const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/role');

// 允許的資料表 (注意：不允許備份/還原 schema migrations 等，只處理業務表)
const ALLOWED_TABLES = [
  'users',
  'categories',
  'custodian_roles',
  'user_custodian_roles',
  'assets',
  'asset_custody_history',
  'audit_logs'
];

/**
 * POST /api/system/export
 * 匯出指定的資料表資料
 */
router.post('/export', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { tables } = req.body;
    let targetTables = ALLOWED_TABLES;

    if (Array.isArray(tables) && tables.length > 0) {
      targetTables = tables.filter(t => ALLOWED_TABLES.includes(t));
    }

    const exportData = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      data: {}
    };

    // 依序讀取指定資料表的內容
    for (const table of targetTables) {
      const result = await pool.query(`SELECT * FROM ${table}`);
      exportData.data[table] = result.rows;
    }

    // 記錄日誌
    await pool.query(
      'INSERT INTO audit_logs (user_id, username, action, target, target_id, details) VALUES ($1, $2, $3, $4, $5, $6)',
      [req.user.id, req.user.username, 'EXPORT', 'system', null, JSON.stringify({ tables: targetTables })]
    );

    res.json(exportData);
  } catch (err) {
    console.error('匯出資料錯誤:', err);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

/**
 * POST /api/system/import
 * 匯入資料庫
 */
router.post('/import', authenticate, authorize('admin'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { mode, data } = req.body; // mode: 'overwrite' | 'merge', data: { table_name: [...] }

    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: '無效的匯入資料' });
    }

    if (!['overwrite', 'merge'].includes(mode)) {
      return res.status(400).json({ error: '匯入模式錯誤 (必須是 overwrite 或 merge)' });
    }

    await client.query('BEGIN');

    // 取得資料庫中存在的 tables 鍵並確保在允許清單內
    const tablesToImport = Object.keys(data).filter(t => ALLOWED_TABLES.includes(t));

    // 如果是覆蓋模式，清空對應的表 (注意順序，因有關聯，使用 CASCADE 可以一次清空)
    if (mode === 'overwrite') {
      // 為了安全，我們先過濾並收集要清空的表
      const tablesList = tablesToImport.join(', ');
      if (tablesList) {
        await client.query(`TRUNCATE TABLE ${tablesList} CASCADE`);
      }
    }

    // 將資料倒進資料表，按依賴順序匯入 (users/roles/categories -> user_roles -> assets -> history/logs)
    const order = [
      'users',
      'custodian_roles',
      'categories',
      'user_custodian_roles',
      'assets',
      'asset_custody_history',
      'audit_logs'
    ];

    for (const table of order) {
      if (tablesToImport.includes(table) && Array.isArray(data[table]) && data[table].length > 0) {
        const rows = data[table];
        
        // 取得該表的所有欄位，並確保對應
        const keys = Object.keys(rows[0]);
        if (keys.length === 0) continue;

        for (const row of rows) {
          const rowKeys = Object.keys(row);
          const values = rowKeys.map(k => row[k]);
          
          const colNames = rowKeys.map(k => `"${k}"`).join(', ');
          const placeholders = rowKeys.map((_, i) => `$${i + 1}`).join(', ');

          let query = '';
          if (mode === 'overwrite') {
            query = `INSERT INTO ${table} (${colNames}) VALUES (${placeholders})`;
          } else {
            // merge 模式：嘗試 INSERT，如果遇到主鍵衝突則更新
            if (rowKeys.includes('id')) {
              const updateSet = rowKeys.filter(k => k !== 'id').map(k => `"${k}" = EXCLUDED."${k}"`).join(', ');
              if (updateSet) {
                query = `INSERT INTO ${table} (${colNames}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${updateSet}`;
              } else {
                query = `INSERT INTO ${table} (${colNames}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`;
              }
            } else {
              // 對於沒有 id 主鍵的關聯表 (如 user_custodian_roles)，可能無法簡單 DO UPDATE，則選擇 DO NOTHING
              if (table === 'user_custodian_roles') {
                query = `INSERT INTO user_custodian_roles (user_id, custodian_role_id) VALUES ($1, $2) ON CONFLICT (user_id, custodian_role_id) DO NOTHING`;
              } else {
                query = `INSERT INTO ${table} (${colNames}) VALUES (${placeholders})`;
              }
            }
          }
          await client.query(query, values);
        }

        // 如果是有自增 ID 的表，而且我們手動插入了 ID，需要更新 sequence 以免後續新增報錯 (duplicate key)
        if (keys.includes('id')) {
          await client.query(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE(MAX(id), 1)) FROM ${table}`);
        }
      }
    }

    // 記錄日誌
    await client.query(
      'INSERT INTO audit_logs (user_id, username, action, target, target_id, details) VALUES ($1, $2, $3, $4, $5, $6)',
      [req.user.id, req.user.username, 'IMPORT', 'system', null, JSON.stringify({ mode, tables: tablesToImport })]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: '資料匯入成功' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('匯入資料錯誤:', err);
    res.status(500).json({ error: '資料匯入失敗: ' + err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
