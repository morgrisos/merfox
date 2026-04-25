const { ISearchProvider } = require('./ISearchProvider');

/**
 * MockAmazonProvider.js
 * 
 * Mock implementation of ISearchProvider for GOAL11.
 * Simulates PA-API responses without making actual HTTP requests.
 * Specifically handles "ドラゴンクエストXI Switch" for testing the scoring engine.
 */
class MockAmazonProvider extends ISearchProvider {

    /**
     * @param {string} keyword 
     * @param {number} maxResults 
     */
    async searchByKeyword(keyword, maxResults = 10) {
        // Simulate network delay
        await new Promise(r => setTimeout(r, 100));

        // Return mock data for DQ11
        if (keyword.includes('ドラゴンクエストXI') || keyword.includes('ドラゴンクエスト11')) {
            return [
                {
                    asin: 'B07SDG299Q',
                    title: 'ドラゴンクエストXI 過ぎ去りし時を求めて S - Switch',
                    brand: 'スクウェア・エニックス',
                    category: 'ゲーム・おもちゃ・グッズ > テレビゲーム > Nintendo Switch > ソフト(パッケージ版)',
                    platform: 'Nintendo Switch',
                    url: 'https://www.amazon.co.jp/dp/B07SDG299Q',
                    source: 'mock_keyword',
                    raw: { note: 'Expected best match' }
                },
                {
                    asin: 'B06Y63281P',
                    title: 'ドラゴンクエストXI 過ぎ去りし時を求めて - PS4',
                    brand: 'スクウェア・エニックス',
                    category: 'ゲーム・おもちゃ・グッズ > テレビゲーム > プレイステーション4(PS4) > ソフト(パッケージ版)',
                    platform: 'PlayStation 4',
                    url: 'https://www.amazon.co.jp/dp/B06Y63281P',
                    source: 'mock_keyword',
                    raw: { note: 'Platform mismatch' }
                },
                {
                    asin: 'B07SVZNRYF',
                    title: 'ドラゴンクエストXI 過ぎ去りし時を求めて S 公式ガイドブック',
                    brand: 'スクウェア・エニックス',
                    category: '本・雑誌・漫画 > 本 > 趣味・スポーツ・実用',
                    platform: '本',
                    url: 'https://www.amazon.co.jp/dp/B07SVZNRYF',
                    source: 'mock_keyword',
                    raw: { note: 'Category mismatch (book)' }
                }
            ].slice(0, maxResults);
        }

        // Generic mock response for other items
        return [
            {
                asin: 'MOCK000001',
                title: `Mock result 1 for ${keyword}`,
                brand: 'MockBrand',
                category: 'MockCategory',
                platform: 'MockPlatform',
                url: 'https://www.amazon.co.jp/dp/MOCK000001',
                source: 'mock_keyword',
                raw: {}
            },
            {
                asin: 'MOCK000002',
                title: `Mock result 2 for ${keyword}`,
                brand: 'MockBrand',
                category: 'MockCategory',
                platform: 'MockPlatform',
                url: 'https://www.amazon.co.jp/dp/MOCK000002',
                source: 'mock_keyword',
                raw: {}
            }
        ].slice(0, maxResults);
    }

    async searchByJan(jan) {
        await new Promise(r => setTimeout(r, 100));
        return [{
            asin: `JANMOCK${jan.substring(0, 3)}`,
            title: `Mock Title for JAN ${jan}`,
            brand: 'MockBrand',
            category: 'MockCategory',
            platform: 'MockPlatform',
            url: `https://www.amazon.co.jp/dp/JANMOCK${jan.substring(0, 3)}`,
            source: 'mock_jan',
            raw: { lookup_type: 'jan' }
        }];
    }

    async searchByIsbn(isbn) {
        await new Promise(r => setTimeout(r, 100));
        return [{
            asin: `ISBNMOCK${isbn.substring(0, 2)}`,
            title: `Mock Title for ISBN ${isbn}`,
            brand: 'MockBrand',
            category: 'MockCategory',
            platform: 'MockPlatform',
            url: `https://www.amazon.co.jp/dp/ISBNMOCK${isbn.substring(0, 2)}`,
            source: 'mock_isbn',
            raw: { lookup_type: 'isbn' }
        }];
    }

    async searchByModel(model, brand) {
        await new Promise(r => setTimeout(r, 100));
        return [{
            asin: 'MODELMOCK1',
            title: `Mock Title for Model ${model}`,
            brand: brand || 'MockBrand',
            category: 'MockCategory',
            platform: 'MockPlatform',
            url: `https://www.amazon.co.jp/dp/MODELMOCK1`,
            source: 'mock_model',
            raw: { lookup_type: 'model' }
        }];
    }

    async lookupByAsin(asin) {
        await new Promise(r => setTimeout(r, 100));

        if (asin === 'B07SDG299Q') {
            return {
                asin,
                title: 'ドラゴンクエストXI 過ぎ去りし時を求めて S - Switch',
                brand: 'スクウェア・エニックス',
                category: 'ゲーム・おもちゃ・グッズ > テレビゲーム > Nintendo Switch > ソフト(パッケージ版)',
                platform: 'Nintendo Switch',
                url: `https://www.amazon.co.jp/dp/${asin}`,
                source: 'mock_lookup',
                raw: { lookup_type: 'asin' }
            };
        } else if (asin === 'B06Y63281P') {
            return {
                asin,
                title: 'ドラゴンクエストXI 過ぎ去りし時を求めて - PS4',
                brand: 'スクウェア・エニックス',
                category: 'ゲーム・おもちゃ・グッズ > テレビゲーム > プレイステーション4(PS4) > ソフト(パッケージ版)',
                platform: 'PlayStation 4',
                url: `https://www.amazon.co.jp/dp/${asin}`,
                source: 'mock_lookup',
                raw: { lookup_type: 'asin' }
            };
        } else if (asin === 'B07SVZNRYF') {
            return {
                asin,
                title: 'ドラゴンクエストXI 過ぎ去りし時を求めて S 公式ガイドブック',
                brand: 'スクウェア・エニックス',
                category: '本・雑誌・漫画 > 本 > 趣味・スポーツ・実用',
                platform: '本',
                url: `https://www.amazon.co.jp/dp/${asin}`,
                source: 'mock_lookup',
                raw: { lookup_type: 'asin' }
            };
        }

        return {
            asin: asin,
            title: `Mock Official Title for ${asin}`,
            brand: 'MockBrand',
            category: 'MockCategory',
            platform: 'MockPlatform',
            url: `https://www.amazon.co.jp/dp/${asin}`,
            source: 'mock_lookup',
            raw: { lookup_type: 'asin' }
        };
    }
}

module.exports = { MockAmazonProvider };
