const express = require('express');
const pool = require('../config/db');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/role');

const router = express.Router();

// 僅 admin 可查看日誌
router.use(authenticate);
router.use(authorize('admin'));

/**
 * GET /api/audit
 * 列出操作日誌（支援分頁與篩選）
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      target,
      user_id,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    if (req.user.username !== 'Developer') {
      conditions.push(`al.username != 'Developer'`);
    }
    const values = [];
    let paramIndex = 1;

    if (action) {
      conditions.push(`al.action = $${paramIndex++}`);
      values.push(action);
    }

    if (target) {
      conditions.push(`al.target = $${paramIndex++}`);
      values.push(target);
    }

    if (user_id) {
      conditions.push(`al.user_id = $${paramIndex++}`);
      values.push(parseInt(user_id));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 總數
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM audit_logs al ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    // 資料
    const dataResult = await pool.query(
      `SELECT al.*, u.display_name AS user_display_name
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...values, parseInt(limit), offset]
    );

    res.json({
      data: dataResult.rows.map(log => ({
        id: log.id,
        userId: log.user_id,
        username: log.username,
        userDisplayName: log.user_display_name,
        action: log.action,
        target: log.target,
        targetId: log.target_id,
        details: log.details,
        createdAt: log.created_at,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('取得操作日誌錯誤:', err);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

module.exports = router;
