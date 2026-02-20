/**
 * MerFox Design System - Typography & Spacing Constants
 * 
 * These constants ensure consistent visual hierarchy and spacing across all pages.
 * Apply these classes instead of arbitrary values to maintain design unity.
 * 
 * CRITICAL: Never use text-xl, text-2xl, text-3xl directly. Always use these tokens.
 */

// ============================================================================
// TYPOGRAPHY
// ============================================================================

/**
 * Page-level heading (main page title)
 * Example: "今日の成果", "リサーチ条件の設定", "マッピング編集"
 */
export const TYPOGRAPHY_H1 = 'text-[28px] font-bold tracking-tight';

/**
 * H1 subtitle / description
 * Example: Page subtitle text below H1
 */
export const TYPOGRAPHY_H1_SUB = 'text-[14px] text-app-text-muted';

/**
 * Section heading (H2)
 * Example: "優先して見るべき 5件", "危険 / 注意一覧"
 */
export const TYPOGRAPHY_H2 = 'text-[20px] font-semibold';

/**
 * Card title / Table section header
 * Example: Card headers, major section tiles
 */
export const TYPOGRAPHY_CARD_TITLE = 'text-[16px] font-semibold';

/**
 * Normal body text
 * Example: Table cells, form labels, general content
 */
export const TYPOGRAPHY_BODY = 'text-[14px]';

/**
 * Help text / Secondary info / Annotations
 * Example: Hints, explanations, metadata
 */
export const TYPOGRAPHY_HELP = 'text-[12px] text-app-text-muted';

/**
 * Button text
 * Example: All button labels (primary, secondary, small)
 */
export const TYPOGRAPHY_BUTTON = 'text-[14px] font-semibold';

/**
 * Sidebar menu items
 * Example: Navigation items in sidebar
 */
export const TYPOGRAPHY_SIDEBAR = 'text-[14px] font-medium';

/**
 * Form labels
 * Example: Input field labels, filter labels
 */
export const TYPOGRAPHY_LABEL = 'text-[14px] font-medium';

/**
 * Big numbers / Stats
 * Example: Dashboard summary counts, large metrics
 */
export const TYPOGRAPHY_BIG_NUMBER = 'text-[32px] font-bold';

// ============================================================================
// SPACING
// ============================================================================

/**
 * Spacing between major sections on a page (vertical stacking only)
 * Example: Gap between summary cards and main content
 * IMPORTANT: Apply to flex-col containers, NOT to grid (use gap-* for grid)
 */
export const SPACING_SECTION = 'space-y-8';

/**
 * Standard card padding
 * Example: Interior padding for Card components
 */
export const SPACING_CARD_PADDING = 'p-6';

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*
import { 
  TYPOGRAPHY_H1, 
  TYPOGRAPHY_H1_SUB,
  TYPOGRAPHY_H2, 
  TYPOGRAPHY_CARD_TITLE,
  TYPOGRAPHY_BODY,
  TYPOGRAPHY_HELP,
  TYPOGRAPHY_BUTTON,
  SPACING_SECTION, 
  SPACING_CARD_PADDING 
} from '@/constants/designTokens';

// Page heading
<h1 className={`${TYPOGRAPHY_H1} text-white`}>今日の成果</h1>
<p className={TYPOGRAPHY_H1_SUB}>今日の実行結果をまとめました。</p>

// Section heading
<h2 className={`${TYPOGRAPHY_H2} text-white`}>優先して見るべき 5件</h2>

// Card
<Card className={SPACING_CARD_PADDING}>
  <h3 className={`${TYPOGRAPHY_CARD_TITLE} text-white`}>カードタイトル</h3>
  <p className={TYPOGRAPHY_BODY}>本文テキスト</p>
  <span className={TYPOGRAPHY_HELP}>ヘルプテキスト</span>
</Card>

// Section spacing (vertical stacking only)
<div className={`flex flex-col ${SPACING_SECTION}`}>
  <section>...</section>
  <section>...</section>
</div>

// Button
<button className={`${TYPOGRAPHY_BUTTON} ...`}>Submit</button>
*/
