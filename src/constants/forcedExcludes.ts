// P0 Safety Feature: Forced Brand Exclusion
// These keywords are ALWAYS excluded from scraping to prevent:
// - Brand trademark infringement
// - Amazon account suspension
// - Legal issues with luxury brands

export const FORCED_BRAND_EXCLUDES = [
    'ルイヴィトン',
    'LOUIS VUITTON',
    'シャネル',
    'CHANEL',
    'エルメス',
    'HERMES',
    'グッチ',
    'GUCCI',
    'プラダ',
    'PRADA',
    '正規品',
    '本物',
    '鑑定済'
];

// P0 Safety Feature: Dangerous URL Keywords
// These keywords in URLs are blocked to prevent:
// - Regulated product categories
// - Brand/luxury item scraping
// - Health/weapon policy violations

export const DANGEROUS_URL_KEYWORDS = [
    'ブランド',
    'バッグ',
    '時計',
    'アクセサリー',
    'サプリ',
    '医薬',
    'ナイフ',
    'モデルガン'
];
