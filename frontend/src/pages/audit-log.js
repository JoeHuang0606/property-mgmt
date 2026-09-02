/**
 * 操作日誌頁面（僅 admin）
 */
import { auditAPI, usersAPI } from '../api.js';
import { showToast } from '../components/toast.js';
import { renderSidebar, initSidebarEvents } from '../components/sidebar.js';
import { renderNavbar, initNavbarEvents } from '../components/navbar.js';

let currentPage = 1;
let currentLimit = 30;

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
            <select class="filter-select" id="filter-user">
              <option value="">全部人員</option>
            </select>
            <select class="filter-select" id="filter-limit">
              <option value="10">每頁 10 筆</option>
              <option value="30" selected>每頁 30 筆</option>
              <option value="50">每頁 50 筆</option>
              <option value="100">每頁 100 筆</option>
            </select>
          </div>

          <div id="audit-timeline">
            <div class="skeleton skeleton-card" style="height:400px;"></div>
          </div>

          <div id="audit-pagination"></div>
          <div id="audit-page-jump" style="text-align: center; margin-top: 12px; display: none;">
            <input type="number" id="jump-page-input" class="form-input" style="width: 80px; display: inline-block; padding: 4px 8px;" min="1" placeholder="頁碼">
            <button id="jump-page-btn" class="btn btn-primary" style="padding: 4px 12px; margin-left: 8px;">跳轉</button>
          </div>
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

  document.getElementById('filter-user').addEventListener('change', () => {
    currentPage = 1;
    loadAuditLog();
  });

  document.getElementById('filter-limit').addEventListener('change', (e) => {
    currentLimit = parseInt(e.target.value);
    currentPage = 1;
    loadAuditLog();
  });

  document.getElementById('jump-page-btn').addEventListener('click', () => {
    const jumpInput = document.getElementById('jump-page-input');
    const targetPage = parseInt(jumpInput.value);
    if (targetPage && targetPage > 0) {
      currentPage = targetPage;
      loadAuditLog();
    }
  });

  await loadUsersFilter();
  await loadAuditLog();
}

async function loadUsersFilter() {
  try {
    const users = await usersAPI.list();
    const userSelect = document.getElementById('filter-user');
    users.forEach(u => {
      const option = document.createElement('option');
      option.value = u.id;
      option.textContent = u.displayName || u.username;
      userSelect.appendChild(option);
    });
  } catch (err) {
    console.error('Failed to load users for filter', err);
  }
}

async function loadAuditLog() {
  const timelineEl = document.getElementById('audit-timeline');
  const paginationEl = document.getElementById('audit-pagination');

  const action = document.getElementById('filter-action')?.value;
  const target = document.getElementById('filter-target')?.value;
  const userId = document.getElementById('filter-user')?.value;
  const jumpContainer = document.getElementById('audit-page-jump');

  try {
    const data = await auditAPI.list({
      page: currentPage,
      limit: currentLimit,
      action,
      target,
      user_id: userId,
    });

    if (data.data.length === 0) {
      timelineEl.innerHTML = `
        <div class="empty-state">
          <span class="material-icons-round">history</span>
          <div class="empty-state-title">尚無操作紀錄</div>
        </div>
      `;
      paginationEl.innerHTML = '';
      jumpContainer.style.display = 'none';
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
      
      jumpContainer.style.display = 'block';
      document.getElementById('jump-page-input').max = totalPages;
      document.getElementById('jump-page-input').value = page;
    } else {
      paginationEl.innerHTML = '';
      jumpContainer.style.display = 'none';
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
