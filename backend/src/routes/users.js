const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/role');

const router = express.Router();

// 所有路由需要登入
router.use(authenticate);

/**
 * GET /api/users
 * 列出所有使用者
 */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.username, u.display_name, u.role, u.created_at, u.updated_at,
             COALESCE(array_agg(ucr.role_id) FILTER (WHERE ucr.role_id IS NOT NULL), '{}') AS assigned_roles
      FROM users u
      LEFT JOIN user_custodian_roles ucr ON u.id = ucr.user_id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);
    res.json(result.rows.map(u => ({
      id: u.id,
      username: u.username,
      displayName: u.display_name,
      role: u.role,
      assignedRoles: u.assigned_roles,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
    })));
  } catch (err) {
    console.error('取得使用者列表錯誤:', err);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

/**
 * POST /api/users
 * 新增使用者（僅 admin）
 */
router.post('/', authorize('admin'), async (req, res) => {
  try {
    const { username, password, displayName, role } = req.body;

    if (!username || !password || !displayName) {
      return res.status(400).json({ error: '請提供帳號、密碼和顯示名稱' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '密碼長度至少 6 個字元' });
    }

    const validRoles = ['admin', 'manager', 'user'];
    const userRole = role || 'user';
    if (!validRoles.includes(userRole)) {
      return res.status(400).json({ error: '無效的角色' });
    }

    // 檢查帳號是否已存在
    const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: '帳號已存在' });
    }

    // 雜湊密碼
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (username, password, display_name, role) VALUES ($1, $2, $3, $4) RETURNING id, username, display_name, role, created_at',
      [username, hashedPassword, displayName, userRole]
    );

    const user = result.rows[0];

    // 記錄日誌
    await pool.query(
      'INSERT INTO audit_logs (user_id, username, action, target, target_id, details) VALUES ($1, $2, $3, $4, $5, $6)',
      [req.user.id, req.user.username, 'CREATE', 'users', user.id, JSON.stringify({ createdUser: username, role: userRole })]
    );

    res.status(201).json({
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      role: user.role,
      createdAt: user.created_at,
    });
  } catch (err) {
    console.error('新增使用者錯誤:', err);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

/**
 * PUT /api/users/:id
 * 更新使用者
 */
router.put('/:id', authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { displayName, role, password } = req.body;

    // 不允許修改自己的角色
    if (parseInt(id) === req.user.id && role && role !== req.user.role) {
      return res.status(400).json({ error: '不能修改自己的角色' });
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (displayName) {
      updates.push(`display_name = $${paramIndex++}`);
      values.push(displayName);
    }

    if (role) {
      const validRoles = ['admin', 'manager', 'user'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: '無效的角色' });
      }
      updates.push(`role = $${paramIndex++}`);
      values.push(role);
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: '密碼長度至少 6 個字元' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push(`password = $${paramIndex++}`);
      values.push(hashedPassword);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: '沒有提供要更新的欄位' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, username, display_name, role, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '使用者不存在' });
    }

    const user = result.rows[0];

    // 記錄日誌
    await pool.query(
      'INSERT INTO audit_logs (user_id, username, action, target, target_id, details) VALUES ($1, $2, $3, $4, $5, $6)',
      [req.user.id, req.user.username, 'UPDATE', 'users', user.id, JSON.stringify({ updatedFields: Object.keys(req.body) })]
    );

    res.json({
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      role: user.role,
      updatedAt: user.updated_at,
    });
  } catch (err) {
    console.error('更新使用者錯誤:', err);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

/**
 * DELETE /api/users/:id
 * 刪除使用者
 */
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // 不能刪除自己
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: '不能刪除自己的帳號' });
    }

    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING username',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '使用者不存在' });
    }

    // 記錄日誌
    await pool.query(
      'INSERT INTO audit_logs (user_id, username, action, target, target_id, details) VALUES ($1, $2, $3, $4, $5, $6)',
      [req.user.id, req.user.username, 'DELETE', 'users', parseInt(id), JSON.stringify({ deletedUser: result.rows[0].username })]
    );

    res.json({ message: '使用者已刪除' });
  } catch (err) {
    console.error('刪除使用者錯誤:', err);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

/**
 * PUT /api/users/:id/roles
 * 更新使用者的職類分配（僅 admin 可操作）
 */
router.put('/:id/roles', authorize('admin'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { roleIds } = req.body; // array of role IDs

    if (!Array.isArray(roleIds)) {
      return res.status(400).json({ error: 'roleIds 必須是陣列' });
    }

    // 檢查使用者是否存在且為 manager
    const userRes = await client.query('SELECT role FROM users WHERE id = $1', [id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: '使用者不存在' });
    }
    if (userRes.rows[0].role !== 'manager') {
      return res.status(400).json({ error: '只能分配職類給管理員 (manager)' });
    }

    await client.query('BEGIN');

    // 刪除舊有關聯
    await client.query('DELETE FROM user_custodian_roles WHERE user_id = $1', [id]);

    // 插入新關聯
    if (roleIds.length > 0) {
      const values = roleIds.map(roleId => `(${id}, ${roleId})`).join(', ');
      await client.query(`INSERT INTO user_custodian_roles (user_id, role_id) VALUES ${values}`);
    }

    // 記錄日誌
    await client.query(
      'INSERT INTO audit_logs (user_id, username, action, target, target_id, details) VALUES ($1, $2, $3, $4, $5, $6)',
      [req.user.id, req.user.username, 'UPDATE_ROLES', 'users', id, JSON.stringify({ assignedRoleIds: roleIds })]
    );

    await client.query('COMMIT');
    res.json({ message: '職類分配更新成功', assignedRoles: roleIds });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('更新使用者職類錯誤:', err);
    res.status(500).json({ error: '伺服器內部錯誤' });
  } finally {
    client.release();
  }
});

module.exports = router;
