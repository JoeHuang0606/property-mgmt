/**
 * 財產管理系統 - 前端入口
 */
import './style.css';
import { addRoute, startRouter, navigate } from './router.js';
import { isAuthenticated, isAdmin } from './auth.js';
import { initParticles } from './particles.js';

// 頁面模組（延遲載入）
import loginPage from './pages/login.js';
import dashboardPage from './pages/dashboard.js';
import assetsPage from './pages/assets.js';
import assetDetailPage from './pages/asset-detail.js';
import assetFormPage from './pages/asset-form.js';
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
addRoute('/assets', authGuard(assetsPage));
addRoute('/assets/new', authGuard(assetFormPage));
addRoute('/assets/:id', authGuard(assetDetailPage));
addRoute('/assets/:id/edit', authGuard((params) => assetFormPage(params)));
addRoute('/scanner', authGuard(scannerPage));
addRoute('/categories', authGuard(categoriesPage));
addRoute('/users', adminGuard(usersPage));
addRoute('/roles', adminGuard(rolesPage));
addRoute('/audit', adminGuard(auditLogPage));

addRoute('/system-backup', adminGuard(systemBackupPage));

// 啟動路由
startRouter();

// 啟動背景動畫
initParticles();
