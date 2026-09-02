/**
 * 側邊欄元件
 */
import { getUser, isAdmin, isManager } from '../auth.js';
import { getCurrentPath } from '../router.js';

export function renderSidebar() {
  const user = getUser();
  const currentPath = getCurrentPath();

  const menuItems = [
    { section: '總覽', items: [
      { icon: 'dashboard', label: '儀表板', path: '/dashboard' },
    ]},
    { section: '財產管理', items: [
      { icon: 'inventory_2', label: '財產列表', path: '/assets' },
      { icon: 'qr_code_scanner', label: '掃描 QR Code', path: '/scanner' },
    ]},
  ];

  // manager 以上才有管理選單
  if (isManager()) {
    menuItems.push({
      section: '管理',
      items: [
        { icon: 'add_circle', label: '新增財產', path: '/assets/new' },
        { icon: 'category', label: '分類管理', path: '/categories' },
        { icon: 'people', label: '帳號管理', path: '/users' },
      ],
    });
  }

  // admin 才有系統管理選單
  if (isAdmin()) {
    menuItems.push({
      section: '系統管理',
      items: [
        { icon: 'manage_accounts', label: '職類管理', path: '/roles' },
        { icon: 'backup', label: '資料管理', path: '/system-backup' },
        { icon: 'history', label: '操作日誌', path: '/audit' },
      ],
    });
  }

  const sectionsHtml = menuItems.map(section => `
    <div class="sidebar-section">
      <div class="sidebar-section-title">${section.section}</div>
      ${section.items.map(item => `
        <a href="#${item.path}" class="sidebar-link ${currentPath === item.path ? 'active' : ''}" data-path="${item.path}">
          <span class="material-icons-round">${item.icon}</span>
          <span>${item.label}</span>
        </a>
      `).join('')}
    </div>
  `).join('');

  return `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-brand">
        <div class="sidebar-logo">
          <span class="material-icons-round">business</span>
        </div>
        <span class="sidebar-brand-text">財產管理系統</span>
      </div>
      <nav class="sidebar-nav">
        ${sectionsHtml}
      </nav>
    </aside>
    <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
  `;
}

export function initSidebarEvents() {
  const backdrop = document.getElementById('sidebar-backdrop');
  const sidebar = document.getElementById('sidebar');

  if (backdrop && sidebar) {
    backdrop.addEventListener('click', () => {
      sidebar.classList.remove('open');
      backdrop.classList.remove('show');
    });
  }
}

export function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (sidebar && backdrop) {
    sidebar.classList.toggle('open');
    backdrop.classList.toggle('show');
  }
}
