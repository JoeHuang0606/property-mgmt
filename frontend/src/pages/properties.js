/**
 * 財產列表頁面
 */
import { propertiesAPI, categoriesAPI, rolesAPI } from '../api.js';
import { isManager, isAdmin, getUser } from '../auth.js';
import { showToast } from '../components/toast.js';
import { showConfirm } from '../components/modal.js';
import { renderSidebar, initSidebarEvents } from '../components/sidebar.js';
import { renderNavbar, initNavbarEvents } from '../components/navbar.js';

let currentPage = 1;
let currentSearch = '';
let currentCategory = '';
let currentRole = '';
let currentLimit = 15;
let isMyPropertiesOnly = false;
let selectedPropertyIds = new Set();

export default async function propertiesPage() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="layout">
      ${renderSidebar()}
      ${renderNavbar('財產列表')}
      <main class="layout-main">
        <div class="page-content">
          <div class="page-header">
            <div>
              <h2 class="page-title">財產列表</h2>
              <p class="page-subtitle">管理所有組織財產</p>
            </div>
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
              ${isManager() ? `
                <button class="btn btn-secondary" id="btn-export-qrcodes" disabled>
                  <span class="material-icons-round">qr_code_scanner</span>
                  <span>匯出 QR CODE (0)</span>
                </button>
                <button class="btn btn-danger" id="btn-bulk-delete" disabled>
                  <span class="material-icons-round">delete</span>
                  <span>刪除 (0)</span>
                </button>
                <a href="#/properties/new" class="btn btn-primary">
                  <span class="material-icons-round">add</span>
                  新增財產
                </a>
              ` : ''}
            </div>
          </div>

          <div class="search-bar">
            <div class="search-input-wrap">
              <span class="material-icons-round">search</span>
              <input type="text" class="search-input" id="search-input" placeholder="搜尋名稱、編號、保管人..." value="${currentSearch}" />
            </div>

            <select class="filter-select" id="filter-category">
              <option value="">全部分類</option>
            </select>

            <select class="filter-select" id="filter-role">
              <option value="">全部職類</option>
            </select>

            <label class="filter-checkbox" style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: var(--text-secondary); user-select: none;">
              <input type="checkbox" id="filter-my-properties" ${isMyPropertiesOnly ? 'checked' : ''} />
              只顯示我的財產
            </label>
          </div>

          <div id="properties-table">
            <div class="skeleton skeleton-card" style="height:400px;"></div>
          </div>

          <div id="properties-pagination"></div>
        </div>
      </main>
    </div>
  `;

  initSidebarEvents();
  initNavbarEvents();

  // 載入分類下拉選項
  try {
    const categories = await categoriesAPI.list();
    const catSelect = document.getElementById('filter-category');
    categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      if (String(c.id) === currentCategory) opt.selected = true;
      catSelect.appendChild(opt);
    });
  } catch (err) {
    // 忽略
  }

  // 載入職類下拉選項
  try {
    const roles = await rolesAPI.list();
    const roleSelect = document.getElementById('filter-role');
    roles.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r.id;
      opt.textContent = r.name;
      if (String(r.id) === currentRole) opt.selected = true;
      roleSelect.appendChild(opt);
    });
  } catch (err) {
    // 忽略
  }

  // 事件綁定
  let searchTimer;
  document.getElementById('search-input').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      currentSearch = e.target.value;
      currentPage = 1;
      loadProperties();
    }, 300);
  });



  document.getElementById('filter-category').addEventListener('change', (e) => {
    currentCategory = e.target.value;
    currentPage = 1;
    loadProperties();
  });

  document.getElementById('filter-role').addEventListener('change', (e) => {
    currentRole = e.target.value;
    currentPage = 1;
    loadProperties();
  });

  const myPropertiesCb = document.getElementById('filter-my-properties');
  if (myPropertiesCb) {
    myPropertiesCb.addEventListener('change', (e) => {
      isMyPropertiesOnly = e.target.checked;
      currentPage = 1;
      loadProperties();
    });
  }

  const exportBtn = document.getElementById('btn-export-qrcodes');
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      if (selectedPropertyIds.size === 0) return;

      exportBtn.disabled = true;
      const originalText = exportBtn.innerHTML;
      exportBtn.innerHTML = '<span class="material-icons-round spin">sync</span> 匯出中...';

      try {
        await propertiesAPI.exportQRCodes(Array.from(selectedPropertyIds));
        showToast('匯出成功！', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        exportBtn.disabled = false;
        exportBtn.innerHTML = originalText;
      }
    });
  }

  const bulkDeleteBtn = document.getElementById('btn-bulk-delete');
  if (bulkDeleteBtn) {
    bulkDeleteBtn.addEventListener('click', async () => {
      if (selectedPropertyIds.size === 0) return;

      showConfirm({
        title: '刪除財產',
        message: `確定要刪除選取的 ${selectedPropertyIds.size} 筆財產嗎？此操作無法復原。`,
        danger: true,
        confirmText: '刪除',
        onConfirm: async () => {
          bulkDeleteBtn.disabled = true;
          const originalText = bulkDeleteBtn.innerHTML;
          bulkDeleteBtn.innerHTML = '<span class="material-icons-round spin">sync</span> 刪除中...';

          try {
            const ids = Array.from(selectedPropertyIds);
            for (const id of ids) {
              await propertiesAPI.delete(id);
            }
            showToast('刪除成功！', 'success');
            selectedPropertyIds.clear();
            updateExportButton();
            loadProperties();
          } catch (err) {
            showToast(err.message, 'error');
          } finally {
            bulkDeleteBtn.disabled = false;
            bulkDeleteBtn.innerHTML = originalText;
          }
        }
      });
    });
  }

  await loadProperties();
}

function updateExportButton() {
  const exportBtn = document.getElementById('btn-export-qrcodes');
  const deleteBtn = document.getElementById('btn-bulk-delete');

  if (exportBtn) {
    exportBtn.querySelector('span:last-child').textContent = `匯出 QR CODE (${selectedPropertyIds.size})`;
    exportBtn.disabled = selectedPropertyIds.size === 0;
  }

  if (deleteBtn) {
    deleteBtn.querySelector('span:last-child').textContent = `刪除 (${selectedPropertyIds.size})`;
    deleteBtn.disabled = selectedPropertyIds.size === 0;
  }
}

async function loadProperties() {
  const tableEl = document.getElementById('properties-table');
  const paginationEl = document.getElementById('properties-pagination');

  try {
    const queryParams = {
      page: currentPage,
      limit: currentLimit,
      search: currentSearch,
      category_id: currentCategory,
      custodian_role_id: currentRole,
    };

    if (isMyPropertiesOnly) {
      const user = getUser();
      if (user) {
        queryParams.custodian = user.displayName;
      }
    }

    const data = await propertiesAPI.list(queryParams);

    if (data.data.length === 0) {
      tableEl.innerHTML = `
        <div class="empty-state">
          <span class="material-icons-round">inventory_2</span>
          <div class="empty-state-title">找不到財產</div>
          <div class="empty-state-desc">嘗試調整搜尋條件或新增財產</div>
        </div>
      `;
      paginationEl.innerHTML = '';
      return;
    }

    const canManage = isManager();

    tableEl.innerHTML = `
      <div class="table-wrap mobile-card-table">
        <table>
          <thead>
            <tr>
              ${canManage ? '<th style="width: 40px;"><input type="checkbox" id="check-all" /></th>' : ''}
              <th>編號</th>
              <th>名稱</th>
              <th>分類</th>
              <th>保管人</th>
              <th>職類</th>
              <th>保管日期</th>
              <th>歸還日期</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${data.data.map(a => {
      const isChecked = selectedPropertyIds.has(String(a.id)) ? 'checked' : '';
      const currentUser = getUser();
      const _canEdit = isAdmin() || (isManager() && (currentUser?.assignedRoles || []).includes(a.custodianRoleId));
      const thumbHtml = a.thumbnailUrl ? `<img src="/api/uploads/${a.thumbnailUrl}" alt="thumbnail" style="width: 32px; height: 32px; object-fit: cover; border-radius: 4px; margin-right: 8px; vertical-align: middle;" />` : '';

      return `
                <tr class="${isChecked ? 'selected' : ''}">
                  ${canManage ? `<td data-label="選擇"><input type="checkbox" class="check-property" value="${a.id}" ${isChecked} /></td>` : ''}
                  <td data-label="編號"><code style="font-size:0.8rem;color:var(--primary-light);">${a.propertyCode}</code></td>
                  <td data-label="名稱"><div style="display: flex; align-items: center;">${thumbHtml}<strong>${a.name}</strong></div></td>
                  <td data-label="分類">${a.categoryName || '-'}</td>
                  <td data-label="保管人">
                    ${a.returnDate || !a.custodian ? '-' : `
                      <div style="display:flex;align-items:center;gap:0.5rem;">
                        <div style="width:28px;height:28px;border-radius:var(--radius-pill);background:var(--primary-dark);color:white;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:0.8rem;overflow:hidden;flex-shrink:0;">
                          ${a.custodianAvatarUrl
                            ? `<img src="/api/uploads/${a.custodianAvatarUrl}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;" />`
                            : a.custodian.charAt(0).toUpperCase()}
                        </div>
                        <span>${a.custodian}</span>
                      </div>
                    `}
                  </td>
                  <td data-label="職類">${a.custodianRoleName || '-'}</td>
                  <td data-label="保管日期">${formatDate(a.custodyDate)}</td>
                  <td data-label="歸還日期">
                    ${a.returnDate ? formatDate(a.returnDate) : '-'}
                  </td>
                  <td data-label="操作">
                    <div class="action-btns">
                      <a href="#/properties/${a.id}" class="icon-btn" title="查看詳情">
                        <span class="material-icons-round">visibility</span>
                      </a>
                      ${_canEdit ? `
                        <a href="#/properties/${a.id}/edit" class="icon-btn" title="編輯">
                          <span class="material-icons-round">edit</span>
                        </a>
                        <button class="icon-btn danger" data-delete-id="${a.id}" data-delete-name="${a.name}" title="刪除">
                          <span class="material-icons-round">delete</span>
                        </button>
                      ` : ''}
                    </div>
                  </td>
                </tr>
              `;
    }).join('')}
          </tbody>
        </table>
      </div>
    `;

    // 刪除按鈕事件
    tableEl.querySelectorAll('[data-delete-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.deleteId;
        const name = btn.dataset.deleteName;
        showConfirm({
          title: '刪除財產',
          message: `確定要刪除財產「${name}」嗎？此操作無法復原。`,
          danger: true,
          confirmText: '刪除',
          onConfirm: async () => {
            try {
              await propertiesAPI.delete(id);
              showToast('財產已刪除', 'success');
              selectedPropertyIds.delete(String(id));
              updateExportButton();
              loadProperties();
            } catch (err) {
              showToast(err.message, 'error');
            }
          }
        });
      });
    });

    if (canManage) {
      const checkAll = document.getElementById('check-all');
      const checkProperties = tableEl.querySelectorAll('.check-property');

      const updateRowStyle = (cb) => {
        const tr = cb.closest('tr');
        if (tr) {
          if (cb.checked) tr.classList.add('selected');
          else tr.classList.remove('selected');
        }
      };

      // 更新全選 Checkbox 狀態
      const updateCheckAll = () => {
        const allChecked = Array.from(checkProperties).every(cb => cb.checked);
        const someChecked = Array.from(checkProperties).some(cb => cb.checked);
        checkAll.checked = checkProperties.length > 0 && allChecked;
        checkAll.indeterminate = someChecked && !allChecked;
      };

      // 綁定全選事件
      checkAll.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        checkProperties.forEach(cb => {
          cb.checked = isChecked;
          updateRowStyle(cb);
          if (isChecked) {
            selectedPropertyIds.add(cb.value);
          } else {
            selectedPropertyIds.delete(cb.value);
          }
        });
        updateExportButton();
      });

      // 綁定單選事件
      checkProperties.forEach(cb => {
        cb.addEventListener('change', (e) => {
          updateRowStyle(e.target);
          if (e.target.checked) {
            selectedPropertyIds.add(e.target.value);
          } else {
            selectedPropertyIds.delete(e.target.value);
          }
          updateCheckAll();
          updateExportButton();
        });
      });

      updateCheckAll();
      updateExportButton();
    }

    // 分頁
    const { page, totalPages, total } = data.pagination;
    
    let containerHtml = `<div class="pagination-container" style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-top: 16px;">
      <div class="pagination-limit">
        <select id="limit-select" class="form-input" style="padding: 6px 12px; font-size: 0.85rem; height: auto; border-radius: var(--radius-sm); min-width: 120px;">
          <option value="15" ${currentLimit === 15 ? 'selected' : ''}>15 筆 / 頁</option>
          <option value="30" ${currentLimit === 30 ? 'selected' : ''}>30 筆 / 頁</option>
          <option value="50" ${currentLimit === 50 ? 'selected' : ''}>50 筆 / 頁</option>
          <option value="10000" ${currentLimit > 50 ? 'selected' : ''}>全部顯示</option>
        </select>
      </div>`;

    if (totalPages > 1) {
      let paginationHtml = `<div class="pagination">`;
      paginationHtml += `<button class="pagination-btn" ${page <= 1 ? 'disabled' : ''} data-page="${page - 1}">
        <span class="material-icons-round" style="font-size:1rem;">chevron_left</span>
      </button>`;

      const start = Math.max(1, page - 2);
      const end = Math.min(totalPages, page + 2);

      if (start > 1) {
        paginationHtml += `<button class="pagination-btn" data-page="1">1</button>`;
        if (start > 2) paginationHtml += `<span class="pagination-info">...</span>`;
      }

      for (let i = start; i <= end; i++) {
        paginationHtml += `<button class="pagination-btn ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
      }

      if (end < totalPages) {
        if (end < totalPages - 1) paginationHtml += `<span class="pagination-info">...</span>`;
        paginationHtml += `<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`;
      }

      paginationHtml += `<button class="pagination-btn" ${page >= totalPages ? 'disabled' : ''} data-page="${page + 1}">
        <span class="material-icons-round" style="font-size:1rem;">chevron_right</span>
      </button>`;
      paginationHtml += `<span class="pagination-info">共 ${total} 項</span>`;
      paginationHtml += `</div>`;
      containerHtml += paginationHtml;
    } else {
      containerHtml += `<div class="pagination"><span class="pagination-info">共 ${total} 項</span></div>`;
    }

    containerHtml += `</div>`;
    paginationEl.innerHTML = containerHtml;

    const limitSelect = document.getElementById('limit-select');
    if (limitSelect) {
      limitSelect.addEventListener('change', (e) => {
        currentLimit = parseInt(e.target.value, 10);
        currentPage = 1;
        loadProperties();
      });
    }

    paginationEl.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        currentPage = parseInt(btn.dataset.page);
        loadProperties();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  } catch (err) {
    tableEl.innerHTML = `
      <div class="empty-state">
        <span class="material-icons-round">error</span>
        <div class="empty-state-title">載入失敗</div>
        <div class="empty-state-desc">${err.message}</div>
      </div>
    `;
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('zh-TW');
}
