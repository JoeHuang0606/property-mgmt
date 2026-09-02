/**
 * API 請求封裝
 * 自動附加 JWT、統一錯誤處理
 */

const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    ...options.headers,
  };

  // 只有當 body 是字串時，才預設為 application/json
  if (typeof options.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  // 如果是 401，清除 token 並導向登入頁
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (window.location.hash !== '#/login') {
      window.location.hash = '#/login';
    }
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || '認證失敗，請重新登入');
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || `請求失敗 (${response.status})`);
  }

  return data;
}

// Auth API
export const authAPI = {
  login: (username, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  me: () => request('/auth/me'),
  changePassword: (currentPassword, newPassword) =>
    request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};

// Users API
export const usersAPI = {
  list: () => request('/users'),
  create: (data) =>
    request('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id, data) =>
    request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id) =>
    request(`/users/${id}`, {
      method: 'DELETE',
    }),
  updateRoles: (id, roleIds) =>
    request(`/users/${id}/roles`, {
      method: 'PUT',
      body: JSON.stringify({ roleIds }),
    }),
};

// Assets API
export const assetsAPI = {
  list: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== null) query.set(k, v);
    });
    return request(`/assets?${query.toString()}`);
  },
  get: (id) => request(`/assets/${id}`),
  getByCode: (code) => request(`/assets/code/${code}`),
  stats: () => request('/assets/stats'),
  create: (data) =>
    request('/assets', {
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),
  update: (id, data) =>
    request(`/assets/${id}`, {
      method: 'PUT',
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),
  returnAsset: (id, formData) =>
    request(`/assets/${id}/return`, {
      method: 'PUT',
      body: formData,
    }),
  takeCustody: (id) =>
    request(`/assets/${id}/take-custody`, {
      method: 'POST',
    }),
  getHistory: (id) => request(`/assets/${id}/history`),
  delete: (id) =>
    request(`/assets/${id}`, {
      method: 'DELETE',
    }),
  exportQRCodes: async (assetIds) => {
    const token = getToken();
    const res = await fetch('/api/assets/export-qrcodes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ assetIds }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || '匯出失敗');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'qrcodes.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
  uploadDetailPhotos: (id, formData) =>
    request(`/assets/${id}/photos`, {
      method: 'POST',
      body: formData,
    }),
  deleteDetailPhoto: (id, photoId) =>
    request(`/assets/${id}/photos/${photoId}`, {
      method: 'DELETE',
    }),
};

// Categories API
export const categoriesAPI = {
  list: () => request('/categories'),
  create: (data) =>
    request('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  delete: (id) =>
    request(`/categories/${id}`, {
      method: 'DELETE',
    }),
  update: (id, data) =>
    request(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// Roles API
export const rolesAPI = {
  list: () => request('/roles'),
  create: (data) =>
    request('/roles', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  delete: (id) =>
    request(`/roles/${id}`, {
      method: 'DELETE',
    }),
  update: (id, data) =>
    request(`/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// Audit API
export const auditAPI = {
  list: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== null) query.set(k, v);
    });
    return request(`/audit?${query.toString()}`);
  },
};

// System Backup API
export const systemAPI = {
  export: (tables = []) =>
    request('/system/export', {
      method: 'POST',
      body: JSON.stringify({ tables }),
    }),
  import: (mode, data) =>
    request('/system/import', {
      method: 'POST',
      body: JSON.stringify({ mode, data }),
    }),
};
