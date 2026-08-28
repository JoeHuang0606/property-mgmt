/**
 * 通用模態框元件
 */

export function showModal({ title, content, footer, onClose, width }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'modal';
  if (width) modal.style.maxWidth = width;

  modal.innerHTML = `
    <div class="modal-header">
      <h3 class="modal-title">${title}</h3>
      <button class="modal-close" aria-label="關閉">
        <span class="material-icons-round">close</span>
      </button>
    </div>
    <div class="modal-body"></div>
    ${footer ? '<div class="modal-footer"></div>' : ''}
  `;

  const bodyEl = modal.querySelector('.modal-body');
  if (typeof content === 'string') {
    bodyEl.innerHTML = content;
  } else if (content instanceof HTMLElement) {
    bodyEl.appendChild(content);
  }

  if (footer) {
    const footerEl = modal.querySelector('.modal-footer');
    if (typeof footer === 'string') {
      footerEl.innerHTML = footer;
    } else if (footer instanceof HTMLElement) {
      footerEl.appendChild(footer);
    }
  }

  function close() {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.2s ease';
    setTimeout(() => {
      overlay.remove();
      if (onClose) onClose();
    }, 200);
  }

  // 點擊關閉按鈕
  modal.querySelector('.modal-close').addEventListener('click', close);

  // 點擊遮罩關閉
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  // ESC 關閉
  function handleEsc(e) {
    if (e.key === 'Escape') {
      close();
      document.removeEventListener('keydown', handleEsc);
    }
  }
  document.addEventListener('keydown', handleEsc);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  return { close, modal, overlay };
}

export function showConfirm({ title = '確認', message, onConfirm, confirmText = '確認', cancelText = '取消', danger = false }) {
  const footerEl = document.createElement('div');
  footerEl.style.display = 'flex';
  footerEl.style.gap = '10px';
  footerEl.style.justifyContent = 'flex-end';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-ghost';
  cancelBtn.textContent = cancelText;

  const confirmBtn = document.createElement('button');
  confirmBtn.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;
  confirmBtn.textContent = confirmText;

  footerEl.appendChild(cancelBtn);
  footerEl.appendChild(confirmBtn);

  const { close } = showModal({
    title,
    content: `<p style="color: var(--text-secondary); font-size: 0.92rem;">${message}</p>`,
    footer: footerEl,
  });

  cancelBtn.addEventListener('click', close);
  confirmBtn.addEventListener('click', () => {
    close();
    if (onConfirm) onConfirm();
  });
}
