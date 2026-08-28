# 📦 財產管理系統 (Asset Management System)

一套前後端分離的財產管理網站，支援 QR Code 掃描追蹤、多角色權限控管、PostgreSQL 資料庫。

---

## ✨ 功能特色

| 功能 | 說明 |
|------|------|
| 🔐 帳號密碼登入 | JWT 認證，僅管理員可建立帳號 |
| 📱 QR Code 掃描 | 開啟鏡頭掃描 QR Code，即時查看財產詳情 |
| 🏷️ QR Code 生成 | 每個財產自動產生唯一 QR Code，可下載、列印 |
| 👥 多角色權限 | 管理員 > 職類管理員 > 使用者，權限遞減 |
| 📊 儀表板統計 | 總資產、使用中、已歸還、逾期、已報廢等數據 |
| 📝 操作日誌 | 完整記錄所有系統操作（僅管理員可查看） |
| 🔍 搜尋篩選 | 支援名稱、編號、保管人搜尋，狀態/分類篩選 |
| 🌙 深色主題 | 玻璃態 (Glassmorphism) 現代化設計 |
| 📱 響應式 | 手機、平板、桌面完美適配 |

---

## 🏗️ 技術棧

| 層級 | 技術 |
|------|------|
| 前端 | Vite + Vanilla JS + CSS (深色玻璃態) |
| 後端 | Node.js + Express.js |
| 資料庫 | PostgreSQL 16 |
| 認證 | JWT (jsonwebtoken) + bcrypt |
| QR Code | qrcode (生成) + html5-qrcode (掃描) |
| 部署 | Docker + Docker Compose |

---

## 🚀 快速開始

### 前置需求

- **Node.js** >= 18
- **PostgreSQL** >= 14
- **npm** >= 9
- （可選）**Docker** + **Docker Compose**

---

### 方式一：Docker Compose 一鍵部署（開發/測試環境推薦）

```bash
# 1. 複製專案
git clone <your-repo-url>
cd 財產管理

# 2. 修改 docker-compose.yml 中的密碼和 JWT_SECRET
#    ⚠️ 請務必修改預設密碼！

# 3. 啟動所有服務
docker compose up -d --build

# 4. 開啟瀏覽器
```

---

### 方式二：部署到 Ubuntu Server (生產環境)

若您要在乾淨的 Ubuntu Server 架設，可參考以下步驟：

```bash
# 1. 安裝 Docker 與 Docker Compose
sudo apt update
sudo apt install -y docker.io docker-compose-v2 git

# 2. 啟動 Docker 服務並設定開機自啟
sudo systemctl enable --now docker
sudo usermod -aG docker $USER

# 3. 登出並重新登入，或執行以下指令使權限生效
newgrp docker

# 4. 取得專案程式碼 (建議放置於 /opt/ 或使用者的家目錄 ~/)
# 方法 A: 放置於 /opt (適合系統層級的服務)
sudo mkdir -p /opt/property-mgmt
sudo chown $USER:$USER /opt/property-mgmt
cd /opt/property-mgmt
# 將檔案複製或 git clone 到此資料夾中
git clone <your-repo-url> .

# (或者) 方法 B: 放置於使用者家目錄
# cd ~
# git clone <your-repo-url> 財產管理
# cd 財產管理

# 5. 安全性設定：修改 docker-compose.yml 
# 務必更改以下兩個環境變數：
# - DB_PASSWORD: postgres_password_change_me
# - JWT_SECRET: change_this_to_a_strong_random_string
nano docker-compose.yml

# 6. 啟動服務 (在背景執行並編譯)
docker compose up -d --build

# 7. 確認服務狀態
docker compose ps
```
> **💡 防火牆設定**：請確保 Ubuntu 防火牆 (UFW) 有開啟 4173 port 或 80 port。
> ```bash
> sudo ufw allow 4173/tcp
> sudo ufw allow 80/tcp
> ```

---

### 💾 資料庫持久化與備份

預設情況下，`docker-compose.yml` 已經設定了 Docker 具名卷宗（Named Volume）`pgdata` 來保存資料：
```yaml
volumes:
  - pgdata:/var/lib/postgresql/data
```
這代表：
- **普通重啟**（如 `docker compose restart` 或伺服器重開機）**不會遺失資料**。
- **一般關閉**（如 `docker compose down` 或 `docker compose stop`）**不會遺失資料**。
- ⚠️ 只有在執行 `docker compose down -v` 時（帶有 `-v` 參數），才會強制刪除資料卷宗，導致資料庫完全重置。

**如何備份資料庫？**
在 Ubuntu 伺服器上，您可以隨時執行以下指令將當前資料庫匯出為 `.sql` 備份檔：
```bash
docker exec -t asset-mgmt-db pg_dump -U postgres asset_management > backup.sql
```

**如何還原資料庫？**
```bash
cat backup.sql | docker exec -i asset-mgmt-db psql -U postgres -d asset_management
```
#    前端：http://localhost:4173
#    後端 API：http://localhost:3000/api/health
```

服務啟動後，系統會自動：
- 建立資料庫表結構
- 建立預設管理員帳號 `admin` / `admin123`

---

### 方式二：手動部署

#### 1. 設定 PostgreSQL

```bash
# 建立資料庫
psql -U postgres -c "CREATE DATABASE asset_management;"
```

#### 2. 啟動後端

```bash
cd backend

# 複製環境變數範本
cp .env.example .env

# 編輯 .env，填入你的 PostgreSQL 設定
# ⚠️ 請務必修改 JWT_SECRET！

# 安裝依賴
npm install

# 啟動（開發模式，支援檔案變更自動重啟）
npm run dev

# 或正式啟動
npm start
```

後端啟動後會自動初始化資料庫表結構和預設管理員帳號。

#### 3. 啟動前端

```bash
cd frontend

# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev
```

開啟瀏覽器前往 `http://localhost:5173`

#### 4. 建構正式版本（可選）

```bash
cd frontend
npm run build
# 產出的靜態檔案位於 frontend/dist/
# 可使用 Nginx 或任何靜態檔案伺服器部署
```

---

## 🔑 預設帳號

| 帳號 | 密碼 | 角色 |
|------|------|------|
| `admin` | `admin123` | 管理員 |

> ⚠️ **重要**：部署後請立即登入並變更管理員密碼！

---

## 👥 角色權限

| 功能 | 管理員 (admin) | 職類管理員 (manager) | 使用者 (user) |
|------|:-:|:-:|:-:|
| 建立/刪除帳號 | ✅ | ❌ | ❌ |
| 管理財產 (新增/編輯/刪除) | ✅ | ✅ | ❌ |
| 檢視財產列表 | ✅ | ✅ | ✅ |
| 掃描 QR Code | ✅ | ✅ | ✅ |
| 查看操作日誌 | ✅ | ❌ | ❌ |
| 變更自身密碼 | ✅ | ✅ | ✅ |

---

## 📡 API 端點

### 認證
| 方法 | 端點 | 說明 |
|------|------|------|
| POST | `/api/auth/login` | 登入 |
| POST | `/api/auth/change-password` | 變更密碼 |
| GET | `/api/auth/me` | 取得當前使用者 |

### 使用者管理（僅 admin）
| 方法 | 端點 | 說明 |
|------|------|------|
| GET | `/api/users` | 列出所有使用者 |
| POST | `/api/users` | 新增使用者 |
| PUT | `/api/users/:id` | 更新使用者 |
| DELETE | `/api/users/:id` | 刪除使用者 |

### 財產管理
| 方法 | 端點 | 說明 | 權限 |
|------|------|------|------|
| GET | `/api/assets` | 列出財產（支援搜尋/篩選/分頁） | 所有 |
| GET | `/api/assets/stats` | 取得統計數據 | 所有 |
| GET | `/api/assets/:id` | 取得財產詳情 | 所有 |
| GET | `/api/assets/code/:code` | 以編號查詢（QR 掃描用） | 所有 |
| POST | `/api/assets` | 新增財產 | admin/manager |
| PUT | `/api/assets/:id` | 編輯財產 | admin/manager |
| DELETE | `/api/assets/:id` | 刪除財產 | admin/manager |

### 分類
| 方法 | 端點 | 說明 | 權限 |
|------|------|------|------|
| GET | `/api/categories` | 列出分類 | 所有 |
| POST | `/api/categories` | 新增分類 | admin/manager |
| DELETE | `/api/categories/:id` | 刪除分類 | admin |

### 操作日誌（僅 admin）
| 方法 | 端點 | 說明 |
|------|------|------|
| GET | `/api/audit` | 列出操作日誌 |

---

## 📁 專案結構

```
財產管理/
├── backend/                    # 後端 API
│   ├── src/
│   │   ├── index.js            # Express 入口
│   │   ├── config/db.js        # PostgreSQL 連線池
│   │   ├── middleware/
│   │   │   ├── auth.js         # JWT 認證中介層
│   │   │   └── role.js         # 角色權限中介層
│   │   ├── routes/
│   │   │   ├── auth.js         # 認證路由
│   │   │   ├── users.js        # 使用者管理路由
│   │   │   ├── assets.js       # 財產管理路由
│   │   │   ├── categories.js   # 分類路由
│   │   │   └── audit.js        # 操作日誌路由
│   │   ├── services/
│   │   │   └── qrcode.js       # QR Code 生成服務
│   │   └── db/
│   │       └── init.sql        # 資料庫初始化 SQL
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/                   # 前端 SPA
│   ├── src/
│   │   ├── main.js             # 前端入口
│   │   ├── style.css           # 深色主題設計系統
│   │   ├── router.js           # SPA 路由器
│   │   ├── api.js              # API 請求封裝
│   │   ├── auth.js             # 認證狀態管理
│   │   ├── pages/              # 頁面模組
│   │   │   ├── login.js
│   │   │   ├── dashboard.js
│   │   │   ├── assets.js
│   │   │   ├── asset-detail.js
│   │   │   ├── asset-form.js
│   │   │   ├── scanner.js
│   │   │   ├── users.js
│   │   │   └── audit-log.js
│   │   └── components/         # 可重用元件
│   │       ├── navbar.js
│   │       ├── sidebar.js
│   │       ├── modal.js
│   │       └── toast.js
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   ├── Dockerfile
│   └── nginx.conf
│
├── docker-compose.yml          # Docker 一鍵啟動
└── README.md                   # 本文件
```

---

## 🔧 環境變數

| 變數 | 說明 | 預設值 |
|------|------|--------|
| `DB_HOST` | PostgreSQL 主機 | `localhost` |
| `DB_PORT` | PostgreSQL 連接埠 | `5432` |
| `DB_USER` | PostgreSQL 使用者 | `postgres` |
| `DB_PASSWORD` | PostgreSQL 密碼 | - |
| `DB_NAME` | 資料庫名稱 | `asset_management` |
| `JWT_SECRET` | JWT 簽名密鑰 | - |
| `JWT_EXPIRES_IN` | JWT 有效時間 | `8h` |
| `PORT` | 後端服務埠 | `3000` |
| `FRONTEND_URL` | 前端網址（CORS） | `http://localhost:5173` |

---

## 📱 QR Code 掃描使用說明

1. 登入系統後，點擊側邊欄的「掃描 QR Code」
2. 點擊「開啟鏡頭」按鈕
3. 將財產上的 QR Code 對準鏡頭
4. 系統自動辨識並顯示財產資訊
5. 點擊「查看詳情」可跳轉至完整財產頁面

> 💡 也可以在掃描頁面手動輸入財產編號進行查詢

---

## 📄 授權

MIT License
