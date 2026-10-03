/**
 * 115校慶園遊會 - 獨立會員驗證邏輯 (Standalone Auth Script)
 * 職責：
 * 1. 支援「學生」與「教職員」雙軌註冊與登入
 * 2. 兩階段註冊：第一階段 Email 驗證碼 (GAS)，第二階段防呆帳密及個資
 * 3. 登入或註冊成功後：
 *    - 同步寫入 localStorage("zg_member_user") 與 sessionStorage("fair115_user_session")
 *    - 觸發 localStorage 變更通知主商城
 *    - 提示「登入成功，已為您自動同步！」，引導回首頁或自動關閉分頁
 */

(function () {
  "use strict";

  const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzVxFfgUkLWnG_CuSwvE0RVW9UWECmLL_iKSwXckZAPGUvsvEu8m4jdcGoCE02BvSVy/exec";

  // 34 個智光商工標準班級字典 (移除任何合班)
  const SCHOOL_CLASSES_GROUPED = {
    "一年級 (11 個班級)": [
      "資處一仁", "餐飲一信甲", "餐飲一信乙", "餐飲一義", "餐飲一願", "餐飲一力",
      "電子一慈", "觀光一真", "資訊一圓", "機械一華", "多媒一行"
    ],
    "二年級 (11 個班級)": [
      "資處二仁", "餐飲二信甲", "餐飲二信乙", "餐飲二義", "餐飲二願", "餐飲二力",
      "電子二慈", "觀光二真", "資訊二圓", "機械二華", "多媒二行"
    ],
    "三年級 (12 個班級)": [
      "資處三仁", "餐飲三信甲", "餐飲三信乙", "餐飲三義", "餐飲三願", "餐飲三力",
      "電子三慈", "觀光三真", "資訊三圓", "機械三華", "多媒三行", "多媒三善"
    ]
  };

  // 教職員三軌階層字典
  const FACULTY_HIERARCHY = {
    "行政單位": [
      "校長室", "實習處", "學務處", "總務處", "輔導處", "教務處",
      "圖書館", "人事室", "會計室", "教官室", "進修部", "導師辦公室"
    ],
    "學術單位": [
      "資料處理科", "餐飲管理科", "電子科", "觀光事業科",
      "資訊科", "機械科", "多媒體設計科", "建教合作班"
    ],
    "教師": [
      "專任教師", "兼課教師", "支領鐘點費教師"
    ]
  };

  // DOM 參考
  const statusToast = document.getElementById("statusToast");
  const tabAuthLogin = document.getElementById("tabAuthLogin");
  const tabAuthRegister = document.getElementById("tabAuthRegister");
  const studentLoginBox = document.getElementById("studentLoginBox");
  const studentRegisterBox = document.getElementById("studentRegisterBox");

  // 登入
  const loginStudentId = document.getElementById("loginStudentId");
  const loginStudentPwd = document.getElementById("loginStudentPwd");
  const btnStudentLoginSubmit = document.getElementById("btnStudentLoginSubmit");

  // 註冊第一階段 (Email)
  const regEmailInput = document.getElementById("regEmailInput");
  const btnSendVerifyCode = document.getElementById("btnSendVerifyCode");
  const regVerifyCodeInput = document.getElementById("regVerifyCodeInput");
  const btnVerifyCodeSubmit = document.getElementById("btnVerifyCodeSubmit");
  const verifyCodeTimerHint = document.getElementById("verifyCodeTimerHint");

  // 註冊第二階段
  const regStage2FieldsBox = document.getElementById("regStage2FieldsBox");
  const verifiedEmailDisplay = document.getElementById("verifiedEmailDisplay");
  const regUserTypeRadios = document.getElementsByName("regUserType");
  const regUsername = document.getElementById("regUsername");
  const regUsernameCheckHint = document.getElementById("regUsernameCheckHint");
  const regPassword = document.getElementById("regPassword");
  const regName = document.getElementById("regName");
  const regNameCheckHint = document.getElementById("regNameCheckHint");
  const regGender = document.getElementById("regGender");
  const regPhone = document.getElementById("regPhone");
  const regStudentFields = document.getElementById("regStudentFields");
  const regFacultyFields = document.getElementById("regFacultyFields");
  const regStudentId = document.getElementById("regStudentId");
  const regSeatNumber = document.getElementById("regSeatNumber");
  const regClassSelect = document.getElementById("regClassSelect");
  const regFacultyId = document.getElementById("regFacultyId");
  const regFacultyCategory = document.getElementById("regFacultyCategory");
  const regDepartment = document.getElementById("regDepartment");
  const btnStudentRegisterSubmit = document.getElementById("btnStudentRegisterSubmit");

  // 狀態變數
  let sentVerificationCode = "";
  let verifyCodeExpiry = 0;
  let verifiedEmail = "";
  let countdownTimer = null;

  function showMessage(msg, isSuccess = false) {
    if (!statusToast) {
      alert(msg);
      return;
    }
    statusToast.className = `status-toast ${isSuccess ? "success" : "error"}`;
    statusToast.textContent = msg;
    statusToast.style.display = "block";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function init() {
    populateClassSelects();
    bindEvents();
    checkIfAlreadyLoggedIn();
  }

  function checkIfAlreadyLoggedIn() {
    const existing = localStorage.getItem("zg_member_user") || sessionStorage.getItem("fair115_user_session");
    if (existing) {
      try {
        const u = JSON.parse(existing);
        if (u && (u.username || u.name)) {
          showMessage(`🟢 您目前已登入為【${u.name}】(${u.userType === "FACULTY" ? "教職員" : u.classCode})，可直接返回商城進行購物。`, true);
        }
      } catch (e) {}
    }
  }

  function populateClassSelects() {
    if (!regClassSelect) return;
    regClassSelect.innerHTML = `<option value="">-- 請選擇就讀班級 (共34班) --</option>`;
    for (const [gradeName, classList] of Object.entries(SCHOOL_CLASSES_GROUPED)) {
      const optgroup = document.createElement("optgroup");
      optgroup.label = `🏫 ${gradeName}`;
      classList.forEach((cls) => {
        const opt = document.createElement("option");
        opt.value = cls;
        opt.textContent = cls;
        optgroup.appendChild(opt);
      });
      regClassSelect.appendChild(optgroup);
    }
  }

  function updateFacultyDepartmentOptions(category) {
    if (!regDepartment) return;
    regDepartment.innerHTML = "";
    const list = FACULTY_HIERARCHY[category];
    if (!list || list.length === 0) {
      regDepartment.disabled = true;
      regDepartment.innerHTML = `<option value="">-- 請先選取類別 --</option>`;
      return;
    }

    regDepartment.disabled = false;
    regDepartment.innerHTML = `<option value="">-- 請選擇具體處室 / 職稱 --</option>`;
    list.forEach(dept => {
      const opt = document.createElement("option");
      opt.value = dept;
      opt.textContent = dept;
      regDepartment.appendChild(opt);
    });
  }

  function bindEvents() {
    // 切換分頁
    tabAuthLogin.addEventListener("click", () => {
      tabAuthLogin.classList.add("active");
      tabAuthRegister.classList.remove("active");
      studentLoginBox.style.display = "block";
      studentRegisterBox.style.display = "none";
      if (statusToast) statusToast.style.display = "none";
    });

    tabAuthRegister.addEventListener("click", () => {
      tabAuthRegister.classList.add("active");
      tabAuthLogin.classList.remove("active");
      studentRegisterBox.style.display = "block";
      studentLoginBox.style.display = "none";
      if (statusToast) statusToast.style.display = "none";
    });

    // 登入事件
    btnStudentLoginSubmit.addEventListener("click", handleLogin);
    loginStudentPwd.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleLogin();
    });

    // 身分選擇切換
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

    // 教職員階層式下拉連動
    if (regFacultyCategory) {
      regFacultyCategory.addEventListener("change", (e) => {
        updateFacultyDepartmentOptions(e.target.value);
      });
    }

    // 發送驗證碼
    btnSendVerifyCode.addEventListener("click", handleSendVerificationCode);
    btnVerifyCodeSubmit.addEventListener("click", handleVerifyCodeSubmit);

    // 即時格式防呆
    if (regUsername) regUsername.addEventListener("input", handleUsernameInput);
    if (regName) regName.addEventListener("input", handleNameInput);

    // 註冊送出
    btnStudentRegisterSubmit.addEventListener("click", handleRegister);
  }

  // 發送 Email 驗證碼
  async function handleSendVerificationCode() {
    const email = regEmailInput.value.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email || !emailRegex.test(email)) {
      showMessage("請輸入有效且格式正確的電子信箱！");
      regEmailInput.focus();
      return;
    }

    btnSendVerifyCode.disabled = true;
    btnSendVerifyCode.textContent = "查重核驗中...";

    try {
      const db = window.firebase ? window.firebase.firestore() : null;
      if (db) {
        const uSnap = await db.collection("users").where("email", "==", email).get();
        if (!uSnap.empty) {
          throw new Error(`此電子信箱【${email}】已被註冊使用，嚴禁重複登記！`);
        }
        const mSnap = await db.collection("members").where("email", "==", email).get();
        if (!mSnap.empty) {
          throw new Error(`此電子信箱【${email}】已被註冊使用，嚴禁重複登記！`);
        }
      }

      // 產生 6 位數隨機驗證碼
      sentVerificationCode = String(Math.floor(100000 + Math.random() * 900000));
      verifyCodeExpiry = Date.now() + 10 * 60 * 1000;

      btnSendVerifyCode.textContent = "發送中...";

      const payload = {
        action: "send_verification_code",
        email: email,
        code: sentVerificationCode,
        appName: "115校慶園遊會預購商城",
        expiryMinutes: 10
      };

      await fetch(GAS_API_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });

      showMessage(`📨 驗證信已送出至【${email}】，請至信箱（含垃圾郵件匣）查收 6 位數驗證碼！`, true);
      startCountdown(60);
      regVerifyCodeInput.focus();
    } catch (err) {
      showMessage(`發送失敗：${err.message}`);
      btnSendVerifyCode.disabled = false;
      btnSendVerifyCode.textContent = "發送驗證碼";
    }
  }

  function startCountdown(seconds) {
    let timeLeft = seconds;
    btnSendVerifyCode.disabled = true;
    btnSendVerifyCode.textContent = `重新發送 (${timeLeft}s)`;

    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        clearInterval(countdownTimer);
        btnSendVerifyCode.disabled = false;
        btnSendVerifyCode.textContent = "發送驗證碼";
      } else {
        btnSendVerifyCode.textContent = `重新發送 (${timeLeft}s)`;
      }
    }, 1000);
  }

  // 驗證碼比對
  function handleVerifyCodeSubmit() {
    const inputCode = regVerifyCodeInput.value.trim();
    if (!inputCode) {
      showMessage("請輸入 6 位數驗證碼！");
      regVerifyCodeInput.focus();
      return;
    }

    if (Date.now() > verifyCodeExpiry) {
      showMessage("驗證碼已過期，請重新點擊發送！");
      return;
    }

    if (inputCode !== sentVerificationCode) {
      showMessage("❌ 驗證碼錯誤，請仔細核對信箱後重新輸入！");
      regVerifyCodeInput.focus();
      return;
    }

    verifiedEmail = regEmailInput.value.trim().toLowerCase();
    verifiedEmailDisplay.textContent = verifiedEmail;
    regEmailInput.disabled = true;
    btnSendVerifyCode.disabled = true;
    regVerifyCodeInput.disabled = true;
    btnVerifyCodeSubmit.disabled = true;

    if (countdownTimer) clearInterval(countdownTimer);
    verifyCodeTimerHint.textContent = "✅ 電子信箱驗證成功！";
    verifyCodeTimerHint.style.color = "#059669";

    regStage2FieldsBox.style.display = "block";
    showMessage("🎉 信箱驗證成功！請接續填寫基本資料完成註冊。", true);
    regUsername.focus();
  }

  function handleUsernameInput() {
    const val = regUsername.value.trim();
    const regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{5,10}$/;
    if (!val) {
      regUsernameCheckHint.textContent = "";
      return;
    }
    if (!regex.test(val)) {
      regUsernameCheckHint.textContent = "❌ 帳號須為 5~10 碼且同時包含英文字母與數字";
      regUsernameCheckHint.style.color = "#ef4444";
    } else {
      regUsernameCheckHint.textContent = "✅ 帳號格式符合規範";
      regUsernameCheckHint.style.color = "#059669";
    }
  }

  function handleNameInput() {
    const val = regName.value.trim();
    const regex = /^[\u4e00-\u9fa5]{2,4}$/;
    if (!val) {
      regNameCheckHint.textContent = "";
      return;
    }
    if (!regex.test(val)) {
      regNameCheckHint.textContent = "❌ 真實姓名限 2 ~ 4 個繁體中文字";
      regNameCheckHint.style.color = "#ef4444";
    } else {
      regNameCheckHint.textContent = "✅ 姓名格式正確";
      regNameCheckHint.style.color = "#059669";
    }
  }

  // 執行登入
  async function handleLogin() {
    const account = loginStudentId.value.trim();
    const pwd = loginStudentPwd.value.trim();

    if (!account || !pwd) {
      showMessage("請完整輸入使用者帳號與密碼！");
      return;
    }

    btnStudentLoginSubmit.disabled = true;
    btnStudentLoginSubmit.textContent = "驗證身分中...";

    try {
      const db = window.firebase ? window.firebase.firestore() : null;
      if (!db) throw new Error("資料庫連線尚未就緒，請重新整理後再試！");

      const res = await window.StudentAuthService.loginUser(db, account, pwd);
      onAuthSuccess(res.user, "登入");
    } catch (err) {
      showMessage(`登入失敗：${err.message}`);
    } finally {
      btnStudentLoginSubmit.disabled = false;
      btnStudentLoginSubmit.textContent = "🚀 登入會員帳號";
    }
  }

  // 執行註冊
  async function handleRegister() {
    let selectedType = "STUDENT";
    regUserTypeRadios.forEach(r => { if (r.checked) selectedType = r.value; });

    if (!verifiedEmail) {
      showMessage("請先完成第一階段信箱驗證！");
      return;
    }

    const trimmedName = regName.value.trim();
    if (!/^[\u4e00-\u9fa5]{2,4}$/.test(trimmedName)) {
      showMessage("真實姓名限 2 ~ 4 個繁體中文字！");
      regName.focus();
      return;
    }

    const trimmedUsername = regUsername.value.trim();
    if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{5,10}$/.test(trimmedUsername)) {
      showMessage("自訂帳號長度須為 5 ~ 10 碼，且必須包含英文字母與數字！");
      regUsername.focus();
      return;
    }

    const trimmedPassword = regPassword.value.trim();
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{6,8}$/.test(trimmedPassword)) {
      showMessage("登入密碼長度須為 6 ~ 8 碼，且必須同時包含英文大寫、小寫字母與數字！");
      regPassword.focus();
      return;
    }

    const trimmedPhone = regPhone.value.trim();
    if (!/^09\d{8}$/.test(trimmedPhone)) {
      showMessage("手機號碼必須為 09 開頭之 10 碼數字！");
      regPhone.focus();
      return;
    }

    const payload = {
      userType: selectedType,
      username: trimmedUsername,
      password: trimmedPassword,
      name: trimmedName,
      gender: regGender.value,
      phone: trimmedPhone,
      email: verifiedEmail,
      studentId: regStudentId.value.trim(),
      seatNumber: regSeatNumber.value.trim(),
      classCode: regClassSelect.value.trim(),
      facultyId: regFacultyId.value.trim(),
      department: regDepartment.value.trim()
    };

    btnStudentRegisterSubmit.disabled = true;
    btnStudentRegisterSubmit.textContent = "建立帳號中...";

    try {
      const db = window.firebase ? window.firebase.firestore() : null;
      if (!db) throw new Error("資料庫尚未就緒");

      const res = await window.StudentAuthService.registerUser(db, payload);

      // 非阻塞觸發歡迎通知信
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
        }).catch(e => console.warn(e));
      } catch (e) {}

      onAuthSuccess(res.user, "註冊");
    } catch (err) {
      showMessage(`註冊失敗：${err.message}`);
    } finally {
      btnStudentRegisterSubmit.disabled = false;
      btnStudentRegisterSubmit.textContent = "✨ 完成資料填寫並送出註冊";
    }
  }

  // 登入/註冊成功處理
  function onAuthSuccess(user, actionType) {
    const userStr = JSON.stringify(user);
    // 寫入 localStorage (提供主商城跨分頁即時監聽)
    localStorage.setItem("zg_member_user", userStr);
    // 寫入 sessionStorage
    sessionStorage.setItem("fair115_user_session", userStr);

    showMessage(`🎉 ${actionType}成功！歡迎【${user.name}】。\n已為您自動同步至主商城，即將為您引導回首頁...`, true);

    setTimeout(() => {
      // 嘗試關閉本獨立分頁；若瀏覽器限制不可關閉，則跳轉回商城首頁
      window.close();
      setTimeout(() => {
        window.location.href = "index.html";
      }, 500);
    }, 1200);
  }

  // 啟動
  window.addEventListener("DOMContentLoaded", init);
})();
