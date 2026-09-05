/**
 * 帳號管理頁面（僅 admin）
 */
import { usersAPI, rolesAPI } from '../api.js';
import { showToast } from '../components/toast.js';
import { showModal, showConfirm } from '../components/modal.js';
import { renderSidebar, initSidebarEvents } from '../components/sidebar.js';
import { renderNavbar, initNavbarEvents } from '../components/navbar.js';
import { getUser, isAdmin } from '../auth.js';

export default async function usersPage() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="layout">
      ${renderSidebar()}
      ${renderNavbar('帳號管理')}
      <main class="layout-main">
        <div class="page-content">
          <div class="page-header">
            <div>
              <h2 class="page-title">帳號管理</h2>
              <p class="page-subtitle">管理系統使用者帳號</p>
            </div>
            <button class="btn btn-primary" id="btn-add-user">
              <span class="material-icons-round">person_add</span>
              新增帳號
            </button>
          </div>

          <div id="users-table">
            <div class="skeleton skeleton-card" style="height:300px;"></div>
          </div>
        </div>
      </main>
    </div>
  `;

  initSidebarEvents();
  initNavbarEvents();

  document.getElementById('btn-add-user').addEventListener('click', () => showUserForm());

  await loadUsers();
}

async function loadUsers() {
  const tableEl = document.getElementById('users-table');
  const currentUser = getUser();
  const currentUserIsAdmin = isAdmin();

  try {
    const users = await usersAPI.list();

    const roleText = { admin: '管理員', manager: '職類管理員', user: '使用者' };

    tableEl.innerHTML = `
      <div class="table-wrap mobile-card-table">
        <table>
          <thead>
            <tr>
              <th>帳號</th>
              <th>顯示名稱</th>
              <th>角色</th>
              <th>建立時間</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td data-label="帳號"><code style="font-size:0.85rem;">${u.username}</code></td>
                <td data-label="顯示名稱">
                  <div style="display:flex;align-items:center;gap:0.5rem;">
                    <div style="width:32px;height:32px;border-radius:var(--radius-pill);background:var(--primary-dark);color:white;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:0.9rem;overflow:hidden;flex-shrink:0;">
                      ${u.avatarUrl
                        ? `<img src="/api/uploads/${u.avatarUrl}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;" />`
                        : (u.displayName ? u.displayName.charAt(0).toUpperCase() : '?')}
                    </div>
                    <strong>${u.displayName}</strong>
                  </div>
                </td>
                <td data-label="角色"><span class="badge badge-${u.role}">${roleText[u.role] || u.role}</span></td>
                <td data-label="建立時間" style="color:var(--text-muted);font-size:0.85rem;">${new Date(u.createdAt).toLocaleString('zh-TW')}</td>
                <td data-label="操作">
                  <div class="action-btns">
                    ${(u.role !== 'admin' || currentUserIsAdmin) ? `
                    <button class="icon-btn" data-edit-id="${u.id}" data-edit-username="${u.username}" data-edit-display="${u.displayName}" data-edit-role="${u.role}" data-edit-assigned-roles='${JSON.stringify(u.assignedRoles || [])}' title="編輯">
                      <span class="material-icons-round">edit</span>
                    </button>
                    ` : ''}
                    ${(u.role === 'manager' && (currentUserIsAdmin || u.role !== 'admin')) ? `
                      <button class="icon-btn" data-assign-id="${u.id}" data-assign-username="${u.username}" data-assign-roles='${JSON.stringify(u.assignedRoles || [])}' title="分配職類">
                        <span class="material-icons-round">assignment_ind</span>
                      </button>
                    ` : ''}
                    ${(u.role !== 'admin' || currentUserIsAdmin) && u.id !== currentUser?.id ? `
                      <button class="icon-btn danger" data-delete-id="${u.id}" data-delete-name="${u.displayName}" title="刪除">
                        <span class="material-icons-round">delete</span>
                      </button>
                    ` : ''}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    // 編輯按鈕
    tableEl.querySelectorAll('[data-edit-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        showUserForm({
          id: btn.dataset.editId,
          username: btn.dataset.editUsername,
          displayName: btn.dataset.editDisplay,
          role: btn.dataset.editRole,
          assignedRoles: JSON.parse(btn.dataset.editAssignedRoles || '[]')
        });
      });
    });

    // 分配職類按鈕
    tableEl.querySelectorAll('[data-assign-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        showRoleAssignForm({
          id: btn.dataset.assignId,
          username: btn.dataset.assignUsername,
          assignedRoles: JSON.parse(btn.dataset.assignRoles || '[]'),
        });
      });
    });

    // 刪除按鈕
    tableEl.querySelectorAll('[data-delete-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        showConfirm({
          title: '刪除帳號',
          message: `確定要刪除「${btn.dataset.deleteName}」的帳號嗎？`,
          danger: true,
          confirmText: '刪除',
          onConfirm: async () => {
            try {
              await usersAPI.delete(btn.dataset.deleteId);
              showToast('帳號已刪除', 'success');
              loadUsers();
            } catch (err) {
              showToast(err.message, 'error');
            }
          },
        });
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

async function showUserForm(user = null) {
  const isEdit = !!user;
  const currentUser = getUser();
  const isEditingSelf = isEdit && parseInt(user?.id, 10) === parseInt(currentUser?.id, 10);
  const isEditingDeveloper = isEdit && user?.username === 'Developer';

  let users = [];
  let allRoles = [];
  try {
    users = await usersAPI.list();
    
    // 若為 manager，更新 currentUser 最新的 assignedRoles 以免 local storage 資料過時
    if (currentUser?.role === 'manager') {
      const myself = users.find(u => parseInt(u.id, 10) === parseInt(currentUser.id, 10));
      if (myself && Array.isArray(myself.assignedRoles)) {
        currentUser.assignedRoles = myself.assignedRoles;
      }
    }

    allRoles = await rolesAPI.list();
    if (currentUser?.role === 'manager') {
      const myRoles = Array.isArray(currentUser.assignedRoles) ? currentUser.assignedRoles : [];
      allRoles = allRoles.filter(r => myRoles.includes(r.id));
    }
  } catch (err) {
    showToast('無法取得職類列表', 'error');
    return;
  }

  const assignedRolesSet = new Set(user?.assignedRoles || []);

  const body = document.createElement('div');
  body.innerHTML = `
    ${!isEdit ? `
      <div class="form-group">
        <label class="form-label">帳號 *</label>
        <input type="text" class="form-input" id="modal-username" placeholder="輸入帳號" />
      </div>
    ` : ''}
    <div class="form-group">
      <label class="form-label">顯示名稱 *</label>
      <input type="text" class="form-input" id="modal-display" placeholder="輸入顯示名稱" value="${user?.displayName || ''}" />
    </div>
    <div class="form-group">
      <label class="form-label">${isEdit ? '新密碼（留空不變更）' : '密碼 *'}</label>
      <input type="password" class="form-input" id="modal-password" placeholder="${isEdit ? '留空不變更' : '輸入密碼（至少 6 個字元）'}" />
    </div>
    <div class="form-group">
      <label class="form-label">角色</label>
      <select class="form-select" id="modal-role" ${isEditingSelf || isEditingDeveloper ? 'disabled' : ''}>
        <option value="user" ${user?.role === 'user' ? 'selected' : ''}>使用者</option>
        <option value="manager" ${user?.role === 'manager' ? 'selected' : ''}>職類管理員</option>
        ${isAdmin() ? `<option value="admin" ${user?.role === 'admin' ? 'selected' : ''}>管理員</option>` : ''}
      </select>
    </div>
    <div class="form-group" id="modal-role-selection" style="display: ${user?.role === 'manager' ? 'block' : 'none'}; border-top: 1px solid var(--border-glass); padding-top: 16px; margin-top: 16px;">
      <label class="form-label">管理職類 (至少選擇一項) *</label>
      ${isEditingSelf ? '<p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 8px;">您無法修改自己的職類權限。</p>' : ''}
      <div style="display: flex; flex-direction: column; gap: 8px; max-height: 200px; overflow-y: auto; padding: 8px; border: 1px solid var(--border-glass); border-radius: var(--radius-sm); background: rgba(0,0,0,0.2);">
        ${allRoles.length === 0 ? '<span style="color:var(--text-muted);">尚無職類資料</span>' : 
          allRoles.map(r => `
            <label style="display: flex; align-items: center; gap: 8px; cursor: ${isEditingSelf ? 'not-allowed' : 'pointer'}; opacity: ${isEditingSelf ? '0.5' : '1'};">
              <input type="checkbox" name="managed_roles" value="${r.id}" ${assignedRolesSet.has(r.id) ? 'checked' : ''} ${isEditingSelf ? 'disabled' : ''} />
              <span>${r.name} (${r.prefix})</span>
            </label>
          `).join('')
        }
      </div>
    </div>
  `;

  // 監聽角色切換
  const roleSelect = body.querySelector('#modal-role');
  const roleSelectionDiv = body.querySelector('#modal-role-selection');
  roleSelect.addEventListener('change', (e) => {
    if (e.target.value === 'manager') {
      roleSelectionDiv.style.display = 'block';
    } else {
      roleSelectionDiv.style.display = 'none';
    }
  });

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
    title: isEdit ? `編輯帳號：${user.username}` : '新增帳號',
    content: body,
    footer,
  });

  cancelBtn.addEventListener('click', close);

  saveBtn.addEventListener('click', async () => {
    const displayName = body.querySelector('#modal-display').value.trim();
    const password = body.querySelector('#modal-password').value;
    const role = body.querySelector('#modal-role').value;
    
    let roleIds = undefined;
    if (role === 'manager' && !isEditingSelf) {
      const checkboxes = body.querySelectorAll('input[name="managed_roles"]:checked');
      roleIds = Array.from(checkboxes).map(cb => parseInt(cb.value, 10));
      if (roleIds.length === 0) {
        showToast('職類管理員必須至少選擇一個職類', 'warning');
        return;
      }
    }

    if (!displayName) {
      showToast('請填寫顯示名稱', 'warning');
      return;
    }

    try {
      saveBtn.disabled = true;
      saveBtn.textContent = '處理中...';

      if (isEdit) {
        const updateData = { displayName, role };
        if (roleIds !== undefined) updateData.roleIds = roleIds;
        if (password) updateData.password = password;
        await usersAPI.update(user.id, updateData);
        showToast('帳號已更新', 'success');
      } else {
        const username = body.querySelector('#modal-username').value.trim();
        if (!username || !password) {
          showToast('請填寫所有必填欄位', 'warning');
          saveBtn.disabled = false;
          saveBtn.textContent = '建立';
          return;
        }
        await usersAPI.create({ username, password, displayName, role, roleIds });
        showToast('帳號已建立', 'success');
      }

      close();
      loadUsers();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = isEdit ? '儲存' : '建立';
    }
  });
}

async function showRoleAssignForm(user) {
  try {
    const currentUser = getUser();
    const isEditingSelf = parseInt(user?.id, 10) === parseInt(currentUser?.id, 10);
    
    // 更新最新 currentUser.assignedRoles
    const users = await usersAPI.list();
    if (currentUser?.role === 'manager') {
      const myself = users.find(u => parseInt(u.id, 10) === parseInt(currentUser.id, 10));
      if (myself && Array.isArray(myself.assignedRoles)) {
        currentUser.assignedRoles = myself.assignedRoles;
      }
    }

    let roles = await rolesAPI.list();
    if (currentUser?.role === 'manager') {
      const myRoles = Array.isArray(currentUser.assignedRoles) ? currentUser.assignedRoles : [];
      roles = roles.filter(r => myRoles.includes(r.id));
    }
    
    const body = document.createElement('div');
    if (roles.length === 0) {
      body.innerHTML = '<p>系統中目前沒有任何職類，請先到「職類管理」新增職類。</p>';
    } else {
      const checkboxesHtml = roles.map(r => {
        const isChecked = user.assignedRoles.includes(r.id);
        return `
          <label style="display:flex; align-items:center; gap:8px; padding:8px 0; cursor:${isEditingSelf ? 'not-allowed' : 'pointer'}; opacity: ${isEditingSelf ? '0.5' : '1'};">
            <input type="checkbox" name="assign-roles" value="${r.id}" ${isChecked ? 'checked' : ''} style="width:18px;height:18px;" ${isEditingSelf ? 'disabled' : ''}>
            <span>${r.name}</span>
          </label>
        `;
      }).join('');
      
      body.innerHTML = `
        <p style="margin-bottom: 12px;">請勾選要分配給「<strong>${user.username}</strong>」的職類：</p>
        ${isEditingSelf ? '<p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 8px;">您無法修改自己的職類權限。</p>' : ''}
        <div style="max-height:300px; overflow-y:auto; border:1px solid var(--border-color); padding:10px; border-radius:6px;">
          ${checkboxesHtml}
        </div>
      `;
    }

    const footer = document.createElement('div');
    footer.style.display = 'flex';
    footer.style.gap = '10px';
    footer.style.justifyContent = 'flex-end';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-ghost';
    cancelBtn.textContent = '取消';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary';
    saveBtn.textContent = '儲存分配';
    if (roles.length === 0) saveBtn.style.display = 'none';

    footer.appendChild(cancelBtn);
    footer.appendChild(saveBtn);

    const { close } = showModal({
      title: `分配職類：${user.username}`,
      content: body,
      footer,
    });

    cancelBtn.addEventListener('click', close);

    saveBtn.addEventListener('click', async () => {
      if (isEditingSelf) {
        showToast('無法修改自己的職類權限', 'warning');
        return;
      }

      const checkedBoxes = Array.from(body.querySelectorAll('input[name="assign-roles"]:checked'));
      const roleIds = checkedBoxes.map(cb => parseInt(cb.value, 10));

      try {
        saveBtn.disabled = true;
        saveBtn.textContent = '儲存中...';

        await usersAPI.updateRoles(user.id, roleIds);
        showToast('職類分配已更新', 'success');

        close();
        loadUsers();
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = '儲存分配';
      }
    });
  } catch (err) {
    showToast('無法載入職類列表', 'error');
  }
}
