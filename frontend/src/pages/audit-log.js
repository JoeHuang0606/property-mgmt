/**
 * 操作日誌頁面（僅 admin）
 */
import { auditAPI } from '../api.js';
import { showToast } from '../components/toast.js';
import { renderSidebar, initSidebarEvents } from '../components/sidebar.js';
import { renderNavbar, initNavbarEvents } from '../components/navbar.js';

let currentPage = 1;

export default async function auditLogPage() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="layout">
      ${renderSidebar()}
      ${renderNavbar('操作日誌')}
      <main class="layout-main">
        <div class="page-content">
          <div class="page-header">
            <div>
              <h2 class="page-title">操作日誌</h2>
              <p class="page-subtitle">追蹤所有系統操作紀錄</p>
            </div>
          </div>

          <div class="search-bar">
            <select class="filter-select" id="filter-action">
              <option value="">全部操作</option>
              <option value="CREATE">建立</option>
              <option value="UPDATE">更新</option>
              <option value="DELETE">刪除</option>
              <option value="LOGIN">登入</option>
              <option value="CHANGE_PASSWORD">變更密碼</option>
            </select>
            <select class="filter-select" id="filter-target">
              <option value="">全部對象</option>
              <option value="assets">財產</option>
              <option value="users">使用者</option>
            </select>
          </div>

          <div id="audit-timeline">
            <div class="skeleton skeleton-card" style="height:400px;"></div>
          </div>

          <div id="audit-pagination"></div>
        </div>
      </main>
    </div>
  `;

  initSidebarEvents();
  initNavbarEvents();

  document.getElementById('filter-action').addEventListener('change', () => {
    currentPage = 1;
    loadAuditLog();
  });

  document.getElementById('filter-target').addEventListener('change', () => {
    currentPage = 1;
    loadAuditLog();
  });

  await loadAuditLog();
}

async function loadAuditLog() {
  const timelineEl = document.getElementById('audit-timeline');
  const paginationEl = document.getElementById('audit-pagination');

  const action = document.getElementById('filter-action')?.value;
  const target = document.getElementById('filter-target')?.value;

  try {
    const data = await auditAPI.list({
      page: currentPage,
      limit: 30,
      action,
      target,
    });

    if (data.data.length === 0) {
      timelineEl.innerHTML = `
        <div class="empty-state">
          <span class="material-icons-round">history</span>
          <div class="empty-state-title">尚無操作紀錄</div>
        </div>
      `;
      paginationEl.innerHTML = '';
      return;
    }

    const actionIcons = {
      CREATE: 'add_circle',
      UPDATE: 'edit',
      DELETE: 'delete',
      LOGIN: 'login',
      CHANGE_PASSWORD: 'lock',
      EXPORT: 'download',
    };

    const actionNames = {
      CREATE: '建立',
      UPDATE: '更新',
      DELETE: '刪除',
      LOGIN: '登入',
      CHANGE_PASSWORD: '變更密碼',
      EXPORT: '匯出',
    };

    const targetNames = {
      assets: '財產',
      users: '使用者',
    };

    timelineEl.innerHTML = `
      <div class="timeline">
        ${data.data.map(log => {
          const details = log.details || {};
          let detailText = '';
          if (details.assetCode) detailText = `編號: ${details.assetCode}`;
          if (details.name) detailText += detailText ? ` · ${details.name}` : details.name;
          if (details.createdUser) detailText = `帳號: ${details.createdUser}`;
          if (details.deletedUser) detailText = `帳號: ${details.deletedUser}`;
          if (details.updatedFields) detailText = `更新欄位: ${details.updatedFields.join(', ')}`;

          return `
            <div class="timeline-item action-${log.action}">
              <div class="timeline-time">${new Date(log.createdAt).toLocaleString('zh-TW')}</div>
              <div class="timeline-content">
                <div class="timeline-action">
                  <span class="material-icons-round" style="font-size:1rem;vertical-align:middle;margin-right:4px;">
                    ${actionIcons[log.action] || 'info'}
                  </span>
                  <strong>${log.userDisplayName || log.username}</strong>
                  ${actionNames[log.action] || log.action}了
                  ${targetNames[log.target] || log.target || ''}
                  ${log.targetId ? `#${log.targetId}` : ''}
                </div>
                ${detailText ? `<div class="timeline-details">${detailText}</div>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    // 分頁
    const { page, totalPages, total } = data.pagination;
    if (totalPages > 1) {
      let paginationHtml = `<div class="pagination">`;
      paginationHtml += `<button class="pagination-btn" ${page <= 1 ? 'disabled' : ''} data-page="${page - 1}">
        <span class="material-icons-round" style="font-size:1rem;">chevron_left</span>
      </button>`;

      for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) {
        paginationHtml += `<button class="pagination-btn ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
      }

      paginationHtml += `<button class="pagination-btn" ${page >= totalPages ? 'disabled' : ''} data-page="${page + 1}">
        <span class="material-icons-round" style="font-size:1rem;">chevron_right</span>
      </button>`;
      paginationHtml += `<span class="pagination-info">共 ${total} 筆</span>`;
      paginationHtml += `</div>`;

      paginationEl.innerHTML = paginationHtml;

      paginationEl.querySelectorAll('[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
          currentPage = parseInt(btn.dataset.page);
          loadAuditLog();
        });
      });
    } else {
      paginationEl.innerHTML = '';
    }
  } catch (err) {
    timelineEl.innerHTML = `
      <div class="empty-state">
        <span class="material-icons-round">error</span>
        <div class="empty-state-title">載入失敗</div>
        <div class="empty-state-desc">${err.message}</div>
      </div>
    `;
  }
}
