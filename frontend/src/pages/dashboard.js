/**
 * 儀表板頁面
 */
import { assetsAPI } from '../api.js';
import { showToast } from '../components/toast.js';
import { renderSidebar, initSidebarEvents } from '../components/sidebar.js';
import { renderNavbar, initNavbarEvents } from '../components/navbar.js';

export default async function dashboardPage() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="layout">
      ${renderSidebar()}
      ${renderNavbar('儀表板')}
      <main class="layout-main">
        <div class="page-content">
          <div class="page-header">
            <div>
              <h2 class="page-title">儀表板</h2>
              <p class="page-subtitle">財產概覽與統計數據</p>
            </div>
          </div>

          <div class="stats-grid" id="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
            <div class="stat-card purple">
              <div class="stat-icon"><span class="material-icons-round">inventory</span></div>
              <div class="stat-info">
                <div class="stat-label">總資產數</div>
                <div class="stat-value skeleton skeleton-text" id="stat-total" style="width:60px;height:36px;"></div>
              </div>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr;gap:24px;">
            <div class="card">
              <div class="card-header">
                <h3 class="card-title">📦 最近新增財產</h3>
                <a href="#/assets" class="btn btn-ghost btn-sm">查看全部</a>
              </div>
              <div id="recent-assets" style="display:flex; flex-direction:column; gap:8px;">
                <div class="skeleton skeleton-card" style="margin-bottom:8px;height:48px;"></div>
                <div class="skeleton skeleton-card" style="margin-bottom:8px;height:48px;"></div>
                <div class="skeleton skeleton-card" style="height:48px;"></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `;

  initSidebarEvents();
  initNavbarEvents();

  // 載入統計數據
  try {
    const [stats, assetsData] = await Promise.all([
      assetsAPI.stats(),
      assetsAPI.list({ limit: 5, sort: 'created_at', order: 'DESC' }),
    ]);

    // 動態更新統計數字（含計數動畫）
    animateNumber('stat-total', stats.total);

    // 最近新增的財產
    const recentEl = document.getElementById('recent-assets');
    if (assetsData.data.length === 0) {
      recentEl.innerHTML = `
        <div class="empty-state" style="padding:30px;">
          <span class="material-icons-round">inbox</span>
          <div class="empty-state-title">尚無財產</div>
        </div>
      `;
    } else {
      recentEl.innerHTML = assetsData.data.map(a => `
        <a href="#/assets/${a.id}" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-radius:var(--radius-sm);transition:var(--transition);border:1px solid transparent;text-decoration:none;color:var(--text-primary);"
           onmouseover="this.style.background='var(--bg-glass-hover)';this.style.borderColor='var(--border-glass)'"
           onmouseout="this.style.background='';this.style.borderColor='transparent'">
          <div>
            <div style="font-weight:600;font-size:0.9rem;">${a.name}</div>
            <div style="font-size:0.78rem;color:var(--text-muted);">${a.assetCode} · ${a.returnDate ? '-' : (a.custodian || '未分配')}</div>
          </div>
        </a>
      `).join('');
    }
  } catch (err) {
    showToast('載入儀表板數據失敗: ' + err.message, 'error');
  }
}


function animateNumber(elementId, target) {
  const el = document.getElementById(elementId);
  if (!el) return;

  el.className = 'stat-value';
  el.style = '';

  if (target === 0) {
    el.textContent = '0';
    return;
  }

  let current = 0;
  const duration = 800;
  const step = target / (duration / 16);
  const timer = setInterval(() => {
    current += step;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    el.textContent = Math.round(current).toLocaleString();
  }, 16);
}
