/**
 * 115校慶園遊會 - 後台 PIM 商品資產與庫存動態管理模組 (Product Information & Inventory Admin)
 * 核心功能：
 * 1. 載入並即時監聽 Firestore products 集合
 * 2. 表格即時編輯：展示圖 URL、標題、說明、售價
 * 3. 三種庫存狀態切換：【有貨】(IN_STOCK)、【缺貨】(OUT_OF_STOCK)、【補貨中】(RESTOCKING)
 * 4. 點擊「儲存商品規格」批次原子寫入雲端
 */

(function (global) {
  "use strict";

  // 預設種子商品定義 (若雲端為空則自動補全)
  const SEED_PRODUCTS = [
    {
      code: "MUG",
      name: "客製陶瓷馬克杯",
      category: "tableware",
      price: 150,
      stockStatus: "IN_STOCK", // IN_STOCK, OUT_OF_STOCK, RESTOCKING
      imageUrl: "",
      desc: "高溫白瓷熱轉印，全彩不掉色，附防撞紙盒。",
      specDetail: "材質：高溫強化白瓷 / 容量：350ml / 印製：全彩昇華轉印。校慶前統一批次印製完畢。"
    },
    {
      code: "CST",
      name: "客製吸水陶瓷杯墊",
      category: "tableware",
      price: 60,
      stockStatus: "IN_STOCK",
      imageUrl: "",
      desc: "天然鶯歌陶瓷吸水材質，底部EVA防滑墊。",
      specDetail: "材質：鶯歌吸水陶瓷 / 直徑：110mm / 底部：EVA止滑墊。校慶前統一排印。"
    },
    {
      code: "BDG",
      name: "磨砂圓形金屬胸章",
      category: "accessories",
      price: 40,
      stockStatus: "IN_STOCK",
      imageUrl: "",
      desc: "58mm 經典磨砂質感金屬別針胸章，防刮防水。",
      specDetail: "規格：58mm 圓形 / 表面：細緻霧面磨砂膜 / 背面：安全別針。"
    },
    {
      code: "CRD",
      name: "紀念卡貼套裝 (一組2張)",
      category: "stationery",
      price: 50,
      stockStatus: "IN_STOCK",
      imageUrl: "",
      desc: "標準悠遊卡尺寸霧面防水防刮卡貼，一組兩張。",
      specDetail: "尺寸：85.6 x 54 mm / 材質：進口PET防水抗刮膜 / 數量：一組 2 張。"
    },
    {
      code: "PSP",
      name: "A3 高光特厚紀念海報",
      category: "prints",
      price: 80,
      stockStatus: "IN_STOCK",
      imageUrl: "",
      desc: "250g 特級雪銅紙雙面高光覆膜，色彩鮮明飽和。",
      specDetail: "尺寸：A3 (297 x 420 mm) / 紙質：250g 特厚雪銅紙 / 覆膜：雙面亮光防水保護膜。"
    }
  ];

  let currentProducts = [];
  let unsubscribeProducts = null;

  /**
   * 1. 雲端商品即時監聽與初始化
   */
  async function initProductAdmin(db, onRenderCallback) {
    if (!db) return;

    // 檢查雲端是否有商品，無則初始化種子
    try {
      const snap = await db.collection("products").get();
      if (snap.empty) {
        const batch = db.batch();
        for (const p of SEED_PRODUCTS) {
          batch.set(db.collection("products").doc(p.code), {
            ...p,
            updatedAt: new Date().toISOString()
          });
        }
        await batch.commit();
        console.log("[PIM] 官方商品庫存種子資料已初始化寫入");
      }
    } catch (e) {
      console.warn("[PIM Init Warn]", e.message);
    }

    if (unsubscribeProducts) unsubscribeProducts();

    unsubscribeProducts = db.collection("products").onSnapshot((snapshot) => {
      const list = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      currentProducts = list;
      if (typeof onRenderCallback === "function") {
        onRenderCallback(currentProducts);
      }
    });
  }

  /**
   * 2. 更新單項商品資產與庫存狀態
   */
  async function updateProductItem(db, productCode, updateData) {
    if (!db) throw new Error("db 實例不可為空");
    if (!productCode) throw new Error("商品代碼不可為空");

    await db.collection("products").doc(productCode).update({
      ...updateData,
      updatedAt: new Date().toISOString()
    });

    return { success: true, message: `商品【${productCode}】已成功更新！` };
  }

  /**
   * 3. 新增商品項目 (➕ 新增商品)
   */
  async function createProductItem(db, productData) {
    if (!db) throw new Error("db 實例不可為空");
    if (!productData || !productData.code) throw new Error("商品代碼不可為空！");

    const code = productData.code.trim().toUpperCase();
    const docRef = db.collection("products").doc(code);
    const snap = await docRef.get();
    if (snap.exists) {
      throw new Error(`商品代碼【${code}】已存在，不可重複建立！`);
    }

    const payload = {
      code: code,
      name: productData.name ? productData.name.trim() : "新商品",
      category: productData.category || "accessories",
      price: Number(productData.price) || 0,
      stockStatus: productData.stockStatus || "IN_STOCK",
      imageUrl: productData.imageUrl ? productData.imageUrl.trim() : "",
      desc: productData.desc ? productData.desc.trim() : "",
      specDetail: productData.specDetail ? productData.specDetail.trim() : "校慶前統一批次印製完畢。",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await docRef.set(payload);
    return { success: true, message: `✨ 商品【${code}】已成功新增！`, product: payload };
  }

  /**
   * 4. 刪除商品項目 (🗑️ 刪除商品，含確認防呆)
   */
  async function deleteProductItem(db, productCode) {
    if (!db) throw new Error("db 實例不可為空");
    if (!productCode) throw new Error("商品代碼不可為空！");

    const code = productCode.trim().toUpperCase();
    await db.collection("products").doc(code).delete();
    return { success: true, message: `🗑️ 商品【${code}】已從雲端永久刪除！` };
  }

  /**
   * 5. 渲染 PIM 編輯卡片至抽屜容器 (含「➕ 新增商品」按鈕與各品項「🗑️ 刪除」防呆)
   */
  function renderPimProducts(containerEl, productsList, onSaveCallback, onDeleteCallback, onAddCallback) {
    if (!containerEl) return;
    containerEl.innerHTML = "";

    // 頂部動作列：新增商品按鈕
    const topActionBar = document.createElement("div");
    topActionBar.style.display = "flex";
    topActionBar.style.justifyContent = "space-between";
    topActionBar.style.alignItems = "center";
    topActionBar.style.marginBottom = "0.75rem";

    topActionBar.innerHTML = `
      <span style="font-size:0.85rem; color:#94a3b8;">共 ${productsList ? productsList.length : 0} 項商品型錄</span>
      <button id="btnPimAddNewProduct" class="btn-tool" style="background: rgba(16, 185, 129, 0.2); border-color: rgba(16, 185, 129, 0.5); color: #10b981; font-weight: 700; padding: 0.4rem 0.9rem;">
        ➕ 新增商品
      </button>
    `;

    topActionBar.querySelector("#btnPimAddNewProduct").addEventListener("click", () => {
      if (typeof onAddCallback === "function") {
        onAddCallback();
      }
    });

    containerEl.appendChild(topActionBar);

    if (!productsList || productsList.length === 0) {
      const emptyMsg = document.createElement("p");
      emptyMsg.style.color = "var(--text-muted)";
      emptyMsg.style.textAlign = "center";
      emptyMsg.textContent = "目前無商品資料，請點擊上方「➕ 新增商品」建立";
      containerEl.appendChild(emptyMsg);
      return;
    }

    productsList.forEach((p) => {
      const card = document.createElement("div");
      card.className = "drawer-section-card";
      card.style.display = "flex";
      card.style.flexDirection = "column";
      card.style.gap = "0.75rem";
      card.style.position = "relative";

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="color:var(--primary); font-size:1rem;">[${p.code}] ${p.name}</strong>
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <label style="font-size:0.75rem; color:var(--text-muted);">庫存：</label>
            <select class="pim-stock-select auth-select" style="padding:0.25rem 0.5rem; font-size:0.8rem; width:auto; display:inline-block;">
              <option value="IN_STOCK" ${p.stockStatus === "IN_STOCK" ? "selected" : ""}>🟢 【有貨】</option>
              <option value="OUT_OF_STOCK" ${p.stockStatus === "OUT_OF_STOCK" ? "selected" : ""}>🔴 【缺貨】</option>
              <option value="RESTOCKING" ${p.stockStatus === "RESTOCKING" ? "selected" : ""}>🟡 【補貨中】</option>
            </select>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: 2fr 1fr; gap:0.75rem;">
          <div>
            <label style="font-size:0.75rem; color:var(--text-muted); display:block; margin-bottom:0.2rem;">商品名稱</label>
            <input type="text" class="pim-name-input auth-input" value="${p.name || ""}" style="padding:0.45rem 0.75rem; font-size:0.85rem;">
          </div>
          <div>
            <label style="font-size:0.75rem; color:var(--text-muted); display:block; margin-bottom:0.2rem;">預購單價 (NT$)</label>
            <input type="number" class="pim-price-input auth-input" value="${p.price || 0}" style="padding:0.45rem 0.75rem; font-size:0.85rem;">
          </div>
        </div>

        <div>
          <label style="font-size:0.75rem; color:var(--text-muted); display:block; margin-bottom:0.2rem;">商品簡短說明</label>
          <input type="text" class="pim-desc-input auth-input" value="${p.desc || p.description || ""}" style="padding:0.45rem 0.75rem; font-size:0.85rem;">
        </div>

        <div>
          <label style="font-size:0.75rem; color:var(--text-muted); display:block; margin-bottom:0.2rem;">自訂展示圖 URL (選填，填入後前台優先顯示此圖)</label>
          <input type="text" class="pim-img-input auth-input" value="${p.imageUrl || ""}" placeholder="例如：https://.../mug.png" style="padding:0.45rem 0.75rem; font-size:0.85rem;">
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.25rem;">
          <button class="btn-tool btn-delete-pim-item" style="padding:0.35rem 0.75rem; font-size:0.8rem; background:rgba(239,68,68,0.15); border-color:var(--danger); color:var(--danger);">
            🗑️ 刪除商品
          </button>
          <button class="btn-tool btn-save-pim-item" style="padding:0.35rem 0.85rem; font-size:0.8rem; background:rgba(56,189,248,0.15); border-color:var(--primary); color:#fff;">
            💾 儲存此品項變更
          </button>
        </div>
      `;

      // 儲存事件
      const btnSave = card.querySelector(".btn-save-pim-item");
      btnSave.addEventListener("click", () => {
        const updatedData = {
          name: card.querySelector(".pim-name-input").value.trim(),
          price: Number(card.querySelector(".pim-price-input").value) || p.price,
          desc: card.querySelector(".pim-desc-input").value.trim(),
          imageUrl: card.querySelector(".pim-img-input").value.trim(),
          stockStatus: card.querySelector(".pim-stock-select").value
        };
        if (typeof onSaveCallback === "function") {
          onSaveCallback(p.code, updatedData);
        }
      });

      // 刪除事件 (防呆二度確認)
      const btnDel = card.querySelector(".btn-delete-pim-item");
      btnDel.addEventListener("click", () => {
        const confirmed = window.confirm(`⚠️ 確定要刪除商品【${p.name}】(${p.code}) 嗎？\n刪除後此品項將不再於前台與後台顯示！`);
        if (confirmed && typeof onDeleteCallback === "function") {
          onDeleteCallback(p.code);
        }
      });

      containerEl.appendChild(card);
    });
  }

  global.ProductAdminService = {
    SEED_PRODUCTS,
    initProductAdmin,
    updateProductItem,
    createProductItem,
    deleteProductItem,
    renderPimProducts
  };

})(typeof window !== "undefined" ? window : global);
