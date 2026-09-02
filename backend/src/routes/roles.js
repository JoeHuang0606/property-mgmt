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
 * PUT /api/roles/:id
 * 修改職類（僅 admin）
 */
router.put('/:id', authorize('admin'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { name, prefix } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: '請提供職類名稱' });
    }

    if (!prefix || !prefix.trim()) {
      return res.status(400).json({ error: '請提供職類前綴' });
    }

    const cleanPrefix = prefix.trim().toUpperCase();
    if (!/^[A-Z0-9]+$/.test(cleanPrefix)) {
      return res.status(400).json({ error: '職類前綴只能包含大寫英文與數字' });
    }

    // 先取得舊前綴
    const oldResult = await client.query('SELECT prefix FROM custodian_roles WHERE id = $1', [id]);
    if (oldResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: '職類不存在' });
    }
    const oldPrefix = oldResult.rows[0].prefix;

    await client.query('BEGIN');

    const result = await client.query(
      'UPDATE custodian_roles SET name = $1, prefix = $2 WHERE id = $3 RETURNING id, name, prefix',
      [name.trim(), cleanPrefix, id]
    );

    // 前綴變更時，更新所有相關財產的編號和 QR Code
    if (oldPrefix !== cleanPrefix) {
      const assets = await client.query(
        'SELECT id, asset_code FROM assets WHERE custodian_role_id = $1',
        [id]
      );

      for (const asset of assets.rows) {
        // 替換編號開頭的舊職類前綴為新前綴
        const newCode = asset.asset_code.replace(
          new RegExp(`^${oldPrefix}-`),
          `${cleanPrefix}-`
        );
        const { generateQRCode } = require('../services/qrcode');
        const qrCode = await generateQRCode(newCode);
        await client.query(
          'UPDATE assets SET asset_code = $1, qr_code = $2, updated_at = NOW() WHERE id = $3',
          [newCode, qrCode, asset.id]
        );
      }
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ error: '職類名稱已存在' });
    }
    console.error('修改職類錯誤:', err);
    res.status(500).json({ error: '伺服器內部錯誤' });
  } finally {
    client.release();
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
