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
  if (routes[path]) {
    currentCleanup = await routes[path]();
    return;
  }

  // 嘗試參數化匹配
  for (const [pattern, handler] of Object.entries(routes)) {
    const regex = patternToRegex(pattern);
    const match = path.match(regex);
    if (match) {
      const params = extractParams(pattern, match);
      currentCleanup = await handler(params);
      return;
    }
  }

  // 404 - 導向首頁
  navigate('/');
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
