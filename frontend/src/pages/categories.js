/**
 * 分類管理頁面
 */
import { categoriesAPI } from '../api.js';
import { showToast } from '../components/toast.js';
import { showModal, showConfirm } from '../components/modal.js';
import { renderSidebar, initSidebarEvents } from '../components/sidebar.js';
import { renderNavbar, initNavbarEvents } from '../components/navbar.js';
import { isAdmin, isManager } from '../auth.js';

export default async function categoriesPage() {
  const app = document.getElementById('app');
  const canManage = isManager();
  const canDelete = isAdmin();

  app.innerHTML = `
    <div class="layout">
      ${renderSidebar()}
      ${renderNavbar('分類管理')}
      <main class="layout-main">
        <div class="page-content">
          <div class="page-header">
            <div>
              <h2 class="page-title">分類管理</h2>
              <p class="page-subtitle">管理財產分類</p>
            </div>
            ${canManage ? `
              <button class="btn btn-primary" id="btn-add-category">
                <span class="material-icons-round">add_circle</span>
                新增分類
              </button>
            ` : ''}
          </div>

          <div id="categories-table">
            <div class="skeleton skeleton-card" style="height:300px;"></div>
          </div>
        </div>
      </main>
    </div>
  `;

  initSidebarEvents();
  initNavbarEvents();

  if (canManage) {
    document.getElementById('btn-add-category').addEventListener('click', () => showCategoryForm());
  }

  await loadCategories();
}

async function loadCategories() {
  const tableEl = document.getElementById('categories-table');
  const canDelete = isAdmin();
  const canManage = isManager();

  try {
    const categories = await categoriesAPI.list();

    tableEl.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>分類名稱</th>
              <th>英文前綴</th>
              <th>財產數量</th>
              ${canManage ? '<th>操作</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${categories.map(c => `
              <tr>
                <td data-label="分類名稱"><strong>${c.name}</strong></td>
                <td data-label="英文前綴"><code>${c.prefix}</code></td>
                <td data-label="財產數量"><span class="badge badge-info">${c.assetCount} 項</span></td>
                ${canManage ? `
                  <td data-label="操作">
                    <div class="action-btns">
                      <button class="icon-btn edit-btn" data-edit-id="${c.id}" data-edit-name="${c.name}" data-edit-prefix="${c.prefix}" title="編輯">
                        <span class="material-icons-round">edit</span>
                      </button>
                      ${canDelete ? `
                      <button class="icon-btn danger" data-delete-id="${c.id}" data-delete-name="${c.name}" data-count="${c.assetCount}" title="刪除">
                        <span class="material-icons-round">delete</span>
                      </button>
                      ` : ''}
                    </div>
                  </td>
                ` : ''}
              </tr>
            `).join('')}
            ${categories.length === 0 ? `
              <tr>
                <td colspan="${canManage ? 4 : 3}" style="text-align: center; color: var(--text-muted); padding: 24px;">
                  尚無分類
                </td>
              </tr>
            ` : ''}
          </tbody>
        </table>
      </div>
    `;

    if (canManage) {
      tableEl.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          showCategoryForm({
            id: btn.dataset.editId,
            name: btn.dataset.editName,
            prefix: btn.dataset.editPrefix
          });
        });
      });
    }

    if (canDelete) {
      tableEl.querySelectorAll('[data-delete-id]').forEach(btn => {
        btn.addEventListener('click', () => {
          const count = parseInt(btn.dataset.count);
          if (count > 0) {
            showToast('此分類下仍有財產，無法刪除。', 'warning');
            return;
          }

          showConfirm({
            title: '刪除分類',
            message: `確定要刪除分類「${btn.dataset.deleteName}」嗎？`,
            danger: true,
            confirmText: '刪除',
            onConfirm: async () => {
              try {
                await categoriesAPI.delete(btn.dataset.deleteId);
                showToast('分類已刪除', 'success');
                loadCategories();
              } catch (err) {
                showToast(err.message, 'error');
              }
            },
          });
        });
      });
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

function showCategoryForm(category = null) {
  const isEdit = !!category;
  
  const body = document.createElement('div');
  body.innerHTML = 
    '<div class="form-group">' +
      '<label class="form-label">分類名稱 *</label>' +
      `<input type="text" class="form-input" id="modal-category-name" placeholder="輸入分類名稱" value="${isEdit ? category.name : ''}" />` +
    '</div>' +
    '<div class="form-group" style="margin-top:16px;">' +
      '<label class="form-label">英文大寫前綴 *</label>' +
      `<input type="text" class="form-input" id="modal-category-prefix" placeholder="例如：IT, FUR" style="text-transform:uppercase;" value="${isEdit ? category.prefix : ''}" />` +
    '</div>';

  const footer = document.createElement('div');
  footer.style.display = 'flex';
  footer.style.gap = '10px';
  footer.style.justifyContent = 'flex-end';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-ghost';
  cancelBtn.textContent = '取消';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-primary';
  saveBtn.textContent = isEdit ? '儲存' : '建立';

  footer.appendChild(cancelBtn);
  footer.appendChild(saveBtn);

  const { close } = showModal({
    title: isEdit ? '編輯分類' : '新增分類',
    content: body,
    footer,
  });

  cancelBtn.addEventListener('click', close);

  saveBtn.onclick = async () => {
    const name = document.getElementById('modal-category-name').value.trim();
    const prefix = document.getElementById('modal-category-prefix').value.trim().toUpperCase();

    if (!name) {
      showToast('請輸入分類名稱', 'error');
      return;
    }
    if (!prefix || !/^[A-Z]+$/.test(prefix)) {
      showToast('請輸入有效的純英文大寫前綴', 'error');
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = isEdit ? '儲存中...' : '建立中...';

    try {
      if (isEdit) {
        await categoriesAPI.update(category.id, { name, prefix });
        showToast('分類已更新', 'success');
      } else {
        await categoriesAPI.create({ name, prefix });
        showToast('分類已建立', 'success');
      }

      close();
      loadCategories();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = isEdit ? '儲存' : '建立';
    }
  };
}
