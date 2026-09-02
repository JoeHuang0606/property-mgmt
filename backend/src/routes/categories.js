const express = require('express');
const pool = require('../config/db');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/role');

const router = express.Router();

router.use(authenticate);

/**
 * GET /api/categories
 * 列出所有分類
 */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.name, c.prefix, COUNT(a.id) AS asset_count
       FROM categories c
       LEFT JOIN assets a ON c.id = a.category_id
       GROUP BY c.id, c.name, c.prefix
       ORDER BY c.name`
    );

    res.json(result.rows.map(c => ({
      id: c.id,
      name: c.name,
      prefix: c.prefix,
      assetCount: parseInt(c.asset_count),
    })));
  } catch (err) {
    console.error('取得分類列表錯誤:', err);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

/**
 * POST /api/categories
 * 新增分類（admin / manager）
 */
router.post('/', authorize('admin', 'manager'), async (req, res) => {
  try {
    const { name, prefix } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: '請提供分類名稱' });
    }

    if (!prefix || !prefix.trim()) {
      return res.status(400).json({ error: '請提供分類前綴' });
    }

    const cleanPrefix = prefix.trim().toUpperCase();
    if (!/^[A-Z]+$/.test(cleanPrefix)) {
      return res.status(400).json({ error: '分類前綴只能包含大寫英文' });
    }

    const result = await pool.query(
      'INSERT INTO categories (name, prefix) VALUES ($1, $2) RETURNING id, name, prefix',
      [name.trim(), cleanPrefix]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: '分類名稱已存在' });
    }
    console.error('新增分類錯誤:', err);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

/**
 * DELETE /api/categories/:id
 * 刪除分類（admin）
 */
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM categories WHERE id = $1 RETURNING name',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '分類不存在' });
    }

    res.json({ message: `分類「${result.rows[0].name}」已刪除` });
  } catch (err) {
    console.error('刪除分類錯誤:', err);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

module.exports = router;
