/**
 * 認證狀態管理
 */

const AUTH_KEY = 'token';
const USER_KEY = 'user';

export function getToken() {
  return localStorage.getItem(AUTH_KEY);
}

export function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAuth(token, user) {
  localStorage.setItem(AUTH_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated() {
  return !!getToken();
}

export function hasRole(...roles) {
  const user = getUser();
  return user && roles.includes(user.role);
}

export function isAdmin() {
  return hasRole('admin');
}

export function isManager() {
  return hasRole('admin', 'manager');
}
