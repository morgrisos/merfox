const { MockAmazonProvider } = require('./MockAmazonProvider');
const { PaapiProvider } = require('./PaapiProvider');

/**
 * ProviderFactory.js
 * 
 * Returns the appropriate ISearchProvider implementation
 * based on the SEARCH_PROVIDER environment variable.
 */
class ProviderFactory {
    static getProvider() {
        const providerType = (process.env.SEARCH_PROVIDER || 'mock').toLowerCase();

        if (providerType === 'paapi') {
            const provider = new PaapiProvider();
            console.log('[PROVIDER] type=paapi initialized');
            return provider;
        } else if (providerType === 'mock') {
            const provider = new MockAmazonProvider();
            console.log('[PROVIDER] type=mock initialized');
            return provider;
        } else {
            throw new Error(`[ProviderFactory] Unknown SEARCH_PROVIDER: ${providerType}. Must be 'mock' or 'paapi'.`);
        }
    }
}

module.exports = { ProviderFactory };
