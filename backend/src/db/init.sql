-- =============================================
-- 財產管理系統 - 資料庫初始化腳本
-- =============================================

-- 建立使用者表
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50) UNIQUE NOT NULL,
  password      VARCHAR(255) NOT NULL,
  display_name  VARCHAR(100) NOT NULL,
  role          VARCHAR(20) NOT NULL DEFAULT 'user'
                CHECK (role IN ('admin', 'manager', 'user')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 建立職類表
CREATE TABLE IF NOT EXISTS custodian_roles (
  id      SERIAL PRIMARY KEY,
  name    VARCHAR(100) UNIQUE NOT NULL,
  prefix  VARCHAR(10) UNIQUE NOT NULL
);

-- 建立使用者與職類的關聯表 (分配職類給經理)
CREATE TABLE IF NOT EXISTS user_custodian_roles (
  user_id   INT REFERENCES users(id) ON DELETE CASCADE,
  role_id   INT REFERENCES custodian_roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- 建立財產分類表
CREATE TABLE IF NOT EXISTS categories (
  id      SERIAL PRIMARY KEY,
  name    VARCHAR(100) UNIQUE NOT NULL,
  prefix  VARCHAR(10) NOT NULL
);

-- 建立財產表
CREATE TABLE IF NOT EXISTS assets (
  id              SERIAL PRIMARY KEY,
  asset_code      VARCHAR(50) UNIQUE NOT NULL,
  name            VARCHAR(200) NOT NULL,
  category_id     INT REFERENCES categories(id) ON DELETE SET NULL,
  location        VARCHAR(200),
  custodian         VARCHAR(100) NOT NULL,
  custodian_role_id INT REFERENCES custodian_roles(id) ON DELETE SET NULL,
  custody_date    DATE NOT NULL,
  return_date     DATE,
  qr_code         TEXT,
  description     TEXT,
  image_url       TEXT,
  created_by      INT REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 建立操作日誌表
CREATE TABLE IF NOT EXISTS audit_logs (
  id          SERIAL PRIMARY KEY,
  user_id     INT REFERENCES users(id) ON DELETE SET NULL,
  username    VARCHAR(50),
  action      VARCHAR(50) NOT NULL,
  target      VARCHAR(50),
  target_id   INT,
  details     JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 建立保管歷史表
CREATE TABLE IF NOT EXISTS asset_custody_history (
  id          SERIAL PRIMARY KEY,
  asset_id    INT REFERENCES assets(id) ON DELETE CASCADE,
  custodian   VARCHAR(100) NOT NULL,
  take_date   DATE NOT NULL,
  return_date DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_assets_asset_code ON assets(asset_code);
CREATE INDEX IF NOT EXISTS idx_assets_category_id ON assets(category_id);
CREATE INDEX IF NOT EXISTS idx_assets_custodian ON assets(custodian);
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_asset_custody_history_asset ON asset_custody_history(asset_id);

-- 插入預設分類
INSERT INTO categories (name, prefix) VALUES
  ('電腦設備', 'IT'),
  ('辦公傢俱', 'FUR'),
  ('通訊設備', 'COM'),
  ('車輛', 'CAR'),
  ('儀器設備', 'EQ'),
  ('其他', 'OTH')
ON CONFLICT (name) DO NOTHING;

-- 插入預設職類
INSERT INTO custodian_roles (name, prefix) VALUES
  ('教師', 'TEA'),
  ('職員', 'STA'),
  ('約聘人員', 'CON'),
  ('學生', 'STU'),
  ('其他', 'OTH')
ON CONFLICT (name) DO NOTHING;

-- 插入預設管理員帳號（密碼: admin123，已用 bcrypt 雜湊）
-- $2a$10$... 為 bcrypt hash of 'admin123'
-- 此處使用佔位值，由程式初始化時處理
INSERT INTO users (username, password, display_name, role) VALUES
  ('admin', '$ADMIN_PASSWORD_PLACEHOLDER', '系統管理員', 'admin')
ON CONFLICT (username) DO NOTHING;
