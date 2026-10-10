/**
 * 主题：青草绿（默认） / 珊瑚奶油。
 * 表现层全部由 styles.css 里的 CSS 变量承载，这里只负责「记住 + 应用」。
 * 注意：index.html <head> 里有一段内联脚本做首屏预置（防闪烁），键名与判定逻辑需与下方保持一致。
 */

export type Theme = 'grass' | 'coral';

/** localStorage 键名，与 index.html 内联脚本一致 */
const STORAGE_KEY = 'chilema.theme';

export const DEFAULT_THEME: Theme = 'grass';

export const THEME_LABEL: Record<Theme, string> = {
  grass: '青草绿',
  coral: '珊瑚奶油',
};

/** 浏览器地址栏 / PWA 标题栏 / Android 状态栏配色，与各主题 --accent-deep 对齐 */
const THEME_COLOR: Record<Theme, string> = {
  grass: '#55a441',
  coral: '#ff6b52',
};

export function isTheme(value: unknown): value is Theme {
  return value === 'grass' || value === 'coral';
}

export function otherTheme(theme: Theme): Theme {
  return theme === 'grass' ? 'coral' : 'grass';
}

/** 读取已保存的主题；未保存或读取失败（隐私模式等）时回落到默认主题 */
export function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return isTheme(saved) ? saved : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

/** 应用到 <html data-theme> 并同步 theme-color */
export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
}

export function saveTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* 存不了也不影响本次会话的使用 */
  }
}
