# 📦 財產管理系統 (Property Management System) v1.0.0

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-v20+-green.svg)
![PostgreSQL](https://img.shields.io/badge/postgres-16-blue.svg)

一套前後端分離的現代化財產管理網站，支援 QR Code 掃描追蹤、多層次角色與職類權限控管、系統備份與還原功能，後端採用 Node.js 與 PostgreSQL 資料庫，並具備絕美的 iOS Liquid Glassmorphism (液態玻璃) 介面設計。

---

## ✨ 功能特色

| 功能 | 說明 |
|------|------|
| 🔐 **帳號與權限管理** | JWT 認證機制，管理員 (Admin) 可分配職類管理員 (Manager) 權限。 |
| 🏢 **分權管理** | 經理只能管理被分配職類下的財產，適合大型組織分層管理。 |
| 📱 **QR Code 掃描與匯出** | 支援生成財產的 QR Code 標籤供列印，也能透過手機鏡頭直接掃描 QR Code 快速盤點。 |
| 💾 **一鍵備份與還原** | 系統級別的資料匯出匯入，支援「合併」與「完全覆蓋」兩種安全模式。 |
| 📊 **視覺化儀表板** | 首頁提供統計數據卡片與長條圖，資產狀態（使用中、報廢、逾期等）一目瞭然。 |
| 📝 **操作日誌稽核** | 完整記錄所有登入與敏感的資料變更，方便後續安全稽核。 |
| 🖼️ **圖片上傳與相簿** | 財產可上傳多張照片，並有精美的燈箱預覽。 |
| 🌙 **深色/淺色主題切換** | 採用現代化的毛玻璃設計 (Glassmorphism)，並能依環境自由切換主題。 |

---

## 🏗️ 技術棧

| 領域 | 技術與框架 |
|------|------|
| **前端** | Vite, Vanilla JS, CSS (Glassmorphism), Chart.js |
| **後端** | Node.js, Express.js, Multer |
| **資料庫** | PostgreSQL 16 |
| **認證** | JWT (jsonwebtoken), bcrypt (密碼雜湊) |
| **掃描/條碼** | qrcode (生成), html5-qrcode (手機掃描) |
| **部署** | Docker, Docker Compose, Nginx |

---

## 🚀 快速開始 (Docker 部署)

最快且最乾淨的部署方式是透過 Docker，確保您的伺服器已經安裝了 `docker` 與 `docker compose`。

```bash
# 1. 取得專案程式碼
git clone https://github.com/JoeHuang0606/property-mgmt.git
cd property-mgmt

# 2. 修改密碼與環境變數 (重要)
# 請修改 docker-compose.yml 內的 DB_PASSWORD 與 JWT_SECRET
nano docker-compose.yml

# 3. 啟動服務與資料庫
docker compose up -d --build
```

服務啟動後，請開啟瀏覽器前往 `http://localhost:4173`。

### 🔄 如何更新到最新版本

若您已經部署過舊版本，想更新到最新版本，請在您的伺服器執行以下指令：

```bash
cd property-mgmt

# 1. 取得最新程式碼
sudo git fetch --all
sudo git checkout main
sudo git pull origin main

# 2. 重新編譯並啟動 Docker 容器
sudo docker compose up -d --build

# 3. 清理舊的無用映像檔 (選用)
sudo docker image prune -f
```

> **💡 常見錯誤排除 (Git 權限問題)**
> 如果在執行 `git fetch` 時遇到 `fatal: detected dubious ownership in repository` 錯誤，請執行以下指令將資料夾加入安全名單，再重新執行更新步驟：
> ```bash
> git config --global --add safe.directory /opt/property-mgmt
> ```
> 
> **💡 常見錯誤排除 (無法 Pull 最新程式碼)**
> 如果在執行 `git pull origin main` 時遇到 `error: Your local changes to the following files would be overwritten by merge`，這是因為您在伺服器上修改過密碼 (`docker-compose.yml`)。請改用以下指令來保留您的密碼並更新：
> ```bash
> git stash
> git pull origin main
> git stash pop
> ```

> **💡 資料會遺失嗎？**
> 不會的！PostgreSQL 資料庫已經掛載在 Docker Volume（`pgdata`） 中，重新執行指令只會更新後端 API 和前端頁面，您的帳號和財產資料都會完整保留。

---

## 🔑 預設帳號

首次啟動資料庫時，系統會自動建立一組預設管理員帳號：

| 帳號 | 密碼 | 角色 |
|------|------|------|
| `admin` | `admin123` | 管理員 |

> ⚠️ **安全性警告**：請在首次登入後，**立刻至右上角「修改密碼」變更管理員密碼**！
> ⚠️ **注意**：v1.0.0 版本已移除了部署時的預設分類與職類假資料，資料庫呈現完全乾淨的狀態。

---

## 👥 角色與權限架構

| 功能 | 管理員 (admin) | 職類管理員 (manager) | 使用者 (user) |
|------|:-:|:-:|:-:|
| **帳號/職類管理** (建立與刪除) | ✅ | ❌ | ❌ |
| **系統備份與操作日誌稽核** | ✅ | ❌ | ❌ |
| **管理所屬職類的財產** (新增/編輯/刪除) | ✅ | ✅ | ❌ |
| **檢視所有財產列表與詳情** | ✅ | ✅ | ✅ |
| **掃描 QR Code** | ✅ | ✅ | ✅ |

---

## 📡 API 開發者端點

| 模組 | 主要路由 | 說明 |
|------|------|------|
| **Auth** | `/api/auth/*` | 登入、登出、驗證、變更密碼。 |
| **Users** | `/api/users/*` | 帳號 CRUD 與權限設定 (Admin 專屬)。 |
| **Assets** | `/api/assets/*` | 財產 CRUD、狀態更新、統計、QR 掃描查詢。 |
| **Categories** | `/api/categories/*` | 財產分類。 |
| **Roles** | `/api/roles/*` | 職類管理。 |
| **System** | `/api/system/*` | 系統資料匯出與匯入 (Admin 專屬)。 |
| **Audit Log**| `/api/audit/*` | 系統操作日誌查詢。 |

---

## 🌐 伺服器與反向代理建議

若您要在生產環境上線，建議配置 Nginx 反向代理或 **Cloudflare Tunnels** 以啟用 HTTPS：

### Nginx 反向代理範例
```nginx
server {
    listen 80;
    server_name assets.yourdomain.com;

    location / {
        proxy_pass http://localhost:4173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # 支援靜態檔案與圖片上傳路徑
    location /api/uploads/ {
        proxy_pass http://localhost:3000/api/uploads/;
    }
}
```

---
*Developed for Modern Asset Management workflows.*
