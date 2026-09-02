/**
 * 財產詳情頁面
 */
import { assetsAPI } from '../api.js';
import { isManager, isAdmin, getUser } from '../auth.js';
import { showToast } from '../components/toast.js';
import { showConfirm, showModal } from '../components/modal.js';
import { renderSidebar, initSidebarEvents } from '../components/sidebar.js';
import { renderNavbar, initNavbarEvents } from '../components/navbar.js';
import { navigate } from '../router.js';

export default async function assetDetailPage({ id } = {}) {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="layout">
      ${renderSidebar()}
      ${renderNavbar('財產詳情')}
      <main class="layout-main">
        <div class="page-content">
          <div id="asset-detail-content">
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-card" style="height:300px;"></div>
          </div>
        </div>
      </main>
    </div>
  `;

  initSidebarEvents();
  initNavbarEvents();

  try {
    const asset = await assetsAPI.get(id);
    const history = await assetsAPI.getHistory(id).catch(() => []);
    renderDetail(asset, history);
  } catch (err) {
    document.getElementById('asset-detail-content').innerHTML = `
      <div class="empty-state">
        <span class="material-icons-round">error</span>
        <div class="empty-state-title">找不到財產</div>
        <div class="empty-state-desc">${err.message}</div>
        <a href="#/assets" class="btn btn-ghost" style="margin-top:16px;">返回列表</a>
      </div>
    `;
  }
}

function renderDetail(a, history = []) {
  const container = document.getElementById('asset-detail-content');
  const user = getUser();
  const canManage = isAdmin() || (isManager() && (user?.assignedRoles || []).includes(a.custodianRoleId));
  const canTakeCustody = !!a.returnDate || !a.custodian;
  const canReturn = !a.returnDate && a.custodian === user?.displayName;

  let historyHtml = '';
  if (history.length > 0) {
    historyHtml = `
      <div class="table-wrap" style="margin-top: 24px;">
        <div style="padding: 20px 24px; border-bottom: 1px solid var(--border-glass);">
          <h3 class="card-title" style="margin: 0; display:flex; align-items:center; gap:8px;">
            <span class="material-icons-round" style="color:var(--primary-light);">history</span>
            保管歷史紀錄
          </h3>
        </div>
        <div class="mobile-card-table" style="max-height: 400px; overflow-y: auto;">
          <table>
            <thead>
              <tr>
                <th>保管人</th>
                <th>領取日期</th>
                <th>歸還日期</th>
              </tr>
            </thead>
            <tbody>
              ${history.map(record => `
                <tr>
                  <td data-label="保管人" style="font-weight: 500;">${record.custodian}</td>
                  <td data-label="領取日期">${new Date(record.takeDate).toLocaleDateString('zh-TW')}</td>
                  <td data-label="歸還日期">${record.returnDate ? new Date(record.returnDate).toLocaleDateString('zh-TW') : '<span class="badge badge-success">保管中</span>'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } else {
    historyHtml = `
      <div class="card">
        <h3 class="card-title" style="margin-bottom: 20px; display:flex; align-items:center; gap:8px;">
          <span class="material-icons-round" style="color:var(--primary-light);">history</span>
          保管歷史紀錄
        </h3>
        <div class="empty-state" style="padding: 32px 0;">
          <span class="material-icons-round">inbox</span>
          <div class="empty-state-desc">尚無歷史紀錄</div>
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h2 class="page-title">${a.name}</h2>
        <p class="page-subtitle">
          <code style="color:var(--primary-light);margin-right:8px;">${a.assetCode}</code>
        </p>
      </div>
      <div style="display:flex;gap:10px;">
        <a href="#/assets" class="btn btn-ghost">
          <span class="material-icons-round">arrow_back</span>
          返回列表
        </a>
        ${canManage ? `
          <a href="#/assets/${a.id}/edit" class="btn btn-primary">
            <span class="material-icons-round">edit</span>
            編輯
          </a>
          <button class="btn btn-danger" id="btn-delete-asset">
            <span class="material-icons-round">delete</span>
            刪除
          </button>
        ` : ''}
      </div>
    </div>

    <div class="asset-detail-grid" style="grid-template-columns: 2.5fr 1fr;">
      <!-- 第一列：財產資訊與 QR Code -->
      <div class="card">
        <h3 class="card-title" style="margin-bottom:20px;">財產資訊</h3>
        <div class="info-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
          <div class="detail-field">
            <div class="detail-label">名稱</div>
            <div class="detail-value">${a.name}</div>
          </div>
          <div class="detail-field">
            <div class="detail-label">編號</div>
            <div class="detail-value"><code style="color:var(--primary-light);">${a.assetCode}</code></div>
          </div>
          <div class="detail-field">
            <div class="detail-label">分類</div>
            <div class="detail-value">${a.categoryName || '-'}</div>
          </div>
          <div class="detail-field">
            <div class="detail-label">存放位置</div>
            <div class="detail-value">${a.location || '-'}</div>
          </div>
          <div class="detail-field">
            <div class="detail-label">保管人</div>
            <div class="detail-value" style="font-weight:600;">${a.custodian}</div>
          </div>
          <div class="detail-field">
            <div class="detail-label">擁有職類</div>
            <div class="detail-value">${a.custodianRoleName || '-'}</div>
          </div>
          <div class="detail-field">
            <div class="detail-label">保管日期</div>
            <div class="detail-value">${formatDate(a.custodyDate)}</div>
          </div>
          <div class="detail-field">
            <div class="detail-label">歸還日期</div>
            <div class="detail-value">${a.returnDate ? formatDate(a.returnDate) : '未設定'}</div>
          </div>
          <div class="detail-field">
            <div class="detail-label">描述</div>
            <div class="detail-value">${a.description || '無描述'}</div>
          </div>
          <div class="detail-field"></div>
          <div class="detail-field">
            <div class="detail-label">建立者</div>
            <div class="detail-value">${a.creatorName || '-'}</div>
          </div>
          <div class="detail-field">
            <div class="detail-label">建立時間</div>
            <div class="detail-value">${formatDateTime(a.createdAt)}</div>
          </div>
        </div>
      </div>
      
      <div class="card">
        <h3 class="card-title" style="margin-bottom:16px;text-align:center;">QR Code</h3>
        <div class="qr-display">
          ${a.qrCode ? `
            <img src="${a.qrCode}" alt="QR Code: ${a.assetCode}" id="qr-img" style="background: white; padding: 12px; border-radius: 12px; width: 100%; box-sizing: border-box; margin-bottom: 16px;" />
            <div style="font-family: monospace; color: var(--primary-light); text-align: center; margin-bottom: 16px; letter-spacing: 1px;">${a.assetCode}</div>
            <div style="margin-top:16px;display:flex;gap:12px;justify-content:center;">
              <button class="btn btn-sm" id="btn-download-qr" style="border: 1px solid var(--border-glass); background: transparent; border-radius: 20px; padding: 6px 16px;">
                <span class="material-icons-round" style="font-size: 18px;">download</span>
                下載
              </button>
              <button class="btn btn-sm" id="btn-print-qr" style="border: 1px solid var(--border-glass); background: transparent; border-radius: 20px; padding: 6px 16px;">
                <span class="material-icons-round" style="font-size: 18px;">print</span>
                列印
              </button>
            </div>
            
            ${canTakeCustody ? `
              <div style="margin-top: 16px; border-top: 1px solid var(--border-glass); padding-top: 16px;">
                <button class="btn btn-primary" id="btn-take-custody" data-id="${a.id}" style="width: 100%;">
                  <span class="material-icons-round">pan_tool</span>
                  領取保管
                </button>
              </div>
            ` : ''}
            ${canReturn ? `
              <div style="margin-top: 16px; border-top: 1px solid var(--border-glass); padding-top: 16px;">
                <button class="btn btn-accent" id="btn-return-asset" data-id="${a.id}" style="width: 100%;">
                  <span class="material-icons-round">assignment_return</span>
                  確認歸還
                </button>
              </div>
            ` : ''}
          ` : '<p style="color:var(--text-muted);">無 QR Code</p>'}
        </div>
      </div>

      <!-- 第二列：財產照片與歷史紀錄 -->
      <div class="card">
        <h3 class="card-title" style="margin-bottom:20px; display:flex; justify-content:space-between; align-items:center;">
          <div><span class="material-icons-round" style="color:var(--primary-light); vertical-align:middle;">image</span> 財產照片</div>
        </h3>
        
        ${a.imageUrl ? `
          <div style="margin-bottom: 24px;">
            <div class="detail-label" style="margin-bottom: 8px;">主要照片</div>
            <img src="/api/uploads/${a.imageUrl}" class="enlargeable-image" alt="Main Photo" style="max-width: 100%; border-radius: 8px; max-height: 400px; object-fit: contain; background: var(--bg-surface); cursor: pointer;" />
          </div>
        ` : `
          <div style="margin-bottom: 24px;">
            <div class="detail-label" style="margin-bottom: 8px;">主要照片</div>
            <div style="width:100%; height:300px; background:var(--bg-secondary); border-radius:8px; display:flex; align-items:center; justify-content:center; color:var(--text-muted);">
              <span class="material-icons-round" style="font-size:64px;">image_not_supported</span>
            </div>
          </div>
        `}
        
        ${history && history.find(h => h.returnPhoto) ? `
          <div style="margin-bottom: 24px;">
            <div class="detail-label" style="margin-bottom: 8px;">最後歸還照片</div>
            <img src="/api/uploads/${history.find(h => h.returnPhoto).returnPhoto}" class="enlargeable-image" alt="Return Photo" style="max-width: 100%; border-radius: 8px; max-height: 400px; object-fit: contain; background: var(--bg-surface); cursor: pointer;" />
          </div>
        ` : ''}

        <div class="detail-label" style="margin-bottom: 8px;">詳情圖片 (${a.detailPhotos ? a.detailPhotos.length : 0})</div>
        ${a.detailPhotos && a.detailPhotos.length > 0 ? `
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 16px;">
            ${a.detailPhotos.map(p => `
              <div style="position: relative; aspect-ratio: 1; border-radius: 8px; overflow: hidden; background: var(--bg-surface); border: 1px solid var(--border-glass);">
                <img src="/api/uploads/${p.url}" class="enlargeable-image" alt="Detail Photo" style="width: 100%; height: 100%; object-fit: cover; cursor: pointer;" />

              </div>
            `).join('')}
          </div>
        ` : '<p style="color:var(--text-muted);">無詳情圖片</p>'}
      </div>

      ${historyHtml}
    </div>
  `;

  // 下載 QR Code
  const dlBtn = document.getElementById('btn-download-qr');
  if (dlBtn) {
    dlBtn.addEventListener('click', () => {
      const link = document.createElement('a');
      link.download = `${a.assetCode}.png`;
      link.href = a.qrCode;
      link.click();
      showToast('QR Code 已下載', 'success');
    });
  }

  // 列印 QR Code
  const printBtn = document.getElementById('btn-print-qr');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head><title>列印 QR Code - ${a.assetCode}</title></head>
        <body style="text-align:center;padding:40px;font-family:sans-serif;">
          <h2>${a.name}</h2>
          <img src="${a.qrCode}" style="max-width:300px;" />
          <p style="font-family:monospace;font-size:18px;margin-top:16px;">${a.assetCode}</p>
          <p>${a.custodian} · ${formatDate(a.custodyDate)}</p>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    });
  }

  if (canTakeCustody) {
    const takeBtn = document.getElementById('btn-take-custody');
    if (takeBtn) {
      takeBtn.addEventListener('click', async (e) => {
        try {
          const btn = e.currentTarget;
          btn.disabled = true;
          btn.innerHTML = '<span class="material-icons-round rotate">sync</span> 處理中...';
          await assetsAPI.takeCustody(a.id);
          showToast('財產領取成功', 'success');
          const [updatedAsset, historyData] = await Promise.all([
            assetsAPI.get(a.id),
            assetsAPI.getHistory(a.id)
          ]);
          renderDetail(updatedAsset, historyData);
        } catch (err) {
          showToast('領取失敗: ' + err.message, 'error');
          e.currentTarget.disabled = false;
          e.currentTarget.innerHTML = '<span class="material-icons-round">pan_tool</span> 領取保管';
        }
      });
    }
  }

  if (canReturn) {
    const returnBtn = document.getElementById('btn-return-asset');
    if (returnBtn) {
      returnBtn.addEventListener('click', () => {
        const formHtml = `
          <div style="display:flex; flex-direction:column; gap:16px; margin-top: 10px;">
            <p style="color:var(--text-secondary); font-size:0.95rem;">歸還財產前，請上傳最新的現況照片（必填）。</p>
            <div class="form-group">
              <label>上傳歸還照片 <span style="color:var(--danger);">*</span></label>
              <input type="file" id="return-photo-input" accept="image/*" class="form-control" />
            </div>
          </div>
        `;
        
        const footerEl = document.createElement('div');
        footerEl.style.display = 'flex';
        footerEl.style.gap = '10px';
        footerEl.style.justifyContent = 'flex-end';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn btn-ghost';
        cancelBtn.textContent = '取消';
        
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'btn btn-primary';
        confirmBtn.innerHTML = '<span class="material-icons-round">upload</span> 確認歸還';
        
        footerEl.appendChild(cancelBtn);
        footerEl.appendChild(confirmBtn);
        
        const { close } = showModal({
          title: '確認歸還財產',
          content: formHtml,
          footer: footerEl,
          width: '400px'
        });
        
        cancelBtn.addEventListener('click', close);
        
        confirmBtn.addEventListener('click', async () => {
          const fileInput = document.getElementById('return-photo-input');
          const file = fileInput.files[0];
          if (!file) {
            showToast('請上傳歸還照片', 'error');
            return;
          }
          
          const returnDate = new Date().toISOString().slice(0, 10);
          const formData = new FormData();
          formData.append('returnDate', returnDate);
          formData.append('returnPhoto', file);
          
          try {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<span class="material-icons-round rotate">sync</span> 處理中...';
            await assetsAPI.returnAsset(a.id, formData);
            showToast('財產歸還成功', 'success');
            close();
            
            const [updatedAsset, historyData] = await Promise.all([
              assetsAPI.get(a.id),
              assetsAPI.getHistory(a.id)
            ]);
            renderDetail(updatedAsset, historyData);
          } catch (err) {
            showToast('歸還失敗: ' + err.message, 'error');
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<span class="material-icons-round">upload</span> 確認歸還';
          }
        });
      });
    }
  }

  // 刪除
  const deleteBtn = document.getElementById('btn-delete-asset');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      showConfirm({
        title: '刪除財產',
        message: `確定要刪除「${a.name}」（${a.assetCode}）嗎？此操作無法復原。`,
        danger: true,
        confirmText: '刪除',
        onConfirm: async () => {
          try {
            await assetsAPI.delete(a.id);
            showToast('財產已刪除', 'success');
            navigate('/assets');
          } catch (err) {
            showToast(err.message, 'error');
          }
        },
      });
    });
  }

  // 點擊圖片放大
  const enlargeableImages = document.querySelectorAll('.enlargeable-image');
  enlargeableImages.forEach(img => {
    img.addEventListener('click', (e) => {
      const src = e.target.src;
      showModal({
        title: '檢視圖片',
        content: `<div style="display:flex; justify-content:center; align-items:center; min-height: 200px;"><img src="${src}" style="max-width: 100%; max-height: 75vh; border-radius: 8px; object-fit: contain;" /></div>`,
        width: '900px'
      });
    });
  });

}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('zh-TW');
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-TW');
}
