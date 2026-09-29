/**
 * 115校慶園遊會 - 隱藏式生產調度管理後台 (Admin Operations JavaScript)
 * 規格核心：
 * 1. 17 人雙軌登入（密碼首登 ➔ 解鎖身分+學號驗證碼）
 * 2. 依角色動態遮蔽個資脫敏（美術僅看圖/外送看班級座號/財務看款項/總召師長解密全覽）
 * 3. 視窗鎖定固定表頭、側邊抽屜式工單檢視面板 (Side Drawer)
 * 4. 頂部 HUD 狀態卡片即時統計與一鍵切換過濾
 * 5. 批次勾選列印 A4 三聯單 (printTemplate.service.js)
 * 6. 一鍵匯出帶原圖 =HYPERLINK() 之 Excel 總表 (excelExport.service.js)
 * 7. onSnapshot 0.3 秒無感重繪
 */

(function () {
  "use strict";

  // 當前登入人員工作階段
  let currentStaffUser = null;
  let allStaffList = [];
  let ordersList = [];
  let currentFilter = "ALL"; // ALL, PENDING_QC, IN_PROD, LOGISTICS, UNPAID
  let selectedOrderIds = new Set();
  let currentInspectingOrder = null;
  let unsubscribeOrders = null;

  // DOM 元素
  const authOverlay = document.getElementById("authOverlay");
  const tabBtnPassword = document.getElementById("tabBtnPassword");
  const tabBtnCode = document.getElementById("tabBtnCode");
  const passwordLoginForm = document.getElementById("passwordLoginForm");
  const codeLoginForm = document.getElementById("codeLoginForm");
  const loginStaffIdInput = document.getElementById("loginStaffIdInput");
  const loginPasswordInput = document.getElementById("loginPasswordInput");
  const btnSubmitPasswordLogin = document.getElementById("btnSubmitPasswordLogin");
  
  const codeStaffIdInput = document.getElementById("codeStaffIdInput");
  const loginAuthCodeInput = document.getElementById("loginAuthCodeInput");
  const btnSubmitCodeLogin = document.getElementById("btnSubmitCodeLogin");

  const sessionStaffName = document.getElementById("sessionStaffName");
  const sessionStaffRole = document.getElementById("sessionStaffRole");
  const btnLogout = document.getElementById("btnLogout");

  // HUD
  const hudCardQc = document.getElementById("hudCardQc");
  const hudCardProd = document.getElementById("hudCardProd");
  const hudCardLogistics = document.getElementById("hudCardLogistics");
  const hudCardFinance = document.getElementById("hudCardFinance");
  const hudValQc = document.getElementById("hudValQc");
  const hudValProd = document.getElementById("hudValProd");
  const hudValLogistics = document.getElementById("hudValLogistics");
  const hudValFinance = document.getElementById("hudValFinance");

  // 工具列
  const searchInput = document.getElementById("searchInput");
  const selectAllCheckbox = document.getElementById("selectAllCheckbox");
  const btnBatchPrint = document.getElementById("btnBatchPrint");
  const btnExportExcel = document.getElementById("btnExportExcel");

  // 表格
  const ordersTableBody = document.getElementById("ordersTableBody");

  // 抽屜
  const orderDrawerBackdrop = document.getElementById("orderDrawerBackdrop");
  const orderDrawer = document.getElementById("orderDrawer");
  const drawerOrderId = document.getElementById("drawerOrderId");
  const btnCloseDrawer = document.getElementById("btnCloseDrawer");
  const drawerContentScroll = document.getElementById("drawerContentScroll");
  const drawerActionFooter = document.getElementById("drawerActionFooter");

  // ==========================================================================
  // 初始化
  // ==========================================================================
  function init() {
    bindEventListeners();
    checkExistingSession();
    // 預先在背景執行 17 人帳籍校準 (Auto-Seed / Upsert)
    autoSeedStaffUsers();
  }

  async function autoSeedStaffUsers() {
    try {
      const db = window.firebase ? window.firebase.firestore() : null;
      if (db && window.RbacService) {
        await window.RbacService.initializeStaffUsers(db);
      }
    } catch (e) {
      console.warn("[AutoSeed Warning]", e.message);
    }
  }

  function checkExistingSession() {
    const saved = sessionStorage.getItem("fair115_admin_session");
    if (saved) {
      try {
        currentStaffUser = JSON.parse(saved);
        onLoginSuccess(currentStaffUser, false);
        return;
      } catch (e) {
        sessionStorage.removeItem("fair115_admin_session");
      }
    }
    // 未登入則顯示登入覆蓋層
    authOverlay.style.display = "flex";
  }

  // ==========================================================================
  // 事件綁定
  // ==========================================================================
  function bindEventListeners() {
    // 登入分頁切換
    tabBtnPassword.addEventListener("click", () => {
      tabBtnPassword.classList.add("active");
      tabBtnCode.classList.remove("active");
      passwordLoginForm.style.display = "block";
      codeLoginForm.style.display = "none";
    });

    tabBtnCode.addEventListener("click", () => {
      tabBtnCode.classList.add("active");
      tabBtnPassword.classList.remove("active");
      codeLoginForm.style.display = "block";
      passwordLoginForm.style.display = "none";
    });

    // 帳密登入提交
    btnSubmitPasswordLogin.addEventListener("click", handlePasswordLogin);
    // 驗證碼登入提交
    btnSubmitCodeLogin.addEventListener("click", handleCodeLogin);
    // 登出
    btnLogout.addEventListener("click", handleLogout);

    // Enter 快捷鍵送出
    loginPasswordInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handlePasswordLogin();
    });
    loginAuthCodeInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleCodeLogin();
    });

    // HUD 點擊切換過濾
    hudCardQc.addEventListener("click", () => toggleFilter("PENDING_QC"));
    hudCardProd.addEventListener("click", () => toggleFilter("IN_PROD"));
    hudCardLogistics.addEventListener("click", () => toggleFilter("LOGISTICS"));
    hudCardFinance.addEventListener("click", () => toggleFilter("UNPAID"));

    // 搜尋輸入
    searchInput.addEventListener("input", renderOrdersTable);

    // 全選
    selectAllCheckbox.addEventListener("change", (e) => {
      const checked = e.target.checked;
      const visibleOrders = getFilteredOrders();
      if (checked) {
        visibleOrders.forEach(o => selectedOrderIds.add(o.orderId));
      } else {
        selectedOrderIds.clear();
      }
      renderOrdersTable();
    });

    // 批次列印 A4 三聯單
    btnBatchPrint.addEventListener("click", handleBatchPrint);

    // 匯出 Excel
    btnExportExcel.addEventListener("click", handleExportExcel);

    // PIM 商品管理抽屜開關
    const btnOpenPimModal = document.getElementById("btnOpenPimModal");
    const pimDrawer = document.getElementById("pimDrawer");
    const pimDrawerBackdrop = document.getElementById("pimDrawerBackdrop");
    const btnClosePimDrawer = document.getElementById("btnClosePimDrawer");
    const pimProductsContainer = document.getElementById("pimProductsContainer");

    if (btnOpenPimModal) {
      btnOpenPimModal.addEventListener("click", () => {
        pimDrawerBackdrop.classList.add("active");
        pimDrawer.classList.add("active");
        loadPimProducts();
      });
    }

    if (btnClosePimDrawer) {
      btnClosePimDrawer.addEventListener("click", closePimDrawer);
    }
    if (pimDrawerBackdrop) {
      pimDrawerBackdrop.addEventListener("click", closePimDrawer);
    }

    function closePimDrawer() {
      pimDrawerBackdrop.classList.remove("active");
      pimDrawer.classList.remove("active");
    }

    function loadPimProducts() {
      const db = window.firebase ? window.firebase.firestore() : null;
      if (!db || !window.ProductAdminService) return;

      window.ProductAdminService.initProductAdmin(db, (products) => {
        window.ProductAdminService.renderPimProducts(pimProductsContainer, products, async (code, updatedData) => {
          try {
            await window.ProductAdminService.updateProductItem(db, code, updatedData);
            alert(`✅ 商品【${code}】規格與庫存已成功儲存！前台已即時同步。`);
          } catch (e) {
            alert(`儲存失敗：${e.message}`);
          }
        });
      });
    }

    // 抽屜關閉
    btnCloseDrawer.addEventListener("click", closeOrderDrawer);
    orderDrawerBackdrop.addEventListener("click", closeOrderDrawer);
  }

  // ==========================================================================
  // 純帳號密碼與身分驗證碼登入
  // ==========================================================================
  async function handlePasswordLogin() {
    const staffId = loginStaffIdInput.value.trim();
    const password = loginPasswordInput.value.trim();

    if (!staffId || !password) {
      alert("請完整輸入系統帳號與密碼！");
      return;
    }

    try {
      const db = window.firebase ? window.firebase.firestore() : null;
      btnSubmitPasswordLogin.disabled = true;
      btnSubmitPasswordLogin.textContent = "驗證中...";

      const res = await window.RbacService.loginWithPassword(db, staffId, password);
      onLoginSuccess(res.user, true);
    } catch (err) {
      alert(`登入失敗：\n${err.message}`);
    } finally {
      btnSubmitPasswordLogin.disabled = false;
      btnSubmitPasswordLogin.textContent = "🚀 帳號密碼登入 (軌道 1)";
    }
  }

  async function handleCodeLogin() {
    const staffId = codeStaffIdInput.value.trim();
    const code = loginAuthCodeInput.value.trim();

    if (!staffId || !code) {
      alert("請完整輸入系統帳號與 6 位學號驗證碼！");
      return;
    }

    try {
      const db = window.firebase ? window.firebase.firestore() : null;
      btnSubmitCodeLogin.disabled = true;
      btnSubmitCodeLogin.textContent = "驗證中...";

      const res = await window.RbacService.loginWithIdentityCode(db, staffId, code);
      onLoginSuccess(res.user, true);
    } catch (err) {
      alert(`驗證碼登入失敗：\n${err.message}`);
    } finally {
      btnSubmitCodeLogin.disabled = false;
      btnSubmitCodeLogin.textContent = "🔓 身分驗證碼登入 (軌道 2)";
    }
  }

  function onLoginSuccess(user, saveSession = true) {
    currentStaffUser = user;
    if (saveSession) {
      sessionStorage.setItem("fair115_admin_session", JSON.stringify(user));
    }

    sessionStaffName.textContent = user.name || user.staffId;
    sessionStaffRole.textContent = user.role;
    authOverlay.style.display = "none";

    // 啟動即時資料監聽 (Realtime Stream)
    startRealtimeOrdersListener();
  }

  function handleLogout() {
    sessionStorage.removeItem("fair115_admin_session");
    currentStaffUser = null;
    if (unsubscribeOrders) {
      unsubscribeOrders();
      unsubscribeOrders = null;
    }
    window.location.reload();
  }

  // ==========================================================================
  // Firestore 毫秒級即時監聽 (0.3 秒無感重繪)
  // ==========================================================================
  function startRealtimeOrdersListener() {
    const db = window.firebase ? window.firebase.firestore() : null;
    if (!db) return;

    if (unsubscribeOrders) unsubscribeOrders();

    unsubscribeOrders = db.collection("orders")
      .orderBy("createdAt", "desc")
      .onSnapshot((snapshot) => {
        const list = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() });
        });
        ordersList = list;
        updateHUDCounts();
        renderOrdersTable();
        
        // 若當前有開啟中抽屜，即時同步資料
        if (currentInspectingOrder) {
          const updated = ordersList.find(o => o.orderId === currentInspectingOrder.orderId);
          if (updated) renderDrawerDetails(updated);
        }
      }, (error) => {
        console.error("[Realtime Error]", error);
      });
  }

  // ==========================================================================
  // HUD 狀態計算與過濾
  // ==========================================================================
  function updateHUDCounts() {
    let qcPending = 0;
    let inProd = 0;
    let logisticsPending = 0;
    let unpaid = 0;

    ordersList.forEach((o) => {
      if (o.qcStatus === "待審核" || !o.qcStatus) qcPending++;
      if (o.prodStatus === "待製作" || o.prodStatus === "製作中") inProd++;
      if (o.deliveryStatus === "待派送" || (!o.deliveryStatus && o.prodStatus === "已完工")) logisticsPending++;
      if (o.paymentStatus !== "PAID" && o.paymentStatus !== "已收款") unpaid++;
    });

    hudValQc.textContent = qcPending;
    hudValProd.textContent = inProd;
    hudValLogistics.textContent = logisticsPending;
    hudValFinance.textContent = unpaid;
  }

  function toggleFilter(filterKey) {
    if (currentFilter === filterKey) {
      currentFilter = "ALL";
    } else {
      currentFilter = filterKey;
    }

    [hudCardQc, hudCardProd, hudCardLogistics, hudCardFinance].forEach(el => el.classList.remove("active"));
    if (currentFilter === "PENDING_QC") hudCardQc.classList.add("active");
    if (currentFilter === "IN_PROD") hudCardProd.classList.add("active");
    if (currentFilter === "LOGISTICS") hudCardLogistics.classList.add("active");
    if (currentFilter === "UNPAID") hudCardFinance.classList.add("active");

    renderOrdersTable();
  }

  function getFilteredOrders() {
    const q = searchInput.value.trim().toLowerCase();

    return ordersList.filter((o) => {
      // 狀態篩選
      if (currentFilter === "PENDING_QC" && (o.qcStatus !== "待審核" && o.qcStatus)) return false;
      if (currentFilter === "IN_PROD" && (o.prodStatus !== "待製作" && o.prodStatus !== "製作中")) return false;
      if (currentFilter === "LOGISTICS" && (o.deliveryStatus !== "待派送" && o.deliveryStatus !== "待出件")) return false;
      if (currentFilter === "UNPAID" && (o.paymentStatus === "PAID" || o.paymentStatus === "已收款")) return false;

      // 關鍵字搜尋
      if (q) {
        const orderId = (o.orderId || "").toLowerCase();
        const studentName = (o.studentName || o.name || "").toLowerCase();
        const studentClass = (o.studentClass || o.classCode || "").toLowerCase();
        const productName = (o.productName || "").toLowerCase();
        return orderId.includes(q) || studentName.includes(q) || studentClass.includes(q) || productName.includes(q);
      }
      return true;
    });
  }

  // ==========================================================================
  // 表格渲染與 17 人脫敏個資
  // ==========================================================================
  function renderOrdersTable() {
    const visibleOrders = getFilteredOrders();
    ordersTableBody.innerHTML = "";

    if (visibleOrders.length === 0) {
      ordersTableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; color: var(--text-muted); padding: 2rem;">查無符合之工單資料</td></tr>`;
      return;
    }

    const role = currentStaffUser ? currentStaffUser.role : "";
    const isTeacherOrDirector = ["HEAD_OF_DEPT", "ADVISOR_TEACHER", "SUPER_ADMIN"].includes(role);
    const isFinance = role === "FINANCE" || isTeacherOrDirector;
    const isLogistics = role === "LOGISTICS" || isTeacherOrDirector;
    const isQc = role === "QC_REVIEWER" || isTeacherOrDirector;

    visibleOrders.forEach((o) => {
      const isSelected = selectedOrderIds.has(o.orderId);
      const tr = document.createElement("tr");

      // 個資動態脫敏
      const displayName = isLogistics || isFinance 
        ? (o.studentName || o.name || "--")
        : (o.studentName ? o.studentName[0] + "○" : "同學");

      const displayClassSeat = isLogistics || isFinance
        ? `${o.studentClass || o.classCode || "--"} (${o.studentSeat || o.seatNumber || "--"}號)`
        : `${o.studentClass || o.classCode || "--"} (••號)`;

      const displayAmount = isFinance
        ? `NT$ ${o.subtotal || o.unitPrice * (o.quantity || 1)}`
        : `••••`;

      // 狀態標籤樣式
      let qcBadgeClass = "pill-pending";
      if (o.qcStatus === "審核通過") qcBadgeClass = "pill-approved";
      if (o.qcStatus === "退件待補") qcBadgeClass = "pill-rejected";

      let payBadgeClass = (o.paymentStatus === "PAID" || o.paymentStatus === "已收款") ? "pill-success" : "pill-pending";

      tr.innerHTML = `
        <td onclick="event.stopPropagation();">
          <input type="checkbox" class="order-chk" data-id="${o.orderId}" ${isSelected ? "checked" : ""}>
        </td>
        <td style="font-weight:700; color:var(--primary);">${o.orderId}</td>
        <td>${displayClassSeat}</td>
        <td>${displayName}</td>
        <td>${o.productName} x ${o.quantity || 1}</td>
        <td><strong style="color: #fff;">${displayAmount}</strong></td>
        <td><span class="status-pill ${qcBadgeClass}">${o.qcStatus || "待審核"}</span></td>
        <td><span class="status-pill ${payBadgeClass}">${o.paymentStatus === "PAID" ? "已收款" : "待收款"}</span></td>
        <td>
          <button class="btn-tool" style="padding:0.25rem 0.6rem; font-size:0.75rem;">檢視 ➔</button>
        </td>
      `;

      // 點擊整列開啟抽屜
      tr.addEventListener("click", () => openOrderDrawer(o));

      // 點擊核取方塊
      const chk = tr.querySelector(".order-chk");
      chk.addEventListener("change", (e) => {
        if (e.target.checked) {
          selectedOrderIds.add(o.orderId);
        } else {
          selectedOrderIds.delete(o.orderId);
        }
      });

      ordersTableBody.appendChild(tr);
    });
  }

  // ==========================================================================
  // 側邊抽屜式工單檢視面板 (Side Drawer)
  // ==========================================================================
  function openOrderDrawer(order) {
    currentInspectingOrder = order;
    drawerOrderId.textContent = order.orderId;
    renderDrawerDetails(order);
    orderDrawerBackdrop.classList.add("active");
    orderDrawer.classList.add("active");
  }

  function closeOrderDrawer() {
    orderDrawerBackdrop.classList.remove("active");
    orderDrawer.classList.remove("active");
    currentInspectingOrder = null;
  }

  function renderDrawerDetails(order) {
    const role = currentStaffUser ? currentStaffUser.role : "";
    const isTeacherOrDirector = ["HEAD_OF_DEPT", "ADVISOR_TEACHER", "SUPER_ADMIN"].includes(role);
    const isQc = role === "QC_REVIEWER" || isTeacherOrDirector;
    const isProd = role === "PRODUCTION" || isTeacherOrDirector;
    const isFinance = role === "FINANCE" || isTeacherOrDirector;

    const imgPreview = order.imageUrl || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%231e293b'/%3E%3Ctext x='50' y='55' fill='%2364748b' font-size='12' text-anchor='middle'%3E無圖檔%3C/text%3E%3C/svg%3E";

    drawerContentScroll.innerHTML = `
      <!-- 圖檔檢驗卡片 -->
      <div class="drawer-section-card">
        <div class="drawer-section-title">🖼️ 客製圖檔與解析度</div>
        <img src="${imgPreview}" class="drawer-image-preview" alt="工單圖檔">
        <div style="margin-top:0.75rem; font-size:0.8rem; display:flex; justify-content:space-between;">
          <span style="color:var(--text-muted);">圖檔規格：${order.imageRes || "未提供"}</span>
          ${order.imageUrl ? `<a href="${order.imageUrl}" target="_blank" style="color:var(--primary); text-decoration:none; font-weight:700;">開啟原始圖 ↗</a>` : ""}
        </div>
      </div>

      <!-- 學生資料卡片 -->
      <div class="drawer-section-card">
        <div class="drawer-section-title">🎓 訂購學生資料</div>
        <p style="font-size:0.85rem; margin-bottom:0.35rem;">
          <strong style="color:#fff;">姓名：</strong>${order.studentName || order.name || "--"} 
          (${order.studentClass || order.classCode || "--"} - ${order.studentSeat || order.seatNumber || "--"}號)
        </p>
        <p style="font-size:0.85rem; margin-bottom:0.35rem;">
          <strong style="color:#fff;">學號：</strong>${order.studentId || "--"} | 
          <strong style="color:#fff;">電話：</strong>${order.phone || "--"}
        </p>
        <p style="font-size:0.85rem; color:var(--text-muted);">
          <strong style="color:#fff;">備註：</strong>${order.customerNotes || order.notes || "無"}
        </p>
      </div>

      <!-- 款項明細卡片 -->
      <div class="drawer-section-card">
        <div class="drawer-section-title">💰 款項與單據資訊</div>
        <div style="display:flex; justify-content:space-between; font-size:0.9rem; margin-bottom:0.35rem;">
          <span>品項單價：NT$ ${order.unitPrice}</span>
          <span>數量：${order.quantity || 1} 件</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:1.1rem; font-weight:800; color:var(--primary); border-top:1px dashed rgba(255,255,255,0.1); padding-top:0.5rem;">
          <span>應付金額：</span>
          <span>NT$ ${order.subtotal || order.unitPrice * (order.quantity || 1)}</span>
        </div>
        <p style="font-size:0.78rem; color:var(--text-muted); margin-top:0.4rem;">
          三聯單防偽流水號：${order.slipSerialNo || "--"}
        </p>
      </div>
    `;

    // 抽屜底部操作按鈕
    drawerActionFooter.innerHTML = "";

    // 1. 單筆列印按鈕
    const btnPrintSingle = document.createElement("button");
    btnPrintSingle.className = "btn-tool";
    btnPrintSingle.style.flex = "1";
    btnPrintSingle.innerHTML = "🖨️ 列印此單";
    btnPrintSingle.onclick = () => {
      const html = window.PrintTemplateService.generateRealtimeA4TripleVoucherHtml(order.orderId);
      const printWin = window.open("", "_blank");
      printWin.document.write(html);
      printWin.document.close();
      printWin.focus();
      printWin.print();
    };
    drawerActionFooter.appendChild(btnPrintSingle);

    // 2. 美術審核通過按鈕
    if (isQc && (order.qcStatus !== "審核通過")) {
      const btnApproveQc = document.createElement("button");
      btnApproveQc.className = "btn-tool btn-tool-primary";
      btnApproveQc.style.flex = "1";
      btnApproveQc.innerHTML = "✅ 圖審通過";
      btnApproveQc.onclick = async () => {
        try {
          const db = window.firebase.firestore();
          await window.OrderFsmService.approveQcOrder(db, order.orderId, currentStaffUser.staffId);
          alert(`工單【${order.orderId}】圖審已通過！`);
        } catch (e) {
          alert(`操作失敗：${e.message}`);
        }
      };
      drawerActionFooter.appendChild(btnApproveQc);
    }

    // 3. 財務收款核銷按鈕
    if (isFinance && (order.paymentStatus !== "PAID" && order.paymentStatus !== "已收款")) {
      const btnConfirmPaid = document.createElement("button");
      btnConfirmPaid.className = "btn-tool btn-tool-success";
      btnConfirmPaid.style.flex = "1";
      btnConfirmPaid.innerHTML = "💵 財務收款核銷";
      btnConfirmPaid.onclick = async () => {
        try {
          const db = window.firebase.firestore();
          await db.collection("orders").doc(order.orderId).update({
            paymentStatus: "PAID",
            paidAt: new Date().toISOString(),
            financeReviewer: currentStaffUser.staffId
          });
          alert(`工單【${order.orderId}】已成功標記收款核銷！`);
        } catch (e) {
          alert(`核銷失敗：${e.message}`);
        }
      };
      drawerActionFooter.appendChild(btnConfirmPaid);
    }
  }

  // ==========================================================================
  // 批次列印 A4 三聯單 (printTemplate.service.js)
  // ==========================================================================
  function handleBatchPrint() {
    if (selectedOrderIds.size === 0) {
      alert("請先在表格中勾選欲列印三聯單的工單！");
      return;
    }

    const selectedList = ordersList.filter(o => selectedOrderIds.has(o.orderId));
    if (selectedList.length === 0) return;

    const html = window.PrintTemplateService.generateBatchPrintVouchersHtml(selectedList);
    const printWin = window.open("", "_blank");
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
    }, 400);
  }

  // ==========================================================================
  // 匯出 Excel 總表 (excelExport.service.js)
  // ==========================================================================
  function handleExportExcel() {
    const listToExport = selectedOrderIds.size > 0
      ? ordersList.filter(o => selectedOrderIds.has(o.orderId))
      : ordersList;

    if (listToExport.length === 0) {
      alert("目前尚無工單可供匯出！");
      return;
    }

    try {
      window.ExcelExportService.exportOrdersToExcel(
        listToExport,
        `115校慶園遊會_訂單生產總表_${Date.now()}.xlsx`
      );
    } catch (err) {
      alert(`Excel 匯出失敗：${err.message}`);
    }
  }

  // 啟動
  window.addEventListener("DOMContentLoaded", init);
})();
