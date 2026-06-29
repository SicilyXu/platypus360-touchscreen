// src/pages/PreviewThemeBridge.jsx
import { useEffect } from 'react';

/** 兜底：把 theme 写入 CSS 变量 */
function applyThemeCSSVariables(configuration) {
  const root = document.documentElement;
  Object.entries(configuration || {}).forEach(([key, val]) => {
    if (val) root.style.setProperty(`--${key}`, String(val));
  });
}

/** 粗判是否是“纯 theme 对象”（你的新协议） */
function looksLikeThemeObject(obj) {
  if (!obj || typeof obj !== 'object') return false;
  const keys = Object.keys(obj);
  // 你当前的三个键任意存在即认为是 theme
  return ['standard', 'light', 'dark'].some((k) => keys.includes(k));
}

/** 统一应用入口：优先全局函数，其次 CSS 变量；并缓存到 window.__PREVIEW_THEME */
function pushPreviewFromThemeObject(themeObj) {
  if (!themeObj || typeof themeObj !== 'object') {
    console.warn('[PreviewThemeBridge] pushPreview skipped: bad theme object', themeObj);
    return;
  }

  // 你的父页直接发的是 { dark, light, standard }，我们将其视作 configuration
  const configuration = themeObj;

  if (typeof window.__APPLY_PREVIEW_THEME__ === 'function') {
    try {
      window.__APPLY_PREVIEW_THEME__({ configuration, colors: themeObj?.colors });
    } catch (err) {
      console.warn('[PreviewThemeBridge] __APPLY_PREVIEW_THEME__ failed, fallback to CSS vars', err);
      applyThemeCSSVariables(configuration);
    }
  } else {
    applyThemeCSSVariables(configuration);
  }

  // 记忆最近一次，用于刷新后自动恢复
  window.__PREVIEW_THEME = { configuration, colors: themeObj?.colors };
}

export default function PreviewThemeBridge() {
  useEffect(() => {
    // 只有在 ?preview=1 时启用
    if (!window.location.search.includes('preview=1')) {
      console.log('[PreviewThemeBridge] preview=1 not in URL, bridge disabled');
      return;
    }

    const allowed = new Set([
      window.origin,
      'https://manage.platypus360.com',
      'http://localhost:3004', // 按你本地 CMS 端口调整
    ]);

    // 自动加入父页 origin（避免端口变化导致的跨域拒绝）
    try {
      if (document.referrer) {
        const refOrigin = new URL(document.referrer).origin;
        allowed.add(refOrigin);
        console.log('[PreviewThemeBridge] Added referrer origin to allowed:', refOrigin);
      }
    } catch {
      /* ignore */
    }

    // 刷新恢复
    if (window.__PREVIEW_THEME?.configuration) {
      console.log('[PreviewThemeBridge] Found previous preview theme in window, applying...');
      pushPreviewFromThemeObject(window.__PREVIEW_THEME.configuration);
    }

    const handler = (e) => {
      console.log('[PreviewThemeBridge] message received:', { origin: e.origin, data: e.data });

      if (!allowed.has(e.origin)) {
        console.warn('[PreviewThemeBridge] message ignored: origin not allowed ->', e.origin);
        return;
      }

      const data = e.data;

      // 1) 旧协议：{ type: 'PREVIEW_THEME', payload }
      if (data?.type === 'PREVIEW_THEME') {
        const themeLike = data?.payload?.configuration || data?.payload;
        console.log('[PreviewThemeBridge] using type=PREVIEW_THEME payload');
        if (looksLikeThemeObject(themeLike)) {
          pushPreviewFromThemeObject(themeLike);
        } else {
          console.warn('[PreviewThemeBridge] PREVIEW_THEME payload not a theme object:', themeLike);
        }
      }
      // 2) 兼容协议：{ __PREVIEW_THEME: payload }
      else if (data?.__PREVIEW_THEME) {
        const themeLike =
          data?.__PREVIEW_THEME?.configuration || data?.__PREVIEW_THEME;
        console.log('[PreviewThemeBridge] using __PREVIEW_THEME payload');
        if (looksLikeThemeObject(themeLike)) {
          pushPreviewFromThemeObject(themeLike);
        } else {
          console.warn('[PreviewThemeBridge] __PREVIEW_THEME payload not a theme object:', themeLike);
        }
      }
      // 3) 新协议：直接发纯 theme 对象（你的当前做法）
      else if (looksLikeThemeObject(data)) {
        console.log('[PreviewThemeBridge] using raw theme object payload');
        pushPreviewFromThemeObject(data);
      }
      // 其它消息丢弃
      else {
        console.warn('[PreviewThemeBridge] message ignored: not a recognised preview payload');
        return;
      }

      // 回 ACK，父页可据此确认已接收
      try {
        e.source?.postMessage(
          { type: 'PREVIEW_THEME_ACK', ok: true, ts: Date.now() },
          e.origin
        );
      } catch {
        /* ignore ack errors */
      }
    };

    window.addEventListener('message', handler);
    console.log(
      '[PreviewThemeBridge] Bridge ready (listening). Allowed origins:',
      [...allowed]
    );

    return () => {
      window.removeEventListener('message', handler);
      console.log('[PreviewThemeBridge] Bridge removed');
    };
  }, []);

  return null;
}
