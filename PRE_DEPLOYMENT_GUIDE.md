# 115校慶園遊會 - 上線前置作業檢核與部署手冊 (Deployment & Readiness Guide)

本文件彙整「115校慶園遊會客製化訂單與產線調度系統」上線前已完成之各項底層基礎建設、資料庫結構、資安防護與部署作業指示。

---

## 一、 已完成之前置基礎建設清單

| 項目分類 | 實作檔案與路徑 | 規格說明 |
| :--- | :--- | :--- |
| **頂層架構規範** | [ARCHITECTURE_SPEC.md](file:///d:/115園遊會-3/ARCHITECTURE_SPEC.md) | 包含拓撲模型、NoSQL 設計、智慧拆單演算法、RBAC/FSM 狀態機與 14 天銷毀協議。 |
| **資料庫安全防禦規則** | [firestore.rules](file:///d:/115園遊會-3/firestore.rules) | 實作 12 人 RBAC 權限隔離、欄位層級寫入約束（學生唯讀防竄改、產線雙門檻守門、財務獨立核可）。 |
| **高並發檢索索引** | [firestore.indexes.json](file:///d:/115園遊會-3/firestore.indexes.json) | 預先配置工單狀態、母單、班級座號防撞複合索引，確保在百萬級併發時查詢不產生全表掃描。 |
| **商城與系統初始化字典** | [database/seed_data.json](file:///d:/115園遊會-3/database/seed_data.json) | 建立 5 款經典園遊會客製化商品（馬克杯、吸水杯墊、胸章、卡貼、海報）及尺寸/DPI限制與全校班級代碼。 |
| **資料庫抽象存取層 (DAL)** | [src/services/db.service.js](file:///d:/115園遊會-3/src/services/db.service.js) | 包含毫秒級母單號生成、品項聚合、獨立工單分裂、斷網離線佇列 (`OfflineTxQueue`) 與本機安全快照。 |
| **RBAC 資料脫敏與狀態守門** | [src/security/guard.js](file:///d:/115園遊會-3/src/security/guard.js) | 提供不同角色（財務/美術/產線/外送）存取資料時之即時脫敏過濾器，電話、金額與個資嚴格隔離。 |
| **14 天不可逆物理銷毀協議** | [src/security/wipeout.service.js](file:///d:/115園遊會-3/src/security/wipeout.service.js) | 實作閉幕起算 14 天倒數計時器與總召專屬密鑰物理刪除邏輯。 |

---

## 二、 前台、後台與商城資料庫結構對應

### 1. 前台 (商城與學生端)
* **商品清單與即時規格**：讀取 `products` 集合，獲取即時價格、交期與 DPI/長寬比要求。
* **學生身份驗證與登記**：寫入 `students` 集合，受 `class_code + seat_number` 唯一防撞約束與寫入後唯讀保護。
* **購物車結帳拆單**：透過 `dbService.submitOrder` 自動依品項分裂為多張子工單並批次存儲。

### 2. 後台 (產線、財務、審核、外送端)
* **財務組**：存取 `work_orders`，僅解鎖收款狀態標記與金額核銷。
* **美術審核組**：存取 `asset_pipeline`，核驗 DPI 與原始圖檔，個資與金額自動脫敏。
* **產線製作看板**：僅展示通過審核且已付款之工單，學生個資全面隱藏。
* **外送物流組**：以班級與座號排序，手機號碼動態遮蔽（如 `09******12`），列印 A4 三聯確認單。

---

## 三、 免費雲端大廠 (Zero-Cost Stack) 連線綁定步驟

當準備將系統正式連線至雲端時，請依下列步驟進行：

1. **Firebase Spark 方案配置**：
   * 前往 [Firebase Console](https://console.firebase.google.com/) 建立免費專案（選擇 Spark 方案）。
   * 啟用 **Cloud Firestore**（以生產模式啟動）。
   * 執行指令部署安全規則與索引：
     ```bash
     firebase deploy --only firestore:rules,firestore:indexes
     ```
   * 將專案 Config 填入 [src/config/system.config.js](file:///d:/115園遊會-3/src/config/system.config.js)。

2. **Cloudinary 免費圖檔圖床配置**：
   * 註冊 [Cloudinary](https://cloudinary.com/) 免費方案（每月 25 點數）。
   * 建立一個「Unsigned Upload Preset」（設定資料夾為 `115_fair_orders`）。
   * 將 Cloud Name 與 Preset 填入 [src/config/system.config.js](file:///d:/115園遊會-3/src/config/system.config.js)。
