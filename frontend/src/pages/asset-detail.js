/**
 * 財產詳情頁面
 */
import { assetsAPI } from '../api.js';
import { isManager, isAdmin, getUser } from '../auth.js';
import { showToast } from '../components/toast.js';
import { showConfirm } from '../components/modal.js';
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
      <div class="card" style="margin-top: 24px;">
        <h3 class="card-title" style="margin-bottom: 20px; display:flex; align-items:center; gap:8px;">
          <span class="material-icons-round" style="color:var(--primary-light);">history</span>
          保管歷史紀錄
        </h3>
        <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
          <table class="table">
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
                  <td style="font-weight: 500;">${record.custodian}</td>
                  <td>${new Date(record.takeDate).toLocaleDateString('zh-TW')}</td>
                  <td>${record.returnDate ? new Date(record.returnDate).toLocaleDateString('zh-TW') : '<span class="badge badge-success">保管中</span>'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } else {
    historyHtml = `
      <div class="card" style="margin-top: 24px;">
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

    <div class="asset-detail-grid">
      <div class="card">
        <h3 class="card-title" style="margin-bottom:20px;">財產資訊</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 24px;">
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
          <div class="detail-field" style="grid-column:1/-1;">
            <div class="detail-label">描述</div>
            <div class="detail-value">${a.description || '無描述'}</div>
          </div>
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

      <div>
        <div class="card">
          <h3 class="card-title" style="margin-bottom:16px;text-align:center;">QR Code</h3>
          <div class="qr-display">
            ${a.qrCode ? `
              <img src="${a.qrCode}" alt="QR Code: ${a.assetCode}" id="qr-img" />
              <div class="qr-code-label">${a.assetCode}</div>
              <div style="margin-top:16px;display:flex;gap:8px;justify-content:center;">
                <button class="btn btn-ghost btn-sm" id="btn-download-qr">
                  <span class="material-icons-round">download</span>
                  下載
                </button>
                <button class="btn btn-ghost btn-sm" id="btn-print-qr">
                  <span class="material-icons-round">print</span>
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
      </div>
    </div>
    
    ${historyHtml}
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
          // 重新載入以更新畫面
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
      returnBtn.addEventListener('click', async (e) => {
        const returnDate = new Date().toISOString().slice(0, 10);
        try {
          const btn = e.currentTarget;
          btn.disabled = true;
          btn.innerHTML = '<span class="material-icons-round rotate">sync</span> 處理中...';
          await assetsAPI.returnAsset(a.id, returnDate);
          showToast('財產歸還成功', 'success');
          // 重新載入以更新畫面
          const [updatedAsset, historyData] = await Promise.all([
            assetsAPI.get(a.id),
            assetsAPI.getHistory(a.id)
          ]);
          renderDetail(updatedAsset, historyData);
        } catch (err) {
          showToast('歸還失敗: ' + err.message, 'error');
          e.currentTarget.disabled = false;
          e.currentTarget.innerHTML = '<span class="material-icons-round">assignment_return</span> 確認歸還';
        }
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
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('zh-TW');
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-TW');
}
