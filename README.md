# 📦 財產管理系統 (Property Management System)

一套前後端分離的現代化財產管理網站，支援 QR Code 掃描追蹤、多層次角色與職類權限控管、系統備份與還原功能，後端採用 Node.js 與 PostgreSQL 資料庫。

---

## ✨ 功能特色

| 功能 | 說明 |
|------|------|
| 🔐 **帳號登入** | JWT 認證機制，安全可靠，僅管理員可建立帳號。 |
| 👥 **多角色權限** | 管理員 (Admin) > 職類管理員 (Manager) > 一般使用者 (User)。 |
| 🏢 **職類控管** | 管理員可將財產分類 (職類) 分配給不同經理，實現分權管理。 |
| 💾 **備份與還原** | 提供系統級別的一鍵備份與匯入功能 (支援合併與覆蓋模式)。 |
| 📱 **QR Code 掃描** | 開啟手機或電腦鏡頭掃描 QR Code，即時查看或編輯財產詳情。 |
| 🏷️ **QR Code 生成** | 每個財產自動產生唯一 QR Code，支援下載列印。 |
| 📊 **視覺化儀表板** | 總資產、使用中、已歸還、逾期、已報廢等數據一目瞭然。 |
| 📝 **操作日誌** | 完整記錄所有系統操作（僅管理員可查看），方便後續稽核。 |
| 🔍 **進階搜尋** | 支援名稱、編號、保管人搜尋，狀態與職類篩選。 |
| 🌙 **深色主題** | 採用 Apple iOS 液態玻璃 (Liquid Glassmorphism) 現代化設計。 |
| 📱 **響應式佈局** | 手機、平板、桌面完美適配，操作無死角。 |

---

## 🏗️ 技術棧

| 領域 | 技術與框架 |
|------|------|
| **前端** | Vite + Vanilla JS + CSS (Liquid Glassmorphism) |
| **後端** | Node.js + Express.js |
| **資料庫** | PostgreSQL 16 |
| **認證** | JWT (jsonwebtoken) + bcrypt (密碼雜湊) |
| **掃描/條碼** | qrcode (生成) + html5-qrcode (掃描) |
| **部署** | Docker + Docker Compose |

---

## 🚀 快速開始

### 部署到 Ubuntu Server (生產環境)

若您要在乾淨的 Ubuntu Server 架設，這是最推薦且最快的部署方式：

```bash
# 1. 安裝 Docker 與 Docker Compose
sudo apt update
sudo apt install -y docker.io docker-compose-v2 git

# 2. 啟動 Docker 服務並設定開機自啟
sudo systemctl enable --now docker
sudo usermod -aG docker $USER

# 3. 登出並重新登入，或執行以下指令使權限生效
newgrp docker

# 4. 取得專案程式碼 (建議放置於 /opt/ 以供系統級別服務使用)
sudo mkdir -p /opt/property-mgmt
sudo chown $USER:$USER /opt/property-mgmt
cd /opt/property-mgmt
git clone https://github.com/JoeHuang0606/property-mgmt.git .

# 5. 安全性設定：修改 docker-compose.yml 
# 務必更改以下兩個環境變數：
# - DB_PASSWORD: 換成您自訂的資料庫密碼
# - JWT_SECRET: 換成一長串複雜的亂碼 (例如 Xk9$vP2qL5#mN8*bV1@cZ7)
nano docker-compose.yml

# 6. 啟動服務 (在背景執行並編譯)
docker compose up -d --build

# 7. 確認服務狀態
docker compose ps
```

> **💡 防火牆設定**：請確保 Ubuntu 防火牆 (UFW) 有開啟 4173 埠 (前端) 或 80 埠 (若有配置 Nginx 反向代理)。
> ```bash
> sudo ufw allow 4173/tcp
> ```

啟動後，請在瀏覽器前往 `http://<您的伺服器IP>:4173` 即可看到登入畫面。

---

## 🔑 預設帳號

| 帳號 | 密碼 | 角色 |
|------|------|------|
| `admin` | `admin123` | 管理員 |

> ⚠️ **重要**：系統啟動後，請立即登入並**修改管理員密碼**！

---

## 👥 角色與權限

系統採用多層次權限控管，適合不同規模的組織使用：

| 功能 | 管理員 (admin) | 職類管理員 (manager) | 使用者 (user) |
|------|:-:|:-:|:-:|
| **帳號管理** (建立/刪除/編輯) | ✅ | ❌ | ❌ |
| **職類管理** (新增/刪除) | ✅ | ❌ | ❌ |
| **系統備份與還原** | ✅ | ❌ | ❌ |
| **操作日誌稽核** | ✅ | ❌ | ❌ |
| **管理所屬職類的財產** (新增/編輯/刪除) | ✅ | ✅ | ❌ |
| **檢視所有財產列表** | ✅ | ✅ | ✅ |
| **掃描 QR Code** | ✅ | ✅ | ✅ |
| **變更自身密碼** | ✅ | ✅ | ✅ |

> **說明**：管理員可以為每個「職類管理員」分配特定的管理職類。該管理員登入後，只能新增、修改、刪除「屬於他管理職類」的財產，無法跨職類操作，從而實現分權管理。

---

## 💾 系統備份與還原

系統提供兩種備份方式，確保資料安全：

### 1. 介面化備份與還原 (推薦)
管理員可從左側選單進入「資料管理」：
- **匯出**：可選擇要匯出的資料表 (例如只匯出財產與分類，不匯出使用者與日誌)。
- **匯入**：支援**「新增/合併 (Merge)」**與**「完全覆蓋 (Overwrite)」**兩種模式。

### 2. 資料庫層級備份 (原始 SQL)
Docker Compose 已將 PostgreSQL 資料持久化至 `pgdata` 卷宗，即使重啟也不會遺失。您可以直接匯出 SQL 檔：
```bash
# 匯出資料庫
docker exec -t asset-mgmt-db pg_dump -U postgres asset_management > backup.sql

# 還原資料庫
cat backup.sql | docker exec -i asset-mgmt-db psql -U postgres -d asset_management
```

---

## 📡 API 端點

| 模組 | 主要端點 | 說明 |
|------|------|------|
| **認證** | `/api/auth/*` | 登入、變更密碼、取得當前使用者。 |
| **使用者** | `/api/users/*` | 使用者帳號 CRUD 與權限設定 (僅 admin)。 |
| **財產** | `/api/assets/*` | 財產 CRUD、統計數據、QR 掃描查詢。 |
| **職類/分類** | `/api/categories/*` | 財產職類 CRUD。 |
| **系統管理** | `/api/system/*` | 系統資料匯出 (`/export`) 與匯入 (`/import`) (僅 admin)。 |
| **日誌稽核** | `/api/audit/*` | 系統操作日誌查詢 (僅 admin)。 |

---

## 🌐 網域與反向代理 (Cloudflare)

如果您希望將系統上線並綁定自己的網域，強烈建議使用 **Cloudflare Tunnels (Zero Trust)**。這不需要在防火牆開 Port，且自動提供 HTTPS 加密。

### 推薦方式：Cloudflare Tunnels (`cloudflared`)

1. 前往 [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) 控制台。
2. 進入 **Networks > Tunnels**，點擊 **Create a tunnel**。
3. 選擇 **Cloudflared**，為 Tunnel 命名（例如 `property-mgmt`）。
4. 選擇您的作業系統 (Debian/Ubuntu)，複製安裝指令並在伺服器上執行。
5. 安裝完成後，在 Cloudflare 控制台設定 **Public Hostname**：
   - **Subdomain**: `assets`
   - **Domain**: `您的網域.com`
   - **Service Type**: `HTTP`
   - **URL**: `localhost:4173` (指向您的前端)
6. 點擊 **Save**，即可透過 `https://assets.您的網域.com` 安全訪問系統！

### 替代方式：傳統 Nginx 反向代理

如果您偏好傳統方式，可使用 Nginx 並搭配 Cloudflare 的 DNS 代理 (橘色雲朵)：

1. 安裝 Nginx：`sudo apt install nginx`
2. 新增設定檔：`sudo nano /etc/nginx/sites-available/property-mgmt`
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
}
```
3. 啟用設定：
```bash
sudo ln -s /etc/nginx/sites-available/property-mgmt /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```
4. 確保 Cloudflare DNS 紀錄有開啟 Proxy (橘色雲朵)，即可獲得 HTTPS。

---

## 🔧 環境變數

您可以在 `docker-compose.yml` 或是後端的 `.env` 中修改以下變數：

| 變數 | 說明 | 預設值 (Docker) |
|------|------|--------|
| `DB_HOST` | PostgreSQL 主機 | `db` |
| `DB_USER` | PostgreSQL 使用者 | `postgres` |
| `DB_PASSWORD` | PostgreSQL 密碼 | *(請自行設定)* |
| `DB_NAME` | 資料庫名稱 | `asset_management` |
| `JWT_SECRET` | JWT 安全簽名密鑰 | *(請自行設定亂碼)* |
| `JWT_EXPIRES_IN` | 登入有效時間 | `8h` |

---

## 📱 QR Code 掃描使用說明

1. 登入系統後，點擊側邊欄的「掃描 QR Code」。
2. 點擊「開啟鏡頭」按鈕並允許瀏覽器存取相機。
3. 將財產上的 QR Code 對準鏡頭。
4. 系統自動辨識並顯示財產資訊卡片。
5. 若您擁有該職類的管理權限，可直接點擊「編輯財產」進行快速更新。

> 💡 若鏡頭無法使用，也可以在掃描頁面直接「手動輸入財產編號」進行快速查詢。

---

## 📄 授權

MIT License
