/**
 * 職類管理頁面
 */
import { rolesAPI } from '../api.js';
import { showToast } from '../components/toast.js';
import { showModal, showConfirm } from '../components/modal.js';
import { renderSidebar, initSidebarEvents } from '../components/sidebar.js';
import { renderNavbar, initNavbarEvents } from '../components/navbar.js';
import { isAdmin } from '../auth.js';

export default async function rolesPage() {
  const app = document.getElementById('app');
  const canManage = isAdmin();

  app.innerHTML = `
    <div class="layout">
      ${renderSidebar()}
      ${renderNavbar('職類管理')}
      <main class="layout-main">
        <div class="page-content">
          <div class="page-header">
            <div>
              <h2 class="page-title">職類管理</h2>
              <p class="page-subtitle">管理所有的財產職類，並在此新增或刪除職類項目。</p>
            </div>
            ${canManage ? `
              <button class="btn btn-primary" id="btn-add-role">
                <span class="material-icons-round">add_circle</span>
                新增職類
              </button>
            ` : ''}
          </div>

          <div id="roles-table">
            <div class="skeleton skeleton-card" style="height:300px;"></div>
          </div>
        </div>
      </main>
    </div>
  `;

  initSidebarEvents();
  initNavbarEvents();

  if (canManage) {
    document.getElementById('btn-add-role').addEventListener('click', () => showRoleForm());
  }

  await loadRoles();
}

async function loadRoles() {
  const tableEl = document.getElementById('roles-table');
  const canManage = isAdmin();

  try {
    const roles = await rolesAPI.list();

    tableEl.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>職類名稱</th>
              <th>職類前綴</th>
              <th>財產數量</th>
              ${canManage ? '<th>操作</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${roles.map(r => `
              <tr>
                <td><strong>${r.name}</strong></td>
                <td><code>${r.prefix}</code></td>
                <td><span class="badge badge-info">${r.assetCount} 項</span></td>
                ${canManage ? `
                  <td>
                    <div class="action-btns">
                      <button class="icon-btn danger" data-delete-id="${r.id}" data-delete-name="${r.name}" data-count="${r.assetCount}" title="刪除">
                        <span class="material-icons-round">delete</span>
                      </button>
                    </div>
                  </td>
                ` : ''}
              </tr>
            `).join('')}
            ${roles.length === 0 ? `
              <tr>
                <td colspan="${canManage ? 4 : 3}" style="text-align: center; color: var(--text-muted); padding: 24px;">
                  尚無職類
                </td>
              </tr>
            ` : ''}
          </tbody>
        </table>
      </div>
    `;

    if (canManage) {
      tableEl.querySelectorAll('[data-delete-id]').forEach(btn => {
        btn.addEventListener('click', () => {
          const count = parseInt(btn.dataset.count);
          if (count > 0) {
            showToast('此職類下仍有財產，無法刪除。', 'warning');
            return;
          }

          showConfirm({
            title: '刪除職類',
            message: `確定要刪除職類「${btn.dataset.deleteName}」嗎？`,
            danger: true,
            confirmText: '刪除',
            onConfirm: async () => {
              try {
                await rolesAPI.delete(btn.dataset.deleteId);
                showToast('職類已刪除', 'success');
                loadRoles();
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

function showRoleForm() {
  const body = document.createElement('div');
  body.innerHTML = 
    '<div class="form-group">' +
      '<label class="form-label">職類名稱 *</label>' +
      '<input type="text" class="form-input" id="modal-role-name" placeholder="例如：護理部、營養科" />' +
    '</div>' +
    '<div class="form-group">' +
      '<label class="form-label">職類前綴 (大寫英文或數字) *</label>' +
      '<input type="text" class="form-input" id="modal-role-prefix" placeholder="例如：NUR, NUT, 001" style="text-transform: uppercase;" />' +
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
  saveBtn.textContent = '建立';

  footer.appendChild(cancelBtn);
  footer.appendChild(saveBtn);

  const { close } = showModal({
    title: '新增職類',
    content: body,
    footer,
  });

  cancelBtn.addEventListener('click', close);

  saveBtn.onclick = async () => {
    const name = document.getElementById('modal-role-name').value.trim();
    let prefix = document.getElementById('modal-role-prefix').value.trim().toUpperCase();

    if (!name) {
      showToast('請輸入職類名稱', 'error');
      return;
    }

    if (!prefix) {
      showToast('請輸入職類前綴', 'error');
      return;
    }

    if (!/^[A-Z0-9]+$/.test(prefix)) {
      showToast('職類前綴只能包含大寫英文與數字', 'error');
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = '建立中...';

    try {
      await rolesAPI.create({ name, prefix });
      showToast('職類已建立', 'success');

      close();
      loadRoles();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = '建立';
    }
  };
}
