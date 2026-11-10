/**
 * شەمشەر ئېلان توسقۇچ (Shemsher AdBlocker) v3.2.0
 * Zero-Black-Screen MAIN-World Engine + WebRTC Local IP Leak Guard (EFP-04)
 */

(function () {
  'use strict';

  let shieldEnabled = true;
  let webrtcGuardEnabled = true;
  let lastCountTime = 0;

  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'SHEMSHER_SHIELD_STATE') {
      shieldEnabled = Boolean(e.data.enabled);
      if (typeof e.data.webrtcGuard === 'boolean') {
        webrtcGuardEnabled = e.data.webrtcGuard;
      }
    }
  });

  function notifyAdBlocked(count = 1) {
    const now = Date.now();
    if (now - lastCountTime < 800) return;
    lastCountTime = now;
    try {
      window.postMessage({ type: 'SHEMSHER_AD_BLOCKED', count }, '*');
    } catch (_) {}
  }

  // EFP-04: WebRTC Local IP Leak Prevention Wrapper
  try {
    const OrigPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection;
    if (OrigPeerConnection) {
      const WrappedPeerConnection = function (config, constraints) {
        if (shieldEnabled && webrtcGuardEnabled && config && Array.isArray(config.iceServers)) {
          config = Object.assign({}, config, {
            iceServers: [],
            iceTransportPolicy: 'relay'
          });
        }
        return new OrigPeerConnection(config, constraints);
      };
      WrappedPeerConnection.prototype = OrigPeerConnection.prototype;
      window.RTCPeerConnection = WrappedPeerConnection;
      if (window.webkitRTCPeerConnection) {
        window.webkitRTCPeerConnection = WrappedPeerConnection;
      }
    }
  } catch (_) {}

  const isYouTube = location.hostname.includes('youtube.com') || location.hostname.includes('youtu.be');

  if (isYouTube) {
    const trappedKeys = ['adPlacements', 'playerAds', 'adSlots'];
    trappedKeys.forEach((prop) => {
      try {
        Object.defineProperty(Object.prototype, prop, {
          configurable: true,
          enumerable: false,
          get() {
            return shieldEnabled ? undefined : this['_' + prop];
          },
          set(val) {
            if (shieldEnabled && val) {
              notifyAdBlocked(1);
              Object.defineProperty(this, '_' + prop, {
                value: [],
                writable: true,
                configurable: true,
                enumerable: false
              });
            } else {
              Object.defineProperty(this, '_' + prop, {
                value: val,
                writable: true,
                configurable: true,
                enumerable: true
              });
            }
          }
        });
      } catch (_) {}
    });

    const YT_AD_KEYS = [
      'adPlacements',
      'playerAds',
      'adSlots',
      'adBreakHeartbeatParams',
      'instreamAdPlayerOverlayRenderer',
      'linearAdSequenceRenderer',
      'actionCompanionAdRenderer',
      'promotedSparklesWebRenderer'
    ];

    function pruneYouTubePayload(obj) {
      if (!shieldEnabled || !obj || typeof obj !== 'object') return obj;
      let found = false;

      function walk(node, depth) {
        if (!node || typeof node !== 'object' || depth > 7) return;
        for (const k of YT_AD_KEYS) {
          if (Object.prototype.hasOwnProperty.call(node, k)) {
            found = true;
            delete node[k];
          }
        }
        if (node.playerResponse && typeof node.playerResponse === 'object') walk(node.playerResponse, depth + 1);
        if (node.contents && typeof node.contents === 'object') walk(node.contents, depth + 1);
      }

      try {
        walk(obj, 0);
        if (found) notifyAdBlocked(1);
      } catch (_) {}
      return obj;
    }

    const origParse = JSON.parse;
    JSON.parse = function (...args) {
      const res = origParse.apply(this, args);
      if (shieldEnabled && res && typeof res === 'object') {
        pruneYouTubePayload(res);
      }
      return res;
    };

    const origJson = Response.prototype.json;
    Response.prototype.json = async function (...args) {
      const data = await origJson.apply(this, args);
      if (shieldEnabled && data && typeof data === 'object') {
        pruneYouTubePayload(data);
      }
      return data;
    };

    function instantSkipViaPlayerAPI() {
      if (!shieldEnabled) return;
      try {
        const player = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
        if (!player) return;

        const isAdShowing = player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting');
        if (!isAdShowing) return;

        const skipBtns = player.querySelectorAll(
          '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, button[id^="skip-button"]'
        );
        skipBtns.forEach((b) => {
          try { b.click(); } catch (_) {}
        });

        if (typeof player.skipAd === 'function') {
          try { player.skipAd(); } catch (_) {}
        }
        if (typeof player.finishAd === 'function') {
          try { player.finishAd(); } catch (_) {}
        }

        const video = player.querySelector('video.html5-main-video') || player.querySelector('video');
        if (video) {
          video.muted = true;
          video.playbackRate = 16;
          if (Number.isFinite(video.duration) && video.duration > 0.1) {
            video.currentTime = Math.max(0, video.duration - 0.05);
            video.play().catch(() => {});
          } else if (typeof player.getDuration === 'function') {
            const d = player.getDuration();
            if (Number.isFinite(d) && d > 0.1 && typeof player.seekTo === 'function') {
              player.seekTo(d, true);
            }
          }
        }

        notifyAdBlocked(1);
      } catch (_) {}
    }

    setInterval(instantSkipViaPlayerAPI, 50);
  }

  const origOpen = window.open;
  window.open = function (url) {
    if (shieldEnabled && url && typeof url === 'string') {
      const lower = url.toLowerCase();
      if (
        lower.includes('doubleclick') ||
        lower.includes('popads') ||
        lower.includes('popcash') ||
        lower.includes('propellerads') ||
        lower.includes('adsterra') ||
        lower.includes('exoclick')
      ) {
        notifyAdBlocked(1);
        return null;
      }
    }
    return origOpen.apply(this, arguments);
  };
})();
