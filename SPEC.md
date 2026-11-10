# تېخنىكىلىق ئۆلچەم ۋە قۇرۇلما ھۆججىتى (SPEC — Technical Specification)

**تۈر نامى:** شەمشەر ئېلان توسقۇچ (Shemsher AdBlocker — Enterprise Edition)  
**نەشرى:** 3.2.0  
**لايىھە ئۆلچىمى:** Chrome Extension Manifest V3 (Chromium 102+)  

---

## 1. سىستېما ئارخىتېكتورىسى (Multi-Layer Defense Architecture)

```
+-----------------------------------------------------------------------+
|                    شەمشەر ئېلان توسقۇچ (Shemsher v3.2.0)               |
+-----------------------------------------------------------------------+
      |                     |                        |                 |
      v                     v                        v                 v
+--------------+   +-----------------+   +-------------------+   +-------------+
| 1. DNR Shield|   | 2. MAIN World   |   | 3. Isolated World |   | 4. Session  |
|   (popup.js) |   | (page-world.js) |   |   (content.js)    |   | Reset (bg)  |
+--------------+   +-----------------+   +-------------------+   +-------------+
| - 40 Domains |   | - Prototype Trap|   | - AD_BLOCK_CSS    |   | - onStartup |
| - EFP-01..03 |   | - WebRTC (EFP04)|   | - Zapper (EFP-05) |   | - Managed   |
+--------------+   +-----------------+   +-------------------+   +-------------+
```

---

## 2. كارخانا دەرىجىلىك مودۇللارنىڭ تېخنىكىلىق يولغا قويۇلۇشى

1. **Session-Zero Counter (`background.js`)**: `chrome.runtime.onStartup` ۋە `chrome.runtime.onInstalled` قوزغالغاندا `shemsher_blocked_count` نى 0 قىلىدۇ.
2. **EFP-01 ئاق تىزىملىك (`popup.js` + `content.js`)**: بارلىق DNR قائىدىلىرىگە `excludedInitiatorDomains` سۈپىتىدە قوشۇلىدۇ.
3. **EFP-02 خىتاي ئىز قوغلىغۇچ قالقىنى (`popup.js`)**: 200-نومۇرلۇق قائىدىدىن باشلاپ `priority: 10` مۇھىملىق بىلەن ئىجرا قىلىنىدۇ.
4. **EFP-03 URL پارامېتىر تازىلىغۇچ (`popup.js`)**: 500-نومۇرلۇق قائىدىدە `queryTransform.removeParams` ئارقىلىق `utm_*`, `fbclid`, `gclid`, `spm` قاتارلىق 13 پارامېتىرنى تازىلايدۇ.
5. **EFP-04 WebRTC Leak Guard (`page-world.js`)**: `window.RTCPeerConnection` نى ئوراپ، `iceTransportPolicy: 'relay'` بىلەن يەرلىك IP ئاشكارىلىنىشنى چەكلەيدۇ.
6. **EFP-05 DOM Element Zapper (`content.js`)**: `SHEMSHER_START_ZAPPER` خەۋىرىنى قوبۇل قىلىپ، چەككەن ئېلېمېنتنىڭ CSS Selector يولىنى `shemsher_zapped_selectors` قا ساقلايدۇ.
7. **EFP-06 Managed Policy & Config Backup (`background.js` + `popup.js`)**: `chrome.storage.managed` نى ئوقۇيدۇ ھەمدە يەرلىك JSON چىقىرىش/يۈكلەشنى تەمىنلەيدۇ.
