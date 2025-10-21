/**
 * Browser Compatibility Layer
 * Provides unified API for Chrome and Firefox
 */

export const browser = (() => {
  // Firefox uses 'browser' namespace, Chrome uses 'chrome'
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    return {
      storage: chrome.storage,
      bookmarks: chrome.bookmarks,
      alarms: chrome.alarms,
      runtime: chrome.runtime
    };
  } else if (typeof browser !== 'undefined' && browser.runtime) {
    return browser;
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

