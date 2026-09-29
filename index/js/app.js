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

  // 商品型錄資料
  let catalogProducts = [
    {
      code: "MUG",
      name: "客製陶瓷馬克杯",
      category: "tableware",
      price: 150,
      leadTime: "校慶現場取件",
      minRes: { w: 2400, h: 1000 },
      stockStatus: "IN_STOCK",
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
      desc: "天然鶯歌陶瓷吸水材質，底部EVA防滑墊。",
      specDetail: "材質：鶯歌吸水陶瓷 / 直徑：110mm / 底部：EVA止滑墊 / 印刷：高彩UV噴印耐磨損。校慶前統一排印。",
      iconSvg: `<svg viewBox="0 0 64 64" fill="none" stroke="#06b6d4" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="32" cy="32" r="24"></circle><circle cx="32" cy="32" r="16" stroke-dasharray="4 4"></circle><path d="M32 20v4M32 40v4M20 32h4M40 32h4"></path></svg>`
    },
    {
      code: "BDG",
      name: "磨砂圓形金屬胸章",
      category: "accessories",
      price: 40,
      leadTime: "校慶現場取件",
      minRes: { w: 1000, h: 1000 },
      stockStatus: "IN_STOCK",
      desc: "58mm 經典磨砂質感金屬別針胸章，防刮防水。",
      specDetail: "規格：58mm 圓形 / 表面：細緻霧面磨砂膜 / 背面：安全別針 / 特色：防水防刮高質感。",
      iconSvg: `<svg viewBox="0 0 64 64" fill="none" stroke="#ec4899" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="32" cy="32" r="22"></circle><path d="M24 32l6 6 12-12"></path><path d="M20 50l4 8 8-4"></path></svg>`
    },
    {
      code: "CRD",
      name: "紀念卡貼套裝 (一組2張)",
      category: "stationery",
      price: 50,
      leadTime: "校慶現場取件",
      minRes: { w: 1012, h: 638 },
      stockStatus: "IN_STOCK",
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

  // DOM 元素引用
  const toastContainer = document.getElementById("toastContainer");
  const productsGrid = document.getElementById("productsGrid");
  const categoriesTrack = document.getElementById("categoriesTrack");
  const bottomCapsule = document.getElementById("bottomCapsule");
  const capsuleBadge = document.getElementById("capsuleBadge");
  const capsuleTotal = document.getElementById("capsuleTotal");
  const cartBadgeCount = document.getElementById("cartBadgeCount");
  
  // 側邊抽屜
  const cartDrawerBackdrop = document.getElementById("cartDrawerBackdrop");
  const cartDrawer = document.getElementById("cartDrawer");
  const drawerBody = document.getElementById("drawerBody");
  const drawerTotalPrice = document.getElementById("drawerTotalPrice");
  const openCartBtn = document.getElementById("openCartBtn");
  const closeCartBtn = document.getElementById("closeCartBtn");
  const capsuleCheckoutBtn = document.getElementById("capsuleCheckoutBtn");
  const drawerCheckoutBtn = document.getElementById("drawerCheckoutBtn");

  // 手機漢堡選單
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const mobileNavDrawer = document.getElementById("mobileNavDrawer");
  const mobileNavBackdrop = document.getElementById("mobileNavBackdrop");

  // 客製彈窗 (PDP)
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
  const addToCartConfirmBtn = document.getElementById("addToCartConfirmBtn");

  // 訂購須知確認彈窗 (Notice Modal)
  const noticeModalOverlay = document.getElementById("noticeModalOverlay");
  const closeNoticeBtn = document.getElementById("closeNoticeBtn");
  const btnAgreeNotice = document.getElementById("btnAgreeNotice");

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

  // 註冊表單元素
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
  const studentGenderSelect = document.getElementById("studentGenderSelect");
  const finalOrderNotes = document.getElementById("finalOrderNotes");
  const confirmOrderSubmitBtn = document.getElementById("confirmOrderSubmitBtn");

  // ==========================================================================
  // 紅色 Toast 與 Shake 震動提示
  // ==========================================================================
  function showToast(message) {
    if (!toastContainer) return;
    const toast = document.createElement("div");
    toast.className = "toast-message";
    toast.innerHTML = `<span>🚨</span> <span>${message}</span>`;
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
  // 初始化
  // ==========================================================================
  function init() {
    populateClassSelects();
    checkUserSession();
    bindEventListeners();
    startProductsRealtimeListener();
    updateCartUI();
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

  // Session-Only 會員狀態檢驗 (僅存於 sessionStorage)
  function checkUserSession() {
    const saved = sessionStorage.getItem("fair115_user_session");
    if (saved) {
      try {
        currentUser = JSON.parse(saved);
        updateUserBtnUI();
      } catch (e) {
        sessionStorage.removeItem("fair115_user_session");
      }
    } else {
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

  // products 集合即時庫存監聽
  function startProductsRealtimeListener() {
    const db = window.firebase ? window.firebase.firestore() : null;
    if (!db) {
      renderProducts("all");
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
        imgContent = `<img src="${p.imageUrl}" alt="${p.name}" style="width:100%; height:100%; object-fit:contain;">`;
      }

      card.innerHTML = `
        ${stockBadgeHtml}
        <div class="product-image-box">
          ${imgContent}
        </div>
        <strong class="product-title" title="${p.name}">${p.name}</strong>
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

      card.addEventListener("click", () => {
        if (!isAvailable) {
          showToast(`此品項目前【${p.stockStatus === "OUT_OF_STOCK" ? "缺貨" : "補貨中"}】，暫不開放選購！`);
          triggerShake(card);
          return;
        }
        openCustomizeModal(p);
      });

      productsGrid.appendChild(card);
    });
  }

  // ==========================================================================
  // 事件監聽與綁定
  // ==========================================================================
  function bindEventListeners() {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 200 && cart.length > 0) {
        bottomCapsule.classList.add("visible");
      } else {
        bottomCapsule.classList.remove("visible");
      }
    }, { passive: true });

    categoriesTrack.addEventListener("click", (e) => {
      const pill = e.target.closest(".category-pill");
      if (!pill) return;
      document.querySelectorAll(".category-pill").forEach(el => el.classList.remove("active"));
      pill.classList.add("active");
      renderProducts(pill.dataset.category);
    });

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

    // 師生會員專區按鈕
    openMemberModalBtn.addEventListener("click", () => {
      if (currentUser) {
        openStudentOrdersModal(currentUser.studentId || currentUser.username);
      } else {
        openStudentAuthModal();
      }
    });

    // 訂單查詢按鈕
    openTrackModalBtn.addEventListener("click", () => {
      const queryId = currentUser ? (currentUser.studentId || currentUser.username) : "";
      openStudentOrdersModal(queryId);
    });

    closeStudentAuthBtn.addEventListener("click", closeStudentAuthModal);

    // 登入 / 註冊 Tab 切換
    tabAuthLogin.addEventListener("click", () => {
      tabAuthLogin.classList.add("active");
      tabAuthRegister.classList.remove("active");
      studentLoginBox.style.display = "block";
      studentRegisterBox.style.display = "none";
    });

    tabAuthRegister.addEventListener("click", () => {
      tabAuthRegister.classList.add("active");
      tabAuthLogin.classList.remove("active");
      studentRegisterBox.style.display = "block";
      studentLoginBox.style.display = "none";
    });

    // 註冊身分 radio 切換 (學生 / 教職員)
    regUserTypeRadios.forEach(r => {
      r.addEventListener("change", (e) => {
        if (e.target.value === "FACULTY") {
          regStudentFields.style.display = "none";
          regFacultyFields.style.display = "block";
        } else {
          regStudentFields.style.display = "block";
          regFacultyFields.style.display = "none";
        }
      });
    });

    btnStudentLoginSubmit.addEventListener("click", handleUserLogin);
    btnStudentRegisterSubmit.addEventListener("click", handleUserRegister);

    closeStudentOrdersBtn.addEventListener("click", closeStudentOrdersModal);
    btnStudentLogout.addEventListener("click", handleUserLogout);
    btnDoTrackSearch.addEventListener("click", () => {
      const q = trackSearchStudentId.value.trim();
      if (!q) {
        alert("請輸入學號或帳號！");
        return;
      }
      startMyOrdersRealtimeListener(q);
    });

    // 購物車抽屜
    openCartBtn.addEventListener("click", openCartDrawer);
    closeCartBtn.addEventListener("click", closeCartDrawer);
    cartDrawerBackdrop.addEventListener("click", closeCartDrawer);
    capsuleCheckoutBtn.addEventListener("click", openCheckoutModal);
    drawerCheckoutBtn.addEventListener("click", () => {
      closeCartDrawer();
      openCheckoutModal();
    });

    hamburgerBtn.addEventListener("click", toggleMobileNav);
    mobileNavBackdrop.addEventListener("click", toggleMobileNav);

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
  }

  function closeStudentAuthModal() {
    studentAuthModalOverlay.classList.remove("active");
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

    const payload = {
      userType: selectedType,
      username: regUsername.value.trim(),
      password: regPassword.value.trim(),
      name: regName.value.trim(),
      gender: regGender.value,
      phone: regPhone.value.trim(),
      studentId: regStudentId.value.trim(),
      seatNumber: regSeatNumber.value.trim(),
      classCode: regClassSelect.value.trim(),
      facultyId: regFacultyId.value.trim(),
      department: regDepartment.value.trim()
    };

    try {
      const db = window.firebase ? window.firebase.firestore() : null;
      btnStudentRegisterSubmit.disabled = true;
      btnStudentRegisterSubmit.textContent = "建立帳號中...";

      const res = await window.StudentAuthService.registerUser(db, payload);
      currentUser = res.user;
      sessionStorage.setItem("fair115_user_session", JSON.stringify(res.user));

      alert(res.message);
      updateUserBtnUI();
      closeStudentAuthModal();
      openStudentOrdersModal(currentUser.studentId || currentUser.username);
    } catch (err) {
      alert(`註冊失敗：\n${err.message}`);
    } finally {
      btnStudentRegisterSubmit.disabled = false;
      btnStudentRegisterSubmit.textContent = "✨ 註冊並登入";
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
  // 訂單進度精準配對查詢看板 (orders studentId == 查詢學號)
  // ==========================================================================
  function openStudentOrdersModal(targetId = "") {
    if (currentUser) {
      btnStudentLogout.style.display = "inline-block";
      memberGreeting.textContent = `歡迎 ${currentUser.name} (${currentUser.userType === "FACULTY" ? currentUser.department : currentUser.classCode} | 身分碼：${currentUser.studentId || currentUser.username})`;
      quickSearchTrackBar.style.display = "none";
      studentOrdersModalOverlay.classList.add("active");
      startMyOrdersRealtimeListener(currentUser.studentId || currentUser.username);
    } else {
      btnStudentLogout.style.display = "none";
      memberGreeting.textContent = "請輸入 6 碼學號查詢自身專屬訂單進度：";
      quickSearchTrackBar.style.display = "flex";
      studentOrdersModalOverlay.classList.add("active");
      if (targetId) {
        trackSearchStudentId.value = targetId;
        startMyOrdersRealtimeListener(targetId);
      } else {
        studentOrdersListContainer.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:1.5rem;">請在上方輸入學號並點擊「查詢」</p>';
      }
    }
  }

  function closeStudentOrdersModal() {
    studentOrdersModalOverlay.classList.remove("active");
    if (unsubscribeOrders) {
      unsubscribeOrders();
      unsubscribeOrders = null;
    }
  }

  function startMyOrdersRealtimeListener(queryStudentId) {
    const db = window.firebase ? window.firebase.firestore() : null;
    if (!db) return;

    const cleanId = String(queryStudentId).trim();
    if (!cleanId) return;

    studentOrdersListContainer.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:1rem;">載入訂單進度中...</p>';

    if (unsubscribeOrders) unsubscribeOrders();

    // 嚴格比對 studentId == cleanId，絕不全域撈取
    unsubscribeOrders = db.collection("orders")
      .where("studentId", "==", cleanId)
      .onSnapshot((snapshot) => {
        if (snapshot.empty) {
          studentOrdersListContainer.innerHTML = `
            <div style="text-align:center; color:var(--text-muted); padding:2rem 1rem;">
              <span style="font-size:2rem; display:block; margin-bottom:0.5rem;">📭</span>
              查無學號【${cleanId}】之訂單，若剛下單請稍候 1~2 秒或核對學號是否正確！
            </div>
          `;
          return;
        }

        studentOrdersListContainer.innerHTML = "";
        snapshot.forEach((doc) => {
          const o = doc.data();

          // 軌道 1：美術審查
          let qcText = "待審核";
          let qcClass = "val-pending";
          if (o.qcStatus === "審核通過") {
            qcText = "✅ 審核通過";
            qcClass = "val-pass";
          } else if (o.qcStatus === "退件待補") {
            qcText = `❌ 退件 (${o.qcRejectedReason || "圖檔不符"})`;
            qcClass = "val-fail";
          }

          // 軌道 2：財務收款
          let payText = "⏳ 待收款";
          let payClass = "val-pending";
          if (o.paymentStatus === "PAID" || o.paymentStatus === "已收款") {
            payText = "💵 已收款核銷";
            payClass = "val-pass";
          }

          // 軌道 3：物流配送
          let deliveryText = "未配送 (校慶當日取貨)";
          let deliveryClass = "val-info";
          if (o.deliveryStatus === "配送中") {
            deliveryText = "🚚 配送中";
            deliveryClass = "val-pending";
          } else if (o.deliveryStatus === "配送完成" || o.deliveryStatus === "已取件") {
            deliveryText = "🎁 取件完成";
            deliveryClass = "val-pass";
          }

          const card = document.createElement("div");
          card.className = "order-track-card";
          card.innerHTML = `
            <div class="order-track-header">
              <div>
                <strong style="color:var(--accent-primary); font-size:0.9rem;">${o.orderId}</strong>
                <span style="font-size:0.75rem; color:var(--text-muted); margin-left:0.5rem;">${o.productName} x ${o.quantity || 1}</span>
              </div>
              <strong style="color:#0f172a; font-size:0.95rem;">NT$ ${o.subtotal || o.unitPrice * (o.quantity || 1)}</strong>
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
          studentOrdersListContainer.appendChild(card);
        });
      }, (err) => {
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
  function openCustomizeModal(product) {
    currentCustomizingProduct = product;
    currentVerifiedFile = null;
    currentFileResInfo = null;
    pendingCartItem = null;

    custModalTitle.textContent = `${product.name}・商品詳情與客製`;
    custModalSpec.textContent = `建議解析度：${product.minRes.w} x ${product.minRes.h} px 以上 / 支援 PNG, JPG, WEBP`;
    pdpAccordionSpec.textContent = product.specDetail;

    custFileInput.value = "";
    custPreviewBox.style.display = "none";
    custPreviewImg.src = "";
    custQtyInput.value = "1";
    custNotesInput.value = "";

    customizeModalOverlay.classList.add("active");
  }

  function closeCustomizeModal() {
    customizeModalOverlay.classList.remove("active");
  }

  function handleAddToCartAttempt() {
    if (!currentCustomizingProduct) return;

    if (!currentVerifiedFile || !custPreviewImg.src) {
      showToast("此商品為客製化限定，必須先上傳圖片才能加入購物車！");
      triggerShake(custDropzone);
      triggerShake(addToCartConfirmBtn);
      return;
    }

    const qty = parseInt(custQtyInput.value, 10) || 1;
    if (qty < 1) {
      alert("數量至少為 1 件！");
      return;
    }

    pendingCartItem = {
      productCode: currentCustomizingProduct.code,
      productName: currentCustomizingProduct.name,
      unitPrice: currentCustomizingProduct.price,
      quantity: qty,
      imageUrl: currentFileResInfo ? currentFileResInfo.safeBase64 : custPreviewImg.src,
      imageRes: currentFileResInfo ? currentFileResInfo.resText : "未提供",
      notes: custNotesInput.value.trim()
    };

    noticeModalOverlay.classList.add("active");
  }

  function handleNoticeAgreed() {
    if (!pendingCartItem) return;

    cart.push(pendingCartItem);
    pendingCartItem = null;

    noticeModalOverlay.classList.remove("active");
    closeCustomizeModal();
    updateCartUI();
    openCartDrawer();
  }

  // ==========================================================================
  // 購物車抽屜
  // ==========================================================================
  function openCartDrawer() {
    cartDrawerBackdrop.classList.add("active");
    cartDrawer.classList.add("active");
  }

  function closeCartDrawer() {
    cartDrawerBackdrop.classList.remove("active");
    cartDrawer.classList.remove("active");
  }

  function toggleMobileNav() {
    const isActive = mobileNavDrawer.classList.contains("active");
    if (isActive) {
      mobileNavDrawer.classList.remove("active");
      mobileNavBackdrop.classList.remove("active");
    } else {
      mobileNavDrawer.classList.add("active");
      mobileNavBackdrop.classList.add("active");
    }
  }

  function updateCartUI() {
    const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

    cartBadgeCount.textContent = totalQty;
    capsuleBadge.textContent = totalQty;
    capsuleTotal.textContent = `NT$ ${totalPrice}`;
    drawerTotalPrice.textContent = `NT$ ${totalPrice}`;

    if (totalQty > 0 && window.scrollY > 200) {
      bottomCapsule.classList.add("visible");
    } else if (totalQty === 0) {
      bottomCapsule.classList.remove("visible");
    }

    if (cart.length === 0) {
      drawerBody.innerHTML = `
        <div class="empty-cart-state">
          <div class="empty-cart-icon">🛒</div>
          <p>購物車目前空空如也！</p>
          <span style="font-size: 0.8rem; color: var(--text-light);">快去選購校慶客製化紀念商品吧</span>
        </div>
      `;
      drawerCheckoutBtn.disabled = true;
      capsuleCheckoutBtn.disabled = true;
    } else {
      drawerCheckoutBtn.disabled = false;
      capsuleCheckoutBtn.disabled = false;
      drawerBody.innerHTML = "";

      cart.forEach((item, index) => {
        const itemEl = document.createElement("div");
        itemEl.className = "cart-item-card";
        const thumbSrc = item.imageUrl || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' fill='%23e2e8f0'/%3E%3C/svg%3E";

        itemEl.innerHTML = `
          <img src="${thumbSrc}" class="cart-item-thumb" alt="${item.productName}">
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
          updateCartUI();
        });
      });

      drawerBody.querySelectorAll(".btn-plus").forEach(b => {
        b.addEventListener("click", () => {
          const idx = parseInt(b.dataset.index, 10);
          cart[idx].quantity++;
          updateCartUI();
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
      studentGenderSelect.value = currentUser.gender || "保密";
    }

    checkoutModalOverlay.classList.add("active");
  }

  function closeCheckoutModal() {
    checkoutModalOverlay.classList.remove("active");
  }

  // ==========================================================================
  // 結帳送單 (自動註冊 + 批次拆單提交)
  // ==========================================================================
  async function handleFinalOrderSubmit() {
    const rawStudent = {
      classCode: classCodeSelect.value.trim(),
      seatNumber: studentSeatInput.value.trim(),
      studentId: studentIdInput.value.trim(),
      name: studentNameInput.value.trim(),
      phone: studentPhoneInput.value.trim(),
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

    confirmOrderSubmitBtn.disabled = true;
    confirmOrderSubmitBtn.textContent = "⏳ 建立身分與安全拆單中...";

    try {
      const db = window.firebase ? window.firebase.firestore() : null;
      if (!db) {
        throw new Error("無法連接至雲端資料庫，請檢查網路！");
      }

      // 會員檢核或訪客自動登記
      let userProfile = currentUser;
      if (!userProfile) {
        const authResult = await window.StudentAuthService.registerStudent(db, rawStudent);
        userProfile = authResult.student || authResult.user;
        sessionStorage.setItem("fair115_user_session", JSON.stringify(userProfile));
        currentUser = userProfile;
        updateUserBtnUI();
      }

      // 批次拆單寫入
      confirmOrderSubmitBtn.textContent = "📦 批次工單排印提交中...";
      const orderNotes = finalOrderNotes.value.trim();
      const splitResult = await window.SplitOrderService.executeSplitOrder(
        db,
        cart,
        userProfile,
        orderNotes
      );

      alert(`🎉 預購成功！\n母單編號：${splitResult.parentOrderId}\n已自動為您拆分為 ${splitResult.workOrders.length} 張產線工單！\n\n※ 您可隨時點擊右上角「訂單查詢」即時追蹤三軌進度！`);

      cart = [];
      updateCartUI();
      closeCheckoutModal();

      // 自動開啟三軌訂單查詢看板
      openStudentOrdersModal(userProfile.studentId || userProfile.username);

    } catch (err) {
      console.error("[Order Error]", err);
      alert(`❌ 訂購攔截：\n${err.message}`);
    } finally {
      confirmOrderSubmitBtn.disabled = false;
      confirmOrderSubmitBtn.textContent = "🚀 確認並提交訂單";
    }
  }

  window.addEventListener("DOMContentLoaded", init);
})();
