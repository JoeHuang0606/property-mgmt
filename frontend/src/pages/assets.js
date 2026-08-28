/**
 * 財產列表頁面
 */
import { assetsAPI, categoriesAPI, rolesAPI } from '../api.js';
import { isManager, isAdmin, getUser } from '../auth.js';
import { showToast } from '../components/toast.js';
import { showConfirm } from '../components/modal.js';
import { renderSidebar, initSidebarEvents } from '../components/sidebar.js';
import { renderNavbar, initNavbarEvents } from '../components/navbar.js';

let currentPage = 1;
let currentSearch = '';
let currentCategory = '';
let currentRole = '';
let selectedAssetIds = new Set();

export default async function assetsPage() {
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
                <a href="#/assets/new" class="btn btn-primary">
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
          </div>

          <div id="assets-table">
            <div class="skeleton skeleton-card" style="height:400px;"></div>
          </div>

          <div id="assets-pagination"></div>
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
      loadAssets();
    }, 300);
  });



  document.getElementById('filter-category').addEventListener('change', (e) => {
    currentCategory = e.target.value;
    currentPage = 1;
    loadAssets();
  });

  document.getElementById('filter-role').addEventListener('change', (e) => {
    currentRole = e.target.value;
    currentPage = 1;
    loadAssets();
  });

  const exportBtn = document.getElementById('btn-export-qrcodes');
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      if (selectedAssetIds.size === 0) return;

      exportBtn.disabled = true;
      const originalText = exportBtn.innerHTML;
      exportBtn.innerHTML = '<span class="material-icons-round spin">sync</span> 匯出中...';

      try {
        await assetsAPI.exportQRCodes(Array.from(selectedAssetIds));
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
      if (selectedAssetIds.size === 0) return;

      showConfirm({
        title: '刪除財產',
        message: `確定要刪除選取的 ${selectedAssetIds.size} 筆財產嗎？此操作無法復原。`,
        danger: true,
        confirmText: '刪除',
        onConfirm: async () => {
          bulkDeleteBtn.disabled = true;
          const originalText = bulkDeleteBtn.innerHTML;
          bulkDeleteBtn.innerHTML = '<span class="material-icons-round spin">sync</span> 刪除中...';

          try {
            const ids = Array.from(selectedAssetIds);
            for (const id of ids) {
              await assetsAPI.delete(id);
            }
            showToast('刪除成功！', 'success');
            selectedAssetIds.clear();
            updateExportButton();
            loadAssets();
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

  await loadAssets();
}

function updateExportButton() {
  const exportBtn = document.getElementById('btn-export-qrcodes');
  const deleteBtn = document.getElementById('btn-bulk-delete');

  if (exportBtn) {
    exportBtn.querySelector('span:last-child').textContent = `匯出 QR CODE (${selectedAssetIds.size})`;
    exportBtn.disabled = selectedAssetIds.size === 0;
  }

  if (deleteBtn) {
    deleteBtn.querySelector('span:last-child').textContent = `刪除 (${selectedAssetIds.size})`;
    deleteBtn.disabled = selectedAssetIds.size === 0;
  }
}

async function loadAssets() {
  const tableEl = document.getElementById('assets-table');
  const paginationEl = document.getElementById('assets-pagination');

  try {
    const data = await assetsAPI.list({
      page: currentPage,
      limit: 15,
      search: currentSearch,
      category_id: currentCategory,
      custodian_role_id: currentRole,
    });

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
      const isChecked = selectedAssetIds.has(String(a.id)) ? 'checked' : '';
      const currentUser = getUser();
      const _canEdit = isAdmin() || (isManager() && (currentUser?.assignedRoles || []).includes(a.custodianRoleId));
      const thumbHtml = a.thumbnailUrl ? `<img src="/api/uploads/${a.thumbnailUrl}" alt="thumbnail" style="width: 32px; height: 32px; object-fit: cover; border-radius: 4px; margin-right: 8px; vertical-align: middle;" />` : '';

      return `
                <tr class="${isChecked ? 'selected' : ''}">
                  ${canManage ? `<td data-label="選擇"><input type="checkbox" class="check-asset" value="${a.id}" ${isChecked} /></td>` : ''}
                  <td data-label="編號"><code style="font-size:0.8rem;color:var(--primary-light);">${a.assetCode}</code></td>
                  <td data-label="名稱"><div style="display: flex; align-items: center;">${thumbHtml}<strong>${a.name}</strong></div></td>
                  <td data-label="分類">${a.categoryName || '-'}</td>
                  <td data-label="保管人">${a.custodian}</td>
                  <td data-label="職類">${a.custodianRoleName || '-'}</td>
                  <td data-label="保管日期">${formatDate(a.custodyDate)}</td>
                  <td data-label="歸還日期">
                    ${a.returnDate ? formatDate(a.returnDate) : '-'}
                  </td>
                  <td data-label="操作">
                    <div class="action-btns">
                      <a href="#/assets/${a.id}" class="icon-btn" title="查看詳情">
                        <span class="material-icons-round">visibility</span>
                      </a>
                      ${_canEdit ? `
                        <a href="#/assets/${a.id}/edit" class="icon-btn" title="編輯">
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
              await assetsAPI.delete(id);
              showToast('財產已刪除', 'success');
              selectedAssetIds.delete(String(id));
              updateExportButton();
              loadAssets();
            } catch (err) {
              showToast(err.message, 'error');
            }
          }
        });
      });
    });

    if (canManage) {
      const checkAll = document.getElementById('check-all');
      const checkAssets = tableEl.querySelectorAll('.check-asset');

      const updateRowStyle = (cb) => {
        const tr = cb.closest('tr');
        if (tr) {
          if (cb.checked) tr.classList.add('selected');
          else tr.classList.remove('selected');
        }
      };

      // 更新全選 Checkbox 狀態
      const updateCheckAll = () => {
        const allChecked = Array.from(checkAssets).every(cb => cb.checked);
        const someChecked = Array.from(checkAssets).some(cb => cb.checked);
        checkAll.checked = checkAssets.length > 0 && allChecked;
        checkAll.indeterminate = someChecked && !allChecked;
      };

      // 綁定全選事件
      checkAll.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        checkAssets.forEach(cb => {
          cb.checked = isChecked;
          updateRowStyle(cb);
          if (isChecked) {
            selectedAssetIds.add(cb.value);
          } else {
            selectedAssetIds.delete(cb.value);
          }
        });
        updateExportButton();
      });

      // 綁定單選事件
      checkAssets.forEach(cb => {
        cb.addEventListener('change', (e) => {
          updateRowStyle(e.target);
          if (e.target.checked) {
            selectedAssetIds.add(e.target.value);
          } else {
            selectedAssetIds.delete(e.target.value);
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

      paginationEl.innerHTML = paginationHtml;

      paginationEl.querySelectorAll('[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
          currentPage = parseInt(btn.dataset.page);
          loadAssets();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      });
    } else {
      paginationEl.innerHTML = '';
    }
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
