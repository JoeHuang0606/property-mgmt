import { systemAPI } from '../api.js';
import { showToast } from '../components/toast.js';
import { renderSidebar, initSidebarEvents } from '../components/sidebar.js';
import { renderNavbar, initNavbarEvents } from '../components/navbar.js';
import { isAdmin } from '../auth.js';

export default async function systemBackupPage() {
  const app = document.getElementById('app');

  if (!isAdmin()) {
    app.innerHTML = `
      <div class="layout">
        ${renderSidebar()}
        ${renderNavbar('資料管理')}
        <main class="layout-main">
          <div class="empty-state">
            <span class="material-icons-round empty-icon">block</span>
            <div class="empty-text">您沒有權限存取此頁面</div>
          </div>
        </main>
      </div>
    `;
    initSidebarEvents();
    initNavbarEvents();
    return;
  }

  app.innerHTML = `
    <div class="layout">
      ${renderSidebar()}
      ${renderNavbar('資料管理')}
      <main class="layout-main">
        <div class="page-content">
          <div class="page-header">
            <h2 class="page-title">資料管理 (匯入/匯出)</h2>
          </div>

    <div class="card">
      <h3 style="margin-bottom: 16px;">匯出資料 (Export)</h3>
      <p style="color: var(--text-secondary); margin-bottom: 16px; font-size: 14px;">
        請選擇您要匯出的資料表。匯出後將會下載為 JSON 檔案。
      </p>
      
      <div class="form-group">
        <label>選擇匯出項目</label>
        <div class="checkbox-group" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; margin-top: 8px;">
          <label style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" name="export-tables" value="users" checked> 帳號資料 (Users)
          </label>
          <label style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" name="export-tables" value="custodian_roles" checked> 職類資料 (Roles)
          </label>
          <label style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" name="export-tables" value="categories" checked> 分類資料 (Categories)
          </label>
          <label style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" name="export-tables" value="user_custodian_roles" checked> 帳號與職類關聯
          </label>
          <label style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" name="export-tables" value="assets" checked> 財產資料 (Assets)
          </label>
          <label style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" name="export-tables" value="asset_custody_history" checked> 財產保管歷史
          </label>
          <label style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" name="export-tables" value="audit_logs" checked> 操作日誌
          </label>
        </div>
      </div>

      <div class="form-actions" style="margin-top: 24px;">
        <button id="btn-export" class="btn btn-primary">
          <span class="material-icons-round">download</span>
          匯出選擇的資料
        </button>
      </div>
    </div>

    <div class="card" style="margin-top: 24px;">
      <h3 style="margin-bottom: 16px;">匯入資料 (Import)</h3>
      <p style="color: var(--text-secondary); margin-bottom: 16px; font-size: 14px;">
        請選擇之前匯出的 JSON 備份檔，並選擇匯入模式。
      </p>

      <div class="form-group">
        <label>匯入模式</label>
        <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 8px;">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input type="radio" name="import-mode" value="merge" checked>
            <span>
              <strong>新增/合併資料 (Merge)</strong><br>
              <small style="color: var(--text-secondary);">將備份檔中的資料加入現有資料庫。若有重複的主鍵，則更新該筆資料；若無重複，則新增。</small>
            </span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input type="radio" name="import-mode" value="overwrite">
            <span>
              <strong>完全覆蓋 (Overwrite)</strong><br>
              <small style="color: var(--danger-color);">⚠️ 危險操作：將會清空現有資料庫中對應的表，並以備份檔的資料完全覆蓋。請謹慎使用！</small>
            </span>
          </label>
        </div>
      </div>

      <div class="form-group" style="margin-top: 20px;">
        <label for="import-file">選擇 JSON 備份檔</label>
        <input type="file" id="import-file" accept=".json" class="form-input" style="padding: 8px;">
      </div>

      <div class="form-actions" style="margin-top: 24px;">
        <button id="btn-import" class="btn btn-primary" style="background-color: var(--danger-color);">
          <span class="material-icons-round">upload</span>
          開始匯入資料
        </button>
          </div>
        </div>
      </main>
    </div>
  `;

  initSidebarEvents();
  initNavbarEvents();

  setupSystemBackupEvents();
}

function setupSystemBackupEvents() {

  const btnExport = document.getElementById('btn-export');
  const btnImport = document.getElementById('btn-import');
  const importFile = document.getElementById('import-file');

  if (btnExport) {
    btnExport.addEventListener('click', async () => {
      try {
        const checkboxes = document.querySelectorAll('input[name="export-tables"]:checked');
        const tables = Array.from(checkboxes).map(cb => cb.value);

        if (tables.length === 0) {
          showToast('請至少選擇一項要匯出的資料表', 'error');
          return;
        }

        btnExport.disabled = true;
        btnExport.innerHTML = '<span class="material-icons-round">autorenew</span> 匯出中...';

        const data = await systemAPI.export(tables);
        
        // 觸發下載
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // 檔名加上日期時間
        const dateStr = new Date().toISOString().replace(/[:.]/g, '-').split('T');
        a.download = `backup_${dateStr[0]}_${dateStr[1].substring(0, 6)}.json`;
        a.click();
        URL.revokeObjectURL(url);

        showToast('匯出成功', 'success');
      } catch (err) {
        showToast('匯出失敗: ' + err.message, 'error');
      } finally {
        btnExport.disabled = false;
        btnExport.innerHTML = '<span class="material-icons-round">download</span> 匯出選擇的資料';
      }
    });
  }

  if (btnImport) {
    btnImport.addEventListener('click', async () => {
      const file = importFile.files[0];
      if (!file) {
        showToast('請選擇要匯入的 JSON 檔案', 'error');
        return;
      }

      const modeElement = document.querySelector('input[name="import-mode"]:checked');
      const mode = modeElement ? modeElement.value : 'merge';

      if (mode === 'overwrite') {
        const confirmMsg = '⚠️ 警告：您選擇了「完全覆蓋 (Overwrite)」模式！\n\n這將會清除您目前資料庫中對應的現有資料，並替換為備份檔的內容。\n\n您確定要繼續嗎？';
        if (!confirm(confirmMsg)) return;
      }

      try {
        btnImport.disabled = true;
        btnImport.innerHTML = '<span class="material-icons-round">autorenew</span> 讀取中...';

        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const jsonStr = e.target.result;
            const parsed = JSON.parse(jsonStr);

            if (!parsed.data) {
              throw new Error('無效的備份檔格式 (缺少 data 欄位)');
            }

            btnImport.innerHTML = '<span class="material-icons-round">autorenew</span> 匯入中...';
            
            await systemAPI.import(mode, parsed.data);
            showToast('資料匯入成功', 'success');
            
            // 清空選擇
            importFile.value = '';
          } catch (err) {
            showToast('匯入失敗: ' + (err.message || '檔案解析錯誤'), 'error');
          } finally {
            btnImport.disabled = false;
            btnImport.innerHTML = '<span class="material-icons-round">upload</span> 開始匯入資料';
          }
        };
        reader.readAsText(file);
      } catch (err) {
        showToast('讀取檔案失敗: ' + err.message, 'error');
        btnImport.disabled = false;
        btnImport.innerHTML = '<span class="material-icons-round">upload</span> 開始匯入資料';
      }
    });
  }
}
