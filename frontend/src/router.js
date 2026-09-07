/**
 * Hash-based SPA 路由器
 */

const routes = {};
let currentCleanup = null;

export function addRoute(path, handler) {
  routes[path] = handler;
}

export function navigate(path) {
  window.location.hash = `#${path}`;
}

export function getCurrentPath() {
  return window.location.hash.slice(1) || '/';
}

export function getPathParams() {
  const hash = window.location.hash.slice(1) || '/';
  const parts = hash.split('/').filter(Boolean);
  return parts;
}

async function handleRoute() {
  const path = getCurrentPath();

  // 執行清理函式
  if (currentCleanup && typeof currentCleanup === 'function') {
    currentCleanup();
    currentCleanup = null;
  }

  // 嘗試精確匹配
  let matched = false;
  if (routes[path]) {
    currentCleanup = await routes[path]();
    matched = true;
  } else {
    // 嘗試參數化匹配
    for (const [pattern, handler] of Object.entries(routes)) {
      const regex = patternToRegex(pattern);
      const match = path.match(regex);
      if (match) {
        const params = extractParams(pattern, match);
        currentCleanup = await handler(params);
        matched = true;
        break;
      }
    }
  }
  if (!matched && !routes[path]) {
    // 404 - 導向首頁
    navigate('/');
    return;
  }

  // 加上浮水印
  const target = document.querySelector('.layout-main') || document.querySelector('.login-page') || document.querySelector('#app');
  if (target && !document.getElementById('global-watermark')) {
    const watermark = document.createElement('div');
    watermark.id = 'global-watermark';
    watermark.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      padding: 24px;
      text-align: center;
      font-size: 0.75rem;
      color: var(--text-muted);
      opacity: 0.6;
      letter-spacing: 0.5px;
      pointer-events: none;
      width: 100%;
      line-height: 1.6;
      z-index: 1000;
    `;
    watermark.innerHTML = `Create By 黃晟宗<br>v${__APP_VERSION__}`;
    target.appendChild(watermark);
  }
}

function patternToRegex(pattern) {
  const regexStr = pattern
    .replace(/:[a-zA-Z]+/g, '([^/]+)')
    .replace(/\//g, '\\/');
  return new RegExp(`^${regexStr}$`);
}

function extractParams(pattern, match) {
  const keys = (pattern.match(/:([a-zA-Z]+)/g) || []).map(k => k.slice(1));
  const params = {};
  keys.forEach((key, i) => {
    params[key] = match[i + 1];
  });
  return params;
}

export function startRouter() {
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}
