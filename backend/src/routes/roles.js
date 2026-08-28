const express = require('express');
const pool = require('../config/db');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/role');

const router = express.Router();

router.use(authenticate);

/**
 * GET /api/roles
 * 列出所有職類
 */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.id, r.name, r.prefix, COUNT(a.id) AS asset_count
       FROM custodian_roles r
       LEFT JOIN assets a ON r.id = a.custodian_role_id
       GROUP BY r.id, r.name, r.prefix
       ORDER BY r.name`
    );

    res.json(result.rows.map(r => ({
      id: r.id,
      name: r.name,
      prefix: r.prefix,
      assetCount: parseInt(r.asset_count),
    })));
  } catch (err) {
    console.error('取得職類列表錯誤:', err);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

/**
 * POST /api/roles
 * 新增職類（僅 admin）
 */
router.post('/', authorize('admin'), async (req, res) => {
  try {
    const { name, prefix } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: '請提供職類名稱' });
    }

    if (!prefix || !prefix.trim()) {
      return res.status(400).json({ error: '請提供職類前綴' });
    }

    const cleanPrefix = prefix.trim();
    if (!/^[A-Z0-9]+$/.test(cleanPrefix)) {
      return res.status(400).json({ error: '職類前綴只能包含大寫英文與數字' });
    }

    const result = await pool.query(
      'INSERT INTO custodian_roles (name, prefix) VALUES ($1, $2) RETURNING id, name, prefix',
      [name.trim(), cleanPrefix]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: '職類名稱已存在' });
    }
    console.error('新增職類錯誤:', err);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

/**
 * DELETE /api/roles/:id
 * 刪除職類（admin）
 */
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM custodian_roles WHERE id = $1 RETURNING name',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '職類不存在' });
    }

    res.json({ message: `職類「${result.rows[0].name}」已刪除` });
  } catch (err) {
    console.error('刪除職類錯誤:', err);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

module.exports = router;
