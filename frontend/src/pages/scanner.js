/**
 * QR Code 掃描器頁面
 */
import { assetsAPI } from '../api.js';
import { showToast } from '../components/toast.js';
import { renderSidebar, initSidebarEvents } from '../components/sidebar.js';
import { renderNavbar, initNavbarEvents } from '../components/navbar.js';
import { isManager, getUser } from '../auth.js';
import { navigate } from '../router.js';

let html5QrcodeScanner = null;

export default async function scannerPage() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="layout">
      ${renderSidebar()}
      ${renderNavbar('掃描 QR Code')}
      <main class="layout-main">
        <div class="page-content">
          <div class="page-header">
            <div>
              <h2 class="page-title">掃描 QR Code</h2>
              <p class="page-subtitle">使用鏡頭掃描財產 QR Code 快速查看詳情</p>
            </div>
          </div>

          <div class="scanner-container">
            <div class="card" style="padding:0;overflow:hidden;">
              <div style="padding:20px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border-glass);">
                <h3 class="card-title" style="margin:0;">
                  <span class="material-icons-round" style="vertical-align:middle;margin-right:8px;color:var(--primary-light);">qr_code_scanner</span>
                  相機掃描
                </h3>
                <div style="display:flex;gap:8px;">
                  <button class="btn btn-primary btn-sm" id="btn-start-scan">
                    <span class="material-icons-round">videocam</span>
                    開啟鏡頭
                  </button>
                  <button class="btn btn-ghost btn-sm hidden" id="btn-stop-scan">
                    <span class="material-icons-round">videocam_off</span>
                    關閉鏡頭
                  </button>
                </div>
              </div>
              <div id="qr-reader" style="width:100%;"></div>
              <div class="scanner-overlay" id="scanner-placeholder">
                <span class="material-icons-round" style="font-size:4rem;opacity:0.2;margin-bottom:12px;">qr_code_scanner</span>
                <p>點擊「開啟鏡頭」開始掃描</p>
                <p style="font-size:0.78rem;margin-top:8px;color:var(--text-muted);">將 QR Code 對準鏡頭即可自動辨識</p>
              </div>
            </div>

            <div style="margin-top:24px;">
              <div class="card">
                <h3 class="card-title" style="margin-bottom:16px;">或手動輸入編號</h3>
                <div style="display:flex;gap:10px;">
                  <input type="text" class="form-input" id="manual-code" placeholder="輸入財產編號，例如 ASSET-20260826-0001" />
                  <button class="btn btn-accent" id="btn-manual-search">
                    <span class="material-icons-round">search</span>
                    查詢
                  </button>
                </div>
              </div>
            </div>

            <div id="scan-result" class="scanner-result"></div>
          </div>
        </div>
      </main>
    </div>
  `;

  initSidebarEvents();
  initNavbarEvents();

  const startBtn = document.getElementById('btn-start-scan');
  const stopBtn = document.getElementById('btn-stop-scan');
  const placeholder = document.getElementById('scanner-placeholder');

  startBtn.addEventListener('click', async () => {
    try {
      // 動態載入 html5-qrcode
      const { Html5Qrcode } = await import('html5-qrcode');

      startBtn.classList.add('hidden');
      stopBtn.classList.remove('hidden');
      placeholder.classList.add('hidden');

      const qrboxSize = (viewfinderWidth, viewfinderHeight) => {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
        const size = Math.floor(minEdge * 0.75); // 取螢幕短邊的 75% 作為掃描框
        return { width: size, height: size };
      };

      html5QrcodeScanner = new Html5Qrcode('qr-reader');
      await html5QrcodeScanner.start(
        { facingMode: 'environment' },
        { 
          fps: 10, 
          qrbox: qrboxSize,
          videoConstraints: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        },
        onScanSuccess,
        () => {}
      );
    } catch (err) {
      console.error('Camera start error:', err);
      let errMsg = err?.message || typeof err === 'string' ? err : '未知錯誤';
      
      if (!navigator.mediaDevices || !window.isSecureContext) {
        errMsg = '需使用 HTTPS 或 localhost 才能存取相機';
      } else if (errMsg.includes('NotAllowedError') || errMsg.includes('Permission')) {
        errMsg = '請允許網站存取相機權限';
      } else if (errMsg.includes('NotFound') || errMsg.includes('device not found')) {
        errMsg = '找不到可用的相機設備';
      }
      
      showToast('無法開啟鏡頭: ' + errMsg, 'error');
      startBtn.classList.remove('hidden');
      stopBtn.classList.add('hidden');
      placeholder.classList.remove('hidden');
    }
  });

  stopBtn.addEventListener('click', async () => {
    await stopScanner();
    startBtn.classList.remove('hidden');
    stopBtn.classList.add('hidden');
    placeholder.classList.remove('hidden');
  });

  // 手動查詢
  document.getElementById('btn-manual-search').addEventListener('click', () => {
    const code = document.getElementById('manual-code').value.trim();
    if (code) lookupAsset(code);
  });

  document.getElementById('manual-code').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const code = e.target.value.trim();
      if (code) lookupAsset(code);
    }
  });

  // 返回清理函式
  return () => {
    stopScanner();
  };
}

async function onScanSuccess(decodedText) {
  // 暫停掃描
  if (html5QrcodeScanner) {
    try { await html5QrcodeScanner.pause(); } catch {}
  }

  showToast('已掃描到 QR Code', 'info');
  await lookupAsset(decodedText);

  // 3 秒後恢復掃描
  setTimeout(() => {
    if (html5QrcodeScanner) {
      try { html5QrcodeScanner.resume(); } catch {}
    }
  }, 3000);
}

async function lookupAsset(code) {
  const resultEl = document.getElementById('scan-result');

  resultEl.innerHTML = `
    <div class="card" style="margin-top:20px;">
      <div class="skeleton skeleton-text w-75"></div>
      <div class="skeleton skeleton-text w-50"></div>
    </div>
  `;

  try {
    const asset = await assetsAPI.getByCode(code);
    const user = getUser();
    
    // 如果有歸還日期（代表目前無人保管），則可以領取
    const canTakeCustody = !!asset.returnDate;

    // 只有當前保管人可以查看並操作歸還
    const canReturn = !asset.returnDate && asset.custodian === user?.displayName;

    // 取得保管歷史紀錄
    let historyHtml = '';
    try {
      const history = await assetsAPI.getHistory(asset.id);
      if (history.length > 0) {
        historyHtml = `
          <div style="margin-top: 16px; border-top: 1px solid var(--border-glass); padding-top: 16px;">
            <h4 style="margin-bottom: 12px; font-size: 0.95rem; color: var(--text-primary); display:flex; align-items:center; gap:6px;">
              <span class="material-icons-round" style="font-size: 1.1rem; color:var(--primary-light);">history</span>
              保管歷史紀錄
            </h4>
            <div style="max-height: 200px; overflow-y: auto; padding-right: 4px;" class="custom-scrollbar">
              <table class="table" style="font-size: 0.85rem; margin: 0;">
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
          <div style="margin-top: 16px; border-top: 1px solid var(--border-glass); padding-top: 16px;">
            <h4 style="margin-bottom: 12px; font-size: 0.95rem; color: var(--text-primary); display:flex; align-items:center; gap:6px;">
              <span class="material-icons-round" style="font-size: 1.1rem; color:var(--primary-light);">history</span>
              保管歷史紀錄
            </h4>
            <div class="empty-state" style="padding: 12px; margin: 0;">
              <span class="material-icons-round" style="font-size: 2rem;">inbox</span>
              <p style="font-size: 0.85rem; margin-top: 8px;">尚無歷史紀錄</p>
            </div>
          </div>
        `;
      }
    } catch (err) {
      console.error('取得歷史紀錄失敗', err);
    }


    resultEl.innerHTML = `
      <div class="card" style="margin-top:20px;border-color:var(--primary);box-shadow:var(--shadow-glow);">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <h3 class="card-title" style="margin:0;">
            <span class="material-icons-round" style="vertical-align:middle;margin-right:6px;color:var(--success);">check_circle</span>
            找到財產
          </h3>
          <a href="#/assets/${asset.id}" class="btn btn-primary btn-sm">
            <span class="material-icons-round">open_in_new</span>
            查看詳情
          </a>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="detail-field">
            <div class="detail-label">名稱</div>
            <div class="detail-value" style="font-weight:700;">${asset.name}</div>
          </div>
          <div class="detail-field">
            <div class="detail-label">編號</div>
            <div class="detail-value"><code style="color:var(--primary-light);">${asset.assetCode}</code></div>
          </div>
          <div class="detail-field">
            <div class="detail-label">保管人</div>
            <div class="detail-value">${asset.custodian}</div>
          </div>
          <div class="detail-field">
            <div class="detail-label">歸還日期</div>
            <div class="detail-value">
              ${asset.returnDate ? new Date(asset.returnDate).toLocaleDateString('zh-TW') : '-'}
            </div>
          </div>
          <div class="detail-field">
            <div class="detail-label">保管日期</div>
            <div class="detail-value">${asset.custodyDate ? new Date(asset.custodyDate).toLocaleDateString('zh-TW') : '-'}</div>
          </div>
          <div class="detail-field">
            <div class="detail-label">分類</div>
            <div class="detail-value">${asset.categoryName || '-'}</div>
          </div>
        </div>
        ${canTakeCustody ? `
        <div style="margin-top: 16px; border-top: 1px solid var(--border-glass); padding-top: 16px;">
          <h4 style="margin-bottom: 8px; font-size: 0.9rem; color: var(--primary-light);">領取財產</h4>
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 12px;">此財產目前可供領取，點擊下方按鈕將保管人更新為您自己。</p>
          <button class="btn btn-primary" id="btn-take-custody" data-id="${asset.id}" style="width: 100%;">
            <span class="material-icons-round">pan_tool</span>
            領取保管
          </button>
        </div>
        ` : ''}
        ${canReturn ? `
        <div style="margin-top: 16px; border-top: 1px solid var(--border-glass); padding-top: 16px;">
          <h4 style="margin-bottom: 8px; font-size: 0.9rem; color: var(--primary-light);">歸還財產</h4>
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 12px;">將此財產歸還並解除您的保管狀態，歸還日期將記錄為今日。</p>
          <button class="btn btn-accent" id="btn-quick-return" data-id="${asset.id}" style="width: 100%;">
            <span class="material-icons-round">assignment_return</span>
            確認歸還
          </button>
        </div>
        ` : ''}
        ${historyHtml}
      </div>
    `;

    if (canTakeCustody) {
      document.getElementById('btn-take-custody').addEventListener('click', async (e) => {
        try {
          const btn = e.currentTarget;
          btn.disabled = true;
          btn.innerHTML = '<span class="material-icons-round rotate">sync</span> 處理中...';
          await assetsAPI.takeCustody(asset.id);
          showToast('財產領取成功', 'success');
          lookupAsset(code); // 重新載入以更新畫面
        } catch (err) {
          showToast('領取失敗: ' + err.message, 'error');
          e.currentTarget.disabled = false;
          e.currentTarget.innerHTML = '<span class="material-icons-round">pan_tool</span> 領取保管';
        }
      });
    }

    if (canReturn) {
      document.getElementById('btn-quick-return').addEventListener('click', async (e) => {
        const returnDate = new Date().toISOString().slice(0, 10); // 固定為今日
        try {
          const btn = e.currentTarget;
          btn.disabled = true;
          btn.innerHTML = '<span class="material-icons-round rotate">sync</span> 處理中...';
          await assetsAPI.returnAsset(asset.id, returnDate);
          showToast('財產歸還成功', 'success');
          lookupAsset(code); // 重新載入以更新畫面
        } catch (err) {
          showToast('歸還失敗: ' + err.message, 'error');
          e.currentTarget.disabled = false;
          e.currentTarget.innerHTML = '<span class="material-icons-round">assignment_return</span> 確認歸還';
        }
      });
    }

  } catch (err) {
    resultEl.innerHTML = `
      <div class="card" style="margin-top:20px;border-color:var(--danger);">
        <div style="display:flex;align-items:center;gap:8px;color:var(--danger);">
          <span class="material-icons-round">error</span>
          <span style="font-weight:600;">找不到財產</span>
        </div>
        <p style="color:var(--text-secondary);margin-top:8px;font-size:0.88rem;">
          編號「${code}」不存在於系統中。請確認 QR Code 是否正確。
        </p>
      </div>
    `;
  }
}

async function stopScanner() {
  if (html5QrcodeScanner) {
    try {
      await html5QrcodeScanner.stop();
      html5QrcodeScanner.clear();
    } catch {}
    html5QrcodeScanner = null;
  }
}
