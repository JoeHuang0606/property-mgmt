/**
 * 新增/編輯財產表單頁面
 */
import { assetsAPI, categoriesAPI, usersAPI, rolesAPI } from '../api.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';
import { renderSidebar, initSidebarEvents } from '../components/sidebar.js';
import { renderNavbar, initNavbarEvents } from '../components/navbar.js';
import { isManager, isAdmin, getUser } from '../auth.js';
import { navigate } from '../router.js';

export default async function assetFormPage({ id } = {}) {
  const isEdit = !!id && id !== 'new';
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="layout">
      ${renderSidebar()}
      ${renderNavbar(isEdit ? '編輯財產' : '新增財產')}
      <main class="layout-main">
        <div class="page-content">
          <div class="page-header">
            <div>
              <h2 class="page-title">${isEdit ? '編輯財產' : '新增財產'}</h2>
              <p class="page-subtitle">${isEdit ? '修改財產資訊' : '建立新的財產紀錄'}</p>
            </div>
            <a href="#/assets" class="btn btn-ghost">
              <span class="material-icons-round">arrow_back</span>
              返回列表
            </a>
          </div>

          <div class="card" style="max-width:800px;">
            <form id="asset-form">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="name">名稱 *</label>
                  <input type="text" class="form-input" id="name" placeholder="財產名稱" required />
                </div>
                <div class="form-group">
                  <label class="form-label" for="categoryId">分類 *</label>
                  <div style="display:flex; gap:8px;">
                    <select class="form-select" id="categoryId" required>
                      <option value="">選擇分類</option>
                    </select>
                    ${isManager() ? `
                      <button type="button" class="btn btn-ghost" id="btn-quick-add-category" title="新增分類">
                        <span class="material-icons-round">add</span>
                      </button>
                    ` : ''}
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="description">描述</label>
                <textarea class="form-textarea" id="description" placeholder="財產描述（選填）"></textarea>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="custodian">保管人</label>
                  ${getUser()?.username === 'Developer' ? `
                  <select class="form-select" id="custodian">
                    <option value="-">留空</option>
                  </select>
                  ` : `
                  <input type="text" class="form-input" id="custodian" readonly required />
                  `}
                </div>
                <div class="form-group">
                  <label class="form-label" for="custodianRoleId">擁有職類 *</label>
                  <div style="display:flex; gap:8px;">
                    <select class="form-select" id="custodianRoleId" required>
                      <option value="">選擇職類</option>
                    </select>
                  </div>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="custodyDate">保管日期 *</label>
                  <input type="date" class="form-input" id="custodyDate" required />
                </div>
                ${isEdit ? `
                <div class="form-group">
                  <label class="form-label" for="returnDate">歸還日期</label>
                  <input type="date" class="form-input" id="returnDate" />
                </div>
                ` : `
                <input type="hidden" id="returnDate" value="" />
                `}
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="location">存放位置</label>
                  <input type="text" class="form-input" id="location" placeholder="存放地點（選填）" />
                </div>
                <div class="form-group">
                  <label class="form-label">主要照片</label>
                  <div style="display: flex; gap: 8px;">
                    <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('image').removeAttribute('capture'); document.getElementById('image').click();" style="flex:1;">
                      <span class="material-icons-round" style="font-size:1.2rem; margin-right:4px;">photo_library</span> 相簿選擇
                    </button>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('image').setAttribute('capture', 'environment'); document.getElementById('image').click();" style="flex:1;">
                      <span class="material-icons-round" style="font-size:1.2rem; margin-right:4px;">photo_camera</span> 開啟相機
                    </button>
                  </div>
                  <input type="file" class="form-input" id="image" accept="image/*" style="display:none;" />
                  <div id="image-preview-container" style="margin-top:8px; display:none;">
                    <img id="image-preview" style="max-width: 100px; max-height: 100px; border-radius: 4px;" />
                    <span style="font-size: 0.8rem; color: var(--text-muted); margin-left: 8px;">已選擇主要照片與縮圖</span>
                  </div>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group" style="width: 100%;">
                  <label class="form-label">上傳詳情圖片</label>
                  <div style="display: flex; gap: 8px;">
                    <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('detailPhotos').removeAttribute('capture'); document.getElementById('detailPhotos').click();" style="flex:1;">
                      <span class="material-icons-round" style="font-size:1.2rem; margin-right:4px;">photo_library</span> 相簿選擇
                    </button>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('detailPhotos').setAttribute('capture', 'environment'); document.getElementById('detailPhotos').click();" style="flex:1;">
                      <span class="material-icons-round" style="font-size:1.2rem; margin-right:4px;">photo_camera</span> 開啟相機
                    </button>
                  </div>
                  <input type="file" class="form-input" id="detailPhotos" accept="image/*" multiple style="display:none;" onchange="
                    const countSpan = document.getElementById('detailPhotosCount');
                    if(this.files.length > 0) {
                      countSpan.textContent = '已選擇 ' + this.files.length + ' 張照片';
                      countSpan.style.display = 'inline';
                    } else {
                      countSpan.style.display = 'none';
                    }
                  " />
                  <span id="detailPhotosCount" style="font-size: 0.85rem; color: var(--primary); display: none; margin-top: 8px;"></span>
                  <div id="existing-detail-photos" style="margin-top:16px; display:none; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 8px;"></div>
                </div>
              </div>

              <div style="display:flex;gap:12px;margin-top:12px;">
                <button type="submit" class="btn btn-primary btn-lg" id="submit-btn">
                  <span class="material-icons-round">${isEdit ? 'save' : 'add_circle'}</span>
                  ${isEdit ? '儲存變更' : '建立財產'}
                </button>
                <a href="#/assets" class="btn btn-ghost btn-lg">取消</a>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  `;

  initSidebarEvents();
  initNavbarEvents();

  let selectedImageFile = null;
  let croppedThumbnailBlob = null;
  let cropperInstance = null;

  // 處理主要照片選擇與裁切
  const imageInput = document.getElementById('image');
  imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    selectedImageFile = file;

    // 建立裁切 Modal
    const reader = new FileReader();
    reader.onload = (event) => {
      const imgUrl = event.target.result;
      const body = document.createElement('div');
      body.innerHTML = `
        <div style="max-height: 400px; text-align: center;">
          <img id="cropper-image" src="${imgUrl}" style="max-width: 100%; display: block;" />
        </div>
        <p style="margin-top: 12px; font-size: 0.9rem; color: var(--text-muted);">請拖曳調整以選取 1x1 的列表縮圖範圍</p>
      `;

      const footer = document.createElement('div');
      footer.innerHTML = `
        <button class="btn btn-ghost" id="cropper-cancel">取消</button>
        <button class="btn btn-primary" id="cropper-save">確認裁切</button>
      `;

      const { close } = showModal({
        title: '裁切縮圖',
        content: body,
        footer,
      });

      const imageElement = document.getElementById('cropper-image');
      cropperInstance = new Cropper(imageElement, {
        aspectRatio: 1,
        viewMode: 1,
        autoCropArea: 0.8,
      });

      document.getElementById('cropper-cancel').addEventListener('click', () => {
        if (cropperInstance) cropperInstance.destroy();
        imageInput.value = '';
        selectedImageFile = null;
        croppedThumbnailBlob = null;
        close();
      });

      document.getElementById('cropper-save').addEventListener('click', () => {
        const canvas = cropperInstance.getCroppedCanvas({
          width: 200,
          height: 200,
        });
        canvas.toBlob((blob) => {
          croppedThumbnailBlob = blob;
          // 顯示預覽
          const previewContainer = document.getElementById('image-preview-container');
          const previewImg = document.getElementById('image-preview');
          previewImg.src = canvas.toDataURL();
          previewContainer.style.display = 'flex';
          previewContainer.style.alignItems = 'center';
          
          if (cropperInstance) cropperInstance.destroy();
          close();
        }, 'image/jpeg', 0.8);
      });
    };
    reader.readAsDataURL(file);
  });

  // 載入分類
  const loadCategories = async () => {
    try {
      const categories = await categoriesAPI.list();
      const catSelect = document.getElementById('categoryId');
      const currentValue = catSelect.value;
      catSelect.innerHTML = '<option value="">選擇分類</option>';
      categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        catSelect.appendChild(opt);
      });
      if (currentValue) catSelect.value = currentValue;
    } catch (err) {
      // 忽略
    }
  };

  const loadRoles = async () => {
    try {
      const roles = await rolesAPI.list();
      const roleSelect = document.getElementById('custodianRoleId');
      const currentValue = roleSelect.value;
      roleSelect.innerHTML = '<option value="">選擇職類</option>';
      
      const user = getUser();
      const isAdminUser = isAdmin();

      roles.forEach(r => {
        // If not admin and user is manager, only show assigned roles
        if (!isAdminUser && user?.role === 'manager' && !(user.assignedRoles || []).includes(r.id)) {
          return;
        }
        
        const opt = document.createElement('option');
        opt.value = r.id;
        opt.textContent = r.name;
        roleSelect.appendChild(opt);
      });
      if (currentValue) roleSelect.value = currentValue;
    } catch (err) {
      // 忽略
    }
  };

  const loadUsers = async () => {
    const user = getUser();
    if (user?.username === 'Developer') {
      try {
        const usersRes = await usersAPI.list();
        const users = usersRes.data || usersRes; // depending on API format
        const custodianSelect = document.getElementById('custodian');
        const currentValue = custodianSelect.value;
        custodianSelect.innerHTML = '<option value="-">留空</option>';
        (Array.isArray(users) ? users : []).forEach(u => {
          if (u.username === 'Developer') return;
          const opt = document.createElement('option');
          opt.value = u.displayName;
          opt.textContent = u.displayName;
          custodianSelect.appendChild(opt);
        });
        if (currentValue) custodianSelect.value = currentValue;
      } catch (err) {
        // 忽略
      }
    }
  };

  await Promise.all([loadCategories(), loadRoles(), loadUsers()]);
  const currentUser = getUser();
  if (!isEdit && currentUser && currentUser.username !== 'Developer') {
    document.getElementById('custodian').value = currentUser.displayName;
  }

  if (isManager()) {
    const quickAddBtn = document.getElementById('btn-quick-add-category');
    if (quickAddBtn) {
      quickAddBtn.addEventListener('click', () => {
        const body = document.createElement('div');
        body.innerHTML =
          '<div class="form-group">' +
          '<label class="form-label">分類名稱 *</label>' +
          '<input type="text" class="form-input" id="quick-category-name" placeholder="輸入分類名稱" />' +
          '</div>' +
          '<div class="form-group" style="margin-top:16px;">' +
          '<label class="form-label">英文大寫前綴 *</label>' +
          '<input type="text" class="form-input" id="quick-category-prefix" placeholder="例如：IT, FUR" style="text-transform:uppercase;" />' +
          '</div>';

        const footer = document.createElement('div');
        footer.innerHTML = `
          <button class="btn btn-ghost" id="quick-cat-cancel">取消</button>
          <button class="btn btn-primary" id="quick-cat-save">建立</button>
        `;

        const { close } = showModal({
          title: '新增分類',
          content: body,
          footer,
        });

        document.getElementById('quick-cat-cancel').addEventListener('click', close);
        
        const saveBtn = document.getElementById('quick-cat-save');
        saveBtn.addEventListener('click', async () => {
          const name = document.getElementById('quick-category-name').value.trim();
          const prefix = document.getElementById('quick-category-prefix').value.trim().toUpperCase();
          if (!name || !prefix) return showToast('請填寫分類名稱與前綴', 'warning');

          try {
            saveBtn.disabled = true;
            saveBtn.textContent = '處理中...';
            const newCat = await categoriesAPI.create({ name, prefix });
            showToast('分類已建立', 'success');
            await loadCategories();
            document.getElementById('categoryId').value = newCat.id;
            close();
          } catch (err) {
            showToast(err.message, 'error');
            saveBtn.disabled = false;
            saveBtn.textContent = '建立';
          }
        });
      });
    }

    const quickAddRoleBtn = document.getElementById('btn-quick-add-role');
    if (quickAddRoleBtn && isAdmin()) {
      quickAddRoleBtn.addEventListener('click', () => {
        const body = document.createElement('div');
        body.innerHTML =
          '<div class="form-group">' +
          '<label class="form-label">職類名稱 *</label>' +
          '<input type="text" class="form-input" id="quick-role-name" placeholder="輸入職類名稱（如：教師、學生）" />' +
          '</div>' +
          '<div class="form-group" style="margin-top:16px;">' +
          '<label class="form-label">英文大寫前綴 *</label>' +
          '<input type="text" class="form-input" id="quick-role-prefix" placeholder="例如：TEA, STU" style="text-transform:uppercase;" />' +
          '</div>';

        const footer = document.createElement('div');
        footer.innerHTML = `
          <button class="btn btn-ghost" id="quick-role-cancel">取消</button>
          <button class="btn btn-primary" id="quick-role-save">建立</button>
        `;

        const { close } = showModal({
          title: '新增職類',
          content: body,
          footer,
        });

        document.getElementById('quick-role-cancel').addEventListener('click', close);
        
        const saveBtn = document.getElementById('quick-role-save');
        saveBtn.addEventListener('click', async () => {
          const name = document.getElementById('quick-role-name').value.trim();
          const prefix = document.getElementById('quick-role-prefix').value.trim().toUpperCase();
          if (!name || !prefix) return showToast('請填寫職類名稱與前綴', 'warning');
          
          try {
            saveBtn.disabled = true;
            saveBtn.textContent = '處理中...';
            const newRole = await rolesAPI.create({ name, prefix });
            showToast('職類已建立', 'success');
            await loadRoles();
            document.getElementById('custodianRoleId').value = newRole.id;
            close();
          } catch (err) {
            showToast(err.message, 'error');
            saveBtn.disabled = false;
            saveBtn.textContent = '建立';
          }
        });
      });
    }
  }

  // 若為編輯模式，載入現有資料
  if (isEdit) {
    try {
      const asset = await assetsAPI.get(id);
      document.getElementById('name').value = asset.name || '';
      document.getElementById('description').value = asset.description || '';
      document.getElementById('custodian').value = asset.custodian || '';
      if (asset.custodianRoleId) document.getElementById('custodianRoleId').value = asset.custodianRoleId;
      document.getElementById('custodyDate').value = asset.custodyDate ? asset.custodyDate.slice(0, 10) : '';
      document.getElementById('returnDate').value = asset.returnDate ? asset.returnDate.slice(0, 10) : '';
      document.getElementById('location').value = asset.location || '';
      if (asset.categoryId) document.getElementById('categoryId').value = asset.categoryId;
      if (asset.custodian) document.getElementById('custodian').value = asset.custodian;
      
      if (asset.thumbnailUrl) {
        const previewContainer = document.getElementById('image-preview-container');
        const previewImg = document.getElementById('image-preview');
        previewImg.src = `/api/uploads/${asset.thumbnailUrl}`;
        previewContainer.style.display = 'flex';
        previewContainer.style.alignItems = 'center';
      }

      if (asset.detailPhotos && asset.detailPhotos.length > 0) {
        const detailPhotosContainer = document.getElementById('existing-detail-photos');
        detailPhotosContainer.style.display = 'grid';
        detailPhotosContainer.innerHTML = asset.detailPhotos.map(p => `
          <div style="position: relative; aspect-ratio: 1; border-radius: 8px; overflow: hidden; background: var(--bg-surface); border: 1px solid var(--border-glass);">
            <img src="/api/uploads/${p.url}" alt="Detail Photo" style="width: 100%; height: 100%; object-fit: cover;" />
            <button type="button" class="icon-btn danger btn-delete-photo" data-photo-id="${p.id}" style="position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.5); color: #fff; width: 28px; height: 28px; border-radius: 14px; display: flex; align-items: center; justify-content: center; padding: 0;">
              <span class="material-icons-round" style="font-size: 16px;">delete</span>
            </button>
          </div>
        `).join('');

        // Attach event listeners for delete
        detailPhotosContainer.querySelectorAll('.btn-delete-photo').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const photoId = e.currentTarget.dataset.photoId;
            showConfirm({
              title: '刪除圖片',
              message: '確定要刪除這張照片嗎？',
              danger: true,
              confirmText: '刪除',
              onConfirm: async () => {
                try {
                  await assetsAPI.deleteDetailPhoto(id, photoId);
                  showToast('照片已刪除', 'success');
                  e.currentTarget.parentElement.remove();
                  if (detailPhotosContainer.children.length === 0) {
                    detailPhotosContainer.style.display = 'none';
                  }
                } catch (err) {
                  showToast(err.message, 'error');
                }
              }
            });
          });
        });
      }

    } catch (err) {
      showToast('載入財產資料失敗: ' + err.message, 'error');
      return;
    }
  } else {
    // 預設保管日期為今天
    document.getElementById('custodyDate').value = new Date().toISOString().slice(0, 10);
  }

  // 表單提交
  const form = document.getElementById('asset-form');
  const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const description = document.getElementById('description').value.trim();
    const categoryId = document.getElementById('categoryId').value || null;
    let custodian = document.getElementById('custodian').value.trim();
    const custodianRoleId = document.getElementById('custodianRoleId').value || null;
    const custodyDate = document.getElementById('custodyDate').value;
    const returnDate = document.getElementById('returnDate').value || null;
    const location = document.getElementById('location').value.trim();
    const isDeveloper = getUser()?.username === 'Developer';

    if (!name || (!isDeveloper && !custodian) || !custodianRoleId || !custodyDate) {
      showToast('請填寫必填欄位', 'error');
      return;
    }

    if (isDeveloper && !custodian) {
      custodian = '-';
    }
    
    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    if (categoryId) formData.append('categoryId', categoryId);
    formData.append('custodian', custodian);
    if (custodianRoleId) formData.append('custodianRoleId', custodianRoleId);
    formData.append('custodyDate', custodyDate);
    if (returnDate) formData.append('returnDate', returnDate);
    formData.append('location', location);
    
    if (selectedImageFile) {
      formData.append('mainPhoto', selectedImageFile);
    }
    if (croppedThumbnailBlob) {
      formData.append('thumbnailPhoto', croppedThumbnailBlob, 'thumbnail.jpg');
    }

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="material-icons-round">hourglass_empty</span> 處理中...';

      if (isEdit) {
        await assetsAPI.update(id, formData);
        
        // upload detail photos if selected
        const detailPhotosInput = document.getElementById('detailPhotos');
        if (detailPhotosInput && detailPhotosInput.files.length > 0) {
          const detailFormData = new FormData();
          for (let i = 0; i < detailPhotosInput.files.length; i++) {
            detailFormData.append('detailPhotos', detailPhotosInput.files[i]);
          }
          await assetsAPI.uploadDetailPhotos(id, detailFormData);
        }
        
        showToast('財產已更新', 'success');
        navigate(`/assets/${id}`);
      } else {
        const result = await assetsAPI.create(formData);
        
        // upload detail photos if selected
        const detailPhotosInput = document.getElementById('detailPhotos');
        if (detailPhotosInput && detailPhotosInput.files.length > 0) {
          const detailFormData = new FormData();
          for (let i = 0; i < detailPhotosInput.files.length; i++) {
            detailFormData.append('detailPhotos', detailPhotosInput.files[i]);
          }
          await assetsAPI.uploadDetailPhotos(result.id, detailFormData);
        }
        
        showToast('財產已建立', 'success');
        navigate(`/assets/${result.id}`);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span class="material-icons-round">' + (isEdit ? 'save' : 'add_circle') + '</span> ' + (isEdit ? '儲存變更' : '建立財產');
    }
  });
}
