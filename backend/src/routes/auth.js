const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const authenticate = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

/**
 * POST /api/auth/login
 * 使用者登入，回傳 JWT
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '請提供帳號和密碼' });
    }

    // 查詢使用者
    const result = await pool.query(
      'SELECT id, username, password, display_name, avatar_url, role FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: '帳號或密碼錯誤' });
    }

    const user = result.rows[0];

    // 驗證密碼
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: '帳號或密碼錯誤' });
    }
    // 查詢分配的職類 (若為 manager)
    let assignedRoles = [];
    if (user.role === 'manager') {
      const rolesRes = await pool.query('SELECT role_id FROM user_custodian_roles WHERE user_id = $1', [user.id]);
      assignedRoles = rolesRes.rows.map(r => r.role_id);
    }

    // 產生 JWT
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        role: user.role,
        assignedRoles
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    // 記錄登入日誌
    await pool.query(
      'INSERT INTO audit_logs (user_id, username, action, target, details) VALUES ($1, $2, $3, $4, $5)',
      [user.id, user.username, 'LOGIN', 'users', JSON.stringify({ ip: req.ip })]
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        role: user.role,
        assignedRoles
      },
    });
  } catch (err) {
    console.error('登入錯誤:', err);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

/**
 * POST /api/auth/change-password
 * 變更密碼（需認證）
 */
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: '請提供目前密碼和新密碼' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: '新密碼長度至少 6 個字元' });
    }

    // 查詢目前密碼
    const result = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '使用者不存在' });
    }

    // 驗證目前密碼
    const isValid = await bcrypt.compare(currentPassword, result.rows[0].password);
    if (!isValid) {
      return res.status(401).json({ error: '目前密碼錯誤' });
    }

    // 雜湊新密碼並更新
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, req.user.id]
    );

    // 記錄日誌
    await pool.query(
      'INSERT INTO audit_logs (user_id, username, action, target, target_id) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, req.user.username, 'CHANGE_PASSWORD', 'users', req.user.id]
    );

    res.json({ message: '密碼已成功變更' });
  } catch (err) {
    console.error('變更密碼錯誤:', err);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

/**
 * GET /api/auth/me
 * 取得當前使用者資訊
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, display_name, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '使用者不存在' });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      role: user.role,
      createdAt: user.created_at,
    });
  } catch (err) {
    console.error('取得使用者資訊錯誤:', err);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

/**
 * POST /api/auth/avatar
 * 上傳使用者頭像
 */
router.post('/avatar', authenticate, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '請提供要上傳的圖片' });
    }

    const avatarUrl = req.file.filename;

    await pool.query(
      'UPDATE users SET avatar_url = $1 WHERE id = $2',
      [avatarUrl, req.user.id]
    );

    res.json({
      message: '頭像上傳成功',
      avatarUrl
    });
  } catch (err) {
    console.error('上傳頭像錯誤:', err);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

module.exports = router;
