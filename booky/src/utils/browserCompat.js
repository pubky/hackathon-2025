/**
 * Browser Compatibility Layer
 * Provides unified API for Chrome and Firefox
 */

export const browser = (() => {
  // Check for Firefox first (has native Promise support)
  if (typeof globalThis.browser !== 'undefined' && globalThis.browser.runtime) {
    return globalThis.browser;
  }
  // Chrome uses 'chrome' namespace
  else if (typeof chrome !== 'undefined' && chrome.runtime) {
    return {
      storage: chrome.storage,
      bookmarks: chrome.bookmarks,
      alarms: chrome.alarms,
      runtime: chrome.runtime
    };
  }
  throw new Error('No browser API available');
})();

/**
 * Check if we're in a Chrome environment
 */
export function isChrome() {
  return typeof chrome !== 'undefined' && chrome.runtime && !chrome.runtime.getBrowserInfo;
}

/**
 * Check if we're in a Firefox environment
 */
export function isFirefox() {
  return typeof browser !== 'undefined' && browser.runtime && browser.runtime.getBrowserInfo;
}

