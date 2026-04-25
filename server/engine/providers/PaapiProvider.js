'use strict';

const crypto = require('crypto');
const axios = require('axios');
const { ISearchProvider } = require('./ISearchProvider');

/**
 * PaapiProvider.js
 *
 * Production implementation of ISearchProvider using Amazon Product Advertising API 5.0.
 * Uses AWS Signature Version 4 signed HTTP POST requests via axios + Node built-in crypto.
 * No external PA-API SDK required.
 *
 * Required env vars:
 *   AMAZON_PAAPI_ACCESS_KEY
 *   AMAZON_PAAPI_SECRET_KEY
 *   AMAZON_PAAPI_PARTNER_TAG
 *   AMAZON_PAAPI_REGION    (default: us-east-1)
 *   AMAZON_PAAPI_HOST      (default: webservices.amazon.co.jp)
 */
class PaapiProvider extends ISearchProvider {
    constructor() {
        super();
        this.accessKey = process.env.AMAZON_PAAPI_ACCESS_KEY;
        this.secretKey = process.env.AMAZON_PAAPI_SECRET_KEY;
        this.partnerTag = process.env.AMAZON_PAAPI_PARTNER_TAG;
        this.region = process.env.AMAZON_PAAPI_REGION || 'us-east-1';
        this.host = process.env.AMAZON_PAAPI_HOST || 'webservices.amazon.co.jp';
        this.marketplace = 'www.amazon.co.jp';

        if (!this.accessKey || !this.secretKey || !this.partnerTag) {
            throw new Error(
                '[PaapiProvider] Missing PA-API Credentials. ' +
                'Please set AMAZON_PAAPI_ACCESS_KEY, AMAZON_PAAPI_SECRET_KEY, ' +
                'and AMAZON_PAAPI_PARTNER_TAG in your .env.local file.'
            );
        }
    }

    // =========================================================================
    // AWS SigV4 Signing Helpers
    // =========================================================================

    _hmac(key, data, encoding) {
        return crypto.createHmac('sha256', key).update(data, 'utf8').digest(encoding);
    }

    _hash(data) {
        return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
    }

    _getSigningKey(dateStamp) {
        const kDate = this._hmac('AWS4' + this.secretKey, dateStamp);
        const kRegion = this._hmac(kDate, this.region);
        const kService = this._hmac(kRegion, 'ProductAdvertisingAPI');
        const kSigning = this._hmac(kService, 'aws4_request');
        return kSigning;
    }

    _buildAuthHeaders(operation, payloadBody) {
        const now = new Date();
        const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
        const dateStamp = amzDate.slice(0, 8);

        const path = '/paapi5/' + operation.toLowerCase().replace(/([A-Z])/g, (m, c) => c);
        // PA-API 5.0 uses fixed paths like /paapi5/searchitems, /paapi5/getitems
        const canonicalPath = `/paapi5/${operation.charAt(0).toLowerCase() + operation.slice(1)}`;

        const payloadHash = this._hash(payloadBody);

        const canonicalHeaders =
            `host:${this.host}\n` +
            `x-amz-date:${amzDate}\n` +
            `x-amz-target:com.amazon.paapi5.v1.ProductAdvertisingAPIv1.${operation}\n`;

        const signedHeaders = 'host;x-amz-date;x-amz-target';

        const canonicalRequest = [
            'POST',
            canonicalPath,
            '',                   // query string (none)
            canonicalHeaders,
            signedHeaders,
            payloadHash
        ].join('\n');

        const credentialScope = `${dateStamp}/${this.region}/ProductAdvertisingAPI/aws4_request`;
        const stringToSign = [
            'AWS4-HMAC-SHA256',
            amzDate,
            credentialScope,
            this._hash(canonicalRequest)
        ].join('\n');

        const signingKey = this._getSigningKey(dateStamp);
        const signature = this._hmac(signingKey, stringToSign, 'hex');

        const authHeader = (
            `AWS4-HMAC-SHA256 Credential=${this.accessKey}/${credentialScope}, ` +
            `SignedHeaders=${signedHeaders}, ` +
            `Signature=${signature}`
        );

        return {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Encoding': 'amz-1.0',
            'X-Amz-Date': amzDate,
            'X-Amz-Target': `com.amazon.paapi5.v1.ProductAdvertisingAPIv1.${operation}`,
            'Authorization': authHeader,
            'Host': this.host
        };
    }

    async _callPaapi(operation, payload) {
        const body = JSON.stringify(payload);
        const headers = this._buildAuthHeaders(operation, body);
        const url = `https://${this.host}/paapi5/${operation.charAt(0).toLowerCase() + operation.slice(1)}`;

        const response = await axios.post(url, body, {
            headers,
            timeout: 10000
        });
        return response.data;
    }

    // =========================================================================
    // Response Formatter – maps PA-API item to ISearchProvider contract
    // =========================================================================
    _formatItem(item) {
        const asin = item.ASIN || '';
        const info = item.ItemInfo || {};
        const title = info.Title?.DisplayValue || '';
        const brand = info.ByLineInfo?.Brand?.DisplayValue || '';
        const manufacturer = info.ByLineInfo?.Manufacturer?.DisplayValue || '';
        const features = info.Features?.DisplayValues || [];
        const category = item.BrowseNodeInfo?.BrowseNodes?.[0]?.DisplayName || '';
        const platform = info.Classifications?.ProductGroup?.DisplayValue || '';

        return {
            asin,
            title,
            brand: brand || manufacturer,
            category,
            platform,
            url: `https://www.amazon.co.jp/dp/${asin}`,
            source: 'paapi',
            raw: item
        };
    }

    // =========================================================================
    // ISearchProvider Methods
    // =========================================================================

    async searchByKeyword(keyword, maxResults = 10) {
        try {
            const payload = {
                Keywords: keyword,
                Resources: [
                    'ItemInfo.Title',
                    'ItemInfo.ByLineInfo',
                    'ItemInfo.Classifications',
                    'ItemInfo.Features',
                    'BrowseNodeInfo.BrowseNodes'
                ],
                PartnerTag: this.partnerTag,
                PartnerType: 'Associates',
                Marketplace: this.marketplace,
                SearchIndex: 'All',
                ItemCount: Math.min(maxResults, 10)
            };
            const result = await this._callPaapi('SearchItems', payload);
            const items = result.SearchResult?.Items || [];
            return items.map(i => this._formatItem(i));
        } catch (e) {
            console.error(`[PaapiProvider] searchByKeyword error: ${e.message}`);
            return [];
        }
    }

    async searchByJan(jan) {
        try {
            const payload = {
                Keywords: jan,
                Resources: [
                    'ItemInfo.Title',
                    'ItemInfo.ByLineInfo',
                    'ItemInfo.Classifications',
                    'BrowseNodeInfo.BrowseNodes'
                ],
                PartnerTag: this.partnerTag,
                PartnerType: 'Associates',
                Marketplace: this.marketplace,
                SearchIndex: 'All',
                ItemCount: 1
            };
            const result = await this._callPaapi('SearchItems', payload);
            const items = result.SearchResult?.Items || [];
            return items.map(i => this._formatItem(i));
        } catch (e) {
            console.error(`[PaapiProvider] searchByJan error: ${e.message}`);
            return [];
        }
    }

    async searchByIsbn(isbn) {
        try {
            const payload = {
                Keywords: isbn,
                Resources: [
                    'ItemInfo.Title',
                    'ItemInfo.ByLineInfo',
                    'BrowseNodeInfo.BrowseNodes'
                ],
                PartnerTag: this.partnerTag,
                PartnerType: 'Associates',
                Marketplace: this.marketplace,
                SearchIndex: 'Books',
                ItemCount: 1
            };
            const result = await this._callPaapi('SearchItems', payload);
            const items = result.SearchResult?.Items || [];
            return items.map(i => this._formatItem(i));
        } catch (e) {
            console.error(`[PaapiProvider] searchByIsbn error: ${e.message}`);
            return [];
        }
    }

    async searchByModel(model, brand) {
        const keyword = brand ? `${model} ${brand}` : model;
        return this.searchByKeyword(keyword, 5);
    }

    async lookupByAsin(asin) {
        try {
            const payload = {
                ItemIds: [asin],
                Resources: [
                    'ItemInfo.Title',
                    'ItemInfo.ByLineInfo',
                    'ItemInfo.Classifications',
                    'ItemInfo.Features',
                    'BrowseNodeInfo.BrowseNodes'
                ],
                PartnerTag: this.partnerTag,
                PartnerType: 'Associates',
                Marketplace: this.marketplace
            };
            const result = await this._callPaapi('GetItems', payload);
            const items = result.ItemsResult?.Items || [];
            if (items.length === 0) return null;
            return this._formatItem(items[0]);
        } catch (e) {
            console.error(`[PaapiProvider] lookupByAsin error: ${e.message}`);
            return null;
        }
    }
}

module.exports = { PaapiProvider };
