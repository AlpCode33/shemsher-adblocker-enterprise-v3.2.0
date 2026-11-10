/**
 * شەمشەر ئېلان توسقۇچ (Shemsher AdBlocker) v3.2.0
 * Universal Cosmetic Filter, Interactive DOM Element Zapper (EFP-05) & Zero-Black-Screen Video Controller
 */

(function () {
  'use strict';

  const STORAGE_KEYS = {
    IS_ENABLED: 'shemsher_is_enabled',
    BLOCKED_COUNT: 'shemsher_blocked_count',
    WHITELIST_DOMAINS: 'shemsher_whitelist_domains',
    WEBRTC_GUARD: 'shemsher_webrtc_guard',
    ZAPPED_SELECTORS: 'shemsher_zapped_selectors'
  };

  let isProtectionEnabled = true;
  let isWebrtcGuardEnabled = true;
  let whitelistDomains = [];
  let zappedSelectorsMap = {};
  let styleElement = null;
  let customZapStyleElement = null;
  let wasAdShowing = false;
  let userMutedBeforeAd = false;
  let zapperActive = false;
  let hoveredElement = null;

  const AD_BLOCK_CSS = `
    ytd-ad-slot-renderer,
    ytd-in-feed-ad-layout-renderer,
    ytd-promoted-sparkles-web-renderer,
    ytd-promoted-video-renderer,
    ytd-compact-promoted-video-renderer,
    ytd-search-pyv-renderer,
    ytd-banner-promo-renderer,
    ytd-statement-banner-renderer,
    ytd-masthead-ad-v3-renderer,
    ytd-primetime-promo-renderer,
    ytd-companion-slot-renderer,
    ytd-action-companion-ad-renderer,
    ytd-player-legacy-desktop-watch-ads-renderer,
    ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"],
    ytd-merch-shelf-renderer,
    .ytd-merch-shelf-renderer,
    .ytp-ad-overlay-container,
    .ytp-ad-message-container,
    .ytp-ad-image-overlay,
    .ytp-ad-text-overlay,
    .ytp-ad-player-overlay-flyout-cta,
    .ytp-ad-player-overlay-layout,
    .ytp-ad-action-interstitial,
    .ytp-featured-product,
    #masthead-ad,
    #player-ads,
    #offer-module,
    ytm-promoted-sparkles-web-renderer,
    ytm-companion-ad-renderer,
    /* Universal Web Ad Containers */
    ins.adsbygoogle,
    .adsbygoogle,
    div[id^="google_ads_iframe_"],
    div[id^="div-gpt-ad"],
    div[id^="taboola-"],
    div[id^="outbrain_"],
    iframe[src*="doubleclick.net"],
    iframe[src*="googlesyndication.com"],
    iframe[src*="googleadservices.com"],
    iframe[src*="adnxs.com"],
    iframe[src*="rubiconproject.com"],
    iframe[src*="criteo.com"],
    iframe[src*="taboola.com"],
    iframe[src*="outbrain.com"],
    iframe[src*="popads.net"],
    iframe[src*="adsterra.com"],
    iframe[src*="exoclick.com"],
    .taboola-widget,
    .outbrain-widget,
    div[class*="ad-container"]:not(body):not(html),
    div[class*="ad-banner"]:not(body):not(html),
    aside[class*="ad-slot"] {
      display: none !important;
      visibility: hidden !important;
      height: 0 !important;
      min-height: 0 !important;
      max-height: 0 !important;
      overflow: hidden !important;
      pointer-events: none !important;
      opacity: 0 !important;
    }
  `;

  function getCurrentHostname() {
    try {
      return location.hostname.replace(/^www\./, '');
    } catch (_) {
      return '';
    }
  }

  function isCurrentSiteEffectiveEnabled() {
    const host = getCurrentHostname();
    if (host && Array.isArray(whitelistDomains) && whitelistDomains.includes(host)) {
      return false;
    }
    return isProtectionEnabled;
  }

  function syncMainWorldState() {
    try {
      window.postMessage({
        type: 'SHEMSHER_SHIELD_STATE',
        enabled: isCurrentSiteEffectiveEnabled(),
        webrtcGuard: isWebrtcGuardEnabled
      }, '*');
    } catch (_) {}
  }

  function injectOrRemoveCosmeticStyles() {
    try {
      const effective = isCurrentSiteEffectiveEnabled();
      if (effective) {
        if (!styleElement) {
          styleElement = document.createElement('style');
          styleElement.id = 'shemsher-adblocker-styles';
          styleElement.textContent = AD_BLOCK_CSS;
        }
        const target = document.head || document.documentElement;
        if (target && !document.getElementById('shemsher-adblocker-styles')) {
          target.appendChild(styleElement);
        }
        applyCustomZappedSelectors();
      } else {
        const existing = document.getElementById('shemsher-adblocker-styles');
        if (existing) existing.remove();
        const existingCustom = document.getElementById('shemsher-zapped-styles');
        if (existingCustom) existingCustom.remove();
      }
    } catch (_) {}
  }

  function applyCustomZappedSelectors() {
    try {
      const host = getCurrentHostname();
      const selectors = zappedSelectorsMap[host];
      if (!Array.isArray(selectors) || selectors.length === 0) return;

      const cssRule = selectors.join(', ') + ' { display: none !important; visibility: hidden !important; }';
      if (!customZapStyleElement) {
        customZapStyleElement = document.createElement('style');
        customZapStyleElement.id = 'shemsher-zapped-styles';
      }
      customZapStyleElement.textContent = cssRule;
      const target = document.head || document.documentElement;
      if (target && !document.getElementById('shemsher-zapped-styles')) {
        target.appendChild(customZapStyleElement);
      }
    } catch (_) {}
  }

  // EFP-05: Interactive DOM Element Zapper
  function buildUniqueSelector(el) {
    if (!el || el.nodeType !== 1) return '';
    if (el.id) return '#' + CSS.escape(el.id);
    const parts = [];
    let cur = el;
    while (cur && cur.nodeType === 1 && cur !== document.body && parts.length < 4) {
      let selector = cur.nodeName.toLowerCase();
      if (cur.className && typeof cur.className === 'string') {
        const cls = cur.className.trim().split(/\s+/).filter(Boolean)[0];
        if (cls) selector += '.' + CSS.escape(cls);
      }
      parts.unshift(selector);
      cur = cur.parentElement;
    }
    return parts.join(' > ');
  }

  function startInteractiveZapper() {
    if (zapperActive) return;
    zapperActive = true;

    function onMouseOver(e) {
      if (!zapperActive) return;
      if (hoveredElement) hoveredElement.style.outline = '';
      hoveredElement = e.target;
      if (hoveredElement && hoveredElement !== document.body && hoveredElement !== document.documentElement) {
        hoveredElement.style.outline = '2px solid #00AFDE';
        hoveredElement.style.cursor = 'crosshair';
      }
    }

    function onClick(e) {
      if (!zapperActive) return;
      e.preventDefault();
      e.stopPropagation();

      const target = e.target;
      if (target && target !== document.body && target !== document.documentElement) {
        target.style.outline = '';
        const selector = buildUniqueSelector(target);
        if (selector) {
          const host = getCurrentHostname();
          const list = Array.isArray(zappedSelectorsMap[host]) ? zappedSelectorsMap[host] : [];
          if (!list.includes(selector)) {
            list.push(selector);
            zappedSelectorsMap[host] = list;
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
              chrome.storage.local.set({ [STORAGE_KEYS.ZAPPED_SELECTORS]: zappedSelectorsMap });
            }
          }
          applyCustomZappedSelectors();
          incrementLocalBlockedCounter(1);
        }
      }
      stopZapper();
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') stopZapper();
    }

    function stopZapper() {
      zapperActive = false;
      if (hoveredElement) {
        hoveredElement.style.outline = '';
        hoveredElement.style.cursor = '';
      }
      document.removeEventListener('mouseover', onMouseOver, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeyDown, true);
    }

    document.addEventListener('mouseover', onMouseOver, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);
  }

  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg && msg.type === 'SHEMSHER_START_ZAPPER') {
        startInteractiveZapper();
      }
    });
  }

  function incrementLocalBlockedCounter(amount = 1) {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get([STORAGE_KEYS.BLOCKED_COUNT], (res) => {
          // Default to 0 so each new browser session starts cleanly from 0
          const current = typeof res[STORAGE_KEYS.BLOCKED_COUNT] === 'number' ? res[STORAGE_KEYS.BLOCKED_COUNT] : 0;
          chrome.storage.local.set({ [STORAGE_KEYS.BLOCKED_COUNT]: current + amount });
        });
      }
    } catch (_) {}
  }

  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'SHEMSHER_AD_BLOCKED') {
      incrementLocalBlockedCounter(e.data.count || 1);
    }
  });

  function fastForwardAnyResidualAd() {
    if (!isCurrentSiteEffectiveEnabled()) return;
    if (!location.hostname.includes('youtube.com') && !location.hostname.includes('youtu.be')) return;

    try {
      const player = document.querySelector('#movie_player, .html5-video-player');
      const video = document.querySelector('video.html5-main-video') || document.querySelector('video');
      if (!player || !video) return;

      const skipBtns = document.querySelectorAll(
        '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, .ytp-ad-action-interstitial-slot button, .ytp-ad-overlay-close-button'
      );
      skipBtns.forEach((btn) => {
        try { btn.click(); } catch (_) {}
      });

      const isAd = player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting');
      if (isAd) {
        if (!wasAdShowing) {
          wasAdShowing = true;
          userMutedBeforeAd = video.muted;
        }
        video.muted = true;
        video.playbackRate = 16;
        if (Number.isFinite(video.duration) && video.duration > 0.1) {
          video.currentTime = Math.max(0, video.duration - 0.05);
        }
      } else if (wasAdShowing) {
        wasAdShowing = false;
        video.muted = userMutedBeforeAd;
        if (video.playbackRate > 2) {
          video.playbackRate = 1;
        }
      }
    } catch (_) {}
  }

  function initContentShield() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get([
          STORAGE_KEYS.IS_ENABLED,
          STORAGE_KEYS.WHITELIST_DOMAINS,
          STORAGE_KEYS.WEBRTC_GUARD,
          STORAGE_KEYS.ZAPPED_SELECTORS
        ], (data) => {
          isProtectionEnabled = typeof data[STORAGE_KEYS.IS_ENABLED] === 'boolean' ? data[STORAGE_KEYS.IS_ENABLED] : true;
          whitelistDomains = Array.isArray(data[STORAGE_KEYS.WHITELIST_DOMAINS]) ? data[STORAGE_KEYS.WHITELIST_DOMAINS] : [];
          isWebrtcGuardEnabled = typeof data[STORAGE_KEYS.WEBRTC_GUARD] === 'boolean' ? data[STORAGE_KEYS.WEBRTC_GUARD] : true;
          zappedSelectorsMap = data[STORAGE_KEYS.ZAPPED_SELECTORS] || {};
          syncMainWorldState();
          injectOrRemoveCosmeticStyles();
        });

        chrome.storage.onChanged.addListener((changes, area) => {
          if (area === 'local') {
            if (changes[STORAGE_KEYS.IS_ENABLED]) {
              isProtectionEnabled = changes[STORAGE_KEYS.IS_ENABLED].newValue;
            }
            if (changes[STORAGE_KEYS.WHITELIST_DOMAINS]) {
              whitelistDomains = changes[STORAGE_KEYS.WHITELIST_DOMAINS].newValue || [];
            }
            if (changes[STORAGE_KEYS.WEBRTC_GUARD]) {
              isWebrtcGuardEnabled = changes[STORAGE_KEYS.WEBRTC_GUARD].newValue;
            }
            if (changes[STORAGE_KEYS.ZAPPED_SELECTORS]) {
              zappedSelectorsMap = changes[STORAGE_KEYS.ZAPPED_SELECTORS].newValue || {};
            }
            syncMainWorldState();
            injectOrRemoveCosmeticStyles();
          }
        });
      } else {
        injectOrRemoveCosmeticStyles();
      }

      const observer = new MutationObserver(() => {
        if (!isCurrentSiteEffectiveEnabled()) return;
        injectOrRemoveCosmeticStyles();
        fastForwardAnyResidualAd();
      });

      observer.observe(document.documentElement || document, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
      });

      setInterval(fastForwardAnyResidualAd, 80);
    } catch (_) {}
  }

  initContentShield();
})();
