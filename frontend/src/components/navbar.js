/**
 * 頂部導航列元件
 */
import { getUser, clearAuth } from '../auth.js';
import { navigate } from '../router.js';
import { toggleSidebar } from './sidebar.js';
import { showModal } from './modal.js';
import { showToast } from './toast.js';
import { authAPI } from '../api.js';

export function renderNavbar(title = '') {
  const user = getUser();
  const initial = user?.displayName?.charAt(0) || 'U';

  const roleName = {
    admin: '管理員',
    manager: '職類管理員',
    user: '使用者',
  };
  const initial = user?.displayName ? user.displayName.charAt(0).toUpperCase() : '?';

  const avatarContent = user?.avatarUrl
    ? `<img src="/api/uploads/${user.avatarUrl}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:var(--radius-pill);" />`
    : initial;

  return `
    <header class="navbar" id="navbar">
      <div style="display:flex;align-items:center;gap:12px;">
        <button class="menu-toggle" id="menu-toggle" aria-label="選單">
          <span class="material-icons-round">menu</span>
        </button>
        <h1 class="navbar-title">${title}</h1>
      </div>
      <div class="navbar-actions">
        <!-- 動態背景切換按鈕 -->
        <button class="bg-anim-toggle" id="bg-anim-toggle" aria-label="切換動態背景" style="background:transparent;border:none;color:var(--text-primary);cursor:pointer;display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:var(--radius-pill);transition:var(--transition);">
          <span class="material-icons-round" id="bg-anim-icon">animation</span>
        </button>

        <!-- 佈景主題切換按鈕 -->
        <button class="theme-toggle" id="theme-toggle" aria-label="切換深淺色模式" style="background:transparent;border:none;color:var(--text-primary);cursor:pointer;display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:var(--radius-pill);transition:var(--transition);">
          <span class="material-icons-round" id="theme-icon">light_mode</span>
        </button>

        <div class="dropdown" id="user-dropdown">
          <div class="navbar-user" id="user-menu-btn">
            <div class="navbar-avatar">${avatarContent}</div>
            <div>
              <div class="navbar-username">${user?.displayName || ''}</div>
              <div class="navbar-role">${roleName[user?.role] || ''}</div>
            </div>
            <span class="material-icons-round" style="font-size:1.2rem;color:var(--text-muted)">expand_more</span>
          </div>
          <div class="dropdown-menu" id="user-menu" style="display:none;">
            <input type="file" id="avatar-upload" style="display:none;" accept="image/*" />
            <button class="dropdown-item" id="btn-change-avatar">
              <span class="material-icons-round">account_circle</span>
              變更頭像
            </button>
            <button class="dropdown-item" id="btn-change-password">
              <span class="material-icons-round">lock</span>
              變更密碼
            </button>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item danger" id="btn-logout">
              <span class="material-icons-round">logout</span>
              登出
            </button>
          </div>
        </div>
      </div>
    </header>
  `;
}

export function initNavbarEvents() {
  // 漢堡選單
  const menuToggle = document.getElementById('menu-toggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', toggleSidebar);
  }

  // 動態背景切換
  const bgAnimToggle = document.getElementById('bg-anim-toggle');
  const bgAnimIcon = document.getElementById('bg-anim-icon');
  if (bgAnimToggle && bgAnimIcon) {
    // 初始化動態背景狀態
    const currentBgAnimated = localStorage.getItem('bg-animated') !== 'false';
    document.documentElement.setAttribute('data-bg-animated', currentBgAnimated ? 'true' : 'false');
    bgAnimIcon.textContent = currentBgAnimated ? 'animation' : 'blur_off';

    bgAnimToggle.addEventListener('click', () => {
      const isAnimated = document.documentElement.getAttribute('data-bg-animated') !== 'false';
      const newAnimated = !isAnimated;
      document.documentElement.setAttribute('data-bg-animated', newAnimated ? 'true' : 'false');
      localStorage.setItem('bg-animated', newAnimated ? 'true' : 'false');
      bgAnimIcon.textContent = newAnimated ? 'animation' : 'blur_off';
    });
  }

  // 佈景主題切換
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  if (themeToggle && themeIcon) {
    // 初始化主題
    const currentTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    themeIcon.textContent = currentTheme === 'dark' ? 'light_mode' : 'dark_mode';

    themeToggle.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const newTheme = isDark ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      themeIcon.textContent = newTheme === 'dark' ? 'light_mode' : 'dark_mode';
    });
  }

  // 使用者選單
  const menuBtn = document.getElementById('user-menu-btn');
  const menu = document.getElementById('user-menu');

  if (menuBtn && menu) {
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = menu.style.display !== 'none';
      menu.style.display = isVisible ? 'none' : 'block';
    });

    document.addEventListener('click', () => {
      menu.style.display = 'none';
    });
  }

  // 登出
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      clearAuth();
      navigate('/login');
      showToast('已成功登出', 'success');
    });
  }

  // 變更密碼
  const changePwBtn = document.getElementById('btn-change-password');
  if (changePwBtn) {
    changePwBtn.addEventListener('click', showChangePasswordModal);
  }

  // 變更頭像
  const changeAvatarBtn = document.getElementById('btn-change-avatar');
  const avatarUpload = document.getElementById('avatar-upload');
  if (changeAvatarBtn && avatarUpload) {
    changeAvatarBtn.addEventListener('click', () => {
      avatarUpload.click();
    });

    avatarUpload.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('avatar', file);

      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/auth/avatar', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || '上傳失敗');
        }

        const data = await response.json();
        
        // Update user in localStorage
        const user = JSON.parse(localStorage.getItem('user'));
        user.avatarUrl = data.avatarUrl;
        localStorage.setItem('user', JSON.stringify(user));
        
        import('./toast.js').then(({ showToast }) => {
          showToast('頭像上傳成功', 'success');
        });
        
        // 重新整理頁面套用新頭像
        setTimeout(() => window.location.reload(), 1000);
      } catch (err) {
        import('./toast.js').then(({ showToast }) => {
          showToast(err.message, 'error');
        });
      }
    });
  }
}

function showChangePasswordModal() {
  const body = document.createElement('div');
  body.innerHTML = `
    <div class="form-group">
      <label class="form-label">目前密碼</label>
      <input type="password" class="form-input" id="current-pw" placeholder="輸入目前密碼" />
    </div>
    <div class="form-group">
      <label class="form-label">新密碼</label>
      <input type="password" class="form-input" id="new-pw" placeholder="輸入新密碼（至少 6 個字元）" />
    </div>
    <div class="form-group">
      <label class="form-label">確認新密碼</label>
      <input type="password" class="form-input" id="confirm-pw" placeholder="再次輸入新密碼" />
    </div>
  `;

  const footer = document.createElement('div');
  footer.style.display = 'flex';
  footer.style.gap = '10px';
  footer.style.justifyContent = 'flex-end';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-ghost';
  cancelBtn.textContent = '取消';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-primary';
  saveBtn.textContent = '儲存';

  footer.appendChild(cancelBtn);
  footer.appendChild(saveBtn);

  const { close } = showModal({
    title: '變更密碼',
    content: body,
    footer,
  });

  cancelBtn.addEventListener('click', close);

  saveBtn.addEventListener('click', async () => {
    const currentPw = body.querySelector('#current-pw').value;
    const newPw = body.querySelector('#new-pw').value;
    const confirmPw = body.querySelector('#confirm-pw').value;

    if (!currentPw || !newPw) {
      showToast('請填寫所有欄位', 'warning');
      return;
    }

    if (newPw !== confirmPw) {
      showToast('新密碼和確認密碼不一致', 'warning');
      return;
    }

    if (newPw.length < 6) {
      showToast('新密碼長度至少 6 個字元', 'warning');
      return;
    }

    try {
      saveBtn.disabled = true;
      saveBtn.textContent = '儲存中...';
      await authAPI.changePassword(currentPw, newPw);
      showToast('密碼已成功變更', 'success');
      close();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = '儲存';
    }
  });
}
