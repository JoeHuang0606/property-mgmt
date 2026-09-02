const express = require('express');
const pool = require('../config/db');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/role');
const { generateQRCode } = require('../services/qrcode');
const ExcelJS = require('exceljs');
const upload = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// 所有路由需認證
router.use(authenticate);

/**
 * 產生唯一財產編號
 */
async function generateAssetCode(categoryId, custodianRoleId) {
  let catPrefix = 'CAT';
  let rolePrefix = 'ROLE';

  if (categoryId) {
    const catResult = await pool.query('SELECT prefix FROM categories WHERE id = $1', [categoryId]);
    if (catResult.rows.length > 0) {
      catPrefix = catResult.rows[0].prefix;
    }
  }

  if (custodianRoleId) {
    const roleResult = await pool.query('SELECT prefix FROM custodian_roles WHERE id = $1', [custodianRoleId]);
    if (roleResult.rows.length > 0) {
      rolePrefix = roleResult.rows[0].prefix;
    }
  }

  const prefix = `${rolePrefix}-${catPrefix}-`;

  const result = await pool.query(
    "SELECT asset_code FROM assets WHERE asset_code LIKE $1 ORDER BY LENGTH(asset_code) DESC, asset_code DESC LIMIT 1",
    [`${prefix}%`]
  );

  let seq = 1;
  if (result.rows.length > 0) {
    const lastCode = result.rows[0].asset_code;
    const lastSeqMatch = lastCode.match(/\d+$/);
    if (lastSeqMatch) {
      seq = parseInt(lastSeqMatch[0], 10) + 1;
    }
  }

  return `${prefix}${String(seq).padStart(3, '0')}`;
}

/**
 * GET /api/assets
 * 列出財產（支援搜尋、篩選、分頁）
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      category_id,
      custodian_role_id,
      custodian,
      sort = 'created_at',
      order = 'DESC',
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(a.name ILIKE $${paramIndex} OR a.asset_code ILIKE $${paramIndex} OR a.custodian ILIKE $${paramIndex})`);
      values.push(`%${search}%`);
      paramIndex++;
    }

    if (category_id) {
      conditions.push(`a.category_id = $${paramIndex++}`);
      values.push(parseInt(category_id));
    }

    if (custodian_role_id) {
      conditions.push(`a.custodian_role_id = $${paramIndex++}`);
      values.push(parseInt(custodian_role_id));
    }

    if (custodian) {
      conditions.push(`a.custodian ILIKE $${paramIndex++}`);
      values.push(`%${custodian}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 白名單排序
    const allowedSorts = ['created_at', 'name', 'asset_code', 'custody_date', 'return_date'];
    const sortColumn = allowedSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // 總數
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM assets a ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    // 資料
    const dataResult = await pool.query(
      `SELECT a.*, c.name AS category_name, u.display_name AS creator_name, cr.name AS custodian_role_name
       FROM assets a
       LEFT JOIN categories c ON a.category_id = c.id
       LEFT JOIN users u ON a.created_by = u.id
       LEFT JOIN custodian_roles cr ON a.custodian_role_id = cr.id
       ${whereClause}
       ORDER BY a.${sortColumn} ${sortOrder}
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...values, parseInt(limit), offset]
    );

    res.json({
      data: dataResult.rows.map(a => ({
        id: a.id,
        assetCode: a.asset_code,
        name: a.name,
        description: a.description,
        categoryId: a.category_id,
        categoryName: a.category_name,
        location: a.location,
        custodian: a.custodian,
        custodianRoleId: a.custodian_role_id,
        custodianRoleName: a.custodian_role_name,
        custodyDate: a.custody_date,
        returnDate: a.return_date,
        qrCode: a.qr_code,
        imageUrl: a.image_url,
        thumbnailUrl: a.thumbnail_url,
        createdBy: a.created_by,
        creatorName: a.creator_name,
        createdAt: a.created_at,
        updatedAt: a.updated_at,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('取得財產列表錯誤:', err);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

/**
 * GET /api/assets/stats
 * 取得統計數據
 */
router.get('/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE custodian IS NOT NULL AND custodian != '') AS assigned,
        COUNT(*) FILTER (WHERE custodian IS NULL OR custodian = '') AS unassigned
      FROM assets
    `);

    const stats = result.rows[0];
    res.json({
      total: parseInt(stats.total),
      assigned: parseInt(stats.assigned || 0),
      unassigned: parseInt(stats.unassigned || 0)
    });
  } catch (err) {
    console.error('取得統計數據錯誤:', err);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

/**
 * GET /api/assets/code/:code
 * 以 asset_code 查詢（供 QR 掃描使用）
 */
router.get('/code/:code', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, c.name AS category_name, u.display_name AS creator_name, cr.name AS custodian_role_name
       FROM assets a
       LEFT JOIN categories c ON a.category_id = c.id
       LEFT JOIN users u ON a.created_by = u.id
       LEFT JOIN custodian_roles cr ON a.custodian_role_id = cr.id
       WHERE a.asset_code = $1`,
      [req.params.code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '找不到此財產' });
    }

    const a = result.rows[0];
    res.json({
      id: a.id,
      assetCode: a.asset_code,
      name: a.name,
      description: a.description,
      categoryId: a.category_id,
      categoryName: a.category_name,
      location: a.location,
      custodian: a.custodian,
      custodianRoleId: a.custodian_role_id,
      custodianRoleName: a.custodian_role_name,
      custodyDate: a.custody_date,
      returnDate: a.return_date,
      qrCode: a.qr_code,
      imageUrl: a.image_url,
      thumbnailUrl: a.thumbnail_url,
      createdBy: a.created_by,
      creatorName: a.creator_name,
      createdAt: a.created_at,
      updatedAt: a.updated_at,
    });
  } catch (err) {
    console.error('以編號查詢財產錯誤:', err);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

/**
 * GET /api/assets/:id
 * 取得單一財產詳情
 */
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, c.name AS category_name, u.display_name AS creator_name, cr.name AS custodian_role_name
       FROM assets a
       LEFT JOIN categories c ON a.category_id = c.id
       LEFT JOIN users u ON a.created_by = u.id
       LEFT JOIN custodian_roles cr ON a.custodian_role_id = cr.id
       WHERE a.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '找不到此財產' });
    }

    const a = result.rows[0];
    
    // 取得詳情圖
    const photosResult = await pool.query('SELECT id, photo_url, created_at FROM asset_photos WHERE asset_id = $1 ORDER BY created_at ASC', [req.params.id]);

    res.json({
      id: a.id,
      assetCode: a.asset_code,
      name: a.name,
      description: a.description,
      categoryId: a.category_id,
      categoryName: a.category_name,
      location: a.location,
      custodian: a.custodian,
      custodianRoleId: a.custodian_role_id,
      custodianRoleName: a.custodian_role_name,
      custodyDate: a.custody_date,
      returnDate: a.return_date,
      qrCode: a.qr_code,
      imageUrl: a.image_url,
      thumbnailUrl: a.thumbnail_url,
      detailPhotos: photosResult.rows.map(p => ({ id: p.id, url: p.photo_url, createdAt: p.created_at })),
      createdBy: a.created_by,
      creatorName: a.creator_name,
      createdAt: a.created_at,
      updatedAt: a.updated_at,
    });
  } catch (err) {
    console.error('取得財產詳情錯誤:', err);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

/**
 * POST /api/assets
 * 新增財產（admin / manager）
 */
router.post('/', authorize('admin', 'manager'), upload.fields([{ name: 'mainPhoto', maxCount: 1 }, { name: 'thumbnailPhoto', maxCount: 1 }]), async (req, res) => {
  try {
    const { name, description, categoryId, location, custodian, custodianRoleId, custodyDate, returnDate } = req.body;

    if (!name || !custodian || !custodyDate || !custodianRoleId) {
      return res.status(400).json({ error: '請提供名稱、保管人、職類和保管日期' });
    }

    // 若為 manager，檢查是否擁有該職類權限
    if (req.user.role === 'manager') {
      const roleCheck = await pool.query('SELECT 1 FROM user_custodian_roles WHERE user_id = $1 AND role_id = $2', [req.user.id, custodianRoleId]);
      if (roleCheck.rows.length === 0) {
        return res.status(403).json({ error: '您沒有權限新增此職類的財產' });
      }
    }

    // 產生唯一編號
    const assetCode = await generateAssetCode(categoryId, custodianRoleId);

    // 產生 QR Code（內容為財產編號）
    const qrCode = await generateQRCode(assetCode);

    const result = await pool.query(
      `INSERT INTO assets (asset_code, name, description, category_id, location, custodian, custodian_role_id, custody_date, return_date, qr_code, image_url, thumbnail_url, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [assetCode, name, description || null, categoryId || null, location || null, custodian, custodianRoleId, custodyDate, returnDate || null, qrCode, req.files?.mainPhoto?.[0]?.filename || null, req.files?.thumbnailPhoto?.[0]?.filename || null, req.user.id]
    );

    const a = result.rows[0];

    // 新增保管歷史
    await pool.query(
      'INSERT INTO asset_custody_history (asset_id, custodian, take_date, return_date) VALUES ($1, $2, $3, $4)',
      [a.id, custodian, custodyDate, returnDate || null]
    );

    // 記錄日誌
    await pool.query(
      'INSERT INTO audit_logs (user_id, username, action, target, target_id, details) VALUES ($1, $2, $3, $4, $5, $6)',
      [req.user.id, req.user.username, 'CREATE', 'assets', a.id, JSON.stringify({ assetCode, name })]
    );

    res.status(201).json({
      id: a.id,
      assetCode: a.asset_code,
      name: a.name,
      description: a.description,
      categoryId: a.category_id,
      location: a.location,
      custodian: a.custodian,
      custodianRoleId: a.custodian_role_id,
      custodyDate: a.custody_date,
      returnDate: a.return_date,
      returnDate: a.return_date,
      qrCode: a.qr_code,
      imageUrl: a.image_url,
      thumbnailUrl: a.thumbnail_url,
      createdBy: a.created_by,
      createdAt: a.created_at,
    });
  } catch (err) {
    console.error('新增財產錯誤:', err);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

/**
 * PUT /api/assets/:id/return
 * 歸還財產（僅限該財產保管人或 admin/manager）
 */
router.put('/:id/return', authenticate, upload.single('returnPhoto'), async (req, res) => {
  try {
    const { id } = req.params;
    const { returnDate } = req.body;

    const returnPhoto = req.file ? req.file.filename : null;
    if (!returnPhoto) {
      return res.status(400).json({ error: '必須上傳歸還照片' });
    }

    // 先查詢財產
    const assetResult = await pool.query('SELECT * FROM assets WHERE id = $1', [id]);
    if (assetResult.rows.length === 0) {
      return res.status(404).json({ error: '找不到此財產' });
    }
    const asset = assetResult.rows[0];

    // 檢查權限：必須是 admin/manager 或是該財產的保管人 (比對 displayName)
    const isAdminOrManager = ['admin', 'manager'].includes(req.user.role);
    const isCustodian = asset.custodian === req.user.displayName;
    
    if (!isAdminOrManager && !isCustodian) {
      return res.status(403).json({ error: '您沒有權限歸還此財產' });
    }

    const result = await pool.query(
      'UPDATE assets SET return_date = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [returnDate || new Date(), id]
    );

    const a = result.rows[0];

    // 關閉仍在保管中的歷史紀錄，並寫入歸還照片
    await pool.query(
      'UPDATE asset_custody_history SET return_date = $1, return_photo = $2 WHERE asset_id = $3 AND return_date IS NULL',
      [returnDate || new Date(), returnPhoto, id]
    );

    // 記錄日誌
    await pool.query(
      'INSERT INTO audit_logs (user_id, username, action, target, target_id, details) VALUES ($1, $2, $3, $4, $5, $6)',
      [req.user.id, req.user.username, 'UPDATE', 'assets', a.id, JSON.stringify({ action: 'return', returnDate: returnDate })]
    );

    res.json({ success: true, returnDate: a.return_date });
  } catch (err) {
    console.error('歸還財產錯誤:', err);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

/**
 * PUT /api/assets/:id
 * 編輯財產（admin / manager）
 */
router.put('/:id', authorize('admin', 'manager'), upload.fields([{ name: 'mainPhoto', maxCount: 1 }, { name: 'thumbnailPhoto', maxCount: 1 }]), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, categoryId, location, custodian, custodianRoleId, custodyDate, returnDate } = req.body;

    // 先取得原本的財產資料
    const oldAssetResult = await pool.query('SELECT * FROM assets WHERE id = $1', [id]);
    if (oldAssetResult.rows.length === 0) {
      return res.status(404).json({ error: '找不到此財產' });
    }
    const oldAsset = oldAssetResult.rows[0];

    // 若為 manager，檢查是否對「原本的職類」與「新的職類」都有權限
    if (req.user.role === 'manager') {
      const assignedRolesRes = await pool.query('SELECT role_id FROM user_custodian_roles WHERE user_id = $1', [req.user.id]);
      const assignedRoles = assignedRolesRes.rows.map(r => r.role_id);
      
      if (oldAsset.custodian_role_id && !assignedRoles.includes(oldAsset.custodian_role_id)) {
        return res.status(403).json({ error: '您沒有權限編輯此職類的財產' });
      }
      
      if (custodianRoleId !== undefined && !assignedRoles.includes(parseInt(custodianRoleId))) {
        return res.status(403).json({ error: '您沒有權限將財產變更為此職類' });
      }
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) { updates.push(`name = $${paramIndex++}`); values.push(name); }
    if (description !== undefined) { updates.push(`description = $${paramIndex++}`); values.push(description); }
    if (categoryId !== undefined) { updates.push(`category_id = $${paramIndex++}`); values.push(categoryId); }
    if (location !== undefined) { updates.push(`location = $${paramIndex++}`); values.push(location); }
    if (custodian !== undefined) { updates.push(`custodian = $${paramIndex++}`); values.push(custodian); }
    if (custodianRoleId !== undefined) { updates.push(`custodian_role_id = $${paramIndex++}`); values.push(custodianRoleId); }
    if (custodyDate !== undefined) { updates.push(`custody_date = $${paramIndex++}`); values.push(custodyDate); }
    if (returnDate !== undefined) { updates.push(`return_date = $${paramIndex++}`); values.push(returnDate || null); }
    if (req.files?.mainPhoto) { updates.push(`image_url = $${paramIndex++}`); values.push(req.files.mainPhoto[0].filename); }
    if (req.files?.thumbnailPhoto) { updates.push(`thumbnail_url = $${paramIndex++}`); values.push(req.files.thumbnailPhoto[0].filename); }
    if (updates.length === 0) {
      return res.status(400).json({ error: '沒有提供要更新的欄位' });
    }

    updates.push('updated_at = NOW()');
    values.push(parseInt(id));

    const result = await pool.query(
      `UPDATE assets SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    const a = result.rows[0];

    // 如果保管人或保管時間有變更，則新增一筆歷史紀錄
    if (custodian !== undefined && custodian !== oldAsset.custodian) {
      // 嘗試先將未歸還的歷史紀錄設為現在
      await pool.query(
        'UPDATE asset_custody_history SET return_date = NOW() WHERE asset_id = $1 AND return_date IS NULL',
        [a.id]
      );
      
      // 插入新的歷史紀錄
      await pool.query(
        'INSERT INTO asset_custody_history (asset_id, custodian, take_date, return_date) VALUES ($1, $2, $3, $4)',
        [a.id, a.custodian, a.custody_date, a.return_date]
      );
    } else if (returnDate !== undefined && returnDate !== oldAsset.return_date) {
      // 若只變更歸還時間，就更新最近的歷史紀錄
      await pool.query(
        'UPDATE asset_custody_history SET return_date = $1 WHERE asset_id = $2 AND return_date IS NULL',
        [a.return_date, a.id]
      );
    }

    // 記錄日誌
    await pool.query(
      'INSERT INTO audit_logs (user_id, username, action, target, target_id, details) VALUES ($1, $2, $3, $4, $5, $6)',
      [req.user.id, req.user.username, 'UPDATE', 'assets', a.id, JSON.stringify({ updatedFields: Object.keys(req.body) })]
    );

    res.json({
      id: a.id,
      assetCode: a.asset_code,
      name: a.name,
      description: a.description,
      categoryId: a.category_id,
      location: a.location,
      custodian: a.custodian,
      custodianRoleId: a.custodian_role_id,
      custodyDate: a.custody_date,
      returnDate: a.return_date,
      qrCode: a.qr_code,
      imageUrl: a.image_url,
      thumbnailUrl: a.thumbnail_url,
      createdAt: a.created_at,
      updatedAt: a.updated_at,
    });
  } catch (err) {
    console.error('編輯財產錯誤:', err);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

/**
 * DELETE /api/assets/:id
 * 刪除財產（admin / manager）
 */
router.delete('/:id', authorize('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM assets WHERE id = $1 RETURNING asset_code, name',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '找不到此財產' });
    }

    // 記錄日誌
    await pool.query(
      'INSERT INTO audit_logs (user_id, username, action, target, target_id, details) VALUES ($1, $2, $3, $4, $5, $6)',
      [req.user.id, req.user.username, 'DELETE', 'assets', parseInt(id), JSON.stringify({ assetCode: result.rows[0].asset_code, name: result.rows[0].name })]
    );

    res.json({ message: '財產已刪除' });
  } catch (err) {
    console.error('刪除財產錯誤:', err);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

/**
 * POST /api/assets/:id/take-custody
 * 掃描領取保管
 */
router.post('/:id/take-custody', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const assetResult = await pool.query('SELECT * FROM assets WHERE id = $1', [id]);
    if (assetResult.rows.length === 0) {
      return res.status(404).json({ error: '找不到此財產' });
    }
    const asset = assetResult.rows[0];

    // 檢查是否已歸還 (若無 return_date，代表仍有人保管)
    if (!asset.return_date) {
      return res.status(400).json({ error: '此財產目前仍有人保管中，無法領取' });
    }

    const today = new Date();
    // 更新財產表
    await pool.query(
      'UPDATE assets SET custodian = $1, custody_date = $2, return_date = NULL, updated_at = NOW() WHERE id = $3',
      [req.user.displayName, today, id]
    );

    // 寫入歷史表
    await pool.query(
      'INSERT INTO asset_custody_history (asset_id, custodian, take_date, return_date) VALUES ($1, $2, $3, NULL)',
      [id, req.user.displayName, today]
    );

    // 記錄日誌
    await pool.query(
      'INSERT INTO audit_logs (user_id, username, action, target, target_id, details) VALUES ($1, $2, $3, $4, $5, $6)',
      [req.user.id, req.user.username, 'TAKE_CUSTODY', 'assets', parseInt(id), JSON.stringify({ custodian: req.user.displayName })]
    );

    res.json({ success: true, custodian: req.user.displayName, custodyDate: today });
  } catch (err) {
    console.error('領取保管錯誤:', err);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

/**
 * GET /api/assets/:id/history
 * 取得保管歷史
 */
router.get('/:id/history', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM asset_custody_history WHERE asset_id = $1 ORDER BY take_date DESC, created_at DESC',
      [id]
    );
    res.json(result.rows.map(row => ({
      id: row.id,
      assetId: row.asset_id,
      custodian: row.custodian,
      takeDate: row.take_date,
      returnDate: row.return_date,
      returnPhoto: row.return_photo,
      createdAt: row.created_at
    })));
  } catch (err) {
    console.error('取得保管歷史錯誤:', err);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

/**
 * POST /api/assets/export-qrcodes
 * 批量匯出勾選的財產 QR Code (Excel)
 */
router.post('/export-qrcodes', authorize('admin', 'manager'), async (req, res) => {
  try {
    const { assetIds } = req.body;
    if (!Array.isArray(assetIds) || assetIds.length === 0) {
      return res.status(400).json({ error: '請提供要匯出的財產 ID' });
    }

    const result = await pool.query(
      `SELECT id, asset_code, qr_code FROM assets WHERE id = ANY($1) ORDER BY asset_code ASC`,
      [assetIds]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '找不到指定的財產' });
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('QR Codes');

    sheet.getColumn('A').width = 10;
    sheet.getColumn('B').width = 1.2;
    sheet.getColumn('C').width = 10;
    sheet.getColumn('D').width = 1.2;
    sheet.getColumn('E').width = 10;

    let rowIndex = 1;
    let colIndex = 1;

    for (let i = 0; i < result.rows.length; i++) {
      const asset = result.rows[i];
      if (!asset.qr_code) continue;

      const imageId = workbook.addImage({
        base64: asset.qr_code,
        extension: 'png',
      });

      sheet.getRow(rowIndex).height = 70; // 2cm大約是 57 points，預留13 points給下方的文字
      sheet.getRow(rowIndex + 1).height = 3;

      sheet.addImage(imageId, {
        tl: { col: colIndex - 1, row: rowIndex - 1 },
        ext: { width: 76, height: 76 } // 2cm = 75.59 pixels (96 DPI)
      });

      const cell = sheet.getCell(rowIndex, colIndex);
      cell.value = asset.asset_code;
      cell.alignment = { vertical: 'bottom', horizontal: 'center' };
      cell.font = { size: 10, bold: true };

      colIndex += 2;
      if (colIndex > 5) {
        colIndex = 1;
        rowIndex += 2;
      }
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=qrcodes.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('匯出 QR Code 錯誤:', err);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

/**
 * POST /api/assets/:id/photos
 * 上傳多張財產詳情圖
 */
router.post('/:id/photos', authorize('admin', 'manager'), upload.array('detailPhotos', 10), async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: '請提供要上傳的圖片' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const savedPhotos = [];
      for (const file of req.files) {
        const result = await client.query(
          'INSERT INTO asset_photos (asset_id, photo_url) VALUES ($1, $2) RETURNING id, photo_url, created_at',
          [id, file.filename]
        );
        savedPhotos.push({
          id: result.rows[0].id,
          url: result.rows[0].photo_url,
          createdAt: result.rows[0].created_at
        });
      }
      
      // 記錄日誌
      await client.query(
        'INSERT INTO audit_logs (user_id, username, action, target, target_id, details) VALUES ($1, $2, $3, $4, $5, $6)',
        [req.user.id, req.user.username, 'UPLOAD_PHOTOS', 'assets', parseInt(id), JSON.stringify({ count: req.files.length })]
      );
      
      await client.query('COMMIT');
      res.json({ photos: savedPhotos });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('上傳詳情圖錯誤:', err);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

/**
 * DELETE /api/assets/:id/photos/:photoId
 * 刪除財產詳情圖
 */
router.delete('/:id/photos/:photoId', authorize('admin', 'manager'), async (req, res) => {
  try {
    const { id, photoId } = req.params;
    
    const result = await pool.query(
      'DELETE FROM asset_photos WHERE id = $1 AND asset_id = $2 RETURNING photo_url',
      [photoId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '找不到指定的圖片' });
    }

    // 嘗試從檔案系統刪除實體檔案
    try {
      const filePath = path.join(__dirname, '../../public/uploads', result.rows[0].photo_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (fsErr) {
      console.error('刪除實體檔案失敗, 忽略:', fsErr);
    }

    // 記錄日誌
    await pool.query(
      'INSERT INTO audit_logs (user_id, username, action, target, target_id, details) VALUES ($1, $2, $3, $4, $5, $6)',
      [req.user.id, req.user.username, 'DELETE_PHOTO', 'assets', parseInt(id), JSON.stringify({ photoId })]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('刪除詳情圖錯誤:', err);
    res.status(500).json({ error: '伺服器內部錯誤' });
  }
});

module.exports = router;
