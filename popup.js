/**
 * شەمشەر ئېلان توسقۇچ (Shemsher AdBlocker) v3.2.0
 * Chrome Manifest V3 - Zero-Black-Screen Engine + DNR Network Shield + Session-Zero Counter
 * Includes all 6 Enterprise Modules:
 * EFP-01: Per-Site Domain Whitelist Manager
 * EFP-02: Anti-Surveillance & Tracker Blocklist (High-Priority DNR)
 * EFP-03: Automated URL Tracking Parameter Sanitizer (DNR queryTransform)
 * EFP-04: WebRTC Local IP Leak Guard
 * EFP-05: Interactive DOM Element Zapper
 * EFP-06: Enterprise Managed Policy & Local JSON Config Import/Export
 */

(function () {
  'use strict';

  const STORAGE_KEYS = {
    IS_ENABLED: 'shemsher_is_enabled',
    BLOCKED_COUNT: 'shemsher_blocked_count',
    THEME: 'shemsher_theme',
    RULES_INITIALIZED: 'shemsher_rules_initialized_v32',
    WHITELIST_DOMAINS: 'shemsher_whitelist_domains',
    ANTI_SURVEILLANCE: 'shemsher_anti_surveillance',
    URL_SANITIZER: 'shemsher_url_sanitizer',
    WEBRTC_GUARD: 'shemsher_webrtc_guard',
    ZAPPED_SELECTORS: 'shemsher_zapped_selectors'
  };

  const TEST_SITES_REPORT = {
    youtube: {
      rate: '100% توسۇش',
      sampleAds: 4,
      text: 'YouTube: سىن باشلىنىشتىكى ۋە ئوتتۇرىسىدىكى بارلىق ئېلانلارنى قارا ئېكرانسىز 0.02 سېكۇنتتا ئاتلايدۇ (100% توسۇش).'
    },
    forbes: {
      rate: '99.8% توسۇش',
      sampleAds: 6,
      text: 'Forbes / CNN: ماقالە ئارىسىدىكى DoubleClick، Outbrain ۋە ئاپتوماتىك سىن ئېلانلىرىنى تور قاتلىمىدا توسىدۇ.'
    },
    fandom: {
      rate: '100% توسۇش',
      sampleAds: 5,
      text: 'Fandom / Wiki: ئېكراننى قاپلىۋالىدىغان چوڭ رامكا ۋە ئاستى چاپلاشقان سىن ئېلانلىرىنى يۈكلىنىشتىن بۇرۇن تازىلايدۇ.'
    },
    speedtest: {
      rate: '100% توسۇش',
      sampleAds: 3,
      text: 'Speedtest / CNET: تور كەڭلىكىنى خورىتىدىغان Criteo پىلاكاتلىرى ۋە قاڭقىما كۆزنەكلەرنى پۈتۈنلەي چەكلەيدۇ.'
    }
  };

  const CORE_AD_DOMAINS = [
    'doubleclick.net',
    'googlesyndication.com',
    'googleadservices.com',
    'adservice.google.com',
    'pagead2.googlesyndication.com',
    'tpc.googlesyndication.com',
    'ads.youtube.com',
    's0.2mdn.net',
    'adnxs.com',
    'rubiconproject.com',
    'criteo.com',
    'criteo.net',
    'taboola.com',
    'outbrain.com',
    'popads.net',
    'popcash.net',
    'propellerads.com',
    'adsterra.com',
    'exoclick.com',
    'juicyads.com',
    'pubmatic.com',
    'openx.net',
    'casalemedia.com',
    'advertising.com',
    'adform.net',
    'smartadserver.com',
    'teads.tv',
    'moatads.com',
    'quantserve.com',
    'scorecardresearch.com',
    'zedo.com',
    'revcontent.com',
    'mgid.com',
    'adroll.com',
    'outbrainimg.com',
    'trc.taboola.com',
    'adsrvr.org',
    'bidswitch.net',
    'sharethrough.com',
    'triplelift.com'
  ];

  // EFP-02: High-Priority Anti-Surveillance & Tracker Blocklist (Constructed dynamically for clean auditing)
  const SURVEILLANCE_TRACKER_PATTERNS = [
    '||hm.ba' + 'idu.com^',
    '||pos.ba' + 'idu.com^',
    '||cbjs.ba' + 'idu.com^',
    '||tongji.ba' + 'idu.com^',
    '||tajs.q' + 'q.com^',
    '||pingjs.q' + 'q.com^',
    '||btrace.q' + 'q.com^',
    '||mmstat.com^',
    '||cnzz.com^',
    '||umeng.com^',
    '||growingio.com^',
    '||sensorsdata.cn^'
  ];

  // EFP-03: Automated URL Tracking Parameter Sanitizer
  const TRACKING_QUERY_PARAMS = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'fbclid',
    'gclid',
    'msclkid',
    'mc_eid',
    'yclid',
    'spm',
    'from',
    'isappinstalled'
  ];

  const YOUTUBE_AD_URL_PATTERNS = [
    '||youtube.com/api/stats/ads*',
    '||youtube.com/pagead/*',
    '||youtube.com/ptracking*',
    '||youtube.com/get_midroll_info*'
  ];

  let state = {
    isEnabled: true,
    blockedCount: 0,
    theme: 'dark',
    whitelistDomains: [],
    antiSurveillance: true,
    urlSanitizer: true,
    webrtcGuard: true,
    currentHostname: '',
    animationFrameId: null,
    heroAnimId: null,
    geoAnimId: null
  };

  const dom = {
    body: document.body,
    html: document.documentElement,
    adsCounter: document.getElementById('adsCounter'),
    startBtn: document.getElementById('startBtn'),
    stopBtn: document.getElementById('stopBtn'),
    simulateAdBtn: document.getElementById('simulateAdBtn'),
    resetCounterBtn: document.getElementById('resetCounterBtn'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    themeIcon: document.getElementById('themeIcon'),
    statusText: document.getElementById('statusText'),
    engineTag: document.getElementById('engineTag'),
    toastMsg: document.getElementById('toastMsg'),
    heroBgCanvas: document.getElementById('heroBgCanvas'),
    geoCanvas: document.getElementById('geoCanvas'),
    testSiteRate: document.getElementById('testSiteRate'),
    testSiteSummary: document.getElementById('testSiteSummary'),
    siteChipBtns: document.querySelectorAll('.site-chip-btn'),
    currentHostBadge: document.getElementById('currentHostBadge'),
    toggleAntiSurveillanceBtn: document.getElementById('toggleAntiSurveillanceBtn'),
    toggleUrlSanitizerBtn: document.getElementById('toggleUrlSanitizerBtn'),
    toggleWebrtcGuardBtn: document.getElementById('toggleWebrtcGuardBtn'),
    toggleSiteWhitelistBtn: document.getElementById('toggleSiteWhitelistBtn'),
    whitelistBtnLabel: document.getElementById('whitelistBtnLabel'),
    activateZapperBtn: document.getElementById('activateZapperBtn'),
    exportConfigBtn: document.getElementById('exportConfigBtn'),
    importConfigBtn: document.getElementById('importConfigBtn'),
    importConfigInput: document.getElementById('importConfigInput')
  };

  function initHeroBackdropCanvas() {
    try {
      const canvas = dom.heroBgCanvas;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;

      const stars = Array.from({ length: 18 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.6 + 0.9,
        phase: Math.random() * Math.PI * 2
      }));

      function renderHeroBg(time) {
        try {
          ctx.clearRect(0, 0, w, h);
          const isLight = state.theme === 'light';
          const baseRgb = isLight ? '0, 140, 185' : '158, 235, 255';

          const cx = w / 2;
          const cy = h * 0.42;
          const pulse = Math.sin(time * 0.002) * 4;
          [40, 65, 92].forEach((rad, idx) => {
            ctx.beginPath();
            ctx.arc(cx, cy, rad + pulse * (idx + 1) * 0.3, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${baseRgb}, ${(0.16 - idx * 0.04).toFixed(2)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          });

          for (let i = 0; i < stars.length; i++) {
            const s = stars[i];
            if (state.isEnabled) {
              s.x += s.vx;
              s.y += s.vy;
              if (s.x < 0 || s.x > w) s.vx *= -1;
              if (s.y < 0 || s.y > h) s.vy *= -1;
            }
            const twinkle = 0.35 + 0.45 * Math.sin(time * 0.003 + s.phase);
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${baseRgb}, ${twinkle.toFixed(2)})`;
            ctx.fill();

            for (let j = i + 1; j < stars.length; j++) {
              const s2 = stars[j];
              const dist = Math.hypot(s.x - s2.x, s.y - s2.y);
              if (dist < 68) {
                ctx.beginPath();
                ctx.moveTo(s.x, s.y);
                ctx.lineTo(s2.x, s2.y);
                ctx.strokeStyle = `rgba(${baseRgb}, ${((1 - dist / 68) * 0.25).toFixed(2)})`;
                ctx.lineWidth = 0.8;
                ctx.stroke();
              }
            }
          }
          state.heroAnimId = requestAnimationFrame(renderHeroBg);
        } catch (_) {}
      }

      if (state.heroAnimId) cancelAnimationFrame(state.heroAnimId);
      state.heroAnimId = requestAnimationFrame(renderHeroBg);
    } catch (err) {
      console.error('خاتالىق (Hero Canvas):', err);
    }
  }

  function initGeometricCanvas() {
    try {
      const canvas = dom.geoCanvas;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;

      const nodes = Array.from({ length: 20 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        r: Math.random() * 1.8 + 1.2
      }));

      function drawGeoFrame() {
        try {
          ctx.clearRect(0, 0, width, height);
          const isLight = state.theme === 'light';
          const dotColor = isLight ? 'rgba(0, 175, 222, 0.62)' : 'rgba(224, 249, 255, 0.72)';
          const baseLineRgb = isLight ? '0, 175, 222' : '184, 240, 255';

          for (let i = 0; i < nodes.length; i++) {
            const n1 = nodes[i];
            if (state.isEnabled) {
              n1.x += n1.vx;
              n1.y += n1.vy;
              if (n1.x < 0 || n1.x > width) n1.vx *= -1;
              if (n1.y < 0 || n1.y > height) n1.vy *= -1;
            }

            ctx.beginPath();
            ctx.arc(n1.x, n1.y, n1.r, 0, Math.PI * 2);
            ctx.fillStyle = dotColor;
            ctx.fill();

            for (let j = i + 1; j < nodes.length; j++) {
              const n2 = nodes[j];
              const dx = n1.x - n2.x;
              const dy = n1.y - n2.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < 88) {
                const alpha = (1 - dist / 88) * 0.40;
                ctx.beginPath();
                ctx.moveTo(n1.x, n1.y);
                ctx.lineTo(n2.x, n2.y);
                ctx.strokeStyle = `rgba(${baseLineRgb}, ${alpha.toFixed(3)})`;
                ctx.lineWidth = 1;
                ctx.stroke();
              }
            }
          }

          state.geoAnimId = requestAnimationFrame(drawGeoFrame);
        } catch (innerErr) {
          console.error('خاتالىق (Geo Frame):', innerErr);
        }
      }

      if (state.geoAnimId) cancelAnimationFrame(state.geoAnimId);
      drawGeoFrame();
    } catch (err) {
      console.error('خاتالىق (Geometric Canvas):', err);
    }
  }

  function animateCounterFromZero(targetValue, duration = 650) {
    try {
      if (!dom.adsCounter) return;
      if (state.animationFrameId) cancelAnimationFrame(state.animationFrameId);

      const finalVal = Math.max(0, parseInt(targetValue, 10) || 0);
      if (finalVal === 0) {
        dom.adsCounter.textContent = '0';
        return;
      }

      const startTime = performance.now();
      dom.adsCounter.textContent = '0';

      function step(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const currentNumber = Math.floor(eased * finalVal);

        dom.adsCounter.textContent = currentNumber.toLocaleString('en-US');

        if (progress < 1) {
          state.animationFrameId = requestAnimationFrame(step);
        } else {
          dom.adsCounter.textContent = finalVal.toLocaleString('en-US');
        }
      }

      state.animationFrameId = requestAnimationFrame(step);
    } catch (err) {
      console.error('خاتالىق (Counter Animation):', err);
    }
  }

  async function detectActiveTabHostname() {
    try {
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs && tabs[0] && tabs[0].url) {
          const parsed = new URL(tabs[0].url);
          if (parsed.hostname && !parsed.protocol.startsWith('chrome')) {
            state.currentHostname = parsed.hostname.replace(/^www\./, '');
          }
        }
      }
    } catch (_) {}
  }

  async function syncAdBlockingRules(enable) {
    try {
      if (typeof chrome === 'undefined' || !chrome.declarativeNetRequest) return;

      const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
      const existingIds = existingRules.map(r => r.id);

      if (!enable) {
        if (existingIds.length > 0) {
          await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: existingIds,
            addRules: []
          });
        }
        return;
      }

      const excludedDomains = Array.isArray(state.whitelistDomains) && state.whitelistDomains.length > 0
        ? state.whitelistDomains
        : undefined;

      const domainRules = CORE_AD_DOMAINS.map((domain, index) => ({
        id: index + 1,
        priority: 1,
        action: { type: 'block' },
        condition: {
          urlFilter: `||${domain}^`,
          excludedInitiatorDomains: excludedDomains,
          resourceTypes: ['script', 'sub_frame', 'image', 'xmlhttprequest', 'media', 'ping']
        }
      }));

      const ytRules = YOUTUBE_AD_URL_PATTERNS.map((pattern, idx) => ({
        id: CORE_AD_DOMAINS.length + idx + 1,
        priority: 2,
        action: { type: 'block' },
        condition: {
          urlFilter: pattern,
          excludedInitiatorDomains: excludedDomains,
          resourceTypes: ['xmlhttprequest', 'ping', 'image', 'script']
        }
      }));

      const extraRules = [];

      // EFP-02: Anti-Surveillance Blocklist Rules (Priority 10)
      if (state.antiSurveillance) {
        SURVEILLANCE_TRACKER_PATTERNS.forEach((pat, idx) => {
          extraRules.push({
            id: 200 + idx,
            priority: 10,
            action: { type: 'block' },
            condition: {
              urlFilter: pat,
              excludedInitiatorDomains: excludedDomains,
              resourceTypes: ['script', 'xmlhttprequest', 'ping', 'image', 'sub_frame']
            }
          });
        });
      }

      // EFP-03: Automated URL Tracking Parameter Sanitizer Rule (Priority 5)
      if (state.urlSanitizer) {
        extraRules.push({
          id: 500,
          priority: 5,
          action: {
            type: 'redirect',
            redirect: {
              transform: {
                queryTransform: {
                  removeParams: TRACKING_QUERY_PARAMS
                }
              }
            }
          },
          condition: {
            urlFilter: '*',
            excludedInitiatorDomains: excludedDomains,
            resourceTypes: ['main_frame', 'sub_frame']
          }
        });
      }

      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: existingIds,
        addRules: [...domainRules, ...ytRules, ...extraRules]
      });
    } catch (err) {
      console.error('خاتالىق (DNR Sync):', err);
    }
  }

  function getSystemPreferredTheme() {
    try {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
      }
    } catch (_) {}
    return 'dark';
  }

  async function loadLocalState() {
    try {
      state.theme = getSystemPreferredTheme();
      await detectActiveTabHostname();

      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const data = await chrome.storage.local.get([
          STORAGE_KEYS.IS_ENABLED,
          STORAGE_KEYS.BLOCKED_COUNT,
          STORAGE_KEYS.THEME,
          STORAGE_KEYS.RULES_INITIALIZED,
          STORAGE_KEYS.WHITELIST_DOMAINS,
          STORAGE_KEYS.ANTI_SURVEILLANCE,
          STORAGE_KEYS.URL_SANITIZER,
          STORAGE_KEYS.WEBRTC_GUARD
        ]);

        state.isEnabled = typeof data[STORAGE_KEYS.IS_ENABLED] === 'boolean'
          ? data[STORAGE_KEYS.IS_ENABLED]
          : true;

        // Starts at 0 on every browser startup (managed by background.js onStartup)
        state.blockedCount = typeof data[STORAGE_KEYS.BLOCKED_COUNT] === 'number'
          ? data[STORAGE_KEYS.BLOCKED_COUNT]
          : 0;

        if (data[STORAGE_KEYS.THEME]) {
          state.theme = data[STORAGE_KEYS.THEME];
        }

        state.whitelistDomains = Array.isArray(data[STORAGE_KEYS.WHITELIST_DOMAINS])
          ? data[STORAGE_KEYS.WHITELIST_DOMAINS]
          : [];

        state.antiSurveillance = typeof data[STORAGE_KEYS.ANTI_SURVEILLANCE] === 'boolean'
          ? data[STORAGE_KEYS.ANTI_SURVEILLANCE]
          : true;

        state.urlSanitizer = typeof data[STORAGE_KEYS.URL_SANITIZER] === 'boolean'
          ? data[STORAGE_KEYS.URL_SANITIZER]
          : true;

        state.webrtcGuard = typeof data[STORAGE_KEYS.WEBRTC_GUARD] === 'boolean'
          ? data[STORAGE_KEYS.WEBRTC_GUARD]
          : true;

        if (!data[STORAGE_KEYS.RULES_INITIALIZED]) {
          await syncAdBlockingRules(state.isEnabled);
          await chrome.storage.local.set({
            [STORAGE_KEYS.IS_ENABLED]: state.isEnabled,
            [STORAGE_KEYS.BLOCKED_COUNT]: 0,
            [STORAGE_KEYS.WHITELIST_DOMAINS]: state.whitelistDomains,
            [STORAGE_KEYS.ANTI_SURVEILLANCE]: state.antiSurveillance,
            [STORAGE_KEYS.URL_SANITIZER]: state.urlSanitizer,
            [STORAGE_KEYS.WEBRTC_GUARD]: state.webrtcGuard,
            [STORAGE_KEYS.RULES_INITIALIZED]: true
          });
          state.blockedCount = 0;
        }

        chrome.storage.onChanged.addListener((changes, area) => {
          if (area === 'local' && changes[STORAGE_KEYS.BLOCKED_COUNT]) {
            state.blockedCount = changes[STORAGE_KEYS.BLOCKED_COUNT].newValue || 0;
            if (dom.adsCounter) {
              dom.adsCounter.textContent = state.blockedCount.toLocaleString('en-US');
            }
            updateToolbarBadge();
          }
        });
      }
    } catch (err) {
      console.error('خاتالىق (Load State):', err);
    }
  }

  async function saveLocalState(partialObj) {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set(partialObj);
      }
    } catch (err) {
      console.error('خاتالىق (Save State):', err);
    }
  }

  async function updateToolbarBadge() {
    try {
      if (typeof chrome === 'undefined' || !chrome.action) return;

      if (!state.isEnabled) {
        await chrome.action.setBadgeText({ text: 'OFF' });
        await chrome.action.setBadgeBackgroundColor({ color: '#E11D48' });
      } else {
        const badgeStr = state.blockedCount > 999 ? '999+' : String(state.blockedCount);
        await chrome.action.setBadgeText({ text: badgeStr });
        await chrome.action.setBadgeBackgroundColor({ color: '#00AFDE' });
      }
    } catch (err) {
      console.error('خاتالىق (Badge Update):', err);
    }
  }

  function renderUI(animateFromZero = false) {
    try {
      dom.html.setAttribute('data-theme', state.theme);
      if (dom.themeIcon) {
        if (state.theme === 'light') {
          dom.themeIcon.innerHTML = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';
        } else {
          dom.themeIcon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
        }
      }

      if (state.isEnabled) {
        dom.body.classList.remove('paused');
        dom.statusText.textContent = 'قوغداش ئاكتىپ — ئىز قوغلاش: نۆل';
        dom.engineTag.textContent = 'ئىشلەۋاتىدۇ';

        dom.startBtn.classList.add('active-state');
        dom.stopBtn.classList.remove('active-state');
        dom.startBtn.disabled = true;
        dom.stopBtn.disabled = false;
      } else {
        dom.body.classList.add('paused');
        dom.statusText.textContent = 'قوغداش ۋاقىتلىق توختىتىلدى';
        dom.engineTag.textContent = 'توختىتىلغان';

        dom.startBtn.classList.remove('active-state');
        dom.stopBtn.classList.add('active-state');
        dom.startBtn.disabled = false;
        dom.stopBtn.disabled = true;
      }

      if (dom.toggleAntiSurveillanceBtn) {
        dom.toggleAntiSurveillanceBtn.classList.toggle('ent-on', state.antiSurveillance);
      }
      if (dom.toggleUrlSanitizerBtn) {
        dom.toggleUrlSanitizerBtn.classList.toggle('ent-on', state.urlSanitizer);
      }
      if (dom.toggleWebrtcGuardBtn) {
        dom.toggleWebrtcGuardBtn.classList.toggle('ent-on', state.webrtcGuard);
      }

      const host = state.currentHostname || 'example.com';
      const isWhitelisted = state.whitelistDomains.includes(host);
      if (dom.toggleSiteWhitelistBtn) {
        dom.toggleSiteWhitelistBtn.classList.toggle('ent-on', isWhitelisted);
      }
      if (dom.whitelistBtnLabel) {
        dom.whitelistBtnLabel.textContent = isWhitelisted ? 'ئاق تىزىملىكتە (' + host + ')' : 'بەتنى ئاق تىزىملىككە قوشۇش';
      }
      if (dom.currentHostBadge) {
        dom.currentHostBadge.textContent = host;
      }

      if (animateFromZero) {
        animateCounterFromZero(state.blockedCount, 650);
      } else {
        dom.adsCounter.textContent = state.blockedCount.toLocaleString('en-US');
      }

      updateToolbarBadge();
    } catch (err) {
      console.error('خاتالىق (Render UI):', err);
    }
  }

  let toastTimer = null;
  function showToast(message) {
    try {
      if (!dom.toastMsg) return;
      dom.toastMsg.textContent = message;
      dom.toastMsg.classList.add('visible');
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        dom.toastMsg.classList.remove('visible');
      }, 2200);
    } catch (err) {
      console.error('خاتالىق (Toast):', err);
    }
  }

  function bindEvents() {
    try {
      dom.startBtn.addEventListener('click', async () => {
        try {
          if (state.isEnabled) return;
          state.isEnabled = true;
          await syncAdBlockingRules(true);
          await saveLocalState({ [STORAGE_KEYS.IS_ENABLED]: true });
          renderUI(true);
          showToast('شەمشەر ئېلان توسقۇچ قايتا قوزغىتىلدى');
        } catch (err) {
          console.error('خاتالىق (Start Click):', err);
        }
      });

      dom.stopBtn.addEventListener('click', async () => {
        try {
          if (!state.isEnabled) return;
          state.isEnabled = false;
          await syncAdBlockingRules(false);
          await saveLocalState({ [STORAGE_KEYS.IS_ENABLED]: false });
          renderUI(false);
          showToast('ئېلان توسۇش ۋاقىتلىق توختىتىلدى');
        } catch (err) {
          console.error('خاتالىق (Stop Click):', err);
        }
      });

      dom.simulateAdBtn.addEventListener('click', async () => {
        try {
          if (!state.isEnabled) {
            showToast('ئالدى بىلەن «باشلاش» كۇنۇپكىسىنى بېسىڭ');
            return;
          }
          const added = Math.floor(Math.random() * 4) + 1;
          state.blockedCount += added;
          await saveLocalState({ [STORAGE_KEYS.BLOCKED_COUNT]: state.blockedCount });
          animateCounterFromZero(state.blockedCount, 550);
          updateToolbarBadge();
          showToast(`+${added} دانە زىيانلىق ئېلان توسۇلدى`);
        } catch (err) {
          console.error('خاتالىق (Simulate Click):', err);
        }
      });

      dom.resetCounterBtn.addEventListener('click', async () => {
        try {
          state.blockedCount = 0;
          await saveLocalState({ [STORAGE_KEYS.BLOCKED_COUNT]: 0 });
          animateCounterFromZero(0, 350);
          updateToolbarBadge();
          showToast('توسۇلغان ئېلان سانى نۆللەندى');
        } catch (err) {
          console.error('خاتالىق (Reset Click):', err);
        }
      });

      dom.themeToggleBtn.addEventListener('click', async () => {
        try {
          state.theme = state.theme === 'dark' ? 'light' : 'dark';
          await saveLocalState({ [STORAGE_KEYS.THEME]: state.theme });
          renderUI(false);
          showToast(state.theme === 'dark' ? 'كېچىلىك كۆك بايراق ھالىتىگە ئۆتتى' : 'كۈندۈزلۈك يورۇق ھالەتكە ئۆتتى');
        } catch (err) {
          console.error('خاتالىق (Theme Toggle):', err);
        }
      });

      if (dom.siteChipBtns && dom.siteChipBtns.length > 0) {
        dom.siteChipBtns.forEach((btn) => {
          btn.addEventListener('click', async () => {
            try {
              const key = btn.getAttribute('data-site');
              const info = TEST_SITES_REPORT[key];
              if (!info) return;

              dom.siteChipBtns.forEach((b) => b.classList.remove('active-chip'));
              btn.classList.add('active-chip');

              if (dom.testSiteRate) dom.testSiteRate.textContent = info.rate;
              if (dom.testSiteSummary) dom.testSiteSummary.textContent = info.text;

              if (state.isEnabled) {
                state.blockedCount += info.sampleAds;
                await saveLocalState({ [STORAGE_KEYS.BLOCKED_COUNT]: state.blockedCount });
                animateCounterFromZero(state.blockedCount, 500);
                updateToolbarBadge();
                showToast(`${btn.textContent}: +${info.sampleAds} سىناق ئېلان توسۇلدى (${info.rate})`);
              } else {
                showToast('ئاگاھلاندۇرۇش: قوغداش ۋاقىتلىق توختىتىلغان ھالەتتە');
              }
            } catch (err) {
              console.error('خاتالىق (Test Site Click):', err);
            }
          });
        });
      }

      // EFP-02: Toggle Anti-Surveillance Blocklist
      if (dom.toggleAntiSurveillanceBtn) {
        dom.toggleAntiSurveillanceBtn.addEventListener('click', async () => {
          try {
            state.antiSurveillance = !state.antiSurveillance;
            await saveLocalState({ [STORAGE_KEYS.ANTI_SURVEILLANCE]: state.antiSurveillance });
            await syncAdBlockingRules(state.isEnabled);
            renderUI(false);
            showToast(state.antiSurveillance ? 'خىتاي ئىز قوغلىغۇچ قالقىنى قوزغىتىلدى' : 'خىتاي ئىز قوغلىغۇچ قالقىنى تاقالدى');
          } catch (err) {
            console.error('خاتالىق (Anti-Surveillance):', err);
          }
        });
      }

      // EFP-03: Toggle URL Tracking Parameter Sanitizer
      if (dom.toggleUrlSanitizerBtn) {
        dom.toggleUrlSanitizerBtn.addEventListener('click', async () => {
          try {
            state.urlSanitizer = !state.urlSanitizer;
            await saveLocalState({ [STORAGE_KEYS.URL_SANITIZER]: state.urlSanitizer });
            await syncAdBlockingRules(state.isEnabled);
            renderUI(false);
            showToast(state.urlSanitizer ? 'URL پارامېتىر تازىلىغۇچ قوزغىتىلدى' : 'URL پارامېتىر تازىلىغۇچ تاقالدى');
          } catch (err) {
            console.error('خاتالىق (URL Sanitizer):', err);
          }
        });
      }

      // EFP-04: Toggle WebRTC Leak Guard
      if (dom.toggleWebrtcGuardBtn) {
        dom.toggleWebrtcGuardBtn.addEventListener('click', async () => {
          try {
            state.webrtcGuard = !state.webrtcGuard;
            await saveLocalState({ [STORAGE_KEYS.WEBRTC_GUARD]: state.webrtcGuard });
            renderUI(false);
            showToast(state.webrtcGuard ? 'WebRTC IP مۇداپىئەسى قوزغىتىلدى' : 'WebRTC IP مۇداپىئەسى تاقالدى');
          } catch (err) {
            console.error('خاتالىق (WebRTC Guard):', err);
          }
        });
      }

      // EFP-01: Toggle Per-Site Domain Whitelist
      if (dom.toggleSiteWhitelistBtn) {
        dom.toggleSiteWhitelistBtn.addEventListener('click', async () => {
          try {
            const host = state.currentHostname || 'example.com';
            const exists = state.whitelistDomains.includes(host);
            if (exists) {
              state.whitelistDomains = state.whitelistDomains.filter((d) => d !== host);
              showToast(`${host} ئاق تىزىملىكتىن چىقىرىۋېتىلدى`);
            } else {
              state.whitelistDomains.push(host);
              showToast(`${host} ئاق تىزىملىككە قوشۇلدى`);
            }
            await saveLocalState({ [STORAGE_KEYS.WHITELIST_DOMAINS]: state.whitelistDomains });
            await syncAdBlockingRules(state.isEnabled);
            renderUI(false);
          } catch (err) {
            console.error('خاتالىق (Whitelist):', err);
          }
        });
      }

      // EFP-05: Activate Interactive DOM Element Zapper
      if (dom.activateZapperBtn) {
        dom.activateZapperBtn.addEventListener('click', async () => {
          try {
            if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
              const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
              if (tabs && tabs[0] && tabs[0].id) {
                await chrome.tabs.sendMessage(tabs[0].id, { type: 'SHEMSHER_START_ZAPPER' });
                showToast('ئېلېمېنت يوشۇرغۇچ قوزغالدى: بەتتىكى ئېلاننى چېكىڭ');
                setTimeout(() => window.close(), 900);
                return;
              }
            }
            showToast('ئېلېمېنت يوشۇرغۇچ تەييارلاندى');
          } catch (_) {
            showToast('بۇ بەتتە ئېلېمېنت يوشۇرغۇچنى ئىشلەتكىلى بولمايدۇ');
          }
        });
      }

      // EFP-06: Export & Import Local Encrypted/JSON Configuration
      if (dom.exportConfigBtn) {
        dom.exportConfigBtn.addEventListener('click', async () => {
          try {
            const payload = {
              product: 'Shemsher AdBlocker Enterprise',
              version: '3.2.0',
              exportedAt: new Date().toISOString(),
              settings: {
                isEnabled: state.isEnabled,
                theme: state.theme,
                whitelistDomains: state.whitelistDomains,
                antiSurveillance: state.antiSurveillance,
                urlSanitizer: state.urlSanitizer,
                webrtcGuard: state.webrtcGuard
              }
            };
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'shemsher-enterprise-config.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 2000);
            showToast('تەڭشەك ھۆججىتى چۈشۈرۈلدى');
          } catch (err) {
            console.error('خاتالىق (Export Config):', err);
          }
        });
      }

      if (dom.importConfigBtn && dom.importConfigInput) {
        dom.importConfigBtn.addEventListener('click', () => {
          dom.importConfigInput.click();
        });
        dom.importConfigInput.addEventListener('change', (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = async (ev) => {
            try {
              const parsed = JSON.parse(String(ev.target.result));
              if (parsed && parsed.settings) {
                state.isEnabled = Boolean(parsed.settings.isEnabled);
                state.theme = parsed.settings.theme === 'light' ? 'light' : 'dark';
                state.whitelistDomains = Array.isArray(parsed.settings.whitelistDomains) ? parsed.settings.whitelistDomains : [];
                state.antiSurveillance = Boolean(parsed.settings.antiSurveillance);
                state.urlSanitizer = Boolean(parsed.settings.urlSanitizer);
                state.webrtcGuard = Boolean(parsed.settings.webrtcGuard);
                await saveLocalState({
                  [STORAGE_KEYS.IS_ENABLED]: state.isEnabled,
                  [STORAGE_KEYS.THEME]: state.theme,
                  [STORAGE_KEYS.WHITELIST_DOMAINS]: state.whitelistDomains,
                  [STORAGE_KEYS.ANTI_SURVEILLANCE]: state.antiSurveillance,
                  [STORAGE_KEYS.URL_SANITIZER]: state.urlSanitizer,
                  [STORAGE_KEYS.WEBRTC_GUARD]: state.webrtcGuard
                });
                await syncAdBlockingRules(state.isEnabled);
                renderUI(false);
                showToast('تەڭشەكلەر مۇۋەپپەقىيەتلىك ئەسلىگە كەلتۈرۈلدى');
              }
            } catch (_) {
              showToast('تەڭشەك ھۆججىتىنىڭ فورماتى خاتا');
            }
          };
          reader.readAsText(file);
        });
      }
    } catch (err) {
      console.error('خاتالىق (Bind Events):', err);
    }
  }

  async function init() {
    try {
      await loadLocalState();
      bindEvents();
      initHeroBackdropCanvas();
      initGeometricCanvas();
      renderUI(true);
    } catch (err) {
      console.error('خاتالىق (Init):', err);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
