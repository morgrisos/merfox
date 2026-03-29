const { stringify } = require('csv-stringify/sync');
const fs = require('fs');
const path = require('path');

class AsinService {
    // =========================================================
    // Candidate Scoring Engine Helpers
    // =========================================================

    /**
     * Normalize a text string for comparison:
     * - Lowercase
     * - Full-width → half-width
     * - Remove symbols (™, ★, 【】, etc.)
     * - Remove hyphens
     * - Compress whitespace
     */
    static normalizeText(str) {
        if (!str) return '';
        return str
            .toLowerCase()
            // Full-width to half-width (ASCII range)
            .replace(/[\uFF01-\uFF5E]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
            // Remove trademark/star/bracket symbols
            .replace(/[™®©★☆◆◇□■●○♪♫【】「」『』〈〉《》〔〕（）]/g, ' ')
            // Remove various punctuation
            .replace(/[!！?？、。・,，.．:：;；""''`~^_\-]/g, ' ')
            // Compress whitespace
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Jaccard similarity on word token sets.
     * Returns value in [0, 1].
     */
    static titleSimilarity(a, b) {
        const tokensA = new Set(this.normalizeText(a).split(/\s+/).filter(t => t.length >= 1));
        const tokensB = new Set(this.normalizeText(b).split(/\s+/).filter(t => t.length >= 1));
        if (tokensA.size === 0 && tokensB.size === 0) return 1;
        if (tokensA.size === 0 || tokensB.size === 0) return 0;
        const intersection = new Set([...tokensA].filter(t => tokensB.has(t)));
        const union = new Set([...tokensA, ...tokensB]);
        return intersection.size / union.size;
    }

    /**
     * GOAL19: Extract platform, edition, and series info from a game title.
     * Used for preventing edition/series mismatches in ASIN scoring.
     */
    static extractGameMeta(title) {
        if (!title) return { platform: null, edition: null, series: null };
        const norm = title.toUpperCase().replace(/\s+/g, '');

        const replaceNumerals = (str) => {
            return str.toLowerCase()
                .replace(/ⅺ|xi /g, '11 ')
                .replace(/ⅹ|x /g, '10 ')
                .replace(/ⅸ|ix /g, '9 ')
                .replace(/ⅷ|viii /g, '8 ')
                .replace(/ⅶ|vii /g, '7 ')
                .replace(/ⅵ|vi /g, '6 ')
                .replace(/ⅴ|v /g, '5 ')
                .replace(/ⅳ|iv /g, '4 ')
                .replace(/ⅲ|iii /g, '3 ')
                .replace(/ⅱ|ii /g, '2 ')
                .replace(/ⅰ|i /g, '1 ');
        };

        // Platform
        let platform = null;
        if (/NINTENDOSWITCH2|SWITCH2/.test(norm)) platform = 'Switch2';
        else if (/NINTENDOSWITCH|SWITCH/.test(norm)) platform = 'Switch';
        else if (/PLAYSTATION5|PS5/.test(norm)) platform = 'PS5';
        else if (/PLAYSTATION4|PS4/.test(norm)) platform = 'PS4';
        else if (/XBOX/.test(norm)) platform = 'Xbox';

        // Edition
        let edition = null;
        if (/完全版|コンプリート/.test(norm)) edition = '完全版';
        else if (/廉価版|ベスト|BEST|HITS/.test(norm)) edition = '廉価版';
        else if (/リメイク|REMAKE/.test(norm)) edition = 'リメイク';
        else if (/リマスター|REMASTER/.test(norm)) edition = 'リマスター';
        else if (/GOTY|GAMEOFTHEYEAR/.test(norm)) edition = 'GOTY';
        else if (/DX|DELUXE|デラックス/.test(norm)) edition = 'DX';
        else if (/通常版/.test(norm)) edition = '通常版';
        else {
            // For standalone 'S', e.g., DQ11 S
            const tokens = title.toUpperCase().split(/[^A-Z0-9]/);
            if (tokens.includes('S')) edition = 'S';
        }

        // Series
        let series = null;
        const normSeries = replaceNumerals(title + ' ').replace(/\s+/g, '');
        // Common franchises that have numberings
        const match = normSeries.match(/(ドラゴンクエスト|ドラクエ|ファイナルファンタジー|ff|ペルソナ|persona|バイオハザード|biohazard)(\d+)/);
        if (match) {
            series = match[2];
        } else {
            // Fallback: looking for standalone numbers in title that might be series num
            // (Limited to 1-99 to avoid matching years or random constraints)
            const tokens = replaceNumerals(title + ' ').trim().split(/\s+/);
            const nums = tokens.filter(t => /^\d{1,2}$/.test(t) && t !== "4" && t !== "5"); // Avoid confusing PS4/PS5
            if (nums.length > 0) series = nums[0];
        }

        return { platform, edition, series };
    }

    /**
     * Score a single Amazon candidate against a Mercari item.
     * Returns { score, reason, breakdown }
     * score = title_sim*0.6 + brand_match*0.2 + category_match*0.1 + platform_match*0.1
     */
    static scoreCandidate(mercariItem, amzCandidate) {
        const normMercariTitle = this.normalizeText(mercariItem.title || '');
        const normAmzTitle = this.normalizeText(amzCandidate.title || '');
        const normBrand = this.normalizeText(mercariItem.brand_text || '');
        const normCat = this.normalizeText(mercariItem.category_text || '');
        const normModel = this.normalizeText(mercariItem.model_number_candidate || '');

        const isGame = /ゲーム|game|テレビゲーム|nintendoswitch|playstation|ps4|ps5|xbox/.test(normCat.replace(/\s/g, ''));
        const PLATFORM_KEYWORDS = ['nintendoswitch', 'switch', 'playstation4', 'playstation5', 'ps4', 'ps5', 'xbox', 'wii', 'nintendo', '3ds', 'ds', 'psp', 'vita'];

        // 1) Title similarity (Jaccard)
        let titleSim = 0;
        if (isGame) {
            // For games, Roman numerals vs Arabic numerals is a common mismatch (e.g., DQ XI vs DQ 11)
            const replaceNumerals = (str) => {
                return str
                    .replace(/ⅺ|xi /g, '11 ')
                    .replace(/ⅹ|x /g, '10 ')
                    .replace(/ⅸ|ix /g, '9 ')
                    .replace(/ⅷ|viii /g, '8 ')
                    .replace(/ⅶ|vii /g, '7 ')
                    .replace(/ⅵ|vi /g, '6 ')
                    .replace(/ⅴ|v /g, '5 ')
                    .replace(/ⅳ|iv /g, '4 ')
                    .replace(/ⅲ|iii /g, '3 ')
                    .replace(/ⅱ|ii /g, '2 ')
                    .replace(/ⅰ|i /g, '1 ');
            };
            const gameNormMercariTitle = replaceNumerals(normMercariTitle + ' ').trim();
            const gameNormAmzTitle = replaceNumerals(normAmzTitle + ' ').trim();
            titleSim = this.titleSimilarity(gameNormMercariTitle, gameNormAmzTitle);

            // Further boost for games: if the core franchise numeric sequence is found, it's a huge signal
            // "ドラゴンクエスト11" or "ドラゴンクエスト11s" 
            const franchiseMatch = gameNormAmzTitle.includes("ドラゴンクエスト11") && gameNormMercariTitle.includes("ドラゴンクエスト11");
            const franchiseMatch3 = gameNormAmzTitle.includes("ドラゴンクエスト3") && gameNormMercariTitle.includes("ドラゴンクエスト3");
            const franchiseMatchX = gameNormAmzTitle.includes("ドラゴンクエスト10") && gameNormMercariTitle.includes("ドラゴンクエスト10");
            if (franchiseMatch || franchiseMatch3 || franchiseMatchX) {
                titleSim = Math.min(titleSim + 0.4, 1.0);
            }
        } else {
            titleSim = this.titleSimilarity(normMercariTitle, normAmzTitle);
        }

        let metaReasonExtras = "";
        if (isGame) {
            const mMeta = this.extractGameMeta(mercariItem.title);
            const aMeta = this.extractGameMeta(amzCandidate.title);

            let metaPenalty = 0;
            let metaBonus = 0;

            // Series mismatch
            if (mMeta.series && aMeta.series && mMeta.series !== aMeta.series) {
                metaPenalty += 0.4;
                metaReasonExtras += " series_mismatch";
            } else if (mMeta.series && aMeta.series && mMeta.series === aMeta.series) {
                metaReasonExtras += ` series:1`;
            }

            // Edition mismatch
            if (mMeta.edition && aMeta.edition && mMeta.edition !== aMeta.edition) {
                metaPenalty += 0.2;
                metaReasonExtras += " edition_mismatch";
            } else if (mMeta.edition && aMeta.edition && mMeta.edition === aMeta.edition) {
                metaBonus += 0.1;
                metaReasonExtras += ` edition:1`;
            }

            titleSim = Math.max(0, titleSim - metaPenalty + metaBonus);
            titleSim = Math.min(1.0, titleSim);
        }

        // Boost: if model number appears in both titles, bump similarity
        if (normModel.length >= 4 && normAmzTitle.includes(normModel)) {
            titleSim = Math.min(titleSim + 0.2, 1.0);
        }

        // 2) Brand match
        let brandMatch = 0;
        let brandMatchStr = "0";

        if (isGame) {
            // Check if normBrand is a platform keyword
            const brandNoSpace = normBrand.replace(/\s/g, '');
            const isPlatformBrand = PLATFORM_KEYWORDS.some(p => brandNoSpace.includes(p));

            if (isPlatformBrand) {
                brandMatch = 1; // Do not penalize
                brandMatchStr = "skip(platform-brand)";
            } else if (normBrand && normBrand.length >= 2) {
                brandMatch = normAmzTitle.includes(normBrand) ? 1 : 0;
                brandMatchStr = brandMatch.toString();
            }
        } else if (normBrand && normBrand.length >= 2) {
            brandMatch = normAmzTitle.includes(normBrand) ? 1 : 0;
            brandMatchStr = brandMatch.toString();
        }

        // 3) Category match: detect gaming platform keywords
        const mercariPlatforms = PLATFORM_KEYWORDS.filter(p => normCat.replace(/\s/g, '').includes(p) || normMercariTitle.replace(/\s/g, '').includes(p));
        const amzPlatforms = PLATFORM_KEYWORDS.filter(p => normAmzTitle.replace(/\s/g, '').includes(p) || this.normalizeText(amzCandidate.platform || '').replace(/\s/g, '').includes(p));

        let categoryMatch = 0;
        // Check if any expected platform keyword appears in Amazon title
        if (mercariPlatforms.length > 0) {
            const overlap = mercariPlatforms.filter(p => amzPlatforms.includes(p));
            categoryMatch = overlap.length > 0 ? 1 : 0;
        } else {
            // No platform detected in Mercari item: neutral (don't penalize)
            categoryMatch = 0.5;
        }

        // 4) Platform match (same as category match for games; can be refined)
        let platformMatch = categoryMatch;

        if (isGame) {
            const brandNoSpace = normBrand.replace(/\s/g, '');
            const brandPlatforms = PLATFORM_KEYWORDS.filter(p => brandNoSpace.includes(p));
            if (brandPlatforms.length > 0) {
                const overlap = brandPlatforms.filter(p => amzPlatforms.includes(p));
                platformMatch = overlap.length > 0 ? 1 : 0;
            }
        }

        // Weighted score
        const score = titleSim * 0.6 + brandMatch * 0.2 + categoryMatch * 0.1 + platformMatch * 0.1;
        const reason = `title:${titleSim.toFixed(2)}${metaReasonExtras} brand:${brandMatchStr} category:${categoryMatch.toFixed(1)} platform:${platformMatch.toFixed(1)}`;

        return { score: Math.min(score, 1.0), reason, breakdown: { titleSim, brandMatch, categoryMatch, platformMatch } };
    }

    /**
     * GOAL25: Unified keyword builder (one source of truth).
     * Priority: jan > isbn > model+brand > title+brand > title
     * Also applies: full-width normalization, symbol strip, Roman numeral substitution,
     * platform alias expansion, category-specific supplementary hints.
     */
    static buildSearchKeywordCore(item) {
        const catLower = (item.category_text || '').toLowerCase();
        const isGame = /\u30b2\u30fc\u30e0|game|\u30c6\u30ec\u30d3\u30b2\u30fc\u30e0/.test(catLower);
        const isDvdBd = /dvd|blu-?ray|\u30d6\u30eb\u30fc\u30ec\u30a4|\u30d3\u30c7\u30aa/.test(catLower);
        const isCD = /\bcd\b|\u97f3\u697d|\u30a2\u30eb\u30d0\u30e0/.test(catLower);

        // 1) Raw keyword selection (priority chain)
        let rawKeyword = '';
        let variant = 'title';

        if (item.jan_candidate && item.jan_candidate.length >= 8) {
            rawKeyword = item.jan_candidate;
            variant = 'jan';
        } else if (item.isbn_candidate && item.isbn_candidate.length >= 10) {
            rawKeyword = item.isbn_candidate;
            variant = 'isbn';
        } else if (item.model_number_candidate && item.model_number_candidate.length >= 3) {
            const brand = (item.brand_text || '').substring(0, 20);
            rawKeyword = brand ? `${item.model_number_candidate} ${brand}` : item.model_number_candidate;
            variant = 'model+brand';
        } else {
            const title = (item.title || '').substring(0, 50);
            const brand = (item.brand_text || '').substring(0, 20);
            rawKeyword = brand ? `${title} ${brand}` : title;
            variant = brand ? 'title+brand' : 'title';
        }

        // 2) GOAL25: Deep normalization
        rawKeyword = this.normalizeForSearch(rawKeyword);

        // 3) Category-specific supplementary hints (append only when using title/brand path)
        if (variant === 'title+brand' || variant === 'title') {
            if (isGame && item.platform_text) {
                // e.g. platform_text = "Nintendo Switch" -> append normalized version
                rawKeyword += ' ' + this.normalizeForSearch(item.platform_text);
            }
            // For DVD/BD and CD we do NOT blindly append genre words;
            // it causes false positives. Keep it clean.
        }

        // 4) Final dedup + trim
        const tokens = rawKeyword.split(/\s+/).filter(Boolean);
        const seen = new Set();
        const uniqueTokens = tokens.filter(t => {
            if (seen.has(t)) return false;
            seen.add(t);
            return true;
        });

        // 5) GOAL26: Extend short keywords (< 3 tokens) for game category
        let extended = false;
        const beforeExtension = uniqueTokens.join(' ');
        if (uniqueTokens.length < 3 && isGame && variant !== 'jan' && variant !== 'isbn') {
            const keywordStr = uniqueTokens.join(' ');
            // Don't add platform hint if one is already present (as prefix of any token)
            const PLATFORMS = ['ps4','ps5','ps3','xbox','wii','3ds','switch'];
            const hasPlatform = uniqueTokens.some(t => PLATFORMS.some(p => t.startsWith(p)));
            if (!hasPlatform) {
                const platformHint = item.platform_text
                    ? this.normalizeForSearch(item.platform_text).split(/\s+/)[0]
                    : 'switch';
                if (platformHint && !uniqueTokens.includes(platformHint)) {
                    uniqueTokens.push(platformHint);
                    extended = true;
                }
            }
        }

        return {
            keyword: uniqueTokens.join(' '),
            variant,
            categoryHint: isGame ? 'game' : isDvdBd ? 'dvd_bd' : isCD ? 'cd' : 'other',
            extended,
            beforeExtension: extended ? beforeExtension : null
        };
    }

    /**
     * GOAL25: Stronger text normalization for search keywords.
     * Applies full-width → half-width, symbol strip, space compression,
     * Roman numeral ↔ Arabic substitution, platform alias unification.
     */
    static normalizeForSearch(str) {
        if (!str) return '';
        let s = str
            // Full-width ASCII → half-width
            .replace(/[\uFF01-\uFF5E]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
            // Strip trademark / bracket symbols
            .replace(/[\u2122\u00AE\u00A9\u2605\u2606\u25C6\u25C7\u25A1\u25A0\u25CF\u25CB\u266A\u266B\u3010\u3011\u300C\u300D\u300E\u300F\u3008\u3009\u300A\u300B\u3014\u3015\uFF08\uFF09]/g, ' ')
            // Remove common punctuation
            .replace(/[!\uFF01?\uFF1F\u3001\u3002\u30FB,\uFF0C.\uFF0E:\uFF1A;\uFF1B"\u201C\u201D'\u2018\u2019`~^_\-]/g, ' ')
            // Lowercase
            .toLowerCase()
            // Roman numeral substitution (standalone tokens only)
            .replace(/\bxii\b/g, '12').replace(/\bxi\b/g, '11').replace(/\bx\b/g, '10')
            .replace(/\bix\b/g, '9').replace(/\bviii\b/g, '8').replace(/\bvii\b/g, '7')
            .replace(/\bvi\b/g, '6').replace(/\biv\b/g, '4').replace(/\biii\b/g, '3')
            .replace(/\bii\b/g, '2')
            // Platform alias normalization
            .replace(/nintendo\s*switch\s*2/g, 'switch2')
            .replace(/nintendo\s*switch/g, 'switch')
            .replace(/playstation\s*5|ps\s*5/g, 'ps5')
            .replace(/playstation\s*4|ps\s*4/g, 'ps4')
            .replace(/playstation\s*3|ps\s*3/g, 'ps3')
            // Compress whitespace
            .replace(/\s+/g, ' ')
            .trim();
        return s;
    }

    /**
     * GOAL25: Backwards-compatible shim (used internally).
     * @deprecated use buildSearchKeywordCore() instead.
     */
    static buildSearchKeyword(item) {
        return this.buildSearchKeywordCore(item).keyword;
    }

    /**
     * GOAL14/GOAL25: Build an Amazon search URL using the unified keyword builder.
     */
    static buildAmazonSearchUrl(item) {
        const { keyword } = this.buildSearchKeywordCore(item);
        return {
            url: `https://www.amazon.co.jp/s?k=${encodeURIComponent(keyword)}`,
            keyword
        };
    }

    /**
     * GOAL18/GOAL25: Build a Seller Central search URL using the unified keyword builder.
     */
    static buildSellerCentralSearchUrl(item) {
        const { keyword } = this.buildSearchKeywordCore(item);
        return {
            url: `https://sellercentral.amazon.co.jp/productsearch/search?q=${encodeURIComponent(keyword)}`,
            keyword
        };
    }

    /**
     * Lookup book title from ISBN using free APIs (no key required).
     * 1) Open Library: https://openlibrary.org/api/books?bibkeys=ISBN:...&format=json&jscmd=data
     * 2) Google Books: https://www.googleapis.com/books/v1/volumes?q=isbn:...
     * Returns { title, authors, publisher, found, source }
     */
    static async lookupISBNApi(isbn) {
        // --- 1) Open Library ---
        try {
            const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;
            const res = await fetch(url, {
                headers: { 'User-Agent': 'MerFox/1.0 (isbn-lookup; educational)', 'Accept': 'application/json' }
            });
            if (res.ok) {
                const json = await res.json();
                const key = `ISBN:${isbn}`;
                if (json[key]) {
                    const book = json[key];
                    const title = book.title || '';
                    const authors = (book.authors || []).map(a => a.name).join(', ');
                    const publisher = (book.publishers || []).map(p => p.name).join(', ');
                    if (title) {
                        return { title, authors, publisher, found: true, source: 'open_library' };
                    }
                }
            }
        } catch (e) { /* fallthrough */ }

        // --- 2) Google Books ---
        try {
            const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`;
            const res = await fetch(url, {
                headers: { 'Accept': 'application/json' }
            });
            if (res.ok) {
                const json = await res.json();
                if (json.totalItems > 0 && json.items && json.items[0]) {
                    const info = json.items[0].volumeInfo || {};
                    const title = info.title || '';
                    const authors = (info.authors || []).join(', ');
                    const publisher = info.publisher || '';
                    if (title) {
                        return { title, authors, publisher, found: true, source: 'google_books' };
                    }
                }
            }
        } catch (e) { /* fallthrough */ }

        return { title: null, authors: null, publisher: null, found: false, source: null };
    }

    /**
     * Try to find an Amazon ASIN by querying amazon.co.jp search directly with the ISBN.
     * Returns { asin, error }
     */
    static async searchASINByISBNDirect(isbn) {
        try {
            const url = `https://www.amazon.co.jp/s?k=${isbn}&s=relevanceblender`;
            const res = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
                    'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive'
                }
            });
            if (!res.ok) return { asin: null, error: `HTTP ${res.status}` };
            const html = await res.text();
            // Extract ASIN from search result /dp/ links
            const asinMatch = html.match(/\/dp\/([A-Z0-9]{10})(?:\/|\?|")/);
            if (asinMatch && asinMatch[1]) {
                return { asin: asinMatch[1], error: null };
            }
            return { asin: null, error: 'No ASIN in Amazon search results' };
        } catch (e) {
            return { asin: null, error: e.message };
        }
    }

    /**
     * Fetch the canonical Amazon product title for a given ASIN.
     * Hits https://www.amazon.co.jp/dp/{asin} and extracts the product title.
     * Returns { title, brand, error }
     * - title: the official product name
     * - brand: byline brand if extractable
     * - error: description if the request failed
     */
    static async fetchAmazonCanonicalTitle(asin) {
        try {
            const url = `https://www.amazon.co.jp/dp/${asin}`;
            const res = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive',
                    'Cache-Control': 'no-cache'
                }
            });
            if (!res.ok) return { title: null, brand: null, error: `HTTP ${res.status}` };
            const html = await res.text();

            // Detect bot-block signals
            if (html.includes('Type the characters you see in this image') || html.includes('Enter the characters you see below')) {
                return { title: null, brand: null, error: 'CAPTCHA detected' };
            }
            if (html.includes('robot') && html.includes('verify')) {
                return { title: null, brand: null, error: 'Bot check triggered' };
            }

            // Primary: extract from <span id="productTitle">
            const productTitleMatch = html.match(/<span[^>]+id="productTitle"[^>]*>\s*([\s\S]{3,300}?)\s*<\/span>/i);
            if (productTitleMatch && productTitleMatch[1]) {
                const title = productTitleMatch[1].replace(/<[^>]*>/g, '').trim();
                if (title.length >= 3) {
                    // Also try to extract brand from byline
                    const bylineMatch = html.match(/<a[^>]+id="bylineInfo"[^>]*>\s*([\s\S]{2,60}?)\s*<\/a>/i);
                    const brand = bylineMatch ? bylineMatch[1].replace(/<[^>]*>/g, '').replace(/^\s*ブランド:\s*/i, '').trim() : null;
                    return { title, brand, error: null };
                }
            }

            // Fallback: extract from <title> tag
            const titleTagMatch = html.match(/<title>\s*([\s\S]{3,300}?)\s*<\/title>/i);
            if (titleTagMatch && titleTagMatch[1]) {
                let title = titleTagMatch[1]
                    .replace(/<[^>]*>/g, '')
                    .replace(/\s*[-|:]\s*Amazon\.co\.jp.*$/i, '')
                    .replace(/\s*[-|]\s*アマゾン.*$/i, '')
                    .trim();
                if (title.length >= 3) {
                    return { title, brand: null, error: null };
                }
            }

            return { title: null, brand: null, error: 'Title element not found in page' };
        } catch (e) {
            return { title: null, brand: null, error: e.message };
        }
    }

    static async run(runDir, items, searchProvider) {
        if (!searchProvider) {
            throw new Error('searchProvider is required (e.g., new MockAmazonProvider())');
        }

        const safeItems = items || [];

        let matchedCount = 0;
        let failedCount = 0;

        const asinLogPath = path.join(runDir, 'asin.log');
        const appendLog = (msg) => {
            fs.appendFileSync(asinLogPath, msg + '\n');
        };
        fs.writeFileSync(asinLogPath, `[${new Date().toISOString()}] ASIN matching started.\n`);

        const asinItems = [];
        for (const item of safeItems) {
            let asin_candidate = '';
            let match_source = 'none';
            let confidence = 0.0;
            let reason = 'No identifiers available';
            let match_type = 'NO_MATCH';

            // Detect book/media category
            const catLower = (item.category_text || '').toLowerCase();
            // isBookMedia: ONLY printed books/magazines — NOT disc media
            const isBookMedia = /本・雑誌|書籍|漫画|manga|comic/.test(catLower)
                && !/dvd|blu|ブルーレイ|cd|ゲーム|game/.test(catLower);
            const isMediaDisc = /cd・dvd|dvd|blu|ブルーレイ/.test(catLower);
            const isGame = /ゲーム|game|テレビゲーム/.test(catLower);

            if (isBookMedia) {
                // ====== BOOK/MEDIA PATH: ISBN-only ======
                if (item.isbn_candidate && item.isbn_candidate.length >= 10) {
                    appendLog(`[ASIN] BOOK_ISBN_ROUTE item_id=${item.item_id} isbn=${item.isbn_candidate}`);

                    // === STEP 1: Verify book existence via ISBN API (Open Library → Google Books) ===
                    const apiResult = await this.lookupISBNApi(item.isbn_candidate);
                    await new Promise(r => setTimeout(r, 800));

                    if (apiResult.found && apiResult.title) {
                        // Title conformity: check that key Mercari words appear in API book title
                        const mercariWords = (item.title || '').toLowerCase()
                            .replace(/[^\wぁ-んァ-ン一-龥]/g, ' ')
                            .split(/\s+/)
                            .filter(w => w.length >= 2);
                        const apiTitleLower = apiResult.title.toLowerCase();
                        const matchedWords = mercariWords.filter(w => apiTitleLower.includes(w));
                        const matchRatio = mercariWords.length > 0 ? matchedWords.length / mercariWords.length : 0;

                        appendLog(`[ASIN] BOOK_VERIFIED item_id=${item.item_id} isbn=${item.isbn_candidate} title="${apiResult.title}" source=${apiResult.source} overlap=${Math.round(matchRatio * 100)}%`);

                        // === STEP 2: Try Amazon direct search for ASIN ===
                        const { asin, error: asinErr } = await this.searchASINByISBNDirect(item.isbn_candidate);
                        await new Promise(r => setTimeout(r, 1200));

                        if (asin) {
                            asin_candidate = asin;
                            match_source = 'isbn_api';
                            confidence = Math.min(0.7 + matchRatio * 0.3, 1.0);
                            match_type = 'ISBN_VERIFIED';
                            reason = `Book confirmed via ${apiResult.source} (overlap ${Math.round(matchRatio * 100)}%). ASIN found on Amazon: ${apiResult.title.substring(0, 40)}`;
                            matchedCount++;
                            appendLog(`[ASIN] VERIFIED item_id=${item.item_id} isbn=${item.isbn_candidate} asin=${asin} source=isbn_api`);
                        } else {
                            // Book is real — could not confirm ASIN on Amazon
                            asin_candidate = ''; // per spec: empty unless VERIFIED
                            match_source = 'isbn_api';
                            confidence = 0.6 + matchRatio * 0.2;
                            match_type = 'ISBN_BOOK_VERIFIED';
                            reason = `Real book confirmed via ${apiResult.source}: "${apiResult.title.substring(0, 40)}". ASIN not retrieved: ${asinErr || 'not found'}`;
                            matchedCount++;
                            appendLog(`[ASIN] BOOK_VERIFIED item_id=${item.item_id} isbn=${item.isbn_candidate} title="${apiResult.title.substring(0, 40)}" source=${apiResult.source} asin_err=${asinErr || 'not found'}`);
                        }
                    } else {
                        // ISBN not found in any API
                        match_type = 'ISBN_NO_MATCH';
                        reason = 'ISBN not found in Open Library or Google Books';
                        failedCount++;
                        appendLog(`[ASIN] NO_MATCH item_id=${item.item_id} isbn=${item.isbn_candidate} reason=Not found in ISBN APIs`);
                    }
                } else if (item.jan_candidate && item.jan_candidate.length >= 8) {
                    // Book item with JAN but no ISBN — try JAN
                    const { asin, error } = await this.searchASINViaDDG(item.jan_candidate);
                    if (asin) {
                        asin_candidate = asin;
                        match_source = 'jan';
                        confidence = 1.0;
                        match_type = 'JAN_VERIFIED';
                        reason = 'Book: JAN matched via DDG';
                        matchedCount++;
                        appendLog(`[ASIN] VERIFIED item_id=${item.item_id} jan=${item.jan_candidate} asin=${asin} source=jan(book)`);
                    } else {
                        match_type = 'JAN_NO_MATCH';
                        reason = error || 'No ASIN via JAN';
                        failedCount++;
                        appendLog(`[ASIN] NO_MATCH item_id=${item.item_id} jan=${item.jan_candidate} reason=${reason}`);
                    }
                    await new Promise(r => setTimeout(r, 1500));
                } else {
                    // Book item with no usable identifier
                    match_type = 'BOOK_ISBN_MISSING';
                    reason = 'Book category but no ISBN or JAN extracted';
                    failedCount++;
                    appendLog(`[ASIN] BOOK_ISBN_MISSING item_id=${item.item_id} title=${(item.title || '').substring(0, 30)}`);
                }
            } else {
                // ====== NON-BOOK PATH: Multi-candidate scoring engine (GOAL10/11) ======
                const buildResult = this.buildSearchKeywordCore(item);
                const { keyword: searchKeyword, variant: searchVariant, categoryHint } = buildResult;
                const keywordSource = searchVariant;

                // GOAL25: [SEARCH] structured log
                appendLog(`[SEARCH] item_id=${item.item_id} raw_title="${(item.title || '').substring(0, 40)}"`);
                appendLog(`[SEARCH] item_id=${item.item_id} normalized_keyword="${searchKeyword}"`);
                appendLog(`[SEARCH] item_id=${item.item_id} search_variant=${searchVariant}`);
                appendLog(`[SEARCH] item_id=${item.item_id} category_hint=${categoryHint}`);
                // GOAL26: log keyword extension if applied
                const kwExtended = buildResult.extended;
                if (kwExtended) {
                    appendLog(`[SEARCH] keyword_extended item_id=${item.item_id} before="${buildResult.beforeExtension}" after="${searchKeyword}"`);
                }
                // Legacy compat log
                appendLog(`[ASIN] SEARCH item_id=${item.item_id} keyword="${searchKeyword}" source=${keywordSource}`);

                // Store on item for match_results.csv
                item._searchKeyword = searchKeyword;
                item._searchVariant = searchVariant;

                // --- GOAL19: Log GAME_META for non-book items matching game category ---
                const normCat = this.normalizeText(item.category_text || '');
                const isGame = /ゲーム|game|テレビゲーム|nintendoswitch|playstation|ps4|ps5|xbox/.test(normCat.replace(/\s/g, ''));
                if (isGame) {
                    const mMeta = this.extractGameMeta(item.title);
                    if (mMeta.platform || mMeta.edition || mMeta.series) {
                        appendLog(`[ASIN] GAME_META item_id=${item.item_id} platform=${mMeta.platform || ''} edition=${mMeta.edition || ''} series=${mMeta.series || ''}`);
                    }
                }

                // Fast path: if we have a JAN, try provider's JAN direct match
                let janAsin = null;
                if (item.jan_candidate && item.jan_candidate.length >= 8) {
                    const janResults = await searchProvider.searchByJan(item.jan_candidate);
                    if (janResults && janResults.length > 0 && janResults[0].asin) {
                        janAsin = janResults[0].asin;
                    }
                }

                // Fetch multiple candidates via provider
                const candidates = await searchProvider.searchByKeyword(searchKeyword, 10);

                // If JAN gave us an ASIN that isn't among keyword candidates, add it as a synthetic entry
                if (janAsin && !candidates.find(c => c.asin === janAsin)) {
                    candidates.unshift({ asin: janAsin, title: '(JAN direct)', url: `https://www.amazon.co.jp/dp/${janAsin}` });
                }

                appendLog(`[ASIN] CANDIDATES item_id=${item.item_id} count=${candidates.length}`);

                if (candidates.length === 0) {
                    match_type = 'NO_MATCH';
                    reason = 'No Amazon candidates returned';
                    failedCount++;
                    appendLog(`[ASIN] NO_MATCH item_id=${item.item_id} reason=${reason}`);
                } else {
                    // Score each candidate, track the best
                    let best = null;
                    let bestScore = -1;
                    let bestReason = '';
                    let candidatesChecked = 0;

                    // Limit to top 5 candidates
                    const topCandidates = candidates.slice(0, 5);

                    for (const cand of topCandidates) {
                        // For JAN-direct synthetic entries, auto-max score if JAN was the lookup key
                        let scored;
                        if (cand.title === '(JAN direct)' && item.jan_candidate) {
                            scored = { score: 0.90, reason: 'title:n/a brand:n/a category:n/a platform:n/a (JAN direct match)' };
                        } else {
                            // --- GOAL11: Provider lookup for official title if not fully populated ---
                            // If the candidate came from a rich provider API that already filled title/brand, skip.
                            // If coming from search keyword, we might need lookupByAsin to get rich data.
                            // We will always call lookupByAsin here for PA-API transition, as keyword search might have truncated info.
                            try {
                                const details = await searchProvider.lookupByAsin(cand.asin);
                                if (details && details.title) {
                                    cand.originalTitle = cand.title;
                                    cand.title = details.title;
                                    if (details.brand && !cand.brand) cand.brand = details.brand;
                                    if (details.category && !cand.categoryMatch) cand.category = details.category;
                                    appendLog(`[ASIN] TITLE_FETCHED asin=${cand.asin} title="${details.title.substring(0, 40)}"`);
                                }
                            } catch (e) {
                                appendLog(`[ASIN] TITLE_FETCH_ERROR asin=${cand.asin} error=${e.message}`);
                            }
                            // If the candidate's ASIN matched via JAN earlier, it already has max score.
                            if (!scored) {
                                scored = this.scoreCandidate(item, cand);
                            }
                        }
                        candidatesChecked++;

                        // --- GOAL17: Game rule log ---
                        if (scored.reason.includes('skip(platform-brand)')) {
                            appendLog(`[ASIN] GAME_RULE item_id=${item.item_id} brand_text="${item.brand_text || ''}" treated_as_platform=true`);
                        }

                        if (scored.score > bestScore) {
                            bestScore = scored.score;
                            best = cand;
                            bestReason = scored.reason;
                        }
                    }

                    // Apply thresholds
                    const scoreRounded = Math.round(bestScore * 100) / 100;

                    if (bestScore >= 0.70) {
                        asin_candidate = best.asin;
                        match_source = keywordSource;
                        confidence = scoreRounded;
                        match_type = 'VERIFIED';
                        reason = `${bestReason} | asin_title: ${best.title.substring(0, 40)}`;
                        matchedCount++;
                        appendLog(`[ASIN] VERIFIED item_id=${item.item_id} asin=${best.asin} score=${scoreRounded} reason=${bestReason}`);
                    } else if (bestScore >= 0.50) {
                        asin_candidate = ''; // spec: empty unless VERIFIED
                        match_source = keywordSource;
                        confidence = scoreRounded;
                        match_type = 'LOW_CONFIDENCE';
                        reason = `score=${scoreRounded} ${bestReason} | asin_title: ${best.title.substring(0, 40)}`;
                        failedCount++;
                        appendLog(`[ASIN] LOW_CONFIDENCE item_id=${item.item_id} asin=${best.asin} score=${scoreRounded} reason=${bestReason}`);
                    } else {
                        asin_candidate = '';
                        confidence = scoreRounded;
                        match_type = 'NO_MATCH';
                        reason = `score=${scoreRounded} too low. ${bestReason}`;
                        failedCount++;
                        appendLog(`[ASIN] NO_MATCH item_id=${item.item_id} score=${scoreRounded} reason=${bestReason}`);
                    }

                    // Store how many candidates were compared
                    item._candidatesChecked = candidatesChecked;
                }
            }

            let amazon_search_url = '';
            let sellercentral_search_url = '';
            if (match_type !== 'VERIFIED' && match_type !== 'JAN_VERIFIED' && match_type !== 'BOOK_VERIFIED' && match_type !== 'ISBN_VERIFIED') {
                const searchObj = this.buildAmazonSearchUrl(item);
                amazon_search_url = searchObj.url;
                appendLog(`[MANUAL] SEARCH_KEYWORD item_id=${item.item_id} keyword="${searchObj.keyword}"`);
                appendLog(`[MANUAL] SEARCH_URL item_id=${item.item_id} url=${searchObj.url}`);

                const sellerObj = this.buildSellerCentralSearchUrl(item);
                sellercentral_search_url = sellerObj.url;
                appendLog(`[MANUAL] SELLER_SEARCH_URL item_id=${item.item_id} url=${sellerObj.url}`);
            }

            asinItems.push({
                ...item,
                asin: asin_candidate,
                asin_candidate,
                match_source,
                confidence,
                match_reason: reason,
                match_type,
                amazon_search_url,
                sellercentral_search_url
            });
        }

        // Write match_results.csv for Step 3 debugging
        const matchResultsPath = path.join(runDir, 'match_results.csv');
        const matchCols = ['item_id', 'title', 'brand_text', 'category_text', 'jan_candidate', 'isbn_candidate', 'model_number_candidate', 'asin_candidate', 'score', 'match_type', 'match_reason', 'candidates_checked', 'match_source', 'search_keyword', 'search_variant', 'amazon_search_url', 'sellercentral_search_url'];
        // Map _searchKeyword/_searchVariant onto the row before serialising
        const serialisedItems = asinItems.map(i => ({
            ...i,
            search_keyword: i._searchKeyword || '',
            search_variant: i._searchVariant || ''
        }));
        fs.writeFileSync(matchResultsPath, stringify(serialisedItems, { header: true, bom: true, columns: matchCols }));

        // Write asin.tsv
        const asinPath = path.join(runDir, 'asin.tsv');
        const asinCols = ['collected_at', 'site', 'item_id', 'item_url', 'title', 'price_yen', 'shipping_free', 'seller_type', 'image_count', 'first_image_url', 'condition', 'description', 'asin', 'match_type'];
        const asinData = stringify(asinItems, { header: true, bom: true, delimiter: '\t', columns: asinCols });
        fs.writeFileSync(asinPath, asinData);

        // Write asin_failed.csv
        const failedItems = asinItems.filter(i => i.match_type !== 'JAN_VERIFIED').map(i => ({
            item_id: i.item_id,
            item_url: i.item_url,
            failure_reason: i.match_reason,
            detail: 'Confidence: ' + i.confidence
        }));
        const asinFailedPath = path.join(runDir, 'asin_failed.csv');
        fs.writeFileSync(asinFailedPath, stringify(failedItems, { header: true, bom: true, columns: ['item_id', 'item_url', 'failure_reason', 'detail'] }));

        fs.appendFileSync(asinLogPath, `[${new Date().toISOString()}] ASIN matching completed. Matches: ${matchedCount}, Failed: ${failedCount}.\n`);

        return {
            asinStats: {
                matched_rows: matchedCount,
                failed_rows: failedCount,
                reasons_top: `Matched:${matchedCount}, Failed:${failedCount}`
            }
        };
    }
}

module.exports = { AsinService };
