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

  // 系統發信 API 設定 (Google Apps Script Web App)
  const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzVxFfgUkLWnG_CuSwvE0RVW9UWECmLL_iKSwXckZAPGUvsvEu8m4jdcGoCE02BvSVy/exec";

  // 當前登入人員工作階段
  let currentStaffUser = null;
  let allStaffList = [];
  let ordersList = [];
  let membersList = [];
  let currentFilter = "ALL"; // ALL, PENDING_QC, IN_PROD, LOGISTICS, UNPAID
  let printStatusFilter = "ALL"; // ALL, UNPRINTED, PRINTED
  let selectedOrderIds = new Set();
  let lastCheckedIndex = null; // 支援 Shift 連續範圍多選
  let currentInspectingOrder = null;
  let unsubscribeOrders = null;
  let unsubscribeMembers = null;
  let unsubscribeStaff = null;

  // 燈箱縮放變數
  let currentLightboxZoom = 1;

  // 退件待辦目標
  let pendingRejectOrderId = null;

  // DOM 元素 - 驗證
  const authOverlay = document.getElementById("authOverlay");
  const tabBtnPassword = document.getElementById("tabBtnPassword");
  const tabBtnCode = document.getElementById("tabBtnCode");
  const passwordLoginForm = document.getElementById("passwordLoginForm");
  const codeLoginForm = document.getElementById("codeLoginForm");
  const loginStaffIdInput = document.getElementById("loginStaffIdInput");
  const loginPasswordInput = document.getElementById("loginPasswordInput");
  const btnSubmitPasswordLogin = document.getElementById("btnSubmitPasswordLogin");
  
  const codeStaffSelect = document.getElementById("codeStaffSelect");
  const loginAuthCodeInput = document.getElementById("loginAuthCodeInput");
  const btnSubmitCodeLogin = document.getElementById("btnSubmitCodeLogin");

  const sessionStaffName = document.getElementById("sessionStaffName");
  const sessionStaffRole = document.getElementById("sessionStaffRole");
  const btnLogout = document.getElementById("btnLogout");

  // DOM 元素 - 分頁切換
  const tabNavOrders = document.getElementById("tabNavOrders");
  const tabNavMembers = document.getElementById("tabNavMembers");
  const tabNavOverdue = document.getElementById("tabNavOverdue");
  const tabNavStaffManager = document.getElementById("tabNavStaffManager");
  const overdueBadgeCount = document.getElementById("overdueBadgeCount");

  const viewOrdersSection = document.getElementById("viewOrdersSection");
  const viewMembersSection = document.getElementById("viewMembersSection");
  const viewOverdueSection = document.getElementById("viewOverdueSection");
  const viewStaffManagerSection = document.getElementById("viewStaffManagerSection");

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
  const printStatusFilterSelect = document.getElementById("printStatusFilterSelect");
  const selectAllCheckbox = document.getElementById("selectAllCheckbox");
  const btnBatchPrint = document.getElementById("btnBatchPrint");
  const btnExportExcel = document.getElementById("btnExportExcel");

  // 表格
  const ordersTableBody = document.getElementById("ordersTableBody");
  const membersTableBody = document.getElementById("membersTableBody");
  const memberSearchInput = document.getElementById("memberSearchInput");
  const memberCountBadge = document.getElementById("memberCountBadge");
  const overdueTableBody = document.getElementById("overdueTableBody");
  const btnPrintAllOverdueSlips = document.getElementById("btnPrintAllOverdueSlips");
  const staffTableBody = document.getElementById("staffTableBody");

  // 抽屜
  const orderDrawerBackdrop = document.getElementById("orderDrawerBackdrop");
  const orderDrawer = document.getElementById("orderDrawer");
  const drawerOrderId = document.getElementById("drawerOrderId");
  const btnCloseDrawer = document.getElementById("btnCloseDrawer");
  const drawerContentScroll = document.getElementById("drawerContentScroll");
  const drawerActionFooter = document.getElementById("drawerActionFooter");

  // 燈箱 DOM
  const imageLightboxModal = document.getElementById("imageLightboxModal");
  const lightboxTitle = document.getElementById("lightboxTitle");
  const lightboxResText = document.getElementById("lightboxResText");
  const lightboxTargetImg = document.getElementById("lightboxTargetImg");
  const btnZoomIn = document.getElementById("btnZoomIn");
  const btnZoomOut = document.getElementById("btnZoomOut");
  const btnZoomReset = document.getElementById("btnZoomReset");
  const btnOpenRawImage = document.getElementById("btnOpenRawImage");
  const btnCloseLightbox = document.getElementById("btnCloseLightbox");

  // 美術退件彈窗 DOM
  const qcRejectModalOverlay = document.getElementById("qcRejectModalOverlay");
  const qcRejectOrderTitle = document.getElementById("qcRejectOrderTitle");
  const qcRejectPresetSelect = document.getElementById("qcRejectPresetSelect");
  const qcRejectReasonInput = document.getElementById("qcRejectReasonInput");
  const btnCancelQcReject = document.getElementById("btnCancelQcReject");
  const btnConfirmQcReject = document.getElementById("btnConfirmQcReject");

  // PIM 新增商品彈窗 DOM
  const pimAddProductModalOverlay = document.getElementById("pimAddProductModalOverlay");
  const newProdCode = document.getElementById("newProdCode");
  const newProdName = document.getElementById("newProdName");
  const newProdPrice = document.getElementById("newProdPrice");
  const newProdCategory = document.getElementById("newProdCategory");
  const newProdMaterial = document.getElementById("newProdMaterial");
  const newProdDesc = document.getElementById("newProdDesc");
  const newProdImageFile = document.getElementById("newProdImageFile");
  const newProdImgPreviewBox = document.getElementById("newProdImgPreviewBox");
  const newProdImgPreview = document.getElementById("newProdImgPreview");
  const newProdStockStatus = document.getElementById("newProdStockStatus");
  const btnCancelAddProduct = document.getElementById("btnCancelAddProduct");
  const btnSubmitAddProduct = document.getElementById("btnSubmitAddProduct");

  // ==========================================================================
  // 初始化
  // ==========================================================================
  function init() {
    bindEventListeners();
    checkExistingSession();
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

    btnSubmitPasswordLogin.addEventListener("click", handlePasswordLogin);
    btnSubmitCodeLogin.addEventListener("click", handleCodeLogin);
    btnLogout.addEventListener("click", handleLogout);

    loginPasswordInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handlePasswordLogin();
    });
    loginAuthCodeInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleCodeLogin();
    });

    // 主分頁切換
    tabNavOrders.addEventListener("click", () => switchMainTab("orders"));
    tabNavMembers.addEventListener("click", () => switchMainTab("members"));
    tabNavOverdue.addEventListener("click", () => switchMainTab("overdue"));
    tabNavStaffManager.addEventListener("click", () => switchMainTab("staffManager"));

    // HUD 點擊切換過濾
    hudCardQc.addEventListener("click", () => toggleFilter("PENDING_QC"));
    hudCardProd.addEventListener("click", () => toggleFilter("IN_PROD"));
    hudCardLogistics.addEventListener("click", () => toggleFilter("LOGISTICS"));
    hudCardFinance.addEventListener("click", () => toggleFilter("UNPAID"));

    // 搜尋輸入與三聯單狀態篩選
    searchInput.addEventListener("input", renderOrdersTable);
    if (printStatusFilterSelect) {
      printStatusFilterSelect.addEventListener("change", (e) => {
        printStatusFilter = e.target.value;
        renderOrdersTable();
      });
    }
    if (memberSearchInput) {
      memberSearchInput.addEventListener("input", renderMembersTable);
    }

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

    // 批次列印退貨通知憑證
    if (btnPrintAllOverdueSlips) {
      btnPrintAllOverdueSlips.addEventListener("click", handleBatchPrintOverdueSlips);
    }

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
        window.ProductAdminService.renderPimProducts(
          pimProductsContainer,
          products,
          async (code, updatedData) => {
            try {
              await window.ProductAdminService.updateProductItem(db, code, updatedData);
              alert(`✅ 商品【${code}】規格與庫存已成功儲存！前台已即時同步。`);
            } catch (e) {
              alert(`儲存失敗：${e.message}`);
            }
          },
          async (code) => {
            try {
              await window.ProductAdminService.deleteProductItem(db, code);
              alert(`🗑️ 商品【${code}】已成功刪除！`);
            } catch (e) {
              alert(`刪除失敗：${e.message}`);
            }
          },
          () => {
            // 開啟新增商品彈窗
            openPimAddProductModal();
          }
        );
      });
    }

    // 新增商品彈窗按鈕與圖片預覽
    let newProdTempBase64 = "";

    if (newProdImageFile) {
      newProdImageFile.addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            newProdTempBase64 = evt.target.result;
            if (newProdImgPreview) newProdImgPreview.src = newProdTempBase64;
            if (newProdImgPreviewBox) newProdImgPreviewBox.style.display = "flex";
          };
          reader.readAsDataURL(file);
        } else {
          newProdTempBase64 = "";
          if (newProdImgPreviewBox) newProdImgPreviewBox.style.display = "none";
        }
      });
    }

    btnCancelAddProduct.addEventListener("click", closePimAddProductModal);
    btnSubmitAddProduct.addEventListener("click", handleSubmitNewProduct);

    function openPimAddProductModal() {
      newProdCode.value = "";
      newProdName.value = "";
      newProdPrice.value = "";
      newProdCategory.value = "accessories";
      if (newProdMaterial) newProdMaterial.value = "";
      newProdDesc.value = "";
      if (newProdImageFile) newProdImageFile.value = "";
      if (newProdImgPreviewBox) newProdImgPreviewBox.style.display = "none";
      newProdTempBase64 = "";
      newProdStockStatus.value = "IN_STOCK";
      pimAddProductModalOverlay.style.display = "flex";
    }

    function closePimAddProductModal() {
      pimAddProductModalOverlay.style.display = "none";
    }

    async function handleSubmitNewProduct() {
      const code = newProdCode.value.trim().toUpperCase();
      const name = newProdName.value.trim();
      const price = Number(newProdPrice.value) || 0;
      const category = newProdCategory.value;
      const material = newProdMaterial ? newProdMaterial.value.trim() : "";
      const desc = newProdDesc.value.trim();
      const stockStatus = newProdStockStatus.value;

      if (!code || !/^[A-Z0-9]{3,6}$/.test(code)) {
        alert("商品代碼請輸入 3~6 碼大寫英數字！");
        newProdCode.focus();
        return;
      }
      if (!name) {
        alert("請輸入商品名稱！");
        newProdName.focus();
        return;
      }
      if (price <= 0) {
        alert("請輸入大於 0 之商品單價！");
        newProdPrice.focus();
        return;
      }

      btnSubmitAddProduct.disabled = true;
      btnSubmitAddProduct.textContent = "上架處理中...";

      try {
        const db = window.firebase ? window.firebase.firestore() : null;
        if (!db) throw new Error("資料庫未連線");

        await window.ProductAdminService.createProductItem(db, {
          code: code,
          name: name,
          price: price,
          category: category,
          material: material || "優質規格材質",
          desc: desc,
          imageUrl: newProdTempBase64 || "",
          stockStatus: stockStatus,
          specDetail: `材質規格：${material || "優選工藝"}。校慶前統一批次印製完畢。`
        });

        alert(`🎉 商品【${name}】(${code}) 上架成功！前台已即時同步。`);
        closePimAddProductModal();
      } catch (err) {
        alert(`❌ 上架失敗：${err.message}`);
      } finally {
        btnSubmitAddProduct.disabled = false;
        btnSubmitAddProduct.textContent = "✨ 建立並上架商品";
      }
    }

    // 抽屜關閉
    btnCloseDrawer.addEventListener("click", closeOrderDrawer);
    orderDrawerBackdrop.addEventListener("click", closeOrderDrawer);

    // 燈箱事件
    btnCloseLightbox.addEventListener("click", closeImageLightbox);
    btnZoomIn.addEventListener("click", () => setLightboxZoom(currentLightboxZoom + 0.3));
    btnZoomOut.addEventListener("click", () => setLightboxZoom(Math.max(0.4, currentLightboxZoom - 0.3)));
    btnZoomReset.addEventListener("click", () => setLightboxZoom(1));
    imageLightboxModal.addEventListener("click", (e) => {
      if (e.target === imageLightboxModal || e.target.id === "lightboxImageStage") {
        closeImageLightbox();
      }
    });

    // 退件理由彈窗事件
    btnCancelQcReject.addEventListener("click", closeQcRejectModal);
    btnConfirmQcReject.addEventListener("click", handleConfirmQcReject);
    qcRejectPresetSelect.addEventListener("change", (e) => {
      if (e.target.value) {
        qcRejectReasonInput.value = e.target.value;
      }
    });
  }

  // ==========================================================================
  // 分頁切換 (Tab Navigation)
  // ==========================================================================
  function switchMainTab(tabKey) {
    const tabs = [
      { key: "orders", btn: tabNavOrders, sec: viewOrdersSection },
      { key: "members", btn: tabNavMembers, sec: viewMembersSection },
      { key: "overdue", btn: tabNavOverdue, sec: viewOverdueSection },
      { key: "staffManager", btn: tabNavStaffManager, sec: viewStaffManagerSection }
    ];

    tabs.forEach(t => {
      if (t.key === tabKey) {
        t.btn.classList.add("active");
        t.sec.style.display = "block";
      } else {
        t.btn.classList.remove("active");
        t.sec.style.display = "none";
      }
    });

    if (tabKey === "members") {
      startMembersListener();
    } else if (tabKey === "staffManager") {
      startStaffManagerListener();
    }
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
    const staffId = codeStaffSelect ? codeStaffSelect.value.trim() : "";
    const code = loginAuthCodeInput.value.trim();

    if (!staffId) {
      alert("請點擊下拉選單選擇您的身分席位！");
      return;
    }
    if (!code) {
      alert("請輸入 6 位專屬數字驗證碼！");
      return;
    }

    try {
      const db = window.firebase ? window.firebase.firestore() : null;
      btnSubmitCodeLogin.disabled = true;
      btnSubmitCodeLogin.textContent = "驗證身分中...";

      const res = await window.RbacService.loginWithIdentityCode(db, staffId, code);
      onLoginSuccess(res.user, true);
    } catch (err) {
      alert(err.message);
    } finally {
      btnSubmitCodeLogin.disabled = false;
      btnSubmitCodeLogin.textContent = "🔓 身分快捷驗證碼登入 (軌道 2)";
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

    // 依總召權限 (SUPER_ADMIN) 顯示幹部帳密與驗證碼設置分頁
    if (user.role === "SUPER_ADMIN") {
      tabNavStaffManager.style.display = "inline-flex";
    } else {
      tabNavStaffManager.style.display = "none";
    }

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
    if (unsubscribeMembers) {
      unsubscribeMembers();
      unsubscribeMembers = null;
    }
    if (unsubscribeStaff) {
      unsubscribeStaff();
      unsubscribeStaff = null;
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
        renderOverdueTable();

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
    let overdueCount = 0;

    const fourDaysMs = 4 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    ordersList.forEach((o) => {
      if (o.qcStatus === "待審核" || !o.qcStatus) qcPending++;
      if (o.prodStatus === "待製作" || o.prodStatus === "製作中") inProd++;
      if (o.deliveryStatus === "待派送" || (!o.deliveryStatus && o.prodStatus === "已完工")) logisticsPending++;
      if (o.paymentStatus !== "PAID" && o.paymentStatus !== "已收款") unpaid++;

      // 檢查退件逾期 4 天
      if (o.qcStatus === "退件待補" || o.qcStatus === "審核不通過") {
        const rejTime = o.qcRejectedAt || o.rejectedAt;
        if (rejTime && (now - new Date(rejTime).getTime() > fourDaysMs)) {
          overdueCount++;
        }
      }
    });

    hudValQc.textContent = qcPending;
    hudValProd.textContent = inProd;
    hudValLogistics.textContent = logisticsPending;
    hudValFinance.textContent = unpaid;

    if (overdueBadgeCount) {
      if (overdueCount > 0) {
        overdueBadgeCount.style.display = "inline-block";
        overdueBadgeCount.textContent = overdueCount;
      } else {
        overdueBadgeCount.style.display = "none";
      }
    }
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
      if (currentFilter === "PENDING_QC" && (o.qcStatus !== "待審核" && o.qcStatus)) return false;
      if (currentFilter === "IN_PROD" && (o.prodStatus !== "待製作" && o.prodStatus !== "製作中")) return false;
      if (currentFilter === "LOGISTICS" && (o.deliveryStatus !== "待派送" && o.deliveryStatus !== "待出件")) return false;
      if (currentFilter === "UNPAID" && (o.paymentStatus === "PAID" || o.paymentStatus === "已收款")) return false;

      // 三聯單列印狀態篩選
      const actualPrintStatus = o.printStatus || "UNPRINTED";
      if (printStatusFilter === "UNPRINTED" && actualPrintStatus !== "UNPRINTED") return false;
      if (printStatusFilter === "PRINTED" && actualPrintStatus !== "PRINTED") return false;

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
  // 表格渲染與全組態動態狀態機下拉選單 (分組狀態機)
  // ==========================================================================
  function renderOrdersTable() {
    const visibleOrders = getFilteredOrders();
    ordersTableBody.innerHTML = "";

    if (visibleOrders.length === 0) {
      ordersTableBody.innerHTML = `<tr><td colspan="12" style="text-align:center; color: var(--text-muted); padding: 2rem;">查無符合之工單資料</td></tr>`;
      return;
    }

    const role = currentStaffUser ? currentStaffUser.role : "";
    const isTeacherOrDirector = ["HEAD_OF_DEPT", "ADVISOR_TEACHER", "SUPER_ADMIN"].includes(role);
    const isFinance = role === "FINANCE" || isTeacherOrDirector;
    const isLogistics = role === "LOGISTICS" || isTeacherOrDirector;
    const isQc = role === "QC_REVIEWER" || isTeacherOrDirector;
    const isProd = role === "PRODUCTION" || isTeacherOrDirector;

    visibleOrders.forEach((o, index) => {
      const isSelected = selectedOrderIds.has(o.orderId);
      const tr = document.createElement("tr");

      // 個資動態脫敏與帳號/Email 清楚呈現
      const accountText = o.username ? `<span style="font-family:monospace; font-size:0.75rem; color:#38bdf8; display:block;">@${o.username}</span>` : "";
      const emailText = o.email ? `<span style="font-size:0.72rem; color:#94a3b8; display:block;">${o.email}</span>` : "";

      const displayName = isLogistics || isFinance 
        ? `<div><strong>${o.studentName || o.name || "--"}</strong>${accountText}${emailText}</div>`
        : `<div><strong>${o.studentName ? o.studentName[0] + "○" : "同學"}</strong>${accountText}</div>`;

      const displayClassSeat = isLogistics || isFinance
        ? `${o.studentClass || o.classCode || "--"} (${o.studentSeat || o.seatNumber || "--"}號)`
        : `${o.studentClass || o.classCode || "--"} (••號)`;

      const displayAmount = isFinance
        ? `NT$ ${o.subtotal || o.unitPrice * (o.quantity || 1)}`
        : `••••`;

      // 圖片縮圖
      const imgSrc = o.imageUrl || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%231e293b'/%3E%3Ctext x='50' y='55' fill='%2364748b' font-size='12' text-anchor='middle'%3E無圖%3C/text%3E%3C/svg%3E";

      // ==========================================
      // 嚴格相依狀態機 (State Machine) 解鎖判斷：
      // 1. 初始：美術預設「待審核」，派送/財務/產線一律 disabled。
      // 2. 第一解鎖：美術 == 「審核通過」，解鎖「派送組」(未派送/派送中/已派送完成)。
      // 3. 第二解鎖：派送 == 「已派送完成」，解鎖「財務組」(未收款/待收款/已收款)。
      // 4. 第三解鎖：財務 == 「已收款」，解鎖「產線組」(未排單/製作中/已完成)。
      // 5. 總召審定：產線 == 「已完成」或「已完成製作」後，由總召進行最終審定。
      // ==========================================
      const isQcPassed = o.qcStatus === "審核通過";
      const isDeliDone = o.deliveryStatus === "已派送完成" || o.deliveryStatus === "已送達";
      const isFinancePaid = o.paymentStatus === "PAID" || o.paymentStatus === "已收款";
      const isProdDone = o.prodStatus === "已完成" || o.prodStatus === "已完成製作" || o.prodStatus === "已完工";

      // 1. 美術組狀態下拉選單
      const qcCurrent = o.qcStatus || "待審核";
      const qcSelectHtml = `
        <select class="table-status-select qc-select ${qcCurrent === '審核通過' ? 'status-qc-pass' : qcCurrent === '退件待補' || qcCurrent === '審核不通過' ? 'status-qc-fail' : 'status-qc-pending'}" data-order-id="${o.orderId}" ${!isQc ? "disabled title='僅美術組或總召可修改'" : ""}>
          <option value="待審核" ${qcCurrent === '待審核' ? 'selected' : ''}>待審核</option>
          <option value="審核通過" ${qcCurrent === '審核通過' ? 'selected' : ''}>審核通過</option>
          <option value="審核不通過" ${qcCurrent === '退件待補' || qcCurrent === '審核不通過' ? 'selected' : ''}>審核不通過</option>
        </select>
      `;

      // 2. 派送組狀態下拉選單 (必須等美術審核通過才解鎖)
      const deliCurrent = o.deliveryStatus || "未派送";
      const canEditDeli = isLogistics && isQcPassed;
      const deliDisabledTitle = !isQcPassed ? "必須等美術組審核通過後方可變更派送狀態" : (!isLogistics ? "僅派送組或總召可修改" : "");
      const deliSelectHtml = `
        <select class="table-status-select deli-select ${deliCurrent === '已派送完成' || deliCurrent === '已送達' ? 'status-logistics-done' : deliCurrent === '派送中' ? 'status-logistics-in' : 'status-logistics-wait'}" data-order-id="${o.orderId}" ${!canEditDeli ? `disabled title="${deliDisabledTitle}"` : ""}>
          <option value="未派送" ${deliCurrent === '未派送' || deliCurrent === '待派送' ? 'selected' : ''}>未派送</option>
          <option value="派送中" ${deliCurrent === '派送中' ? 'selected' : ''}>派送中</option>
          <option value="已派送完成" ${deliCurrent === '已派送完成' || deliCurrent === '已送達' ? 'selected' : ''}>已派送完成</option>
        </select>
      `;

      // 3. 財務組狀態下拉選單 (必須等派送組已派送完成才解鎖)
      let finCurrent = "未收款";
      if (o.paymentStatus === "PAID" || o.paymentStatus === "已收款") finCurrent = "已收款";
      else if (o.paymentStatus === "待收款") finCurrent = "待收款";
      else if (o.paymentStatus) finCurrent = o.paymentStatus;
      
      const canEditFin = isFinance && isDeliDone;
      const finDisabledTitle = !isDeliDone ? "必須等派送組切換為【已派送完成】後方可進行收款核銷" : (!isFinance ? "僅財務組或總召可修改" : "");
      const finSelectHtml = `
        <select class="table-status-select fin-select ${finCurrent === '已收款' ? 'status-pay-done' : finCurrent === '待收款' ? 'status-pay-wait' : 'status-pay-none'}" data-order-id="${o.orderId}" ${!canEditFin ? `disabled title="${finDisabledTitle}"` : ""}>
          <option value="未收款" ${finCurrent === '未收款' ? 'selected' : ''}>未收款</option>
          <option value="待收款" ${finCurrent === '待收款' ? 'selected' : ''}>待收款</option>
          <option value="已收款" ${finCurrent === '已收款' ? 'selected' : ''}>已收款</option>
        </select>
      `;

      // 4. 產線組狀態下拉選單 (必須等財務組已收款才解鎖)
      const prodCurrent = o.prodStatus || "未排單";
      const canEditProd = isProd && isFinancePaid;
      const prodDisabledTitle = !isFinancePaid ? "必須等財務組切換為【已收款】後方可排單製作" : (!isProd ? "僅商品製作組或總召可修改" : "");
      const prodSelectHtml = `
        <select class="table-status-select prod-select ${isProdDone ? 'status-prod-done' : prodCurrent === '製作中' ? 'status-prod-in' : 'status-prod-wait'}" data-order-id="${o.orderId}" ${!canEditProd ? `disabled title="${prodDisabledTitle}"` : ""}>
          <option value="未排單" ${prodCurrent === '未排單' || prodCurrent === '待排單' || prodCurrent === '待製作' ? 'selected' : ''}>未排單</option>
          <option value="製作中" ${prodCurrent === '製作中' ? 'selected' : ''}>製作中</option>
          <option value="已完成" ${isProdDone ? 'selected' : ''}>已完成</option>
        </select>
      `;

      // 5. 總召審定標籤與操作
      const isDirectorApproved = o.directorApproved === true;
      const canDirectorApprove = isTeacherOrDirector && isProdDone;
      const directorHtml = isDirectorApproved
        ? `<span class="status-pill pill-approved" title="總召已審定歸檔">👑 已審定</span>`
        : (canDirectorApprove
            ? `<button class="btn-tool btn-approve-director" data-order-id="${o.orderId}" style="padding:0.2rem 0.5rem; font-size:0.75rem; background:rgba(99,102,241,0.25); border-color:#818cf8; color:#fff;">核准審定</button>`
            : `<span style="font-size:0.75rem; color:var(--text-muted);">待前程解鎖</span>`);

      // 三聯單列印狀態徽章
      const isPrinted = o.printStatus === "PRINTED";
      const printTimeStr = o.printedAt ? new Date(o.printedAt).toLocaleString("zh-TW") : "";
      const printBadgeHtml = isPrinted
        ? `<span class="status-pill pill-success" title="列印時間：${printTimeStr || '已完成'}">🟢 已列印三聯單</span>`
        : `<span class="status-pill pill-pending" title="尚未列印三聯單">🟡 未列印</span>`;

      tr.innerHTML = `
        <td onclick="event.stopPropagation();">
          <input type="checkbox" class="order-chk" data-id="${o.orderId}" ${isSelected ? "checked" : ""}>
        </td>
        <td onclick="event.stopPropagation();">
          <div class="thumb-preview-box" title="點擊開啟高畫質燈箱">
            <img src="${imgSrc}" class="thumb-img" alt="圖檔">
          </div>
        </td>
        <td style="font-weight:700; color:var(--primary); font-family:monospace;">${o.orderId}</td>
        <td>${displayClassSeat}</td>
        <td>${displayName}</td>
        <td>${o.productName} x ${o.quantity || 1}</td>
        <td><strong style="color: #fff;">${displayAmount}</strong></td>
        <td>${printBadgeHtml}</td>
        <td onclick="event.stopPropagation();">${qcSelectHtml}</td>
        <td onclick="event.stopPropagation();">${deliSelectHtml}</td>
        <td onclick="event.stopPropagation();">${finSelectHtml}</td>
        <td onclick="event.stopPropagation();">${prodSelectHtml}</td>
        <td onclick="event.stopPropagation();">${directorHtml}</td>
        <td>
          <button class="btn-tool btn-inspect-row" style="padding:0.25rem 0.6rem; font-size:0.75rem;">檢視 ➔</button>
        </td>
      `;

      // 點擊縮圖開啟燈箱
      const thumbBox = tr.querySelector(".thumb-preview-box");
      thumbBox.addEventListener("click", () => openImageLightbox(o));

      // 點擊整列開啟抽屜
      tr.querySelector(".btn-inspect-row").addEventListener("click", (e) => {
        e.stopPropagation();
        openOrderDrawer(o);
      });
      tr.addEventListener("click", () => openOrderDrawer(o));

      // 勾選核取方塊 (支援 Shift 連續範圍多選)
      const chk = tr.querySelector(".order-chk");
      chk.addEventListener("click", (e) => {
        const currentIndex = index;
        const isChecked = chk.checked;

        if (e.shiftKey && lastCheckedIndex !== null) {
          const start = Math.min(lastCheckedIndex, currentIndex);
          const end = Math.max(lastCheckedIndex, currentIndex);
          const allCheckboxes = ordersTableBody.querySelectorAll(".order-chk");

          for (let i = start; i <= end; i++) {
            const targetChk = allCheckboxes[i];
            if (targetChk) {
              targetChk.checked = isChecked;
              const targetOrderId = targetChk.dataset.id;
              if (isChecked) {
                selectedOrderIds.add(targetOrderId);
              } else {
                selectedOrderIds.delete(targetOrderId);
              }
            }
          }
        } else {
          if (isChecked) {
            selectedOrderIds.add(o.orderId);
          } else {
            selectedOrderIds.delete(o.orderId);
          }
        }

        lastCheckedIndex = currentIndex;
      });

      // 綁定連鎖狀態機下拉選單變更
      const qcSel = tr.querySelector(".qc-select");
      if (qcSel && !qcSel.disabled) {
        qcSel.addEventListener("change", (e) => handleQcStatusDropdownChange(o.orderId, e.target.value));
      }

      const deliSel = tr.querySelector(".deli-select");
      if (deliSel && !deliSel.disabled) {
        deliSel.addEventListener("change", (e) => handleGenericStatusChange(o.orderId, "deliveryStatus", e.target.value));
      }

      const finSel = tr.querySelector(".fin-select");
      if (finSel && !finSel.disabled) {
        finSel.addEventListener("change", (e) => handleGenericStatusChange(o.orderId, "paymentStatus", e.target.value));
      }

      const prodSel = tr.querySelector(".prod-select");
      if (prodSel && !prodSel.disabled) {
        prodSel.addEventListener("change", (e) => handleGenericStatusChange(o.orderId, "prodStatus", e.target.value));
      }

      const btnDir = tr.querySelector(".btn-approve-director");
      if (btnDir) {
        btnDir.addEventListener("click", async (e) => {
          e.stopPropagation();
          if (confirm(`確認對工單【${o.orderId}】進行總召最終審定歸檔？`)) {
            await handleGenericStatusChange(o.orderId, "directorApproved", true);
            alert(`✅ 工單【${o.orderId}】已完成總召審定！`);
          }
        });
      }

      ordersTableBody.appendChild(tr);
    });
  }

  // ==========================================================================
  // 分組狀態機動態變更處理
  // ==========================================================================
  async function handleGenericStatusChange(orderId, fieldName, newVal) {
    try {
      const db = window.firebase ? window.firebase.firestore() : null;
      if (!db) return;

      const updatePayload = {
        [fieldName]: newVal,
        updatedAt: new Date().toISOString()
      };
      if (fieldName === "paymentStatus" && newVal === "已收款") {
        updatePayload.paidAt = new Date().toISOString();
        updatePayload.financeReviewer = currentStaffUser ? currentStaffUser.staffId : "admin_finance";
      }

      await db.collection("orders").doc(orderId).update(updatePayload);
    } catch (err) {
      alert(`更新狀態失敗：\n${err.message}`);
      renderOrdersTable();
    }
  }

  function handleQcStatusDropdownChange(orderId, selectedValue) {
    if (selectedValue === "審核不通過") {
      openQcRejectModal(orderId);
    } else if (selectedValue === "審核通過") {
      const db = window.firebase ? window.firebase.firestore() : null;
      if (!db) return;
      window.OrderFsmService.approveQcOrder(db, orderId, currentStaffUser ? currentStaffUser.staffId : "admin_art_core")
        .catch(err => {
          alert(`圖審操作失敗：${err.message}`);
          renderOrdersTable();
        });
    } else {
      handleGenericStatusChange(orderId, "qcStatus", "待審核");
    }
  }

  function openQcRejectModal(orderId) {
    pendingRejectOrderId = orderId;
    qcRejectOrderTitle.textContent = `退件工單：【${orderId}】`;
    qcRejectPresetSelect.value = "";
    qcRejectReasonInput.value = "";
    qcRejectModalOverlay.style.display = "flex";
  }

  function closeQcRejectModal() {
    qcRejectModalOverlay.style.display = "none";
    pendingRejectOrderId = null;
    renderOrdersTable();
  }

  async function handleConfirmQcReject() {
    if (!pendingRejectOrderId) return;
    const reason = qcRejectReasonInput.value.trim();
    if (!reason) {
      alert("退件理由必填，請輸入退件原因以通知訂購人！");
      return;
    }

    try {
      const db = window.firebase ? window.firebase.firestore() : null;
      btnConfirmQcReject.disabled = true;
      btnConfirmQcReject.textContent = "退件中...";

      const targetOrder = ordersList.find(o => o.orderId === pendingRejectOrderId || o.id === pendingRejectOrderId);

      await window.OrderFsmService.rejectQcOrder(
        db,
        pendingRejectOrderId,
        reason,
        currentStaffUser ? currentStaffUser.staffId : "admin_art_core"
      );

      // 調用 GAS 發送退貨通知信 (action: "send_order_rejected")
      if (targetOrder && targetOrder.email) {
        try {
          const rejectMailPayload = {
            action: "send_order_rejected",
            email: targetOrder.email,
            name: targetOrder.studentName || targetOrder.name || "同學",
            username: targetOrder.username || targetOrder.studentId || "--",
            orderId: targetOrder.orderId,
            productName: targetOrder.productName || "客製化商品",
            reason: reason,
            notice: "經美術組審核未符印製標準，請於 3 天內登入官網修改上傳圖檔；若逾期未處理，配送組將於第 4 天親送紙本退貨通知憑證至班級。",
            deadlineDays: 3,
            portalUrl: "https://project-8372949785937083434.web.app/"
          };

          fetch(GAS_API_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(rejectMailPayload)
          }).catch(err => console.warn("[Reject Email Send Error]", err));
        } catch (mailErr) {
          console.warn("[Reject Email Exception]", mailErr);
        }
      }

      alert(`✅ 工單【${pendingRejectOrderId}】已標記為審核不通過，退件原因已即時記錄並發送通知信！`);
      closeQcRejectModal();
    } catch (err) {
      alert(`退件失敗：${err.message}`);
    } finally {
      btnConfirmQcReject.disabled = false;
      btnConfirmQcReject.textContent = "❌ 確認退件並通知";
    }
  }

  // ==========================================================================
  // 全校會員資料庫看板 (Member Directory)
  // ==========================================================================
  function startMembersListener() {
    const db = window.firebase ? window.firebase.firestore() : null;
    if (!db) return;

    if (unsubscribeMembers) unsubscribeMembers();

    unsubscribeMembers = db.collection("users").onSnapshot((snapshot) => {
      const list = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      membersList = list;
      renderMembersTable();
    }, (err) => {
      console.warn("[Members Error]", err);
    });
  }

  function renderMembersTable() {
    const q = memberSearchInput ? memberSearchInput.value.trim().toLowerCase() : "";
    membersTableBody.innerHTML = "";

    const filtered = membersList.filter(m => {
      if (!q) return true;
      const str = `${m.username || ""} ${m.name || ""} ${m.studentId || ""} ${m.classCode || ""} ${m.facultyId || ""} ${m.phone || ""}`.toLowerCase();
      return str.includes(q);
    });

    if (memberCountBadge) {
      memberCountBadge.textContent = `共 ${filtered.length} 筆會員 (全校資料庫)`;
    }

    function formatFullDateTime(dt) {
      if (!dt) return "--";
      try {
        const d = new Date(dt);
        if (isNaN(d.getTime())) return String(dt);
        const pad = (n) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      } catch (e) {
        return String(dt);
      }
    }

    filtered.forEach(m => {
      const tr = document.createElement("tr");
      const isFaculty = m.userType === "FACULTY";
      const typeBadge = isFaculty 
        ? `<span class="status-pill" style="background:rgba(168,85,247,0.2); color:#c084fc;">教職員</span>`
        : `<span class="status-pill" style="background:rgba(56,189,248,0.2); color:#38bdf8;">學生</span>`;

      const regTimeFormatted = formatFullDateTime(m.registeredAt || m.createdAt);

      tr.innerHTML = `
        <td>${typeBadge}</td>
        <td style="font-family:monospace; font-weight:700; color:#38bdf8;">${m.username || "--"}</td>
        <td style="font-size:0.8rem; color:#cbd5e1;"><a href="mailto:${m.email || ''}" style="color:#a5b4fc; text-decoration:none;">${m.email || "--"}</a></td>
        <td style="font-family:monospace; font-weight:600; color:#fff;">${m.studentId || m.facultyId || "--"}</td>
        <td><strong>${m.name || "--"}</strong></td>
        <td>${isFaculty ? (m.department || "教職員") : (m.classCode || "--")}</td>
        <td>${isFaculty ? "--" : (m.seatNumber !== undefined ? `${m.seatNumber} 號` : "--")}</td>
        <td>${m.phone || "--"}</td>
        <td style="font-size:0.75rem; color:#94a3b8; font-family:monospace;">${regTimeFormatted}</td>
      `;
      membersTableBody.appendChild(tr);
    });
  }

  // ==========================================================================
  // 美術退件滿 4 天專區與憑證列印
  // ==========================================================================
  function getOverdueRejectedOrdersList() {
    const fourDaysMs = 4 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    return ordersList.filter(o => {
      if (o.qcStatus !== "退件待補" && o.qcStatus !== "審核不通過") return false;
      const rejTime = o.qcRejectedAt || o.rejectedAt;
      if (!rejTime) return false;
      return (now - new Date(rejTime).getTime()) > fourDaysMs;
    });
  }

  function renderOverdueTable() {
    const overdueList = getOverdueRejectedOrdersList();
    overdueTableBody.innerHTML = "";

    if (overdueList.length === 0) {
      overdueTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--text-muted); padding:2rem;">🎉 目前無任何超過 4 天未補正之退件工單！</td></tr>`;
      return;
    }

    const now = Date.now();
    overdueList.forEach(o => {
      const rejTime = o.qcRejectedAt || o.rejectedAt;
      const diffDays = rejTime ? Math.floor((now - new Date(rejTime).getTime()) / (24 * 60 * 60 * 1000)) : 4;
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td style="font-family:monospace; font-weight:700; color:#f87171;">${o.orderId}</td>
        <td>${o.studentClass || o.classCode || "--"} (${o.studentSeat || o.seatNumber || "--"}號)</td>
        <td><strong>${o.studentName || o.name || "--"}</strong></td>
        <td>${o.productName || "--"}</td>
        <td style="color:#fbbf24; font-size:0.8rem; max-width:260px;">${o.qcRejectedReason || o.rejectReason || "圖檔不合規範逾期未補"}</td>
        <td style="font-size:0.75rem; color:#94a3b8;">${rejTime ? new Date(rejTime).toLocaleString("zh-TW") : "--"}</td>
        <td><span class="status-pill status-qc-fail">逾期 ${diffDays} 天</span></td>
        <td>
          <button class="btn-tool btn-print-overdue" style="padding:0.25rem 0.6rem; font-size:0.75rem; background:rgba(239,68,68,0.2); border-color:#ef4444; color:#fca5a5;">
            🖨️ 印退貨憑證
          </button>
        </td>
      `;

      tr.querySelector(".btn-print-overdue").addEventListener("click", () => {
        window.PrintTemplateService.printOverdueRejectNotices([o]);
      });

      overdueTableBody.appendChild(tr);
    });
  }

  function handleBatchPrintOverdueSlips() {
    const overdueList = getOverdueRejectedOrdersList();
    if (overdueList.length === 0) {
      alert("目前無逾期滿 4 天之退件工單需列印！");
      return;
    }
    window.PrintTemplateService.printOverdueRejectNotices(overdueList);
  }

  // ==========================================================================
  // 幹部驗證碼與帳密管理 (總召專屬 SUPER_ADMIN)
  // ==========================================================================
  function startStaffManagerListener() {
    const db = window.firebase ? window.firebase.firestore() : null;
    if (!db) return;

    if (unsubscribeStaff) unsubscribeStaff();

    unsubscribeStaff = db.collection("staff_users").onSnapshot((snapshot) => {
      const list = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      allStaffList = list;
      renderStaffManagerTable();
    });
  }

  function renderStaffManagerTable() {
    staffTableBody.innerHTML = "";

    if (allStaffList.length === 0) {
      staffTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:2rem;">讀取幹部資料中...</td></tr>`;
      return;
    }

    allStaffList.forEach(staff => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td style="font-family:monospace; font-weight:700; color:#818cf8;">${staff.staffId}</td>
        <td><strong>${staff.name || staff.staffId}</strong></td>
        <td>
          <select class="staff-role-select auth-select" style="padding:0.25rem 0.5rem; font-size:0.8rem; width:auto;">
            <option value="SUPER_ADMIN" ${staff.role === "SUPER_ADMIN" ? "selected" : ""}>總召 (SUPER_ADMIN)</option>
            <option value="HEAD_OF_DEPT" ${staff.role === "HEAD_OF_DEPT" ? "selected" : ""}>科主任 (HEAD_OF_DEPT)</option>
            <option value="ADVISOR_TEACHER" ${staff.role === "ADVISOR_TEACHER" ? "selected" : ""}>指導老師 (ADVISOR_TEACHER)</option>
            <option value="DEVELOPER" ${staff.role === "DEVELOPER" ? "selected" : ""}>AI 網站組 (DEVELOPER)</option>
            <option value="QC_REVIEWER" ${staff.role === "QC_REVIEWER" ? "selected" : ""}>美術視覺組 (QC_REVIEWER)</option>
            <option value="PRODUCTION" ${staff.role === "PRODUCTION" ? "selected" : ""}>商品製作組 (PRODUCTION)</option>
            <option value="FINANCE" ${staff.role === "FINANCE" ? "selected" : ""}>財務組 (FINANCE)</option>
            <option value="LOGISTICS" ${staff.role === "LOGISTICS" ? "selected" : ""}>外送組 (LOGISTICS)</option>
            <option value="MARKETING" ${staff.role === "MARKETING" ? "selected" : ""}>企劃組 (MARKETING)</option>
            <option value="PROMOTION" ${staff.role === "PROMOTION" ? "selected" : ""}>宣傳組 (PROMOTION)</option>
          </select>
        </td>
        <td>
          <input type="text" class="staff-pwd-input auth-input" value="${staff.password || ""}" style="padding:0.25rem 0.5rem; font-size:0.8rem; width:140px;">
        </td>
        <td>
          <input type="text" class="staff-code-input auth-input" maxlength="6" value="${staff.authCode || ""}" style="padding:0.25rem 0.5rem; font-size:0.8rem; width:90px; font-family:monospace; font-weight:700;">
        </td>
        <td>
          <label style="display:inline-flex; align-items:center; gap:0.35rem; cursor:pointer; font-size:0.75rem;">
            <input type="checkbox" class="staff-activated-chk" ${(staff.isActivated || staff.hasInitialized) ? "checked" : ""}>
            <span class="status-text" style="color:${(staff.isActivated || staff.hasInitialized) ? '#34d399' : '#f87171'}; font-weight:600;">
              ${(staff.isActivated || staff.hasInitialized) ? "🟢 已啟用" : "🔴 待啟用"}
            </span>
          </label>
        </td>
        <td>
          <button class="btn-tool btn-save-staff" style="padding:0.25rem 0.65rem; font-size:0.75rem; background:rgba(99,102,241,0.2); border-color:#818cf8; color:#fff;">
            💾 儲存
          </button>
        </td>
      `;

      const chkActivated = tr.querySelector(".staff-activated-chk");
      const statusText = tr.querySelector(".status-text");
      chkActivated.addEventListener("change", () => {
        if (chkActivated.checked) {
          statusText.style.color = "#34d399";
          statusText.textContent = "🟢 已啟用";
        } else {
          statusText.style.color = "#f87171";
          statusText.textContent = "🔴 待啟用";
        }
      });

      const btnSave = tr.querySelector(".btn-save-staff");
      btnSave.addEventListener("click", async () => {
        const newRole = tr.querySelector(".staff-role-select").value;
        const newPwd = tr.querySelector(".staff-pwd-input").value.trim();
        const newCode = tr.querySelector(".staff-code-input").value.trim();
        const newIsActivated = chkActivated.checked;

        if (!newPwd) {
          alert("登入密碼不可為空！");
          return;
        }
        if (!/^\d{6}$/.test(newCode)) {
          alert("專屬身分驗證碼必須為恰好 6 碼純數字 (真實學號)！");
          return;
        }

        try {
          const db = window.firebase ? window.firebase.firestore() : null;
          await db.collection("staff_users").doc(staff.staffId).update({
            role: newRole,
            password: newPwd,
            authCode: newCode,
            isActivated: newIsActivated,
            hasInitialized: newIsActivated,
            updatedAt: new Date().toISOString()
          });
          alert(`✅ 幹部【${staff.name || staff.staffId}】之帳號設定 (包含密碼、驗證碼與啟用狀態) 已成功儲存！`);
        } catch (err) {
          alert(`儲存失敗：${err.message}`);
        }
      });

      staffTableBody.appendChild(tr);
    });
  }

  // ==========================================================================
  // 自訂圖片燈箱與縮放檢視 (Image Lightbox)
  // ==========================================================================
  function openImageLightbox(order) {
    if (!order) return;
    const src = order.imageUrl;
    if (!src) {
      alert("此工單未包含上傳圖檔！");
      return;
    }

    currentLightboxZoom = 1;
    lightboxTargetImg.src = src;
    lightboxTargetImg.style.transform = `scale(${currentLightboxZoom})`;
    lightboxTitle.textContent = `工單【${order.orderId}】客製圖片檢視 (${order.productName || "客製品"})`;
    lightboxResText.textContent = order.imageRes ? `[解析度: ${order.imageRes}]` : "";
    btnOpenRawImage.href = src;

    imageLightboxModal.style.display = "flex";
  }

  function closeImageLightbox() {
    imageLightboxModal.style.display = "none";
    lightboxTargetImg.src = "";
    currentLightboxZoom = 1;
  }

  function setLightboxZoom(newZoom) {
    currentLightboxZoom = Math.min(4, Math.max(0.3, newZoom));
    lightboxTargetImg.style.transform = `scale(${currentLightboxZoom})`;
  }

  // ==========================================================================
  // PIM 新增商品彈窗 (Add Product Modal)
  // ==========================================================================
  function openPimAddProductModal() {
    newProdCode.value = "";
    newProdName.value = "";
    newProdPrice.value = "";
    newProdDesc.value = "";
    newProdImage.value = "";
    newProdStockStatus.value = "IN_STOCK";
    pimAddProductModalOverlay.style.display = "flex";
  }

  function closePimAddProductModal() {
    pimAddProductModalOverlay.style.display = "none";
  }

  async function handleSubmitNewProduct() {
    const code = newProdCode.value.trim().toUpperCase();
    const name = newProdName.value.trim();
    const price = Number(newProdPrice.value);
    const category = newProdCategory.value;
    const desc = newProdDesc.value.trim();
    const imageUrl = newProdImage.value.trim();
    const stockStatus = newProdStockStatus.value;

    if (!code || code.length < 2) {
      alert("請填寫商品代碼（至少 2 碼大寫英文字母，例：TOTE）！");
      return;
    }
    if (!name) {
      alert("請輸入商品名稱！");
      return;
    }
    if (!price || price < 1) {
      alert("預購單價必須大於 0！");
      return;
    }

    try {
      const db = window.firebase ? window.firebase.firestore() : null;
      btnSubmitAddProduct.disabled = true;
      btnSubmitAddProduct.textContent = "上架中...";

      await window.ProductAdminService.createProductItem(db, {
        code,
        name,
        price,
        category,
        desc,
        imageUrl,
        stockStatus
      });

      alert(`🎉 新商品【${name}】(${code}) 已成功上架！前台與 PIM 即時同步。`);
      closePimAddProductModal();
    } catch (err) {
      alert(`新增商品失敗：\n${err.message}`);
    } finally {
      btnSubmitAddProduct.disabled = false;
      btnSubmitAddProduct.textContent = "✨ 建立並上架商品";
    }
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
    const isFinance = role === "FINANCE" || isTeacherOrDirector;

    const imgPreview = order.imageUrl || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%231e293b'/%3E%3Ctext x='50' y='55' fill='%2364748b' font-size='12' text-anchor='middle'%3E無圖檔%3C/text%3E%3C/svg%3E";

    const isEmailSent = order.mailStatus === "SENT";
    const mailSentTimeStr = order.mailSentAt ? new Date(order.mailSentAt).toLocaleString("zh-TW") : "";

    drawerContentScroll.innerHTML = `
      <!-- 顧客個資與圖檔審核區塊 (手動發信控制台) -->
      <div class="drawer-section-card" style="border: 1px solid rgba(99, 102, 241, 0.35); background: rgba(99, 102, 241, 0.08);">
        <div class="drawer-section-title" style="display:flex; justify-content:space-between; align-items:center;">
          <span>📋 顧客個資與圖檔審核區塊</span>
          <span style="font-size:0.75rem; padding:2px 8px; border-radius:999px; ${isEmailSent ? 'background:#059669; color:#fff;' : 'background:#d97706; color:#fff;'}">
            ${isEmailSent ? '已核驗發信' : '待審核發信'}
          </span>
        </div>
        <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.6rem;">
          工作人員核驗顧客姓名、班級、圖檔清晰度無誤後，可手動點擊寄送訂單確認信至顧客 Gmail。
        </p>
        <div style="display:flex; gap:0.5rem; align-items:center;">
          <button id="btnManualSendOrderEmail" class="btn-tool" style="width:100%; padding:0.65rem 1rem; font-size:0.86rem; font-weight:700; ${isEmailSent ? 'background:#059669; color:#fff; cursor:default;' : 'background:var(--accent-gradient-btn); color:#fff; cursor:pointer;'}" ${isEmailSent ? 'disabled' : ''}>
            ${isEmailSent ? `✔ 訂單確認信已送達 (${mailSentTimeStr})` : '📧 審核無誤，發送訂單確認信至顧客信箱'}
          </button>
        </div>
      </div>

      <!-- 圖檔檢驗卡片 -->
      <div class="drawer-section-card">
        <div class="drawer-section-title">🖼️ 客製圖檔與解析度</div>
        <img src="${imgPreview}" class="drawer-image-preview" style="cursor:pointer;" alt="工單圖檔" title="點擊開啟放大燈箱">
        <div style="margin-top:0.75rem; font-size:0.8rem; display:flex; justify-content:space-between; align-items:center;">
          <span style="color:var(--text-muted);">圖檔規格：${order.imageRes || "未提供"}</span>
          <button id="drawerOpenLightboxBtn" class="btn-tool" style="font-size:0.75rem; padding:0.2rem 0.6rem;">🔍 燈箱放大</button>
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
          <strong style="color:#fff;">電話：</strong>${order.studentPhone || order.phone || "--"}
        </p>
        <p style="font-size:0.85rem; margin-bottom:0.35rem;">
          <strong style="color:#fff;">Email：</strong>${order.email || "--"}
        </p>
        <p style="font-size:0.85rem; color:var(--text-muted);">
          <strong style="color:#fff;">備註：</strong>${order.customerNotes || order.notes || "無"}
        </p>
      </div>

      <!-- 款項明細卡片 -->
      <div class="drawer-section-card">
        <div class="drawer-section-title">💰 款項與單據資訊</div>
        <div style="display:flex; justify-content:space-between; font-size:0.9rem; margin-bottom:0.35rem;">
          <span>品項單價：NT$ ${order.unitPrice || 0}</span>
          <span>數量：${order.quantity || 1} 件</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:1.1rem; font-weight:800; color:var(--primary); border-top:1px dashed rgba(255,255,255,0.1); padding-top:0.5rem;">
          <span>應付金額：</span>
          <span>NT$ ${order.subtotal || (order.unitPrice * (order.quantity || 1))}</span>
        </div>
        <p style="font-size:0.78rem; color:var(--text-muted); margin-top:0.4rem;">
          三聯單防偽流水號：${order.slipSerialNo || "--"}
        </p>
        <div style="margin-top:0.6rem; padding-top:0.5rem; border-top:1px dashed rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:0.8rem; color:var(--text-muted);">三聯單列印狀態：</span>
          <span style="font-size:0.8rem; font-weight:700; color:${order.printStatus === 'PRINTED' ? '#34d399' : '#f59e0b'};">
            ${order.printStatus === 'PRINTED' ? `🟢 已列印 (${order.printedAt ? new Date(order.printedAt).toLocaleString('zh-TW') : '已完成'})` : '🟡 待列印 (UNPRINTED)'}
          </span>
        </div>
      </div>
    `;

    // 抽屜內手動發信按鈕綁定
    const btnManualSendOrderEmail = drawerContentScroll.querySelector("#btnManualSendOrderEmail");
    if (btnManualSendOrderEmail && !isEmailSent) {
      btnManualSendOrderEmail.addEventListener("click", async () => {
        if (!order.email) {
          alert("⚠️ 此工單無顧客 Email，無法發送訂單確認信！");
          return;
        }

        const confirmSend = confirm(`確定要發送訂單確認信至【${order.email}】嗎？\n顧客姓名：${order.studentName || order.name}\n品項：${order.productName || "客製商品"}`);
        if (!confirmSend) return;

        btnManualSendOrderEmail.disabled = true;
        btnManualSendOrderEmail.textContent = "⏳ 正在透過 GAS 發送確認信...";

        try {
          const emailPayload = {
            action: "send_order_success",
            email: order.email,
            name: order.studentName || order.name || "同學/老師",
            username: order.username || order.studentId || "--",
            orderId: order.parentOrderId || order.orderId,
            serialNumber: order.slipSerialNo || order.orderId,
            totalAmount: Number(order.subtotal || (order.unitPrice * (order.quantity || 1)) || 0),
            itemsSummary: `${order.productName} x ${order.quantity || 1} (NT$ ${order.subtotal || (order.unitPrice * (order.quantity || 1))})`,
            customDetails: `【${order.productName}】客製備註：${order.customerNotes || "無特殊備註"}`,
            customImageUrl: (order.imageUrl && order.imageUrl.startsWith("http")) ? order.imageUrl : "",
            notice: "本訂單經工作人員審核無誤，我們將在 3 天內將派送單（三聯單）發送到您的班級現場，財務人員將隨行收取款項。領貨憑第一聯取貨憑證，三聯單簽名後恕不退貨。"
          };

          await fetch(GAS_API_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(emailPayload)
          });

          const nowIso = new Date().toISOString();
          const db = window.firebase ? window.firebase.firestore() : null;
          if (db) {
            await db.collection("orders").doc(order.orderId).update({
              mailStatus: "SENT",
              mailSentAt: nowIso
            });
          }

          // 同步記憶體物件
          order.mailStatus = "SENT";
          order.mailSentAt = nowIso;

          btnManualSendOrderEmail.style.background = "#059669";
          btnManualSendOrderEmail.style.color = "#fff";
          btnManualSendOrderEmail.style.cursor = "default";
          btnManualSendOrderEmail.disabled = true;
          btnManualSendOrderEmail.textContent = `✔ 訂單確認信已送達 (${new Date(nowIso).toLocaleString("zh-TW")})`;

          alert(`🎉 訂單確認信已成功送達至【${order.email}】！\n系統已標記為【已核驗發信】。`);
        } catch (err) {
          console.error("[Manual Send Order Email Error]", err);
          alert(`❌ 發送確認信失敗：\n${err.message}`);
          btnManualSendOrderEmail.disabled = false;
          btnManualSendOrderEmail.textContent = "📧 審核無誤，發送訂單確認信至顧客信箱";
        }
      });
    }

    // 抽屜內圖片點擊開啟燈箱
    drawerContentScroll.querySelector(".drawer-image-preview").addEventListener("click", () => openImageLightbox(order));
    drawerContentScroll.querySelector("#drawerOpenLightboxBtn").addEventListener("click", () => openImageLightbox(order));

    // 抽屜底部操作按鈕
    drawerActionFooter.innerHTML = "";

    // 1. 單筆列印按鈕 (調用 A4 零跑版三聯單並自動監控更新列印狀態；必須等美術審核通過才解鎖)
    const isQcApprovedForPrint = order.qcStatus === "審核通過";
    const btnPrintSingle = document.createElement("button");
    btnPrintSingle.className = "btn-tool";
    btnPrintSingle.style.flex = "1";
    if (!isQcApprovedForPrint) {
      btnPrintSingle.style.opacity = "0.5";
      btnPrintSingle.style.cursor = "not-allowed";
      btnPrintSingle.title = "⚠️ 必須等美術組審核通過後方可列印三聯單！";
      btnPrintSingle.innerHTML = "🔒 列印三聯單 (待美術審核)";
      btnPrintSingle.onclick = () => {
        alert("⚠️ 必須等美術組審核通過後方可列印！");
      };
    } else {
      btnPrintSingle.innerHTML = "🖨️ 列印三聯單 (A4單頁)";
      btnPrintSingle.onclick = () => {
        window.PrintTemplateService.printA4TripleVouchers([order], (printedIds) => {
          markOrdersAsPrinted(printedIds || [order.orderId]);
        });
      };
    }
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
          alert(`工單【${order.orderId}】圖審已通過！已連鎖解鎖三聯單列印與派送組選單。`);
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
  // 自動更新三聯單列印狀態 (printStatus: PRINTED, printedAt: ISO)
  // ==========================================================================
  async function markOrdersAsPrinted(orderIds) {
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) return;
    const nowIso = new Date().toISOString();

    // 1. 本地立即樂觀更新 (Optimistic UI Update，無須手動重整)
    orderIds.forEach(id => {
      const target = ordersList.find(o => o.orderId === id || o.id === id);
      if (target) {
        target.printStatus = "PRINTED";
        target.printedAt = nowIso;
      }
    });
    renderOrdersTable();

    // 若當前有開啟中之抽屜面板，即時更新其狀態標籤
    if (currentInspectingOrder && orderIds.includes(currentInspectingOrder.orderId)) {
      currentInspectingOrder.printStatus = "PRINTED";
      currentInspectingOrder.printedAt = nowIso;
      renderDrawerDetails(currentInspectingOrder);
    }

    // 2. 同步寫入 Firestore
    try {
      const db = window.firebase ? window.firebase.firestore() : null;
      if (!db) return;

      const batch = db.batch();
      orderIds.forEach(id => {
        const docRef = db.collection("orders").doc(id);
        batch.update(docRef, {
          printStatus: "PRINTED",
          printedAt: nowIso
        });
      });
      await batch.commit();
      console.log(`[PrintStatus] 成功更新工單列印狀態為 PRINTED:`, orderIds);
    } catch (err) {
      console.error("[PrintStatus] 更新列印狀態至 Firestore 失敗：", err);
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

    // 檢核勾選工單中是否包含未經美術審核通過之工單
    const unapprovedOrders = selectedList.filter(o => o.qcStatus !== "審核通過");
    if (unapprovedOrders.length > 0) {
      alert(`⚠️ 必須等美術組審核通過後方可列印！\n所選工單中包含 ${unapprovedOrders.length} 筆尚未審核通過的工單（如：${unapprovedOrders[0].orderId}），請先完成圖審再行批次列印。`);
      return;
    }

    window.PrintTemplateService.printA4TripleVouchers(selectedList, (printedIds) => {
      markOrdersAsPrinted(printedIds || selectedList.map(o => o.orderId));
    });
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
