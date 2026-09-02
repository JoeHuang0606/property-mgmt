/**
 * 登入頁面
 */
import { authAPI } from '../api.js';
import { setAuth } from '../auth.js';
import { navigate } from '../router.js';
import { showToast } from '../components/toast.js';

export default function loginPage() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="login-page">
      <div class="login-card">
        <div class="login-logo">
          <span class="material-icons-round">business</span>
        </div>
        <h1 class="login-title">財產管理系統</h1>
        <p class="login-subtitle">Asset Management System</p>
        <form class="login-form" id="login-form">
          <div class="form-group">
            <label class="form-label" for="username">帳號</label>
            <input type="text" class="form-input" id="username" placeholder="輸入您的帳號" autocomplete="username" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="password">密碼</label>
            <input type="password" class="form-input" id="password" placeholder="輸入您的密碼" autocomplete="current-password" required />
          </div>
          <button type="submit" class="btn btn-primary login-btn" id="login-btn">
            <span class="material-icons-round">login</span>
            登入
          </button>
        </form>
        <p style="text-align:center;margin-top:24px;font-size:0.78rem;color:var(--text-muted);">
          帳號由管理員統一發放，如需帳號請聯繫管理員
        </p>
      </div>
    </div>
  `;

  const form = document.getElementById('login-form');
  const btn = document.getElementById('login-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
      showToast('請輸入帳號和密碼', 'warning');
      return;
    }

    try {
      btn.disabled = true;
      btn.innerHTML = '<span class="material-icons-round">hourglass_empty</span> 登入中...';

      const data = await authAPI.login(username, password);
      setAuth(data.token, data.user);
      showToast(`歡迎回來，${data.user.displayName}！`, 'success');
      navigate('/dashboard');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-icons-round">login</span> 登入';
    }
  });

  // 自動聚焦帳號欄位
  document.getElementById('username').focus();
}
