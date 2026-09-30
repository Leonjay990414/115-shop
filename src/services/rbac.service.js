/**
 * 115校慶園遊會 - RBAC 權限控管與 17 人全團隊矩陣服務 (RBAC & 17-Staff Matrix Service)
 * 整合：
 * 1. 17 位成員完整架構 (含科主任 HEAD_OF_DEPT 與指導老師 ADVISOR_TEACHER 兩位最高權限師長)
 * 2. 嚴格鎖定一般成員帳號與密碼 (唯讀，禁止自行修改)
 * 3. 驗證碼檢視與修改矩陣 (AuthCode Access Matrix)
 * 4. 標準精準時間格式化函式 formatPrecisionTime (YYYY/MM/DD HH:mm:ss.SSS)
 * 5. 自動補全 (Auto-Seed / Upsert) 邏輯，確保雲端帳密與驗證碼 100% 同步校準
 */

(function (global) {
  "use strict";

  const USER_ROLES = {
    HEAD_OF_DEPT: "HEAD_OF_DEPT",       // 科主任 (最高管理階層)
    ADVISOR_TEACHER: "ADVISOR_TEACHER", // 指導老師 (最高管理階層)
    SUPER_ADMIN: "SUPER_ADMIN",         // 總召 (最高管理階層)
    DEVELOPER: "DEVELOPER",             // AI 網站組 (核心/招募)
    QC_REVIEWER: "QC_REVIEWER",         // 美術視覺組 (核心/招募)
    PRODUCTION: "PRODUCTION",           // 商品製作組 (核心/招募)
    FINANCE: "FINANCE",                 // 財務組 (核心/招募)
    MARKETING: "MARKETING",             // 企劃組 (A/B)
    PROMOTION: "PROMOTION",             // 宣傳組 (A/B)
    LOGISTICS: "LOGISTICS"              // 外送組 (A/B)
  };

  /**
   * 精準時間戳格式化工具 (YYYY/MM/DD HH:mm:ss 或附帶 .SSS)
   */
  function formatPrecisionTime(dateInput, includeMs = false) {
    if (!dateInput) return "--";
    let dateObj;
    if (typeof dateInput.toDate === "function") {
      dateObj = dateInput.toDate();
    } else {
      dateObj = new Date(dateInput);
    }
    if (isNaN(dateObj.getTime())) return "--";

    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const d = String(dateObj.getDate()).padStart(2, "0");
    const hh = String(dateObj.getHours()).padStart(2, "0");
    const mm = String(dateObj.getMinutes()).padStart(2, "0");
    const ss = String(dateObj.getSeconds()).padStart(2, "0");
    const ms = String(dateObj.getMilliseconds()).padStart(3, "0");

    return includeMs 
      ? `${y}/${m}/${d} ${hh}:${mm}:${ss}.${ms}`
      : `${y}/${m}/${d} ${hh}:${mm}:${ss}`;
  }

  // 正式 17 人標準成員帳籍矩陣 (最新校準 412001~412015 驗證碼體系，首次登入開通狀態 isActivated)
  const OFFICIAL_17_STAFF_USERS = [
    // 兩位最高階師長
    { staffId: "admin_dept_head", password: "ZgBoss@2026_00", authCode: "000000", role: USER_ROLES.HEAD_OF_DEPT, name: "科主任", isActivated: false, hasInitialized: false, isSuperUser: true },
    { staffId: "admin_teacher", password: "ZgTeacher@2026", authCode: "888888", role: USER_ROLES.ADVISOR_TEACHER, name: "指導老師", isActivated: false, hasInitialized: false, isSuperUser: true },

    // 總召
    { staffId: "admin_director", password: "ZgShop@2026_01", authCode: "412001", role: USER_ROLES.SUPER_ADMIN, name: "總召", isActivated: false, hasInitialized: false, isSuperUser: true },

    // AI 網站組 (412002, 412003)
    { staffId: "admin_web_core", password: "ZgShop@2026_02", authCode: "412002", role: USER_ROLES.DEVELOPER, name: "AI 網站核心 (組長)", isActivated: false, hasInitialized: false, isSuperUser: false },
    { staffId: "admin_web_staff", password: "ZgShop@2026_03", authCode: "412003", role: USER_ROLES.DEVELOPER, name: "AI 網站招募 (組員)", isActivated: false, hasInitialized: false, isSuperUser: false },

    // 美術視覺組 (412004, 412005)
    { staffId: "admin_art_core", password: "ZgShop@2026_04", authCode: "412004", role: USER_ROLES.QC_REVIEWER, name: "美術視覺核心 (組長)", isActivated: false, hasInitialized: false, isSuperUser: false },
    { staffId: "admin_art_staff", password: "ZgShop@2026_05", authCode: "412005", role: USER_ROLES.QC_REVIEWER, name: "美術視覺招募 (組員)", isActivated: false, hasInitialized: false, isSuperUser: false },

    // 商品製作組 (412006, 412007)
    { staffId: "admin_maker_core", password: "ZgShop@2026_06", authCode: "412006", role: USER_ROLES.PRODUCTION, name: "商品製作核心 (組長)", isActivated: false, hasInitialized: false, isSuperUser: false },
    { staffId: "admin_maker_staff", password: "ZgShop@2026_07", authCode: "412007", role: USER_ROLES.PRODUCTION, name: "商品製作招募 (組員)", isActivated: false, hasInitialized: false, isSuperUser: false },

    // 財務組 (412008, 412009)
    { staffId: "admin_finance_core", password: "ZgShop@2026_08", authCode: "412008", role: USER_ROLES.FINANCE, name: "財務組核心 (組長)", isActivated: false, hasInitialized: false, isSuperUser: false },
    { staffId: "admin_finance_staff", password: "ZgShop@2026_09", authCode: "412009", role: USER_ROLES.FINANCE, name: "財務組招募 (組員)", isActivated: false, hasInitialized: false, isSuperUser: false },

    // 企劃組 (412010, 412011)
    { staffId: "staff_plan_A", password: "ZgStaff@2026_10", authCode: "412010", role: USER_ROLES.MARKETING, name: "企劃組 A (組長)", isActivated: false, hasInitialized: false, isSuperUser: false },
    { staffId: "staff_plan_B", password: "ZgStaff@2026_11", authCode: "412011", role: USER_ROLES.MARKETING, name: "企劃組 B (組員)", isActivated: false, hasInitialized: false, isSuperUser: false },

    // 宣傳組 (412012, 412013)
    { staffId: "staff_promo_A", password: "ZgStaff@2026_12", authCode: "412012", role: USER_ROLES.PROMOTION, name: "宣傳組 A (組長)", isActivated: false, hasInitialized: false, isSuperUser: false },
    { staffId: "staff_promo_B", password: "ZgStaff@2026_13", authCode: "412013", role: USER_ROLES.PROMOTION, name: "宣傳組 B (組員)", isActivated: false, hasInitialized: false, isSuperUser: false },

    // 外送組 (412014, 412015)
    { staffId: "staff_delivery_A", password: "ZgStaff@2026_14", authCode: "412014", role: USER_ROLES.LOGISTICS, name: "外送組 A (組長)", isActivated: false, hasInitialized: false, isSuperUser: false },
    { staffId: "staff_delivery_B", password: "ZgStaff@2026_15", authCode: "412015", role: USER_ROLES.LOGISTICS, name: "外送組 B (組員)", isActivated: false, hasInitialized: false, isSuperUser: false }
  ];

  /**
   * 判斷是否為最高管理階層 (科主任、指導老師、總召)
   */
  function isManagerRole(role) {
    return role === USER_ROLES.HEAD_OF_DEPT || 
           role === USER_ROLES.ADVISOR_TEACHER || 
           role === USER_ROLES.SUPER_ADMIN;
  }

  /**
   * 1. 雲端初始化與校準 17 人成員帳籍 (staff_users 集合) - Auto-Seed/Upsert
   */
  async function initializeStaffUsers(db) {
    if (!db) throw new Error("[RbacService] db 實例不可為空");
    const batch = db.batch();
    let needCommit = false;

    for (const staff of OFFICIAL_17_STAFF_USERS) {
      const docRef = db.collection("staff_users").doc(staff.staffId);
      const snap = await docRef.get();
      if (!snap.exists) {
        batch.set(docRef, {
          ...staff,
          isActivated: false,
          hasInitialized: false,
          createdAt: global.firebase && global.firebase.firestore ? global.firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString(),
          firstLoginAt: null
        });
        needCommit = true;
      } else {
        const existingData = snap.data();
        const updateData = {};
        // 確保 isActivated 欄位存在
        if (existingData.isActivated === undefined) {
          updateData.isActivated = existingData.hasInitialized || false;
        }
        if (existingData.name !== staff.name) {
          updateData.name = staff.name;
        }
        if (Object.keys(updateData).length > 0) {
          batch.update(docRef, updateData);
          needCommit = true;
        }
      }
    }

    if (needCommit) {
      await batch.commit();
      console.log("[RbacService] 正式 17 人成員雲端帳籍已完成初始化/校準寫入");
    }
  }

  /**
   * 2. 軌道 1【帳號密碼登入】(支援純帳號密碼查詢與自動補全校準)
   */
  async function loginWithPassword(db, staffId, password) {
    if (!db) throw new Error("[RbacService] db 實例不可為空");
    if (!staffId || !password) throw new Error("請完整填寫帳號與密碼！");

    const cleanStaffId = staffId.trim();
    const cleanPassword = password.trim();

    const docRef = db.collection("staff_users").doc(cleanStaffId);
    let snap = await docRef.get();

    // 若雲端尚未有此帳號，檢查是否屬於官方 17 人預設名單進行自動補齊 (Auto-Seed)
    if (!snap.exists) {
      const defaultUser = OFFICIAL_17_STAFF_USERS.find(s => s.staffId === cleanStaffId);
      if (defaultUser) {
        await docRef.set({
          ...defaultUser,
          createdAt: global.firebase && global.firebase.firestore ? global.firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString(),
          firstLoginAt: null
        });
        snap = await docRef.get();
      } else {
        throw new Error(`❌ 查無帳號【${cleanStaffId}】，請確認輸入是否正確！`);
      }
    }

    let staffData = snap.data();

    // 檢查密碼，若不符合再檢查是否為官方預設密碼進行校準
    if (staffData.password !== cleanPassword) {
      const officialUser = OFFICIAL_17_STAFF_USERS.find(s => s.staffId === cleanStaffId);
      if (officialUser && officialUser.password === cleanPassword) {
        // 自動校準密碼
        await docRef.update({ password: cleanPassword, authCode: officialUser.authCode });
        staffData.password = cleanPassword;
        staffData.authCode = officialUser.authCode;
      } else {
        throw new Error("❌ 登入失敗：密碼不符，請重新輸入！");
      }
    }

    // 帳號密碼登入成功後，將 isActivated 與 hasInitialized 自動標記為 true，解鎖其後續的身分+驗證碼快速登入
    const serverTimestamp = global.firebase && global.firebase.firestore ? global.firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString();
    await docRef.update({
      isActivated: true,
      hasInitialized: true,
      firstLoginAt: staffData.firstLoginAt || serverTimestamp
    });
    staffData.isActivated = true;
    staffData.hasInitialized = true;

    return {
      success: true,
      channel: "PASSWORD",
      staff: staffData,
      user: staffData,
      isManager: isManagerRole(staffData.role),
      message: `🎉 帳密登入成功！歡迎【${staffData.name}】（角色：${staffData.role}）`
    };
  }

  /**
   * 2. 軌道 2【身分與學號驗證碼登入】
   * 規範：
   * 1. 選擇身分席位 (staffId 或角色) + 輸入 6 碼驗證碼
   * 2. 若資料庫查出該身分尚未完成首次帳密登入 (isActivated !== true)，則拒絕登入並彈窗提示：
   *    「⚠️ 該身分尚未完成首次登入開通，請先切換至【帳號密碼】登入一次以啟用驗證碼功能！」
   * 3. 若已開通且驗證碼正確，則順利登入
   */
  async function loginWithIdentityCode(db, staffIdOrRole, authCode) {
    if (!db) throw new Error("[RbacService] db 實例不可為空");
    if (!staffIdOrRole || !authCode) throw new Error("請選擇身分席位並輸入 6 碼專屬驗證碼！");

    const trimmedCode = String(authCode).trim();
    const cleanId = String(staffIdOrRole).trim();
    let targetDocSnap = null;

    const directDoc = await db.collection("staff_users").doc(cleanId).get();
    if (directDoc.exists) {
      targetDocSnap = directDoc;
    } else {
      const query = await db.collection("staff_users").where("authCode", "==", trimmedCode).get();
      if (!query.empty) {
        targetDocSnap = query.docs[0];
      }
    }

    if (!targetDocSnap || !targetDocSnap.exists) {
      throw new Error(`❌ 找不到符合此身分【${cleanId}】的工作人員檔案！`);
    }

    const staffData = targetDocSnap.data();

    // 檢查是否已完成首次帳密登入開通 (isActivated 欄位)
    if (staffData.isActivated !== true && staffData.hasInitialized !== true) {
      throw new Error(`⚠️ 該身分尚未完成首次登入開通，請先切換至【帳號密碼】登入一次以啟用驗證碼功能！`);
    }

    if (staffData.authCode !== trimmedCode) {
      throw new Error(`❌ 驗證碼錯誤：輸入的 6 位數專屬驗證碼不相符！`);
    }

    return {
      success: true,
      channel: "AUTH_CODE",
      staff: staffData,
      user: staffData,
      isManager: isManagerRole(staffData.role),
      message: `⚡ 快速身分驗證登入成功！【${staffData.name}】已就緒（權限：${staffData.role}）`
    };
  }

  /**
   * 3. 密碼修改防護 (僅管理階層具備修改權限，一般成員帳密鎖定為唯讀)
   */
  async function updateStaffPassword(db, currentStaffId, targetStaffId, oldPassword, newPassword) {
    if (!db) throw new Error("[RbacService] db 實例不可為空");
    const currentDoc = await db.collection("staff_users").doc(currentStaffId).get();
    if (!currentDoc.exists) throw new Error("未授權的操作者！");

    const currentStaff = currentDoc.data();
    if (!isManagerRole(currentStaff.role)) {
      throw new Error("403 Forbidden: 一般成員帳號密碼已鎖定唯讀，無權修改密碼！");
    }

    const targetDoc = await db.collection("staff_users").doc(targetStaffId).get();
    if (!targetDoc.exists) throw new Error("目標使用者不存在！");

    if (currentStaff.role !== USER_ROLES.HEAD_OF_DEPT && currentStaff.role !== USER_ROLES.ADVISOR_TEACHER) {
      if (targetDoc.data().password !== oldPassword) {
        throw new Error("原密碼比對錯誤！");
      }
    }

    await db.collection("staff_users").doc(targetStaffId).update({
      password: newPassword
    });

    return { success: true, message: `密碼已成功更新！` };
  }

  /**
   * 4. 驗證碼檢視遮蔽矩陣 (Mask Matrix)
   */
  function maskStaffAuthCodeMatrix(staffList, currentStaffUser) {
    if (!Array.isArray(staffList)) return [];
    if (!currentStaffUser) {
      return staffList.map(s => ({ ...s, authCode: "••••••", canEditCode: false }));
    }

    const isManager = isManagerRole(currentStaffUser.role);

    return staffList.map((member) => {
      const isSelf = member.staffId === currentStaffUser.staffId;
      if (isManager) {
        return {
          ...member,
          canEditCode: true
        };
      }
      if (isSelf) {
        return {
          ...member,
          canEditCode: true
        };
      }
      return {
        ...member,
        authCode: "••••••",
        canEditCode: false
      };
    });
  }

  /**
   * 5. 驗證碼修改安全防呆 (Update AuthCode)
   */
  async function updateStaffAuthCode(db, operatorUser, targetStaffId, newAuthCode) {
    if (!db) throw new Error("db 實例不可為空");
    if (!operatorUser) throw new Error("未登入的操作者！");

    const code = String(newAuthCode).trim();
    if (!/^\d{6}$/.test(code)) {
      throw new Error("驗證碼格式錯誤：必須為恰好 6 碼純數字 (真實學號)！");
    }

    const isManager = isManagerRole(operatorUser.role);
    const isSelf = operatorUser.staffId === targetStaffId;

    if (!isManager && !isSelf) {
      throw new Error(`403 Forbidden: 操作者【${operatorUser.name}】無權修改他人驗證碼！`);
    }

    const targetDocRef = db.collection("staff_users").doc(targetStaffId);
    const snap = await targetDocRef.get();
    if (!snap.exists) {
      throw new Error(`目標成員【${targetStaffId}】不存在！`);
    }

    await targetDocRef.update({
      authCode: code,
      authCodeUpdatedAt: global.firebase && global.firebase.firestore ? global.firebase.firestore.FieldValue.serverTimestamp() : new Date().toISOString()
    });

    return {
      success: true,
      message: `成員【${snap.data().name}】之驗證碼已成功更新！`
    };
  }

  // 匯出全域物件
  global.RbacService = {
    USER_ROLES,
    OFFICIAL_17_STAFF_USERS,
    formatPrecisionTime,
    isManagerRole,
    initializeStaffUsers,
    loginWithPassword,
    loginWithIdentityCode,
    updateStaffPassword,
    maskStaffAuthCodeMatrix,
    updateStaffAuthCode
  };

})(typeof window !== "undefined" ? window : global);
