/**
 * Toast 通知元件
 */

let container = null;

function ensureContainer() {
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

const icons = {
  success: 'check_circle',
  error: 'error',
  warning: 'warning',
  info: 'info',
};

export function showToast(message, type = 'info', duration = 4000) {
  const c = ensureContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="material-icons-round toast-icon">${icons[type] || 'info'}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" aria-label="關閉">
      <span class="material-icons-round">close</span>
    </button>
  `;

  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => removeToast(toast));

  c.appendChild(toast);

  if (duration > 0) {
    setTimeout(() => removeToast(toast), duration);
  }
}

function removeToast(toast) {
  toast.style.opacity = '0';
  toast.style.transform = 'translateX(100%)';
  toast.style.transition = 'all 0.3s ease';
  setTimeout(() => toast.remove(), 300);
}
