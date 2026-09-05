# 📦 財產管理系統 (Property Management System) v1.17.2

![Version](https://img.shields.io/badge/version-1.17.2-blue.svg)
![Node](https://img.shields.io/badge/node-v20+-green.svg)
![PostgreSQL](https://img.shields.io/badge/postgres-16-blue.svg)
![Docker](https://img.shields.io/badge/docker-ready-blue.svg)

一套前後端分離的現代化財產管理網站，專為企業與組織設計。支援 QR Code 掃描追蹤、多層次角色與職類權限控管、系統備份與還原功能。後端採用 Node.js 與 PostgreSQL 資料庫，並具備絕美的 iOS Liquid Glassmorphism (液態玻璃) 介面設計與完整的響應式體驗。

---

## ✨ 核心功能特色

| 功能 | 說明 |
|------|------|
| 🔐 **多層次權限與防護** | 具備 JWT 認證，區分管理員 (Admin)、職類管理員 (Manager) 與一般使用者。具備嚴謹的防越權機制，防止平移或向上提權。 |
| 🏢 **細緻的分權管理** | 經理只能管理被分配職類下的財產與人員；建立與分配職類時，嚴格限制只能授予自身擁有的職類權限。 |
| 📱 **QR Code 掃描與匯出** | 支援生成財產的 QR Code 標籤（2x3cm 含名稱排版）供列印，也能透過手機鏡頭直接掃描 QR Code 快速盤點。 |
| 💾 **一鍵備份與還原** | 系統級別的資料匯出匯入，支援「合併」與「完全覆蓋」兩種安全模式，確保資料移轉不遺失。 |
| 📊 **視覺化儀表板** | 首頁提供統計數據卡片與 Chart.js 長條圖，資產狀態（使用中、報廢、逾期等）一目瞭然。 |
| 📝 **進階操作日誌稽核** | 完整記錄所有登入與敏感的資料變更，支援特定人員篩選與自訂分頁跳轉，方便後續安全稽核。 |
| 🖼️ **相機整合與燈箱相簿** | 財產可上傳多張照片並於精美燈箱預覽；歸還財產可強制要求上傳照片，全面支援手機相機即時拍照。 |
| 👤 **個人頭像整合** | 支援個人頭像上傳與智慧 1x1 裁切，並全面整合至導覽列與帳號管理清單中，識別更直覺。 |
| 🌙 **深色/淺色主題切換** | 採用現代化的毛玻璃設計 (Glassmorphism)，並能依環境自由手動或自動切換主題。 |
| 🏷️ **連動更新與防呆機制** | 修改分類或職類前綴時，自動同步更新所有相關財產編號；已歸還財產的保管人欄位會自動切換為「-」。 |
| 🔍 **進階快速篩選** | 財產列表支援「職類篩選」與「只顯示我的財產」快速篩選，精準定位所需資產。 |
| 🔄 **無痛升級與向下相容** | 伺服器啟動時會自動偵測並修正舊版資料庫結構缺失，部署新版完全無痛。 |

---

## 🏗️ 技術棧

| 領域 | 技術與框架 |
|------|------|
| **前端** | Vite, Vanilla JS, CSS (Glassmorphism), Chart.js |
| **後端** | Node.js, Express.js, Multer (圖片處理) |
| **資料庫** | PostgreSQL 16 |
| **安全認證** | JWT (jsonwebtoken), bcrypt (密碼雜湊) |
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
# 請務必修改 docker-compose.yml 內的 DB_PASSWORD 與 JWT_SECRET
nano docker-compose.yml

# 3. 啟動服務與資料庫
docker compose up -d --build
```

服務啟動後，請開啟瀏覽器前往 `http://localhost:4173` 或您設定的網域。

---

## 🔄 系統更新指南

如果您已經在伺服器上部署了舊版本，並想要同步最新的 GitHub 程式碼（升級至最新版），請依循以下步驟進行安全升級：

### 標準更新流程

```bash
cd /opt/property-mgmt  # 進入您的專案目錄

# 1. 暫存您在伺服器上修改過的檔案 (例如 docker-compose.yml 的密碼設定)
sudo git stash

# 2. 獲取最新程式碼並強制同步
sudo git fetch --all
sudo git reset --hard origin/main

# 3. 還原您修改過的設定檔
sudo git stash pop

# 4. 重新編譯並啟動 Docker 容器
sudo docker compose down
sudo docker compose up -d --build
```

### 常見錯誤與排除方式

---

#### ❌ 錯誤 1: Git — `fatal: detected dubious ownership in repository`

**原因**：Git 偵測到專案目錄的擁有者與當前執行使用者不同（例如用 `root` 操作但目錄歸屬其他使用者）。

**解法**：將專案目錄加入 Git 安全名單：
```bash
git config --global --add safe.directory /opt/property-mgmt
```

---

#### ❌ 錯誤 2: Git — `Your local changes would be overwritten by merge`

**原因**：您在伺服器上修改過 `docker-compose.yml`（例如改了密碼），導致 `git pull` 無法自動合併。

**解法**：用 `git stash` 暫存您的修改，拉取完再還原：
```bash
sudo git stash
sudo git fetch --all
sudo git reset --hard origin/main
sudo git stash pop
```

> 💡 如果 `git stash pop` 出現 **Conflict（衝突）**，請手動刪除衝突標記並確認密碼正確後儲存即可。

---

#### ❌ 錯誤 3: 後端容器不斷重啟 — `Restarting (1) X seconds ago`

**原因**：後端伺服器啟動時無法連線到資料庫，最常見的原因是 **密碼不一致**。

**診斷方式**：查看後端日誌 `docker logs asset-mgmt-backend`。若出現 `password authentication failed`，代表 `DB_PASSWORD` 跟 `POSTGRES_PASSWORD` 不一致。

**解法**：編輯 `docker-compose.yml`，確認以下兩個欄位的密碼 **完全相同**，然後重新啟動 `docker compose down` 及 `docker compose up -d --build`。

> ⚠️ **重要**：PostgreSQL 只會在 **第一次建立** 資料庫時設定密碼。如果資料庫已經建立過，單純修改 `POSTGRES_PASSWORD` 不會改變已有的密碼。

---

#### ❌ 錯誤 4: 密碼怎麼改都沒用 — 需要完全重建資料庫

**原因**：PostgreSQL 的密碼在第一次建立 Volume 時就固定了。

**解法**：刪除舊的 Volume 並完全重建（⚠️ **此操作會清除所有資料**）：
```bash
docker compose down
docker volume rm property-mgmt_pgdata
docker compose up -d --build
```

---

#### 💡 資料會遺失嗎？

**一般更新不會！** 您的資料庫（`pgdata`）和上傳的圖片（`uploads_data`）都被安全地掛載於 Docker Volumes。只要您 **沒有** 執行 `docker volume rm` 或 `docker compose down -v`，不論更新或重啟多少次，帳號和財產資料都會完整保留。

---

## 🔑 預設帳號

首次啟動資料庫時，系統會自動建立一組預設管理員帳號：

| 帳號 | 密碼 | 角色 |
|------|------|------|
| `admin` | `admin123` | 管理員 |

> ⚠️ **安全性警告**：請在首次登入後，**立刻至右上角「修改密碼」變更管理員密碼**！
> ⚠️ **資料狀態**：為確保生產環境安全，系統預設只會建立上述的一組管理員帳號，不會產生任何範例假資料。

---

## 👥 角色與權限架構

| 功能 | 管理員 (admin) | 職類管理員 (manager) | 使用者 (user) |
|------|:-:|:-:|:-:|
| **帳號/職類管理** (建立與刪除) | ✅ | ❌ | ❌ |
| **系統備份與操作日誌稽核** | ✅ | ❌ | ❌ |
| **管理所屬職類的財產** (新增/編輯/刪除) | ✅ | ✅ | ❌ |
| **分配/創建職類權限** (只能賦予自己擁有的職類) | ✅ | ✅ | ❌ |
| **檢視所有財產列表與詳情** | ✅ | ✅ | ✅ |
| **掃描 QR Code** | ✅ | ✅ | ✅ |

---

## 📡 API 開發者端點

| 模組 | 主要路由 | 說明 |
|------|------|------|
| **Auth** | `/api/auth/*` | 登入、登出、驗證、變更密碼。 |
| **Users** | `/api/users/*` | 帳號 CRUD 與權限設定。 |
| **Assets** | `/api/assets/*` | 財產 CRUD、狀態更新、統計、QR 掃描查詢。 |
| **Categories** | `/api/categories/*` | 財產分類。 |
| **Roles** | `/api/roles/*` | 職類管理。 |
| **System** | `/api/system/*` | 系統資料匯出與匯入。 |
| **Audit Log**| `/api/audit/*` | 系統操作日誌查詢。 |

---

## 🌐 伺服器與反向代理建議

若您要在生產環境上線，強烈建議配置 Nginx 反向代理或 **Cloudflare Tunnels** 以啟用 HTTPS 加密連線：

### Nginx 反向代理範例 (搭配 HTTPS)
```nginx
server {
    listen 80;
    server_name assets.yourdomain.com;

    location / {
        proxy_pass http://localhost:4173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 支援靜態檔案與圖片上傳路徑
    location /api/uploads/ {
        proxy_pass http://localhost:3000/api/uploads/;
    }
}
```

---
*Designed & Developed for Modern Asset Management Workflows.*
