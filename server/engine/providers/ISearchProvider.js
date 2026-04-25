/**
 * ISearchProvider.js
 * 
 * Abstract interface for Amazon ASIN search providers.
 * All providers (Mock, PA-API, Scraping) must implement these methods.
 * Return format for candidate search:
 * Array<{ asin, title, brand, category, platform, url, source, raw }>
 */
class ISearchProvider {
    /**
     * Search Amazon by a generic keyword string.
     * @param {string} keyword 
     * @param {number} maxResults 
     * @returns {Promise<Array<Object>>}
     */
    async searchByKeyword(keyword, maxResults = 10) {
        throw new Error('Not implemented');
    }

    /**
     * Search Amazon by JAN code.
     * @param {string} jan 
     * @returns {Promise<Array<Object>>}
     */
    async searchByJan(jan) {
        throw new Error('Not implemented');
    }

    /**
     * Search Amazon by ISBN.
     * @param {string} isbn 
     * @returns {Promise<Array<Object>>}
     */
    async searchByIsbn(isbn) {
        throw new Error('Not implemented');
    }

    /**
     * Lookup specific ASIN details.
     * @param {string} asin 
     * @returns {Promise<Object>}
     */
    async lookupByAsin(asin) {
        throw new Error('Not implemented');
    }
}

module.exports = { ISearchProvider };
