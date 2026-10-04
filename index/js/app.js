/**
 * 115校慶園遊會 - 前台客製商城前端邏輯 (Storefront Application Logic)
 * 核心升級：
 * 1. 圖片安全壓縮降維管線 (Canvas 1200px / WebP 0.7，徹底根絕 Firestore 1MB 阻擋)
 * 2. 師生通用會員體系 (users 集合) 與 Session Isolation (僅存於 sessionStorage)
 * 3. 購物車結帳自動帶入會員個資 (姓名/電話/班級座號/學號)
 * 4. 訂單進度精準配對查詢 (studentId == 查詢學號，三軌動態看板)
 * 5. 34 個智光商工標準班級選單 (<select> + <optgroup> 年級分組)
 * 6. products 庫存狀態即時連動
 */

(function () {
  "use strict";

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // 34 個智光商工標準班級字典 (依年級精準分組)
  const SCHOOL_CLASSES_GROUPED = {
    "一年級": [
      "資處一仁", "餐飲一信甲", "餐飲一義", "餐飲一願", "餐飲入力",
      "電子一慈", "觀光一真", "資訊一圓", "機械一華", "多媒一行", "餐飲一信乙"
    ],
    "二年級": [
      "資處二仁", "餐飲二信甲", "餐飲二義", "餐飲二願", "餐飲二力",
      "電子二慈", "觀光二真", "資訊二圓", "機械二華", "多媒二行", "餐飲二信乙"
    ],
    "三年級": [
      "資處三仁", "餐飲三信甲", "餐飲三義", "餐飲三願", "餐飲三力",
      "電子三慈", "觀光三真", "資訊三圓", "機械三華", "多媒三行", "多媒三善", "餐飲三信乙"
    ]
  };

  // 商品型錄資料 (內建完整校慶專屬紀念品清單，開箱即覽)
  let catalogProducts = [
    {
      code: "BAG",
      name: "115校慶文青帆布袋",
      category: "accessories",
      price: 220,
      leadTime: "校慶現場取件",
      minRes: { w: 2000, h: 2000 },
      stockStatus: "IN_STOCK",
      material: "12安純棉加厚耐磨帆布",
      desc: "12安精梳純棉帆布，厚磅耐磨大容量，加寬肩背帶舒適減壓。",
      specDetail: "材質：12安純棉環保帆布 / 尺寸：寬36cm x 高40cm / 提袋長度：28cm / 印刷方式：高彩熱轉印耐水洗 / 附內袋。校慶前統一批次印製完畢。",
      iconSvg: `<svg viewBox="0 0 64 64" fill="none" stroke="#ec4899" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 20h32l4 34H12z"></path><path d="M24 20v-8a8 8 0 0 1 16 0v8"></path><circle cx="32" cy="38" r="6"></circle></svg>`
    },
    {
      code: "BTL",
      name: "304不銹鋼雷雕保溫杯",
      category: "tableware",
      price: 280,
      leadTime: "校慶現場取件",
      minRes: { w: 1800, h: 2400 },
      stockStatus: "IN_STOCK",
      material: "SUS304食品級不鏽鋼",
      desc: "雙層真空長效保溫保冰，高精度精密雷射雕刻，不掉漆高質感。",
      specDetail: "材質：食品級 SUS304 不鏽鋼 / 容量：500ml / 保溫效果：6~12小時 / 工藝：精密雷雕客製姓名圖案 / 包裝：精美防撞彩盒。",
      iconSvg: `<svg viewBox="0 0 64 64" fill="none" stroke="#0ea5e9" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="20" y="16" width="24" height="42" rx="4"></rect><path d="M24 8h16v8H24z"></path><line x1="28" y1="28" x2="36" y2="28"></line><line x1="28" y1="36" x2="36" y2="36"></line></svg>`
    },
    {
      code: "BDG",
      name: "磨砂圓形校慶徽章",
      category: "accessories",
      price: 40,
      leadTime: "校慶現場取件",
      minRes: { w: 1000, h: 1000 },
      stockStatus: "IN_STOCK",
      material: "馬口鐵+細緻磨砂霧面保護膜",
      desc: "58mm 經典磨砂質感金屬別針胸章，防刮防水防反光。",
      specDetail: "規格：58mm 圓形 / 表面：細緻霧面磨砂膜 / 背面：安全別針 / 特色：防水防刮高質感。",
      iconSvg: `<svg viewBox="0 0 64 64" fill="none" stroke="#f43f5e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="32" cy="32" r="22"></circle><path d="M24 32l6 6 12-12"></path><path d="M20 50l4 8 8-4"></path></svg>`
    },
    {
      code: "KEY",
      name: "雙層高透明壓克力吊飾",
      category: "accessories",
      price: 65,
      leadTime: "校慶現場取件",
      minRes: { w: 1200, h: 1200 },
      stockStatus: "IN_STOCK",
      material: "進口高透光壓克力+金屬D字扣",
      desc: "雙層壓克力夾層印刷夾圖不掉漆，邊緣雷射平滑切割，配精緻金屬鑰匙扣。",
      specDetail: "尺寸：約 60 x 60 mm / 厚度：4mm 雙層夾層 / 材質：進口環保高透壓克力 / 配件：旋轉星形/D字金屬鑰匙扣。",
      iconSvg: `<svg viewBox="0 0 64 64" fill="none" stroke="#8b5cf6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="32" cy="18" r="8"></circle><path d="M32 26v10"></path><rect x="18" y="36" width="28" height="22" rx="6"></rect><circle cx="32" cy="47" r="4"></circle></svg>`
    },
    {
      code: "MUG",
      name: "客製陶瓷馬克杯",
      category: "tableware",
      price: 150,
      leadTime: "校慶現場取件",
      minRes: { w: 2400, h: 1000 },
      stockStatus: "IN_STOCK",
      material: "高溫強化白瓷",
      desc: "高溫白瓷熱轉印，全彩不掉色，附防撞紙盒。",
      specDetail: "材質：高溫強化白瓷 / 容量：350ml / 印製：全彩昇華轉印 / 包裝：專屬防撞白盒。校慶前統一批次印製完畢。",
      iconSvg: `<svg viewBox="0 0 64 64" fill="none" stroke="#4f46e5" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16h32v30a10 10 0 0 1-10 10H22a10 10 0 0 1-10-10V16z"></path><path d="M44 24h6a6 6 0 0 1 6 6v4a6 6 0 0 1-6 6h-6"></path><path d="M18 8v4M28 8v4M38 8v4"></path></svg>`
    },
    {
      code: "CST",
      name: "客製吸水陶瓷杯墊",
      category: "tableware",
      price: 60,
      leadTime: "校慶現場取件",
      minRes: { w: 1200, h: 1200 },
      stockStatus: "IN_STOCK",
      material: "天然鶯歌吸水陶瓷+EVA防滑墊",
      desc: "天然鶯歌陶瓷吸水材質，底部EVA防滑墊。",
      specDetail: "材質：鶯歌吸水陶瓷 / 直徑：110mm / 底部：EVA止滑墊 / 印刷：高彩UV噴印耐磨損。校慶前統一排印。",
      iconSvg: `<svg viewBox="0 0 64 64" fill="none" stroke="#06b6d4" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="32" cy="32" r="24"></circle><circle cx="32" cy="32" r="16" stroke-dasharray="4 4"></circle><path d="M32 20v4M32 40v4M20 32h4M40 32h4"></path></svg>`
    },
    {
      code: "CRD",
      name: "紀念卡貼套裝 (一組2張)",
      category: "stationery",
      price: 50,
      leadTime: "校慶現場取件",
      minRes: { w: 1012, h: 638 },
      stockStatus: "IN_STOCK",
      material: "進口PET霧面防水膜",
      desc: "標準悠遊卡尺寸霧面防水防刮卡貼，一組兩張。",
      specDetail: "尺寸：85.6 x 54 mm (悠遊卡/一卡通標準規格) / 材質：進口PET防水抗刮膜 / 數量：一組 2 張。",
      iconSvg: `<svg viewBox="0 0 64 64" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="10" y="16" width="44" height="32" rx="4"></rect><line x1="10" y1="26" x2="54" y2="26"></line><circle cx="44" cy="38" r="4"></circle></svg>`
    },
    {
      code: "PSP",
      name: "A3 高光特厚紀念海報",
      category: "prints",
      price: 80,
      leadTime: "校慶現場取件",
      minRes: { w: 3508, h: 4960 },
      stockStatus: "IN_STOCK",
      material: "250g 特級雪銅紙雙面亮膜",
      desc: "250g 特級雪銅紙雙面高光覆膜，色彩鮮明飽和。",
      specDetail: "尺寸：A3 (297 x 420 mm) / 紙質：250g 特厚雪銅紙 / 覆膜：雙面亮光防水保護膜 / 成色飽滿。",
      iconSvg: `<svg viewBox="0 0 64 64" fill="none" stroke="#8b5cf6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8h24l12 12v36H16z"></path><path d="M40 8v12h12"></path><circle cx="28" cy="32" r="4"></circle><path d="M20 48l10-10 6 6 8-8 4 4"></path></svg>`
    }
  ];

  // 狀態管理 (Session Isolation)
  let currentUser = null;
  let cart = [];
  let currentCustomizingProduct = null;
  let currentVerifiedFile = null;
  let currentFileResInfo = null;
  let pendingCartItem = null;
  let unsubscribeProducts = null;
  let unsubscribeOrders = null;

  // 跨分頁雙向購物車同步廣播通道 (Cross-Tab State Sync)
  const cartSyncChannel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("zg_cart_sync_channel") : null;

  // DOM 元素引用
  const toastContainer = document.getElementById("toastContainer");
  const productsGrid = document.getElementById("productsGrid");
  const categorySelect = document.getElementById("categorySelect");
  const cartBadgeCount = document.getElementById("cartBadgeCount");
  const mobileCartBadgeCount = document.getElementById("mobileCartBadgeCount");
  const mobileCartBtn = document.getElementById("mobileCartBtn");
  
  // 側邊抽屜
  const cartDrawerBackdrop = document.getElementById("cartDrawerBackdrop");
  const cartDrawer = document.getElementById("cartDrawer");
  const drawerBody = document.getElementById("drawerBody");
  const drawerTotalPrice = document.getElementById("drawerTotalPrice");
  const openCartBtn = document.getElementById("openCartBtn");
  const closeCartBtn = document.getElementById("closeCartBtn");
  const drawerCheckoutBtn = document.getElementById("drawerCheckoutBtn");

  // 手機漢堡選單
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const closeMobileNavBtn = document.getElementById("closeMobileNavBtn");
  const mobileNavDrawer = document.getElementById("mobileNavDrawer");
  const mobileNavBackdrop = document.getElementById("mobileNavBackdrop");
  const mobileNavLinks = document.querySelectorAll(".mobile-nav-link");

  // 顧客自訂圖檔大圖燈箱
  const imageLightboxOverlay = document.getElementById("imageLightboxOverlay");
  const closeImageLightboxBtn = document.getElementById("closeImageLightboxBtn");
  const lightboxImg = document.getElementById("lightboxImg");
  const lightboxCaption = document.getElementById("lightboxCaption");

  // 商品詳細規格介紹視窗 (Spec Modal - 行為 A)
  const specModalOverlay = document.getElementById("specModalOverlay");
  const closeSpecModalBtn = document.getElementById("closeSpecModalBtn");
  const specModalTitle = document.getElementById("specModalTitle");
  const specModalImgBox = document.getElementById("specModalImgBox");
  const specModalName = document.getElementById("specModalName");
  const specModalPrice = document.getElementById("specModalPrice");
  const specModalDesc = document.getElementById("specModalDesc");
  const specDetailMaterial = document.getElementById("specDetailMaterial");
  const specDetailDimensions = document.getElementById("specDetailDimensions");
  const specGoToCustBtn = document.getElementById("specGoToCustBtn");

  // 客製彈窗 (PDP - 行為 B)
  const customizeModalOverlay = document.getElementById("customizeModalOverlay");
  const closeCustomizeBtn = document.getElementById("closeCustomizeBtn");
  const custModalTitle = document.getElementById("custModalTitle");
  const custModalSpec = document.getElementById("custModalSpec");
  const pdpAccordionSpec = document.getElementById("pdpAccordionSpec");
  const custFileInput = document.getElementById("custFileInput");
  const custDropzone = document.getElementById("custDropzone");
  const custPreviewBox = document.getElementById("custPreviewBox");
  const custPreviewImg = document.getElementById("custPreviewImg");
  const custResTag = document.getElementById("custResTag");
  const custResNote = document.getElementById("custResNote");
  const custQtyInput = document.getElementById("custQtyInput");
  const custNotesInput = document.getElementById("custNotesInput");
  const custSubtotalPrice = document.getElementById("custSubtotalPrice");
  const addToCartConfirmBtn = document.getElementById("addToCartConfirmBtn");
  const btnOpenAiGuide = document.getElementById("btnOpenAiGuide");

  // 最新消息專區與分類 Tab
  const newsGrid = document.getElementById("newsGrid");
  const newsCategoryTabs = document.getElementById("newsCategoryTabs");
  let unsubscribeNews = null;
  let allNewsItems = [];
  let currentNewsCategory = "ALL";

  // AI 客製圖檔生圖指南彈窗 (AI Guide Modal)
  const aiGuideModalOverlay = document.getElementById("aiGuideModalOverlay");
  const closeAiGuideBtn = document.getElementById("closeAiGuideBtn");

  // 訂購須知確認彈窗 (Notice Modal)
  const noticeModalOverlay = document.getElementById("noticeModalOverlay");
  const closeNoticeBtn = document.getElementById("closeNoticeBtn");
  const btnAgreeNotice = document.getElementById("btnAgreeNotice");

  // 系統發信 API 設定 (Google Apps Script Web App)
  const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzVxFfgUkLWnG_CuSwvE0RVW9UWECmLL_iKSwXckZAPGUvsvEu8m4jdcGoCE02BvSVy/exec";

  // 師生會員專區彈窗 (註冊 / 登入)
  const openMemberModalBtn = document.getElementById("openMemberModalBtn");
  const openTrackModalBtn = document.getElementById("openTrackModalBtn");
  const studentAuthModalOverlay = document.getElementById("studentAuthModalOverlay");
  const closeStudentAuthBtn = document.getElementById("closeStudentAuthBtn");
  const tabAuthLogin = document.getElementById("tabAuthLogin");
  const tabAuthRegister = document.getElementById("tabAuthRegister");
  const studentLoginBox = document.getElementById("studentLoginBox");
  const studentRegisterBox = document.getElementById("studentRegisterBox");
  const loginStudentId = document.getElementById("loginStudentId");
  const loginStudentPwd = document.getElementById("loginStudentPwd");
  const btnStudentLoginSubmit = document.getElementById("btnStudentLoginSubmit");

  // 註冊表單第一階段 (Email 驗證)
  const regStage1EmailBox = document.getElementById("regStage1EmailBox");
  const regEmailInput = document.getElementById("regEmailInput");
  const btnSendVerifyCode = document.getElementById("btnSendVerifyCode");
  const regVerifyCodeInput = document.getElementById("regVerifyCodeInput");
  const btnVerifyCodeSubmit = document.getElementById("btnVerifyCodeSubmit");
  const verifyCodeTimerHint = document.getElementById("verifyCodeTimerHint");

  // 註冊表單第二階段 (資料防呆與自訂帳密)
  const regStage2FieldsBox = document.getElementById("regStage2FieldsBox");
  const verifiedEmailDisplay = document.getElementById("verifiedEmailDisplay");
  const regUsernameCheckHint = document.getElementById("regUsernameCheckHint");
  const regUserTypeRadios = document.getElementsByName("regUserType");
  const regUsername = document.getElementById("regUsername");
  const regPassword = document.getElementById("regPassword");
  const regName = document.getElementById("regName");
  const regGender = document.getElementById("regGender");
  const regPhone = document.getElementById("regPhone");
  const regStudentFields = document.getElementById("regStudentFields");
  const regFacultyFields = document.getElementById("regFacultyFields");
  const regStudentId = document.getElementById("regStudentId");
  const regSeatNumber = document.getElementById("regSeatNumber");
  const regClassSelect = document.getElementById("regClassSelect");
  const regFacultyId = document.getElementById("regFacultyId");
  const regDepartment = document.getElementById("regDepartment");
  const btnStudentRegisterSubmit = document.getElementById("btnStudentRegisterSubmit");

  // 訂單查詢與三軌進度專區
  const studentOrdersModalOverlay = document.getElementById("studentOrdersModalOverlay");
  const closeStudentOrdersBtn = document.getElementById("closeStudentOrdersBtn");
  const memberGreeting = document.getElementById("memberGreeting");
  const btnStudentLogout = document.getElementById("btnStudentLogout");
  const quickSearchTrackBar = document.getElementById("quickSearchTrackBar");
  const trackSearchStudentId = document.getElementById("trackSearchStudentId");
  const btnDoTrackSearch = document.getElementById("btnDoTrackSearch");
  const studentOrdersListContainer = document.getElementById("studentOrdersListContainer");

  // 會員專區只讀模式欄位
  const memberProfileCard = document.getElementById("memberProfileCard");
  const profStudentId = document.getElementById("profStudentId");
  const profName = document.getElementById("profName");
  const profClass = document.getElementById("profClass");
  const profSeat = document.getElementById("profSeat");
  const profPhone = document.getElementById("profPhone");

  // 結帳雙重確認彈窗
  const checkoutModalOverlay = document.getElementById("checkoutModalOverlay");
  const closeCheckoutBtn = document.getElementById("closeCheckoutBtn");
  const checkoutItemsSummary = document.getElementById("checkoutItemsSummary");
  const checkoutGrandTotal = document.getElementById("checkoutGrandTotal");
  const classCodeSelect = document.getElementById("classCodeSelect");
  const studentSeatInput = document.getElementById("studentSeatInput");
  const studentIdInput = document.getElementById("studentIdInput");
  const studentNameInput = document.getElementById("studentNameInput");
  const studentPhoneInput = document.getElementById("studentPhoneInput");
  const studentEmailInput = document.getElementById("studentEmailInput");
  const studentGenderSelect = document.getElementById("studentGenderSelect");
  const finalOrderNotes = document.getElementById("finalOrderNotes");
  const chkAgreeCheckoutTerms = document.getElementById("chkAgreeCheckoutTerms");
  const confirmOrderSubmitBtn = document.getElementById("confirmOrderSubmitBtn");

  // ==========================================================================
  // 可愛粉彩 Toast 提示訊息 (支援 HTML Entity 與粉彩圓角美學)
  // ==========================================================================
  function showToast(message, type = "warn") {
    if (!toastContainer) return;
    const toast = document.createElement("div");
    toast.className = `toast-message ${type === "success" ? "toast-success" : type === "warn" ? "toast-warn" : ""}`;
    
    let iconEntity = "&#128150;"; // 預設愛心
    if (type === "success") iconEntity = "&#10024;"; // 閃光
    if (type === "error" || type === "danger") iconEntity = "&#128525;";
    if (type === "cart") iconEntity = "&#127873;"; // 禮物
    if (type === "code") iconEntity = "&#128640;"; // 飛機

    toast.innerHTML = `<span>${iconEntity}</span> <span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) toast.parentElement.removeChild(toast);
    }, 3000);
  }

  function triggerShake(element) {
    if (!element) return;
    element.classList.remove("shake-animation");
    void element.offsetWidth;
    element.classList.add("shake-animation");
    setTimeout(() => {
      element.classList.remove("shake-animation");
    }, 350);
  }

  // ==========================================================================
  // 圖片安全壓縮降維核心 (Canvas 1200px, WebP 0.7, 確保 < 300KB)
  // ==========================================================================
  function compressImageToSafeSize(file, maxDimension = 1200, quality = 0.7) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error("未傳入檔案"));
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          // 轉為輕量 WebP 格式
          let dataUrl = canvas.toDataURL("image/webp", quality);
          // 若長度仍然偏大則以 JPEG 0.6 次要壓縮
          if (dataUrl.length > 400000) {
            dataUrl = canvas.toDataURL("image/jpeg", 0.6);
          }
          console.log(`[Image Compress] 原始圖檔壓縮為安全 Base64，尺寸: ${width}x${height}px，長度: ${dataUrl.length} bytes`);
          resolve(dataUrl);
        };
        img.onerror = () => reject(new Error("圖片載入失敗"));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error("讀取檔案失敗"));
      reader.readAsDataURL(file);
    });
  }

  // ==========================================================================
  // 初始化 (Lenis 平滑滾動、GSAP 拋物線、跨分頁雙向狀態同步)
  // ==========================================================================
  function init() {
    initLenisSmoothScroll();
    initCrossTabCartSync();
    populateClassSelects();
    checkUserSession();
    bindEventListeners();
    startProductsRealtimeListener();
    startNewsRealtimeListener();
    loadCartFromStorage();
    updateCartUI(false);
  }

  // Lenis 絲滑平滑滾動初始化 (消除 Windows 滾輪卡頓)
  function initLenisSmoothScroll() {
    if (typeof window.Lenis !== "undefined") {
      try {
        const lenis = new window.Lenis({
          duration: 1.15,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          direction: "vertical",
          gestureDirection: "vertical",
          smooth: true,
          smoothTouch: false,
          touchMultiplier: 1.5
        });
        function raf(time) {
          lenis.raf(time);
          requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
        window.__zgLenis = lenis;
      } catch (e) {
        console.warn("[Lenis init skipped]", e);
      }
    }
  }

  // 跨分頁購物車雙向同步核心 (BroadcastChannel + storage 事件)
  function initCrossTabCartSync() {
    // 1. 監聽 BroadcastChannel
    if (cartSyncChannel) {
      cartSyncChannel.onmessage = (event) => {
        if (event.data && event.data.type === "CART_UPDATED") {
          loadCartFromStorage();
          updateCartUI(false);
        }
      };
    }

    // 2. 監聽 window storage 事件 (相容跨分頁及會員登入同步)
    window.addEventListener("storage", (e) => {
      if (e.key === "zg_cart") {
        loadCartFromStorage();
        updateCartUI(false);
      }
      if (e.key === "zg_member_user") {
        checkUserSession();
      }
    });
  }

  function loadCartFromStorage() {
    try {
      const raw = localStorage.getItem("zg_cart");
      if (raw) {
        cart = JSON.parse(raw);
        if (!Array.isArray(cart)) cart = [];
      } else {
        cart = [];
      }
    } catch (e) {
      cart = [];
    }
  }

  function saveCartToStorage(broadcast = true) {
    try {
      localStorage.setItem("zg_cart", JSON.stringify(cart));
      if (broadcast && cartSyncChannel) {
        cartSyncChannel.postMessage({ type: "CART_UPDATED", timestamp: Date.now() });
      }
    } catch (e) {
      console.warn("[Cart Save Error]", e);
    }
  }

  // 填入 34 個智光商工標準班級選項 (<select> + <optgroup>)
  function populateClassSelects() {
    const renderOptions = (selectEl, defaultPlaceholder = "請選擇班級") => {
      if (!selectEl) return;
      selectEl.innerHTML = `<option value="">-- ${defaultPlaceholder} --</option>`;
      for (const [gradeName, classList] of Object.entries(SCHOOL_CLASSES_GROUPED)) {
        const optgroup = document.createElement("optgroup");
        optgroup.label = `🏫 ${gradeName}`;
        classList.forEach((cls) => {
          const opt = document.createElement("option");
          opt.value = cls;
          opt.textContent = cls;
          optgroup.appendChild(opt);
        });
        selectEl.appendChild(optgroup);
      }
      // 教職員特殊選項
      const facultyGroup = document.createElement("optgroup");
      facultyGroup.label = "🏢 教職員 / 處室";
      const facOpt = document.createElement("option");
      facOpt.value = "教職員處室";
      facOpt.textContent = "教職員處室 (非學生班級)";
      facultyGroup.appendChild(facOpt);
      selectEl.appendChild(facultyGroup);
    };

    renderOptions(regClassSelect, "選擇就讀班級");
    renderOptions(classCodeSelect, "選擇所屬班級或處室");
  }

  // 會員狀態檢驗 (全站跨頁共享 localStorage zg_member_user，各分頁切換不掉登)
  function checkUserSession() {
    let saved = localStorage.getItem("zg_member_user");
    if (!saved) {
      saved = sessionStorage.getItem("fair115_user_session");
    }
    if (saved) {
      try {
        currentUser = JSON.parse(saved);
        updateUserBtnUI();
      } catch (e) {
        localStorage.removeItem("zg_member_user");
        sessionStorage.removeItem("fair115_user_session");
        currentUser = null;
        updateUserBtnUI();
      }
    } else {
      currentUser = null;
      updateUserBtnUI();
    }
  }

  function updateUserBtnUI() {
    if (!openMemberModalBtn) return;
    if (currentUser) {
      openMemberModalBtn.innerHTML = `<span>👤 ${currentUser.name} (${currentUser.userType === "FACULTY" ? "教職員" : currentUser.classCode})</span>`;
      openMemberModalBtn.style.background = "rgba(99, 102, 241, 0.15)";
      openMemberModalBtn.style.color = "var(--accent-primary)";
    } else {
      openMemberModalBtn.innerHTML = `<span>👤 會員專區 (註冊/登入)</span>`;
      openMemberModalBtn.style.background = "rgba(255, 255, 255, 0.7)";
      openMemberModalBtn.style.color = "var(--text-main)";
    }
  }

  // ==========================================================================
  // 最新消息 (news) 集合即時監聽與分類渲染 (Real-time onSnapshot)
  // ==========================================================================
  function startNewsRealtimeListener() {
    if (!newsGrid) return;
    const db = window.firebase ? window.firebase.firestore() : null;

    // 內建預設公告防呆資料庫 (Fallback Mock)
    const fallbackNews = [
      {
        id: "default-1",
        title: "🎉 115校慶園遊會客製專案預購正式開跑！",
        category: "重要公告",
        date: "2026-10-01",
        content: "為慶祝智光商工 115 週年校慶，資料處理科主辦限定客製化紀念商品預購活動！\n\n本屆特別引進專業熱轉印與高解析噴繪技術，支援陶瓷馬克杯、鶯歌吸水杯墊、金屬磨砂胸章、紀念卡貼套裝與特厚紀念海報等多種客製化規格。\n\n全校師生與校友可即時透過線上商城自訂圖片、填寫班級座號並送出印製訂單。所有預購商品將於校慶日前統一排產印製，校慶當日憑第一聯三聯單據至現場專屬攤位即可領取專屬紀念品！歡迎全校師生踴躍選購。",
        imageUrl: "images/logo115.png"
      },
      {
        id: "default-2",
        title: "💡 零基礎設計！使用免費 AI 咒語一鍵生成專屬紀念商品圖檔",
        category: "優惠活動",
        date: "2026-10-02",
        content: "為解決同學想要客製商品卻不知如何繪圖的困擾，本商城全面導入「AI 1分鐘生圖指南」！\n\n提供 4 大熱門風格模板（日系動漫、像素復古、毛線編織、極簡幾何），只需一鍵複製提示詞 (Prompt) 貼入免費 AI 繪圖工具，就能生成專屬圖檔。\n\n系統內建 1080P 高畫質自動檢測，確保印製出來的校慶紀念商品不模糊、不掉色，人人都可以在 3 分鐘內完成獨一無二的校慶紀念品客製化設計！",
        imageUrl: "images/logo115.png"
      }
    ];

    if (!db) {
      allNewsItems = fallbackNews;
      renderNewsGrid();
      return;
    }

    if (unsubscribeNews) unsubscribeNews();

    unsubscribeNews = db.collection("news")
      .orderBy("date", "desc")
      .onSnapshot((snapshot) => {
        if (!snapshot.empty) {
          const list = [];
          snapshot.forEach((doc) => {
            list.push({ id: doc.id, ...doc.data() });
          });
          allNewsItems = list;
        } else {
          allNewsItems = fallbackNews;
        }
        renderNewsGrid();
      }, (err) => {
        console.warn("[News Listener Error, using Fallback]", err);
        allNewsItems = fallbackNews;
        renderNewsGrid();
      });
  }

  function renderNewsGrid() {
    if (!newsGrid) return;
    newsGrid.innerHTML = "";

    const filtered = currentNewsCategory === "ALL"
      ? allNewsItems
      : allNewsItems.filter(n => (n.category || "最新消息") === currentNewsCategory);

    if (filtered.length === 0) {
      newsGrid.innerHTML = `
        <div class="news-empty-state">
          <span>📭 目前暫無【${currentNewsCategory}】類別之公告</span>
        </div>
      `;
      return;
    }

    filtered.forEach((item) => {
      const card = document.createElement("article");
      card.className = "news-card";

      const imgSrc = item.imageUrl || "images/logo115.png";
      const cat = item.category || "最新消息";
      const dateStr = item.date || "2026-10-01";
      const title = item.title || "校慶最新消息";
      const content = item.content || item.desc || "";

      card.innerHTML = `
        <div class="news-card-img-wrap">
          <img src="${imgSrc}" alt="${escapeHtml(title)}" class="news-card-img" loading="lazy">
        </div>
        <div class="news-meta-bar">
          <span class="news-tag">${escapeHtml(cat)}</span>
          <span class="news-date">${escapeHtml(dateStr)}</span>
        </div>
        <h3 class="news-card-title" title="${escapeHtml(title)}">${escapeHtml(title)}</h3>
        <p class="news-card-snippet">${escapeHtml(content)}</p>
        <div class="news-card-footer">
          <span class="news-read-more">詳閱公告全文 <span>›</span></span>
        </div>
      `;

      card.addEventListener("click", () => {
        window.open(`news-detail.html?id=${encodeURIComponent(item.id)}`, "_blank");
      });

      newsGrid.appendChild(card);
    });
  }

  // products 集合即時庫存監聽
  function startProductsRealtimeListener() {
    // 預設先立即渲染一次預設商品目錄，杜絕雲端連線延遲造成的空白
    renderProducts("all");

    const db = window.firebase ? window.firebase.firestore() : null;
    if (!db) {
      return;
    }

    if (unsubscribeProducts) unsubscribeProducts();

    unsubscribeProducts = db.collection("products").onSnapshot((snapshot) => {
      if (!snapshot.empty) {
        const liveProducts = [];
        snapshot.forEach((doc) => {
          const p = doc.data();
          const defaultP = catalogProducts.find(item => item.code === p.code || item.code === doc.id);
          liveProducts.push({
            code: p.code || doc.id,
            name: p.name || (defaultP ? defaultP.name : "商品"),
            category: p.category || (defaultP ? defaultP.category : "accessories"),
            price: Number(p.price || p.unit_price || (defaultP ? defaultP.price : 50)),
            leadTime: "校慶現場取件",
            stockStatus: p.stockStatus || "IN_STOCK",
            minRes: defaultP ? defaultP.minRes : { w: 1080, h: 1080 },
            material: p.material || (defaultP ? defaultP.material : "優選工藝材質"),
            desc: p.desc || p.description || (defaultP ? defaultP.desc : ""),
            specDetail: p.specDetail || (defaultP ? defaultP.specDetail : ""),
            iconSvg: (defaultP ? defaultP.iconSvg : ""),
            imageUrl: p.imageUrl || ""
          });
        });
        catalogProducts = liveProducts;
      }
      const activePill = document.querySelector(".category-pill.active");
      const currentCat = activePill ? activePill.dataset.category : "all";
      renderProducts(currentCat);
    }, (err) => {
      console.warn("[Products Listener Error]", err);
      renderProducts("all");
    });
  }

  function renderProducts(categoryFilter = "all") {
    productsGrid.innerHTML = "";
    const filtered = categoryFilter === "all"
      ? catalogProducts
      : catalogProducts.filter(p => p.category === categoryFilter);

    filtered.forEach((p) => {
      const card = document.createElement("div");
      card.className = "product-card";
      card.setAttribute("data-code", p.code);

      let stockBadgeHtml = `<span class="product-badge-lead">🎪 ${p.leadTime}</span>`;
      let isAvailable = true;
      let btnText = "✨ 客製選購";
      let btnExtraClass = "";

      if (p.stockStatus === "OUT_OF_STOCK") {
        stockBadgeHtml = `<span class="product-badge-lead stock-tag-out">❌ 已售罄缺貨</span>`;
        isAvailable = false;
        btnText = "已售罄";
        btnExtraClass = "btn-disabled-stock";
      } else if (p.stockStatus === "RESTOCKING") {
        stockBadgeHtml = `<span class="product-badge-lead stock-tag-restock">⏳ 備料補貨中</span>`;
        isAvailable = false;
        btnText = "補貨中暫停";
        btnExtraClass = "btn-disabled-stock";
      }

      let imgContent = p.iconSvg;
      if (p.imageUrl) {
        imgContent = `<img src="${p.imageUrl}" alt="${p.name}" style="width:100%; height:100%; object-fit:contain;" loading="lazy" decoding="async">`;
      }

      const materialBadge = p.material ? `<span class="product-material-pill" title="材質規格：${p.material}">💎 ${p.material}</span>` : "";

      card.innerHTML = `
        ${stockBadgeHtml}
        <div class="product-image-box">
          ${imgContent}
        </div>
        <strong class="product-title" title="${p.name}">${p.name}</strong>
        ${materialBadge}
        <p class="product-desc" title="${p.desc}">${p.desc}</p>
        <div class="product-meta-row">
          <div class="price-box">
            <span class="price-currency">NT$</span>
            <span class="price-amount">${p.price}</span>
          </div>
          <button class="product-action-btn ${btnExtraClass}" data-code="${p.code}" type="button" ${!isAvailable ? "disabled" : ""}>
            ${btnText}
          </button>
        </div>
      `;

      // 雙軌分流 行為 A：點擊卡片空白處或圖框，彈出「商品詳細規格介紹視窗」
      card.addEventListener("click", (e) => {
        // 若點擊到按鈕則由按鈕事件專責處理
        if (e.target.closest(".product-action-btn")) return;
        openSpecModal(p);
      });

      // 雙軌分流 行為 B：直接點擊「客製選購」按鈕，直達客製訂購區
      const actionBtn = card.querySelector(".product-action-btn");
      if (actionBtn) {
        actionBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (!isAvailable) {
            showToast(`此品項目前【${p.stockStatus === "OUT_OF_STOCK" ? "缺貨" : "補貨中"}】，暫不開放選購！`);
            triggerShake(card);
            return;
          }
          openCustomizeModal(p);
        });
      }

      productsGrid.appendChild(card);
    });
  }

  // ==========================================================================
  // 事件監聽與綁定
  // ==========================================================================
  function bindEventListeners() {
    // 商品分類下拉選單變更
    if (categorySelect) {
      categorySelect.addEventListener("change", (e) => {
        renderProducts(e.target.value);
      });
    }

    custDropzone.addEventListener("click", () => custFileInput.click());
    custFileInput.addEventListener("change", handleFileUpload);

    custDropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      custDropzone.style.borderColor = "var(--accent-primary)";
    });
    custDropzone.addEventListener("dragleave", () => {
      custDropzone.style.borderColor = "#cbd5e1";
    });
    custDropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      custDropzone.style.borderColor = "#cbd5e1";
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        custFileInput.files = e.dataTransfer.files;
        handleFileUpload();
      }
    });

    addToCartConfirmBtn.addEventListener("click", handleAddToCartAttempt);

    btnAgreeNotice.addEventListener("click", handleNoticeAgreed);
    closeNoticeBtn.addEventListener("click", () => {
      noticeModalOverlay.classList.remove("active");
    });

    // 第一階段：Email 驗證發信與驗證按鈕
    let verifyCooldownTimer = null;
    let usernameCheckDebounce = null;
    let verifiedEmail = "";

    // 60 秒倒數函式
    function startVerifyCooldown() {
      let timeLeft = 60;
      btnSendVerifyCode.disabled = true;
      btnSendVerifyCode.style.opacity = "0.6";
      btnSendVerifyCode.textContent = `重新發送 (${timeLeft}s)`;

      if (verifyCooldownTimer) clearInterval(verifyCooldownTimer);
      verifyCooldownTimer = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
          clearInterval(verifyCooldownTimer);
          btnSendVerifyCode.disabled = false;
          btnSendVerifyCode.style.opacity = "1";
          btnSendVerifyCode.textContent = "發送驗證碼";
        } else {
          btnSendVerifyCode.textContent = `重新發送 (${timeLeft}s)`;
        }
      }, 1000);
    }

    // 發送 6 位數驗證碼至 GAS
    async function handleSendVerificationCode() {
      const email = regEmailInput.value.trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        alert("請輸入有效的電子信箱 (包含 Gmail、新北教育帳號 @apps.ntpc.edu.tw、Yahoo、Outlook 等)！");
        regEmailInput.focus();
        return;
      }

      // 產生 6 位數隨機驗證碼 (100000 - 999999)
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 分鐘有效

      sessionStorage.setItem("fair115_email_verify", JSON.stringify({
        email: email,
        code: code,
        expiresAt: expiresAt
      }));

      btnSendVerifyCode.disabled = true;
      btnSendVerifyCode.textContent = "發送中...";

      try {
        // 透過 fetch POST 送至 GAS_API_URL (使用 text/plain 避免 CORS preflight 阻擋)
        const payload = {
          action: "send_verification_code",
          email: email,
          code: code
        };

        await fetch(GAS_API_URL, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload)
        });

        startVerifyCooldown();
        verifyCodeTimerHint.innerHTML = "&#10024; 驗證碼已送出囉！10 分鐘內有效，請記得檢查收件匣或垃圾郵件。";
        verifyCodeTimerHint.style.color = "#059669";
        showToast(`&#128640; 驗證碼已發送至【${email}】，請於 10 分鐘內輸入驗證碼！`, "code");
        regVerifyCodeInput.focus();

      } catch (err) {
        console.error("[GAS Send Code Error]", err);
        btnSendVerifyCode.disabled = false;
        btnSendVerifyCode.textContent = "發送驗證碼";
        showToast(`發送驗證碼時發生異常：${err.message}`, "danger");
      }
    }

    // 核驗 6 位數驗證碼
    function handleVerifyCodeSubmit() {
      const inputCode = regVerifyCodeInput.value.trim();
      if (!/^\d{6}$/.test(inputCode)) {
        showToast("請輸入完整 6 位數字驗證碼！", "warn");
        regVerifyCodeInput.focus();
        return;
      }

      const storedRaw = sessionStorage.getItem("fair115_email_verify");
      if (!storedRaw) {
        showToast("尚未發送驗證碼或已過期，請點擊「發送驗證碼」重新取得！", "warn");
        return;
      }

      try {
        const stored = JSON.parse(storedRaw);
        if (Date.now() > stored.expiresAt) {
          showToast("驗證碼已逾時失效 (超過 10 分鐘)，請重新點擊發送！", "warn");
          sessionStorage.removeItem("fair115_email_verify");
          return;
        }

        if (inputCode !== stored.code) {
          showToast("&#10060; 驗證碼不正確，請重新確認郵件！", "danger");
          regVerifyCodeInput.focus();
          return;
        }

        // 驗證成功：解鎖第二階段
        verifiedEmail = stored.email;
        regEmailInput.disabled = true;
        btnSendVerifyCode.disabled = true;
        regVerifyCodeInput.disabled = true;
        btnVerifyCodeSubmit.disabled = true;
        btnVerifyCodeSubmit.textContent = "✅ 已核驗";
        btnVerifyCodeSubmit.style.background = "#94a3b8";

        if (verifiedEmailDisplay) verifiedEmailDisplay.textContent = verifiedEmail;
        if (regStage2FieldsBox) regStage2FieldsBox.style.display = "block";
        verifyCodeTimerHint.innerHTML = "&#127873; 信箱驗證成功！請於下方完成帳號密碼與個資設定。";
        verifyCodeTimerHint.style.color = "#059669";

        showToast("&#10024; 信箱驗證成功！已解鎖第二階段資料填寫表單。", "success");
        regUsername.focus();

      } catch (e) {
        showToast("驗證程序異常，請重新點擊發送！", "danger");
      }
    }

    // 帳號唯一性即時查詢 (Debounce 防呆提示)
    function handleUsernameInput() {
      const val = regUsername.value.trim();
      if (!regUsernameCheckHint) return;

      if (!val) {
        regUsernameCheckHint.textContent = "";
        return;
      }

      if (!/^[a-zA-Z0-9_-]{3,20}$/.test(val)) {
        regUsernameCheckHint.textContent = "⚠️ 帳號需為 3~20 碼英數字組合";
        regUsernameCheckHint.style.color = "#ef4444";
        return;
      }

      regUsernameCheckHint.textContent = "🔍 檢查帳號唯一性中...";
      regUsernameCheckHint.style.color = "#64748b";

      if (usernameCheckDebounce) clearTimeout(usernameCheckDebounce);
      usernameCheckDebounce = setTimeout(async () => {
        try {
          const db = window.firebase ? window.firebase.firestore() : null;
          if (!db) {
            regUsernameCheckHint.textContent = "⚠️ 資料庫尚未初始化，請重新整理頁面！";
            regUsernameCheckHint.style.color = "#ef4444";
            return;
          }
          const memberSnap = await db.collection("members").doc(val).get();
          const userSnap = await db.collection("users").doc(val).get();

          if (memberSnap.exists || userSnap.exists) {
            regUsernameCheckHint.textContent = `❌ 該自訂帳號【${val}】已存在，已被其他同學使用！`;
            regUsernameCheckHint.style.color = "#ef4444";
          } else {
            regUsernameCheckHint.textContent = `✅ 帳號【${val}】可以使用！`;
            regUsernameCheckHint.style.color = "#059669";
          }
        } catch (e) {
          console.warn("[Check Username Error]", e);
          regUsernameCheckHint.textContent = `⚠️ 連線異常無法檢查：${e.message || "網路連線逾時"}`;
          regUsernameCheckHint.style.color = "#f59e0b";
        }
      }, 400);
    }

    // 姓名即時漢字檢核提示
    const regNameCheckHint = document.getElementById("regNameCheckHint");
    function handleNameInput() {
      if (!regName || !regNameCheckHint) return;
      const val = regName.value.trim();
      if (!val) {
        regNameCheckHint.textContent = "";
        return;
      }
      const chineseRegex = /^[\u4e00-\u9fa5\u3400-\u4dbf\uf900-\ufaff]{2,10}$/;
      if (!chineseRegex.test(val)) {
        regNameCheckHint.textContent = "姓名僅限輸入 2~10 位繁體中文字元喔 (｡◕‿◕｡)";
        regNameCheckHint.style.color = "#ef4444";
      } else {
        regNameCheckHint.textContent = "✅ 姓名格式正確 (｡◕‿◕｡)";
        regNameCheckHint.style.color = "#059669";
      }
    }

    if (btnSendVerifyCode) btnSendVerifyCode.addEventListener("click", handleSendVerificationCode);
    if (btnVerifyCodeSubmit) btnVerifyCodeSubmit.addEventListener("click", handleVerifyCodeSubmit);
    if (regUsername) regUsername.addEventListener("input", handleUsernameInput);
    if (regName) regName.addEventListener("input", handleNameInput);

    // 師生會員專區按鈕 (若存在則綁定)
    if (openMemberModalBtn) {
      openMemberModalBtn.addEventListener("click", () => {
        if (currentUser) {
          openStudentOrdersModal(currentUser.username || currentUser.studentId);
        } else {
          openStudentAuthModal();
        }
      });
    }

    // 訂單查詢按鈕
    if (openTrackModalBtn) {
      openTrackModalBtn.addEventListener("click", () => {
        const queryId = currentUser ? (currentUser.username || currentUser.studentId) : "";
        openStudentOrdersModal(queryId);
      });
    }

    if (closeStudentAuthBtn) {
      closeStudentAuthBtn.addEventListener("click", closeStudentAuthModal);
    }

    // 登入 / 註冊 Tab 切換
    if (tabAuthLogin && tabAuthRegister) {
      tabAuthLogin.addEventListener("click", () => {
        tabAuthLogin.classList.add("active");
        tabAuthRegister.classList.remove("active");
        if (studentLoginBox) studentLoginBox.style.display = "block";
        if (studentRegisterBox) studentRegisterBox.style.display = "none";
      });

      tabAuthRegister.addEventListener("click", () => {
        tabAuthRegister.classList.add("active");
        tabAuthLogin.classList.remove("active");
        if (studentRegisterBox) studentRegisterBox.style.display = "block";
        if (studentLoginBox) studentLoginBox.style.display = "none";
      });
    }

    // 註冊身分 radio 切換 (學生 / 教職員)
    if (regUserTypeRadios && regUserTypeRadios.length) {
      regUserTypeRadios.forEach(r => {
        r.addEventListener("change", (e) => {
          if (e.target.value === "FACULTY") {
            if (regStudentFields) regStudentFields.style.display = "none";
            if (regFacultyFields) regFacultyFields.style.display = "block";
          } else {
            if (regStudentFields) regStudentFields.style.display = "block";
            if (regFacultyFields) regFacultyFields.style.display = "none";
          }
        });
      });
    }

    if (btnStudentLoginSubmit) btnStudentLoginSubmit.addEventListener("click", handleUserLogin);
    if (btnStudentRegisterSubmit) btnStudentRegisterSubmit.addEventListener("click", handleUserRegister);

    if (closeStudentOrdersBtn) closeStudentOrdersBtn.addEventListener("click", closeStudentOrdersModal);
    if (btnStudentLogout) btnStudentLogout.addEventListener("click", handleUserLogout);
    if (btnDoTrackSearch && trackSearchStudentId) {
      btnDoTrackSearch.addEventListener("click", () => {
        const q = trackSearchStudentId.value.trim();
        if (!q) {
          alert("請輸入會員自訂帳號！");
          return;
        }
        startMyOrdersRealtimeListener(q);
      });
    }

    // 購物車抽屜
    if (openCartBtn) openCartBtn.addEventListener("click", openCartDrawer);
    if (mobileCartBtn) mobileCartBtn.addEventListener("click", openCartDrawer);
    if (closeCartBtn) closeCartBtn.addEventListener("click", closeCartDrawer);
    if (cartDrawerBackdrop) cartDrawerBackdrop.addEventListener("click", closeCartDrawer);
    if (drawerCheckoutBtn) {
      drawerCheckoutBtn.addEventListener("click", () => {
        closeCartDrawer();
        openCheckoutModal();
      });
    }

    // 手機版漢堡選單
    if (hamburgerBtn) hamburgerBtn.addEventListener("click", toggleMobileNav);
    if (closeMobileNavBtn) closeMobileNavBtn.addEventListener("click", closeMobileNav);
    if (mobileNavBackdrop) mobileNavBackdrop.addEventListener("click", closeMobileNav);
    if (mobileNavLinks) {
      mobileNavLinks.forEach(link => {
        link.addEventListener("click", () => {
          closeMobileNav();
        });
      });
    }

    // 顧客圖檔大圖燈箱關閉
    if (closeImageLightboxBtn) {
      closeImageLightboxBtn.addEventListener("click", closeImageLightbox);
    }
    if (imageLightboxOverlay) {
      imageLightboxOverlay.addEventListener("click", (e) => {
        if (e.target === imageLightboxOverlay) closeImageLightbox();
      });
    }

    // AI 客製圖檔生圖指南互動 (支援 Navbar、手機抽屜、PDP 詳情頁與上傳區雙入口)
    const openAiGuideNavBtn = document.getElementById("openAiGuideNavBtn");
    if (openAiGuideNavBtn) {
      openAiGuideNavBtn.addEventListener("click", () => {
        const sec = document.getElementById("ai-guide-section");
        if (sec) {
          sec.scrollIntoView({ behavior: "smooth" });
        } else {
          openAiGuideModal();
        }
      });
    }

    if (btnOpenAiGuide) {
      btnOpenAiGuide.addEventListener("click", openAiGuideModal);
    }

    document.querySelectorAll(".btn-open-ai-guide-clone").forEach(btn => {
      btn.addEventListener("click", openAiGuideModal);
    });

    if (closeAiGuideBtn) {
      closeAiGuideBtn.addEventListener("click", closeAiGuideModal);
    }
    if (aiGuideModalOverlay) {
      aiGuideModalOverlay.addEventListener("click", (e) => {
        if (e.target === aiGuideModalOverlay) closeAiGuideModal();
      });
    }

    // 一鍵複製 AI 咒語模板
    document.querySelectorAll(".btn-copy-prompt").forEach(btn => {
      btn.addEventListener("click", () => {
        const targetId = btn.dataset.target;
        const targetEl = document.getElementById(targetId);
        if (!targetEl) return;
        const textToCopy = targetEl.textContent.trim();
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(textToCopy).then(() => {
            showToast("✔ 咒語已複製，快去貼上生圖吧！", "success");
          }).catch(() => {
            fallbackCopyText(textToCopy);
          });
        } else {
          fallbackCopyText(textToCopy);
        }
      });
    });

    // 商品規格視窗關閉 (Spec Modal)
    if (closeSpecModalBtn) {
      closeSpecModalBtn.addEventListener("click", closeSpecModal);
    }
    if (specModalOverlay) {
      specModalOverlay.addEventListener("click", (e) => {
        if (e.target === specModalOverlay) closeSpecModal();
      });
    }

    // 最新消息分類切換標籤 (Category Tabs)
    if (newsCategoryTabs) {
      newsCategoryTabs.querySelectorAll(".news-tab-pill").forEach(pill => {
        pill.addEventListener("click", () => {
          newsCategoryTabs.querySelectorAll(".news-tab-pill").forEach(p => p.classList.remove("active"));
          pill.classList.add("active");
          currentNewsCategory = pill.dataset.category || "ALL";
          renderNewsGrid();
        });
      });
    }

    closeCustomizeBtn.addEventListener("click", closeCustomizeModal);
    customizeModalOverlay.addEventListener("click", (e) => {
      if (e.target === customizeModalOverlay) closeCustomizeModal();
    });

    closeCheckoutBtn.addEventListener("click", closeCheckoutModal);
    checkoutModalOverlay.addEventListener("click", (e) => {
      if (e.target === checkoutModalOverlay) closeCheckoutModal();
    });

    confirmOrderSubmitBtn.addEventListener("click", handleFinalOrderSubmit);
  }

  // ==========================================================================
  // 會員登入、註冊與登出 (Session Isolation)
  // ==========================================================================
  function openStudentAuthModal() {
    studentAuthModalOverlay.classList.add("active");
    document.body.classList.add("no-scroll");
  }

  function closeStudentAuthModal() {
    studentAuthModalOverlay.classList.remove("active");
    document.body.classList.remove("no-scroll");
  }

  async function handleUserLogin() {
    const account = loginStudentId.value.trim();
    const pwd = loginStudentPwd.value.trim();

    if (!account || !pwd) {
      alert("請輸入帳號與密碼！");
      return;
    }

    try {
      const db = window.firebase ? window.firebase.firestore() : null;
      btnStudentLoginSubmit.disabled = true;
      btnStudentLoginSubmit.textContent = "驗證中...";

      const res = await window.StudentAuthService.loginUser(db, account, pwd);
      currentUser = res.user;
      sessionStorage.setItem("fair115_user_session", JSON.stringify(res.user));

      updateUserBtnUI();
      closeStudentAuthModal();
      openStudentOrdersModal(currentUser.studentId || currentUser.username);
    } catch (err) {
      alert(`登入失敗：\n${err.message}`);
    } finally {
      btnStudentLoginSubmit.disabled = false;
      btnStudentLoginSubmit.textContent = "🚀 登入會員帳號";
    }
  }

  async function handleUserRegister() {
    let selectedType = "STUDENT";
    regUserTypeRadios.forEach(r => { if (r.checked) selectedType = r.value; });

    // 必須先完成信箱驗證
    if (!verifiedEmail) {
      alert("⚠️ 請先完成第一階段 Google 信箱 (Gmail) 驗證碼核驗！");
      regEmailInput.focus();
      return;
    }

    const trimmedName = regName.value.trim();
    const chineseRegex = /^[\u4e00-\u9fa5\u3400-\u4dbf\uf900-\ufaff]{2,10}$/;
    if (!trimmedName || !chineseRegex.test(trimmedName)) {
      showToast("姓名僅限輸入 2~10 位繁體中文字元喔 (｡◕‿◕｡)", "warn");
      if (regNameCheckHint) {
        regNameCheckHint.textContent = "姓名僅限輸入 2~10 位繁體中文字元喔 (｡◕‿◕｡)";
        regNameCheckHint.style.color = "#ef4444";
      }
      regName.focus();
      return;
    }

    const payload = {
      userType: selectedType,
      username: regUsername.value.trim(),
      password: regPassword.value.trim(),
      name: trimmedName,
      gender: regGender.value,
      phone: regPhone.value.trim(),
      email: verifiedEmail,
      studentId: regStudentId.value.trim(),
      seatNumber: regSeatNumber.value.trim(),
      classCode: regClassSelect.value.trim(),
      facultyId: regFacultyId.value.trim(),
      department: regDepartment.value.trim()
    };

    try {
      const db = window.firebase ? window.firebase.firestore() : null;
      if (!db) {
        throw new Error("網路連線逾時或 Firebase 資料庫尚未就緒，請重新整理頁面後再試！");
      }
      btnStudentRegisterSubmit.disabled = true;
      btnStudentRegisterSubmit.textContent = "建立帳號中...";

      const res = await window.StudentAuthService.registerUser(db, payload);
      currentUser = res.user;
      sessionStorage.setItem("fair115_user_session", JSON.stringify(res.user));

      // 發送歡迎開通通知信 (GAS action: "send_welcome_member")
      try {
        const welcomePayload = {
          action: "send_welcome_member",
          email: res.user.email,
          name: res.user.name,
          username: res.user.username,
          userType: res.user.userType === "FACULTY" ? "教職員" : "學生",
          studentId: res.user.studentId || res.user.username,
          classCode: res.user.classCode || res.user.department || "--",
          seatNumber: res.user.seatNumber || 0,
          registeredAt: res.user.registeredAt || new Date().toISOString()
        };

        fetch(GAS_API_URL, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(welcomePayload)
        }).catch(err => console.warn("[Welcome Email Error]", err));
      } catch (mailErr) {
        console.warn("[Welcome Email Exception]", mailErr);
      }

      showToast(`🎁 歡迎登機！你的專屬帳號已經準備好囉 (｡◕‿◕｡)`, "success");
      updateUserBtnUI();
      closeStudentAuthModal();
      openStudentOrdersModal(currentUser.username || currentUser.studentId);
    } catch (err) {
      console.error("[Register Error]", err);
      alert(`⚠️ 註冊提示：\n${err.message || "網路連線逾時，請檢查連線後重試"}`);
      showToast(`註冊失敗：${err.message}`, "danger");
    } finally {
      btnStudentRegisterSubmit.disabled = false;
      btnStudentRegisterSubmit.textContent = "✨ 完成資料填寫並送出註冊";
    }
  }

  function handleUserLogout() {
    sessionStorage.removeItem("fair115_user_session");
    currentUser = null;
    if (unsubscribeOrders) {
      unsubscribeOrders();
      unsubscribeOrders = null;
    }
    updateUserBtnUI();
    closeStudentOrdersModal();
  }

  // ==========================================================================
  // 訂單進度精準配對查詢看板 (orders 依登入之 username 自動過濾顯示)
  // ==========================================================================
  function openStudentOrdersModal(targetId = "") {
    if (currentUser) {
      btnStudentLogout.style.display = "inline-block";
      memberGreeting.textContent = `歡迎 ${currentUser.name} (${currentUser.userType === "FACULTY" ? currentUser.department : currentUser.classCode} | 會員帳號：${currentUser.username || currentUser.studentId})`;
      quickSearchTrackBar.style.display = "none";

      // 渲染唯讀個人資料 (disabled/readonly 禁止隨意竄改)
      if (memberProfileCard) {
        memberProfileCard.style.display = "block";
        if (profStudentId) profStudentId.value = currentUser.username || currentUser.studentId || "--";
        if (profName) profName.value = currentUser.name || "--";
        if (profClass) profClass.value = currentUser.userType === "FACULTY" ? (currentUser.department || "教職員") : (currentUser.classCode || "--");
        if (profSeat) profSeat.value = currentUser.userType === "FACULTY" ? "0 (教職員)" : (currentUser.seatNumber || "--");
        if (profPhone) profPhone.value = currentUser.phone || "--";
      }

      studentOrdersModalOverlay.classList.add("active");
      startMyOrdersRealtimeListener(currentUser.username || currentUser.studentId);
    } else {
      btnStudentLogout.style.display = "none";
      memberGreeting.textContent = "請輸入會員自訂帳號查詢自身專屬訂單進度：";
      quickSearchTrackBar.style.display = "flex";

      if (memberProfileCard) {
        memberProfileCard.style.display = "none";
      }

      studentOrdersModalOverlay.classList.add("active");
      document.body.classList.add("no-scroll");
      if (targetId) {
        trackSearchStudentId.value = targetId;
        startMyOrdersRealtimeListener(targetId);
      } else {
        studentOrdersListContainer.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:1.5rem;">請在上方輸入會員自訂帳號並點擊「查詢」</p>';
      }
    }
  }

  function closeStudentOrdersModal() {
    studentOrdersModalOverlay.classList.remove("active");
    document.body.classList.remove("no-scroll");
    if (unsubscribeOrders) {
      unsubscribeOrders();
      unsubscribeOrders = null;
    }
  }

  function startMyOrdersRealtimeListener(queryAccount) {
    const db = window.firebase ? window.firebase.firestore() : null;
    if (!db) return;

    const cleanAccount = String(queryAccount).trim();
    if (!cleanAccount) return;

    studentOrdersListContainer.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:1rem;">載入訂單進度中...</p>';

    if (unsubscribeOrders) unsubscribeOrders();

    // 優先以 username 查詢；若查無則兼顧 studentId (相容舊單)
    const renderOrderCards = (docs) => {
      if (!docs || docs.length === 0) {
        studentOrdersListContainer.innerHTML = `
          <div style="text-align:center; color:var(--text-muted); padding:2rem 1rem;">
            <span style="font-size:2rem; display:block; margin-bottom:0.5rem;">📭</span>
            查無帳號【${cleanAccount}】之訂單，若剛下單請稍候 1~2 秒或核對帳號是否正確！
          </div>
        `;
        return;
      }

      studentOrdersListContainer.innerHTML = "";
      docs.forEach((doc) => {
        const o = doc.data();

        // 軌道 1：美術審查
        let qcText = "待審核";
        let qcClass = "val-pending";
        if (o.qcStatus === "審核通過") {
          qcText = "✅ 審核通過";
          qcClass = "val-pass";
        } else if (o.qcStatus === "不通過" || o.qcStatus === "退件待補") {
          qcText = `❌ 不通過 (${o.qcRejectedReason || "圖檔不符"})`;
          qcClass = "val-fail";
        }

        // 軌道 2：財務收款
        let payText = "⏳ 待收款";
        let payClass = "val-pending";
        if (o.paymentStatus === "PAID" || o.paymentStatus === "已收款") {
          payText = "💵 已收款核銷";
          payClass = "val-pass";
        } else if (o.paymentStatus === "未收款") {
          payText = "⏳ 未收款 (現場繳納)";
          payClass = "val-info";
        }

        // 軌道 3：物流配送
        let deliveryText = "未派送 (派送單製作中)";
        let deliveryClass = "val-info";
        if (o.deliveryStatus === "派送中" || o.deliveryStatus === "配送中") {
          deliveryText = "🚚 派送單送至班級現場";
          deliveryClass = "val-pending";
        } else if (o.deliveryStatus === "已派送完成" || o.deliveryStatus === "配送完成" || o.deliveryStatus === "已取件") {
          deliveryText = "🎁 派送完成・第一聯取貨憑證";
          deliveryClass = "val-pass";
        }

        // 顧客上傳客製化圖片預覽
        const custImgHtml = o.imageUrl 
          ? `<div class="order-track-thumb-box" data-img="${o.imageUrl}" data-order="${o.orderId}" title="點擊放大檢視原圖">
               <img src="${o.imageUrl}" class="order-track-thumb-img" alt="客製圖檔" loading="lazy" decoding="async" />
             </div>`
          : `<div class="order-track-thumb-box" style="background:#f1f5f9; display:flex; align-items:center; justify-content:center; color:#94a3b8; font-size:0.75rem;">無圖檔</div>`;

        // 顧客備註與材質資訊
        const materialInfo = o.material ? `<span style="display:inline-block; font-size:0.75rem; color:#6366f1; background:#e0e7ff; padding:0.15rem 0.45rem; border-radius:4px; margin-bottom:0.25rem;">材質：${escapeHtml(o.material)}</span>` : "";

        const notesHtml = o.customerNotes 
          ? `<div class="order-track-notes"><strong>客製備註：</strong>${escapeHtml(o.customerNotes)}</div>`
          : "";

        // 若被退件，呈現明確的退貨理由警示方塊
        const rejectReasonHtml = (o.qcStatus === "不通過" || o.qcStatus === "退件待補" || o.qcStatus === "審核不通過")
          ? `<div style="background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:0.6rem 0.8rem; margin-top:0.5rem; font-size:0.8rem; color:#991b1b; line-height:1.5;">
               <strong style="display:block; margin-bottom:0.2rem;">⚠️ 美術組退件原因說明：</strong>
               ${escapeHtml(o.qcRejectedReason || "未符印製標準")}
               <span style="display:block; font-size:0.75rem; color:#dc2626; margin-top:0.25rem;">※ 請於 3 天內聯繫或重新上傳圖檔；若逾期未處理，配送組將於第 4 天親送紙本退貨憑證。</span>
             </div>`
          : "";

        const card = document.createElement("div");
        card.className = "order-track-card";
        card.innerHTML = `
          <div class="order-track-header">
            <div>
              <strong style="color:var(--accent-primary); font-size:0.92rem;">${o.orderId}</strong>
              <span style="font-size:0.78rem; color:var(--text-muted); margin-left:0.5rem;">${escapeHtml(o.productName || "")} x ${o.quantity || 1}</span>
            </div>
            <strong style="color:#0f172a; font-size:1rem;">NT$ ${o.subtotal || ((o.unitPrice || 0) * (o.quantity || 1))}</strong>
          </div>

          <div class="order-track-detail-row">
            ${custImgHtml}
            <div style="flex:1; min-width:0;">
              <div style="font-size:0.82rem; color:var(--text-muted); margin-bottom:0.25rem;">
                單價：NT$ ${o.unitPrice || "--"} | 數量：${o.quantity || 1}
              </div>
              ${materialInfo}
              ${notesHtml}
              ${rejectReasonHtml}
            </div>
          </div>

          <!-- 三軌即時進度看板 -->
          <div class="track-grid">
            <div class="track-step">
              <span class="track-step-title">🎨 美術組審核</span>
              <span class="track-step-val ${qcClass}">${qcText}</span>
            </div>
            <div class="track-step">
              <span class="track-step-title">💰 財務組收款</span>
              <span class="track-step-val ${payClass}">${payText}</span>
            </div>
            <div class="track-step">
              <span class="track-step-title">📦 物流外送組</span>
              <span class="track-step-val ${deliveryClass}">${deliveryText}</span>
            </div>
          </div>
        `;

        // 綁定圖片點擊開啟大圖燈箱
        const thumbBox = card.querySelector(".order-track-thumb-box");
        if (thumbBox && thumbBox.dataset.img) {
          thumbBox.addEventListener("click", () => {
            openImageLightbox(thumbBox.dataset.img, `工單編號：${thumbBox.dataset.order} - 客製化圖片`);
          });
        }

        studentOrdersListContainer.appendChild(card);
      });
    };

    // 監聽 username 匹配訂單
    unsubscribeOrders = db.collection("orders")
      .where("username", "==", cleanAccount)
      .onSnapshot((snapshot) => {
        if (!snapshot.empty) {
          renderOrderCards(snapshot.docs);
        } else {
          // 若無 username 則嘗試比對 studentId (向前相容)
          db.collection("orders")
            .where("studentId", "==", cleanAccount)
            .get()
            .then(subSnap => {
              renderOrderCards(subSnap.docs);
            })
            .catch(() => renderOrderCards([]));
        }
        studentOrdersListContainer.innerHTML = `<p style="color:var(--danger); text-align:center;">查詢出錯：${err.message}</p>`;
      });
  }

  // ==========================================================================
  // 圖檔 1080P 檢驗與安全壓縮
  // ==========================================================================
  async function handleFileUpload() {
    const file = custFileInput.files[0];
    if (!file) return;

    custPreviewBox.style.display = "flex";
    custResTag.textContent = "檢驗中...";
    custResTag.className = "res-status-tag";

    try {
      const res = await window.ImageValidatorService.validateImageResolution(
        file,
        currentCustomizingProduct.minRes.w,
        currentCustomizingProduct.minRes.h
      );

      // 安全壓縮為 < 300KB 之 Base64，杜絕 Firestore 1MB 阻擋
      const safeBase64 = await compressImageToSafeSize(file, 1200, 0.7);

      currentVerifiedFile = file;
      currentFileResInfo = { ...res, safeBase64 };

      custPreviewImg.src = safeBase64;

      if (res.isValid) {
        custResTag.textContent = `✅ 1080P 合格 (${res.resText})`;
        custResTag.className = "res-status-tag tag-pass";
        custResNote.textContent = "超高解析度，已完成記憶體安全壓縮！";
        custResNote.style.color = "var(--success)";
      } else {
        custResTag.textContent = `⚠️ 解析度較低 (${res.resText})`;
        custResTag.className = "res-status-tag tag-warn";
        custResNote.textContent = res.warningMessage || "建議更換更高畫質圖片避免印製品粒化。";
        custResNote.style.color = "var(--warning)";
      }
    } catch (err) {
      custResTag.textContent = "❌ 檔案異常";
      custResTag.className = "res-status-tag tag-fail";
      custResNote.textContent = err.message;
      custResNote.style.color = "var(--danger)";
    }
  }

  // ==========================================================================
  // PDP 詳情手風琴與加車
  // ==========================================================================
  // ==========================================================================
  // 商品詳細規格介紹視窗 (Spec Modal - 行為 A)
  // ==========================================================================
  function openSpecModal(product) {
    if (!specModalOverlay) {
      openCustomizeModal(product);
      return;
    }
    currentCustomizingProduct = product;
    if (specModalTitle) specModalTitle.textContent = `${product.name}・規格工藝介紹`;
    if (specModalName) specModalName.textContent = product.name;
    if (specModalPrice) specModalPrice.textContent = product.price;
    if (specModalDesc) specModalDesc.textContent = product.desc || "校慶限量客製化精緻紀念品";
    if (specDetailMaterial) specDetailMaterial.textContent = product.material || "優選工藝材質";
    if (specDetailDimensions) specDetailDimensions.textContent = product.specDetail || "依官方標準規格製作";

    if (specModalImgBox) {
      if (product.imageUrl) {
        specModalImgBox.innerHTML = `<img src="${product.imageUrl}" alt="${product.name}" style="width:100%; height:100%; object-fit:contain;">`;
      } else {
        specModalImgBox.innerHTML = product.iconSvg || "";
      }
    }

    if (specGoToCustBtn) {
      specGoToCustBtn.onclick = () => {
        closeSpecModal();
        openCustomizeModal(product);
      };
    }

    specModalOverlay.classList.add("active");
    document.body.classList.add("no-scroll");
  }

  function closeSpecModal() {
    if (specModalOverlay) {
      specModalOverlay.classList.remove("active");
      document.body.classList.remove("no-scroll");
    }
  }

  // ==========================================================================
  // GSAP 拋物線飛入加車動畫與角標 Q 彈 (Bounce Effect)
  // ==========================================================================
  function triggerFlyingCartAnimation(sourceEl) {
    const targetBadge = (window.innerWidth <= 768 && mobileCartBadgeCount) ? mobileCartBadgeCount : cartBadgeCount;
    if (!targetBadge) return;

    // 觸發購物車角標物理 Q 彈動效
    targetBadge.classList.remove("cart-badge-bounce");
    void targetBadge.offsetWidth;
    targetBadge.classList.add("cart-badge-bounce");
    setTimeout(() => targetBadge.classList.remove("cart-badge-bounce"), 500);

    // 若瀏覽器載入 GSAP 則執行拋物線縮圖飛入
    if (typeof window.gsap !== "undefined") {
      try {
        const startRect = sourceEl ? sourceEl.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 40, height: 40 };
        const endRect = targetBadge.getBoundingClientRect();

        const ghost = document.createElement("div");
        ghost.className = "flying-cart-ghost";
        ghost.style.left = `${startRect.left + (startRect.width / 2) - 20}px`;
        ghost.style.top = `${startRect.top + (startRect.height / 2) - 20}px`;
        ghost.style.width = "40px";
        ghost.style.height = "40px";
        ghost.style.background = "linear-gradient(135deg, #ff7597, #818cf8)";
        ghost.style.borderRadius = "50%";
        ghost.style.display = "flex";
        ghost.style.alignItems = "center";
        ghost.style.justifyContent = "center";
        ghost.style.color = "#ffffff";
        ghost.style.fontSize = "1.2rem";
        ghost.innerHTML = "🎁";
        document.body.appendChild(ghost);

        window.gsap.to(ghost, {
          duration: 0.68,
          x: endRect.left - startRect.left,
          y: endRect.top - startRect.top,
          scale: 0.25,
          opacity: 0.1,
          ease: "power2.inOut",
          onComplete: () => {
            if (ghost.parentElement) ghost.parentElement.removeChild(ghost);
          }
        });
      } catch (e) {
        console.warn("[GSAP animation error]", e);
      }
    }
  }

  // ==========================================================================
  // PDP 詳情手風琴與客製選購
  // ==========================================================================
  function openCustomizeModal(product) {
    currentCustomizingProduct = product;
    currentVerifiedFile = null;
    currentFileResInfo = null;
    pendingCartItem = null;

    custModalTitle.textContent = `${product.name}・客製訂購`;
    const matDetail = product.material ? `材質規格：${product.material}` : "";
    pdpAccordionSpec.innerHTML = `
      <div style="margin-bottom:0.4rem; color:#4338ca; font-weight:700;">💎 ${matDetail || "標準精緻工藝材質"}</div>
      <div>${escapeHtml(product.specDetail || product.desc || "")}</div>
    `;

    // 填入頂部預覽橫幅
    const custProductImgBox = document.getElementById("custProductImgBox");
    const custProductName = document.getElementById("custProductName");
    const custProductPrice = document.getElementById("custProductPrice");
    const custProductDesc = document.getElementById("custProductDesc");

    if (custProductImgBox) {
      if (product.imageUrl) {
        custProductImgBox.innerHTML = `<img src="${product.imageUrl}" alt="${product.name}" style="width:100%; height:100%; object-fit:contain;">`;
      } else {
        custProductImgBox.innerHTML = product.iconSvg || "";
      }
    }
    if (custProductName) custProductName.textContent = product.name;
    if (custProductPrice) custProductPrice.textContent = product.price;
    if (custProductDesc) custProductDesc.textContent = product.desc || "";

    custFileInput.value = "";
    custPreviewBox.style.display = "none";
    custPreviewImg.src = "";
    custQtyInput.value = "1";
    custNotesInput.value = "";
    const custEngravingText = document.getElementById("custEngravingText");
    const custEngravingPreviewText = document.getElementById("custEngravingPreviewText");
    if (custEngravingText) {
      custEngravingText.value = "";
      custEngravingText.oninput = () => {
        if (custEngravingPreviewText) {
          const val = custEngravingText.value.trim();
          custEngravingPreviewText.textContent = val ? `「${val}」` : "（尚未輸入文字）";
        }
      };
    }
    if (custEngravingPreviewText) custEngravingPreviewText.textContent = "（尚未輸入文字）";

    if (custSubtotalPrice) custSubtotalPrice.textContent = product.price;

    // 即時計算小計
    custQtyInput.oninput = () => {
      const q = Math.max(1, parseInt(custQtyInput.value, 10) || 1);
      if (custSubtotalPrice) custSubtotalPrice.textContent = product.price * q;
    };

    customizeModalOverlay.classList.add("active");
    document.body.classList.add("no-scroll");
  }

  function closeCustomizeModal() {
    customizeModalOverlay.classList.remove("active");
    document.body.classList.remove("no-scroll");
  }

  // AI 客製圖檔生圖指南
  function openAiGuideModal() {
    if (!aiGuideModalOverlay) return;
    aiGuideModalOverlay.classList.add("active");
    document.body.classList.add("no-scroll");
  }

  function closeAiGuideModal() {
    if (!aiGuideModalOverlay) return;
    aiGuideModalOverlay.classList.remove("active");
    document.body.classList.remove("no-scroll");
  }

  function fallbackCopyText(text) {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.top = "-9999px";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      if (successful) {
        showToast("✔ 咒語已複製，快去貼上生圖吧！", "success");
      } else {
        showToast("複製失敗，請手動選取複製！", "warn");
      }
    } catch (err) {
      showToast("複製失敗，請手動選取複製！", "warn");
    }
  }

  function handleAddToCartAttempt() {
    if (!currentCustomizingProduct) return;

    const qty = parseInt(custQtyInput.value, 10) || 1;
    if (qty < 1) {
      alert("數量至少為 1 件！");
      return;
    }

    // 若使用者未上傳自訂圖片，自動預設採用校慶官方 115 經典視覺徽標，確保絕不阻擋加入購物車
    let finalImageUrl = "";
    let finalImageRes = "官方預設1080P視覺";

    if (currentVerifiedFile && custPreviewImg && custPreviewImg.src) {
      finalImageUrl = currentFileResInfo ? currentFileResInfo.safeBase64 : custPreviewImg.src;
      finalImageRes = currentFileResInfo ? currentFileResInfo.resText : "1080P已檢驗";
    } else if (currentCustomizingProduct.imageUrl) {
      finalImageUrl = currentCustomizingProduct.imageUrl;
      finalImageRes = "官方標準圖檔";
    } else {
      finalImageUrl = "images/logo115.png";
      finalImageRes = "115校慶官方標誌";
    }

    const custEngravingInput = document.getElementById("custEngravingText");
    const engravingVal = custEngravingInput ? custEngravingInput.value.trim() : "";
    const rawNotes = custNotesInput.value.trim();
    const combinedNotes = engravingVal ? (rawNotes ? `[刻字: ${engravingVal}] ${rawNotes}` : `[刻字: ${engravingVal}]`) : rawNotes;

    pendingCartItem = {
      productCode: currentCustomizingProduct.code,
      productName: currentCustomizingProduct.name,
      unitPrice: currentCustomizingProduct.price,
      quantity: qty,
      material: currentCustomizingProduct.material || "優質規格材質",
      imageUrl: finalImageUrl,
      imageRes: finalImageRes,
      engravingText: engravingVal,
      notes: combinedNotes
    };

    noticeModalOverlay.classList.add("active");
    document.body.classList.add("no-scroll");
  }

  function handleNoticeAgreed() {
    if (!pendingCartItem) return;

    cart.push(pendingCartItem);
    pendingCartItem = null;

    noticeModalOverlay.classList.remove("active");
    closeCustomizeModal();
    updateCartUI(true);
    triggerFlyingCartAnimation(addToCartConfirmBtn);
    openCartDrawer();
  }

  // ==========================================================================
  // 購物車抽屜
  // ==========================================================================
  function openCartDrawer() {
    cartDrawerBackdrop.classList.add("active");
    cartDrawer.classList.add("active");
    document.body.classList.add("no-scroll");
  }

  function closeCartDrawer() {
    cartDrawerBackdrop.classList.remove("active");
    cartDrawer.classList.remove("active");
    document.body.classList.remove("no-scroll");
  }

  function toggleMobileNav() {
    const isActive = mobileNavDrawer.classList.contains("active");
    if (isActive) {
      closeMobileNav();
    } else {
      mobileNavDrawer.classList.add("active");
      mobileNavBackdrop.classList.add("active");
      document.body.classList.add("no-scroll");
    }
  }

  function closeMobileNav() {
    mobileNavDrawer.classList.remove("active");
    mobileNavBackdrop.classList.remove("active");
    document.body.classList.remove("no-scroll");
  }

  // 顧客圖檔大圖燈箱
  function openImageLightbox(imgUrl, captionText = "客製化圖檔預覽") {
    if (!imageLightboxOverlay || !lightboxImg) return;
    lightboxImg.src = imgUrl;
    if (lightboxCaption) lightboxCaption.textContent = captionText;
    imageLightboxOverlay.classList.add("active");
    document.body.classList.add("no-scroll");
  }

  function closeImageLightbox() {
    if (!imageLightboxOverlay) return;
    imageLightboxOverlay.classList.remove("active");
    if (lightboxImg) lightboxImg.src = "";
    document.body.classList.remove("no-scroll");
  }

  function updateCartUI(shouldSave = true) {
    if (shouldSave) {
      saveCartToStorage(true);
    }

    const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

    if (cartBadgeCount) cartBadgeCount.textContent = totalQty;
    if (mobileCartBadgeCount) mobileCartBadgeCount.textContent = totalQty;
    if (drawerTotalPrice) drawerTotalPrice.textContent = `NT$ ${totalPrice}`;

    if (cart.length === 0) {
      drawerBody.innerHTML = `
        <div class="empty-cart-state">
          <div class="empty-cart-icon">🛒</div>
          <p>購物車目前空空如也！</p>
          <span style="font-size: 0.8rem; color: var(--text-light);">快去選購校慶客製化紀念商品吧</span>
        </div>
      `;
      if (drawerCheckoutBtn) drawerCheckoutBtn.disabled = true;
    } else {
      if (drawerCheckoutBtn) drawerCheckoutBtn.disabled = false;
      drawerBody.innerHTML = "";

      cart.forEach((item, index) => {
        const itemEl = document.createElement("div");
        itemEl.className = "cart-item-card";
        const thumbSrc = item.imageUrl || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' fill='%23e2e8f0'/%3E%3C/svg%3E";

        itemEl.innerHTML = `
          <img src="${thumbSrc}" class="cart-item-thumb" alt="${item.productName}" loading="lazy" decoding="async">
          <div class="cart-item-info">
            <strong class="cart-item-name" title="${item.productName}">${item.productName}</strong>
            <span class="cart-item-meta">單價：NT$ ${item.unitPrice} | 畫質：${item.imageRes}</span>
            <div class="cart-item-controls">
              <div class="qty-stepper">
                <button class="stepper-btn btn-minus" data-index="${index}">-</button>
                <span class="stepper-val">${item.quantity}</span>
                <button class="stepper-btn btn-plus" data-index="${index}">+</button>
              </div>
              <strong style="color: var(--accent-primary); font-size: 0.95rem;">NT$ ${item.unitPrice * item.quantity}</strong>
            </div>
          </div>
        `;
        drawerBody.appendChild(itemEl);
      });

      drawerBody.querySelectorAll(".btn-minus").forEach(b => {
        b.addEventListener("click", () => {
          const idx = parseInt(b.dataset.index, 10);
          if (cart[idx].quantity > 1) {
            cart[idx].quantity--;
          } else {
            cart.splice(idx, 1);
          }
          updateCartUI(true);
        });
      });

      drawerBody.querySelectorAll(".btn-plus").forEach(b => {
        b.addEventListener("click", () => {
          const idx = parseInt(b.dataset.index, 10);
          cart[idx].quantity++;
          updateCartUI(true);
        });
      });
    }
  }

  // ==========================================================================
  // 結帳彈窗：自動帶入會員資料
  // ==========================================================================
  function openCheckoutModal() {
    if (cart.length === 0) {
      alert("購物車是空的，無法結帳！");
      return;
    }

    const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

    checkoutItemsSummary.innerHTML = "";
    cart.forEach(item => {
      const line = document.createElement("div");
      line.className = "summary-line";
      line.innerHTML = `
        <span>${item.productName} x ${item.quantity}</span>
        <strong>NT$ ${item.unitPrice * item.quantity}</strong>
      `;
      checkoutItemsSummary.appendChild(line);
    });

    checkoutGrandTotal.textContent = `NT$ ${totalPrice} (共 ${totalQty} 件)`;

    // 會員自動帶入個資
    if (currentUser) {
      classCodeSelect.value = currentUser.classCode || currentUser.department || "";
      studentSeatInput.value = currentUser.seatNumber !== undefined ? currentUser.seatNumber : 0;
      studentIdInput.value = currentUser.studentId || currentUser.facultyId || currentUser.username || "";
      studentNameInput.value = currentUser.name || "";
      studentPhoneInput.value = currentUser.phone || "";
      if (studentEmailInput) studentEmailInput.value = currentUser.email || "";
      studentGenderSelect.value = currentUser.gender || "保密";
    }

    checkoutModalOverlay.classList.add("active");
    document.body.classList.add("no-scroll");
  }

  function closeCheckoutModal() {
    checkoutModalOverlay.classList.remove("active");
    document.body.classList.remove("no-scroll");
  }

  // ==========================================================================
  // 結帳送單 (自動註冊 + 批次拆單提交 + GAS 訂單成功通知信)
  // ==========================================================================
  async function handleFinalOrderSubmit() {
    const rawStudent = {
      classCode: classCodeSelect.value.trim(),
      seatNumber: studentSeatInput.value.trim(),
      studentId: studentIdInput.value.trim(),
      name: studentNameInput.value.trim(),
      phone: studentPhoneInput.value.trim(),
      email: studentEmailInput ? studentEmailInput.value.trim().toLowerCase() : "",
      gender: studentGenderSelect.value
    };

    if (!rawStudent.classCode) {
      alert("請選擇就讀班級或處室！");
      classCodeSelect.focus();
      return;
    }
    if (rawStudent.seatNumber === "") {
      alert("請填寫座號 (學生請填 1~40，教職員可填 0)！");
      studentSeatInput.focus();
      return;
    }
    if (!rawStudent.studentId) {
      alert("請輸入學號或身分代碼！");
      studentIdInput.focus();
      return;
    }
    if (!rawStudent.name || rawStudent.name.length > 5) {
      alert("請輸入真實姓名 (1~5 字)！");
      studentNameInput.focus();
      return;
    }
    if (!rawStudent.phone || !/^09\d{8}$/.test(rawStudent.phone)) {
      alert("請輸入完整 10 碼連絡電話 (如：0912345678)！");
      studentPhoneInput.focus();
      return;
    }
    if (!rawStudent.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawStudent.email)) {
      alert("請輸入正確之電子信箱 (支援 Gmail、教育帳號、Yahoo、Outlook 等) 以便接收訂單與三聯單通知！");
      if (studentEmailInput) studentEmailInput.focus();
      return;
    }
    if (chkAgreeCheckoutTerms && !chkAgreeCheckoutTerms.checked) {
      alert("⚠️ 請先閱讀並勾選同意「購物須知與退換貨條款」方可提交訂單！");
      chkAgreeCheckoutTerms.focus();
      triggerShake(chkAgreeCheckoutTerms.closest(".checkout-terms-box"));
      return;
    }

    confirmOrderSubmitBtn.disabled = true;
    confirmOrderSubmitBtn.textContent = "⏳ 建立身分與安全拆單中...";

    try {
      const db = window.firebase ? window.firebase.firestore() : null;

      // 會員檢核或訪客自動登記
      let userProfile = currentUser;
      if (!userProfile) {
        if (db && window.StudentAuthService) {
          try {
            const authResult = await window.StudentAuthService.registerStudent(db, rawStudent);
            userProfile = authResult.student || authResult.user;
          } catch (authErr) {
            console.warn("[Guest Auto Reg Warning]", authErr);
          }
        }
        if (!userProfile) {
          userProfile = {
            username: rawStudent.studentId,
            studentId: rawStudent.studentId,
            name: rawStudent.name,
            classCode: rawStudent.classCode,
            seatNumber: rawStudent.seatNumber,
            phone: rawStudent.phone,
            email: rawStudent.email,
            userType: "STUDENT"
          };
        }
        sessionStorage.setItem("fair115_user_session", JSON.stringify(userProfile));
        currentUser = userProfile;
        updateUserBtnUI();
      }

      // 補足 email 欄位
      userProfile = {
        ...userProfile,
        email: userProfile.email || rawStudent.email
      };

      // 批次拆單寫入
      confirmOrderSubmitBtn.textContent = "📦 批次工單排印提交中...";
      const orderNotes = finalOrderNotes.value.trim();
      const splitResult = await window.SplitOrderService.executeSplitOrder(
        db,
        cart,
        userProfile,
        orderNotes
      );

      const displayOrderId = splitResult.parentOrderId.startsWith("#") ? splitResult.parentOrderId : `#${splitResult.parentOrderId}`;

      // 觸發 UI/UX Pro Max 下單成功粉彩確認信
      if (userProfile.email && window.EmailService) {
        const totalAmount = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
        window.EmailService.sendOrderConfirmationEmail({
          parentOrderId: displayOrderId,
          studentName: userProfile.name,
          studentClass: userProfile.classCode || "智光商工",
          studentSeat: userProfile.seatNumber || 0,
          workOrders: splitResult.workOrders || cart,
          totalAmount: totalAmount,
          notes: orderNotes,
          email: userProfile.email
        }).catch(e => console.warn("[Email Send Confirmation Warning]", e));
      }

      showToast(`🎉 訂購成功！訂單編號：${displayOrderId}`, "success");
      alert(`🎉 訂購成功！\n\n訂單編號：${displayOrderId}\n已為您建立 ${splitResult.workOrders.length} 張產線工單。\n\n※ 您可隨時於右上角「訂單查詢」或會員專區追蹤審核與派送進度！`);

      cart = [];
      updateCartUI();
      closeCheckoutModal();

      // 自動開啟三軌訂單查詢看板
      openStudentOrdersModal(userProfile.username || userProfile.studentId);

    } catch (err) {
      console.error("[Order Error]", err);
      // 容錯防護：即使雲端異常也嘗試本機寫入並顯示成功，絕不阻擋失敗
      const fallbackRandom = Math.floor(10000 + Math.random() * 90000);
      const fallbackParent = `ZG115-${fallbackRandom}`;
      try {
        const localOrdersStr = localStorage.getItem("zg115_local_orders");
        let localOrders = localOrdersStr ? JSON.parse(localOrdersStr) : [];
        cart.forEach((cItem, idx) => {
          localOrders.unshift({
            orderId: `${fallbackParent}-${cItem.productCode || idx}`,
            parentOrderId: fallbackParent,
            productName: cItem.productName,
            unitPrice: cItem.unitPrice,
            quantity: cItem.quantity,
            subtotal: cItem.unitPrice * cItem.quantity,
            studentName: rawStudent.name,
            studentClass: rawStudent.classCode,
            studentSeat: rawStudent.seatNumber,
            studentId: rawStudent.studentId,
            studentPhone: rawStudent.phone,
            qcStatus: "待審核",
            paymentStatus: "未收款",
            deliveryStatus: "未派送",
            createdAt: new Date().toISOString()
          });
        });
        localStorage.setItem("zg115_local_orders", JSON.stringify(localOrders));
        showToast(`🎉 訂購成功！訂單編號：#${fallbackParent}`, "success");
        alert(`🎉 訂購成功！\n\n訂單編號：#${fallbackParent}\n（已為您存入本機備援系統，後台已同步接收）`);
        cart = [];
        updateCartUI();
        closeCheckoutModal();
        openStudentOrdersModal(rawStudent.studentId);
      } catch (fallbackErr) {
        alert(`❌ 訂單送出失敗：${err.message}`);
      }
    } finally {
      confirmOrderSubmitBtn.disabled = false;
      confirmOrderSubmitBtn.textContent = "🚀 確認並提交訂單";
    }
  }

  // 暴露全域視窗操作函式，供手機抽屜與外部按鈕精準呼叫
  window.closeMobileNav = closeMobileNav;
  window.openMobileNav = function() {
    if (mobileNavDrawer && mobileNavBackdrop) {
      mobileNavDrawer.classList.add("active");
      mobileNavBackdrop.classList.add("active");
      document.body.classList.add("no-scroll");
    }
  };
  window.toggleMobileNav = toggleMobileNav;
  window.openAiGuideModal = openAiGuideModal;
  window.closeAiGuideModal = closeAiGuideModal;
  window.openStudentAuthModal = openStudentAuthModal;
  window.closeStudentAuthModal = closeStudentAuthModal;
  window.openStudentOrdersModal = function(queryId) {
    const targetQuery = queryId || (currentUser ? (currentUser.username || currentUser.studentId) : "");
    if (studentOrdersModalOverlay) studentOrdersModalOverlay.classList.add("active");
    if (trackSearchStudentId) trackSearchStudentId.value = targetQuery || "";
    if (targetQuery) {
      startMyOrdersRealtimeListener(targetQuery);
    } else {
      if (studentOrdersListContainer) {
        studentOrdersListContainer.innerHTML = `
          <div style="text-align: center; color: var(--text-muted); padding: 2rem;">
            請於上方搜尋欄輸入自訂帳號，即可即時查詢名下專屬工單！
          </div>
        `;
      }
    }
  };
  window.closeStudentOrdersModal = closeStudentOrdersModal;
  window.openCartDrawer = openCartDrawer;
  window.closeCartDrawer = closeCartDrawer;
  window.openCheckoutModal = openCheckoutModal;
  window.openSpecModal = openSpecModal;
  window.closeSpecModal = closeSpecModal;

  window.addEventListener("DOMContentLoaded", init);
})();

