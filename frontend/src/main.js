/**
 * 財產管理系統 - 前端入口
 */
import './style.css';
import { addRoute, startRouter, navigate } from './router.js';
import { isAuthenticated, isAdmin, isManager } from './auth.js';
import { initParticles } from './particles.js';

// 頁面模組（延遲載入）
import loginPage from './pages/login.js';
import dashboardPage from './pages/dashboard.js';
import propertiesPage from './pages/properties.js';
import propertyDetailPage from './pages/property-detail.js';
import propertyFormPage from './pages/property-form.js';
import scannerPage from './pages/scanner.js';
import usersPage from './pages/users.js';
import auditLogPage from './pages/audit-log.js';
import categoriesPage from './pages/categories.js';
import rolesPage from './pages/roles.js';
import systemBackupPage from './pages/system-backup.js';

// 認證守衛
function authGuard(handler) {
  return async (params) => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }
    return handler(params);
  };
}

// Admin 守衛
function adminGuard(handler) {
  return async (params) => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }
    if (!isAdmin()) {
      navigate('/dashboard');
      return;
    }
    return handler(params);
  };
}

// Manager 守衛
function managerGuard(handler) {
  return async (params) => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }
    if (!isAdmin() && !isManager()) {
      navigate('/dashboard');
      return;
    }
    return handler(params);
  };
}

// 註冊路由
addRoute('/login', () => {
  if (isAuthenticated()) {
    navigate('/dashboard');
    return;
  }
  return loginPage();
});

addRoute('/', () => {
  navigate(isAuthenticated() ? '/dashboard' : '/login');
});

addRoute('/dashboard', authGuard(dashboardPage));
addRoute('/properties', authGuard(propertiesPage));
addRoute('/properties/new', authGuard(propertyFormPage));
addRoute('/properties/:id', authGuard(propertyDetailPage));
addRoute('/properties/:id/edit', authGuard((params) => propertyFormPage(params)));
addRoute('/scanner', authGuard(scannerPage));
addRoute('/categories', authGuard(categoriesPage));
addRoute('/users', managerGuard(usersPage));
addRoute('/roles', adminGuard(rolesPage));
addRoute('/audit', adminGuard(auditLogPage));

addRoute('/system-backup', adminGuard(systemBackupPage));

// 啟動路由
startRouter();

// 啟動背景動畫
initParticles();

// 註冊 Service Worker (PWA)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.error('Service Worker registration failed:', err);
    });
  });
}
