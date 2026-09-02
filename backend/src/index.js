require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const pool = require('./config/db');
const fs = require('fs');
const path = require('path');

const app = express();
app.set('trust proxy', 1); // 信任一層反向代理 (Nginx)

const PORT = process.env.PORT || 3000;

// =============================================
// 安全中介層
// =============================================
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' })); // 增大 JSON 上限以支援大檔備份匯入

// 登入端點限流
const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 分鐘
  max: 20, // 最多 20 次嘗試
  message: { error: '登入嘗試次數過多，請 1 分鐘後再試' },
});

// 通用限流
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 分鐘
  max: 100,
  message: { error: '請求過於頻繁，請稍後再試' },
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', loginLimiter);

// =============================================
// 路由
// =============================================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/assets', require('./routes/assets'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/roles', require('./routes/roles'));
app.use('/api/audit', require('./routes/audit'));
app.use('/api/system', require('./routes/system'));

// 健康檢查端點
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 提供靜態圖片
app.use('/api/uploads', express.static(path.join(__dirname, '../public/uploads')));

// 404
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: '端點不存在' });
});

// 全域錯誤處理
app.use((err, req, res, next) => {
  console.error('未捕獲錯誤:', err);
  res.status(500).json({ error: '伺服器內部錯誤' });
});

// =============================================
// 資料庫初始化 & 啟動
// =============================================
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    // 讀取並執行 init.sql（排除 admin 密碼佔位行）
    const initSql = fs.readFileSync(
      path.join(__dirname, 'db', 'init.sql'),
      'utf-8'
    );

    // 移除 admin 密碼佔位的 INSERT 語句，改用程式處理
    const sqlWithoutAdminInsert = initSql.replace(
      /INSERT INTO users.*\$ADMIN_PASSWORD_PLACEHOLDER.*ON CONFLICT.*DO NOTHING;/s,
      ''
    );

    await client.query(sqlWithoutAdminInsert);

    // 檢查並新增 categories 與 custodian_roles 的 prefix 欄位 (向下相容舊資料庫)
    try {
      await client.query("ALTER TABLE categories ADD COLUMN IF NOT EXISTS prefix VARCHAR(10) NOT NULL DEFAULT 'CAT'");
      await client.query("ALTER TABLE custodian_roles ADD COLUMN IF NOT EXISTS prefix VARCHAR(10) NOT NULL DEFAULT 'ROLE'");
      await client.query("ALTER TABLE asset_custody_history ADD COLUMN IF NOT EXISTS return_photo TEXT");
    } catch (e) {
      console.error('更新資料庫結構時發生錯誤:', e);
    }

    // 遷移：將舊的 admin 帳號改名為 Developer
    try {
      await client.query("UPDATE users SET username = 'Developer', display_name = 'Developer' WHERE username = 'admin' AND NOT EXISTS (SELECT 1 FROM users WHERE username = 'Developer')");
    } catch (e) {
      console.error('更新預設管理員帳號時發生錯誤:', e);
    }

    // 檢查是否已有 Developer 帳號
    const developerCheck = await client.query(
      "SELECT id FROM users WHERE username = 'Developer'"
    );

    if (developerCheck.rows.length === 0) {
      // 建立預設 Developer 帳號
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await client.query(
        "INSERT INTO users (username, password, display_name, role) VALUES ('Developer', $1, 'Developer', 'admin')",
        [hashedPassword]
      );
      console.log('✅ 預設管理員帳號已建立 (Developer / admin123)');
    }

    // 清除任何現有屬於 Developer 的操作日誌
    try {
      await client.query("DELETE FROM audit_logs WHERE username = 'Developer'");
    } catch (e) {
      console.error('清除 Developer 操作日誌時發生錯誤:', e);
    }

    console.log('✅ 資料庫初始化完成');
  } catch (err) {
    console.error('❌ 資料庫初始化失敗:', err);
    throw err;
  } finally {
    client.release();
  }
}

async function start() {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 後端伺服器已啟動：http://localhost:${PORT}`);
      console.log(`📋 API 文件：http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('❌ 伺服器啟動失敗:', err);
    process.exit(1);
  }
}

start();
