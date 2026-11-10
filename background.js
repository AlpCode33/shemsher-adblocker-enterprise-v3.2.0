/**
 * شەمشەر ئېلان توسقۇچ (Shemsher AdBlocker) v3.2.0
 * Enterprise Session Counter Manager & Managed Policy Loader
 * Resets blocked ad count to 0 on every browser startup (Session-Zero Counter)
 */

(function () {
  'use strict';

  const STORAGE_KEYS = {
    IS_ENABLED: 'shemsher_is_enabled',
    BLOCKED_COUNT: 'shemsher_blocked_count',
    WHITELIST_DOMAINS: 'shemsher_whitelist_domains',
    ANTI_SURVEILLANCE: 'shemsher_anti_surveillance',
    URL_SANITIZER: 'shemsher_url_sanitizer',
    WEBRTC_GUARD: 'shemsher_webrtc_guard'
  };

  async function syncBadgeState(isEnabled, count) {
    try {
      if (typeof chrome === 'undefined' || !chrome.action) return;
      if (!isEnabled) {
        await chrome.action.setBadgeText({ text: 'OFF' });
        await chrome.action.setBadgeBackgroundColor({ color: '#E11D48' });
      } else {
        const num = Math.max(0, Number(count) || 0);
        const badgeStr = num > 999 ? '999+' : String(num);
        await chrome.action.setBadgeText({ text: badgeStr });
        await chrome.action.setBadgeBackgroundColor({ color: '#00AFDE' });
      }
    } catch (err) {
      console.error('خاتالىق (Background Badge Sync):', err);
    }
  }

  async function syncManagedEnterprisePolicy() {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.managed) return;
      const managed = await chrome.storage.managed.get(null);
      if (managed && Object.keys(managed).length > 0) {
        const updates = {};
        if (Array.isArray(managed.whitelistDomains)) {
          updates[STORAGE_KEYS.WHITELIST_DOMAINS] = managed.whitelistDomains;
        }
        if (typeof managed.antiSurveillance === 'boolean') {
          updates[STORAGE_KEYS.ANTI_SURVEILLANCE] = managed.antiSurveillance;
        }
        if (typeof managed.urlSanitizer === 'boolean') {
          updates[STORAGE_KEYS.URL_SANITIZER] = managed.urlSanitizer;
        }
        if (typeof managed.webrtcGuard === 'boolean') {
          updates[STORAGE_KEYS.WEBRTC_GUARD] = managed.webrtcGuard;
        }
        if (Object.keys(updates).length > 0) {
          await chrome.storage.local.set(updates);
        }
      }
    } catch (_) {}
  }

  async function resetSessionCounterToZero() {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return;
      const data = await chrome.storage.local.get([STORAGE_KEYS.IS_ENABLED]);
      const isEnabled = typeof data[STORAGE_KEYS.IS_ENABLED] === 'boolean' ? data[STORAGE_KEYS.IS_ENABLED] : true;

      if (chrome.storage.session && typeof chrome.storage.session.setAccessLevel === 'function') {
        try {
          await chrome.storage.session.setAccessLevel({
            accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS'
          });
          await chrome.storage.session.set({ [STORAGE_KEYS.BLOCKED_COUNT]: 0 });
        } catch (_) {}
      }

      await chrome.storage.local.set({
        [STORAGE_KEYS.IS_ENABLED]: isEnabled,
        [STORAGE_KEYS.BLOCKED_COUNT]: 0
      });

      await syncManagedEnterprisePolicy();
      await syncBadgeState(isEnabled, 0);
    } catch (err) {
      console.error('خاتالىق (Startup Counter Reset):', err);
    }
  }

  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onStartup.addListener(() => {
      resetSessionCounterToZero();
    });

    chrome.runtime.onInstalled.addListener(() => {
      resetSessionCounterToZero();
    });
  }

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      try {
        if (area === 'local' && (changes[STORAGE_KEYS.BLOCKED_COUNT] || changes[STORAGE_KEYS.IS_ENABLED])) {
          chrome.storage.local.get([STORAGE_KEYS.IS_ENABLED, STORAGE_KEYS.BLOCKED_COUNT], (res) => {
            const enabled = typeof res[STORAGE_KEYS.IS_ENABLED] === 'boolean' ? res[STORAGE_KEYS.IS_ENABLED] : true;
            const count = typeof res[STORAGE_KEYS.BLOCKED_COUNT] === 'number' ? res[STORAGE_KEYS.BLOCKED_COUNT] : 0;
            syncBadgeState(enabled, count);
          });
        }
      } catch (_) {}
    });
  }
})();
