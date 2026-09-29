/**
 * 115校慶園遊會 - 師生通用會員體系與學籍防撞服務 (Universal User Auth Service)
 * 整合：
 * 1. 支援「學生」與「教職員」雙軌身分註冊與登入
 * 2. 帳密與個資原子化寫入 users 集合
 * 3. 學生部分維持智光商工「同年級學號唯一」與「同班座號唯一」防撞校驗，並寫入 students 集合
 * 4. 登入態僅存於 sessionStorage (Session-Only Auth)
 */

(function (global) {
  "use strict";

  /**
   * 智慧年級解析器
   */
  function getGradeFromClass(classCode) {
    if (!classCode) return 0;
    const s = String(classCode);
    if (/一|1/i.test(s)) return 1;
    if (/二|2/i.test(s)) return 2;
    if (/三|3/i.test(s)) return 3;
    return 0;
  }

  /**
   * 1. 師生通用註冊 (registerUser)
   * @param {Object} db Firestore 實例
   * @param {Object} userData 註冊資料表單
   */
  async function registerUser(db, userData) {
    if (!db) throw new Error("Firestore db 實例不可為空");
    if (!userData) throw new Error("註冊資料不可為空");

    const username = String(userData.username || "").trim();
    const password = String(userData.password || "").trim();
    const userType = userData.userType === "FACULTY" ? "FACULTY" : "STUDENT";
    const name = String(userData.name || "").trim();
    const gender = String(userData.gender || "保密").trim();
    const phone = String(userData.phone || "").trim();

    if (!username || username.length < 3) {
      throw new Error("帳號設定錯誤：帳號長度至少需 3 個字元！");
    }
    if (!password || password.length < 4) {
      throw new Error("密碼設定錯誤：密碼長度至少需 4 個字元！");
    }
    if (!name || name.length > 5) {
      throw new Error("姓名格式錯誤：請輸入 1~5 字元之真實姓名！");
    }
    if (!/^09\d{8}$/.test(phone)) {
      throw new Error("手機號碼格式錯誤：必須為 09 開頭之 10 碼電話！");
    }

    // 檢查 users 集合中帳號唯一性
    const userDocRef = db.collection("users").doc(username);
    const userSnap = await userDocRef.get();
    if (userSnap.exists) {
      throw new Error(`❌ 帳號【${username}】已被註冊，請換一個使用者帳號！`);
    }

    const serverTimestamp = global.firebase && global.firebase.firestore 
      ? global.firebase.firestore.FieldValue.serverTimestamp() 
      : new Date().toISOString();

    let userProfile = {
      username: username,
      password: password,
      userType: userType,
      name: name,
      gender: gender,
      phone: phone,
      createdAt: serverTimestamp
    };

    if (userType === "STUDENT") {
      const studentId = String(userData.studentId || "").trim();
      const classCode = String(userData.classCode || "").trim();
      const rawSeat = String(userData.seatNumber || "").trim();
      const seatNumber = parseInt(rawSeat, 10);

      if (!/^\d{6}$/.test(studentId)) {
        throw new Error("學號格式錯誤：必須為完整 6 位數字！");
      }
      if (!classCode) {
        throw new Error("請選擇所屬班級！");
      }
      if (isNaN(seatNumber) || seatNumber < 1 || seatNumber > 40) {
        throw new Error("座號範圍錯誤：座號必須介於 1 到 40 號之間！");
      }

      const grade = getGradeFromClass(classCode);
      const gradeLabel = grade > 0 ? `${grade}年級` : "自訂群組";

      // 同年級學號防撞
      const studentDocId = `G${grade}_${studentId}`;
      const studentDocRef = db.collection("students").doc(studentDocId);
      const sDoc = await studentDocRef.get();
      if (sDoc.exists) {
        const exist = sDoc.data();
        if (exist.name !== name || exist.classCode !== classCode) {
          throw new Error(`🚨 學籍衝突：【${gradeLabel}】已存在學號【${studentId}】，同校同年級不可重複！`);
        }
      }

      // 同班座號防撞
      const conflictSeat = await db.collection("students")
        .where("classCode", "==", classCode)
        .where("seatNumber", "==", seatNumber)
        .limit(1)
        .get();

      if (!conflictSeat.empty) {
        const existSeat = conflictSeat.docs[0].data();
        if (existSeat.studentId !== studentId) {
          throw new Error(`🚨 座號衝突：【${classCode}】已有同學登記【${seatNumber}號】！`);
        }
      }

      // 寫入 students 實體
      await studentDocRef.set({
        docId: studentDocId,
        grade: grade,
        studentId: studentId,
        classCode: classCode,
        seatNumber: seatNumber,
        name: name,
        gender: gender,
        phone: phone,
        username: username,
        password: password,
        registeredAt: serverTimestamp
      });

      userProfile = {
        ...userProfile,
        studentId: studentId,
        classCode: classCode,
        seatNumber: seatNumber,
        grade: grade
      };

    } else {
      // 教職員
      const facultyId = String(userData.facultyId || "").trim();
      const department = String(userData.department || "").trim();

      if (!facultyId) throw new Error("請輸入教職員編號！");
      if (!department) throw new Error("請輸入服務處室或科別！");

      userProfile = {
        ...userProfile,
        facultyId: facultyId,
        department: department,
        studentId: facultyId, // 相容欄位供訂單索引
        classCode: department,
        seatNumber: 0
      };
    }

    // 寫入 users 集合
    await userDocRef.set(userProfile);

    return {
      success: true,
      user: userProfile,
      message: `🎉 註冊成功！歡迎【${userProfile.name}】（身分：${userType === "STUDENT" ? "學生" : "教職員"}）`
    };
  }

  /**
   * 2. 師生通用登入 (loginUser)
   * 支援 Username 登入，或若是學生亦支援以 6 位學號登入
   */
  async function loginUser(db, account, password) {
    if (!db) throw new Error("Firestore db 實例不可為空");
    const cleanAccount = String(account || "").trim();
    const cleanPwd = String(password || "").trim();

    if (!cleanAccount || !cleanPwd) {
      throw new Error("請完整填寫帳號與密碼！");
    }

    // 1. 優先查 users/{username}
    const userDocRef = db.collection("users").doc(cleanAccount);
    const userSnap = await userDocRef.get();

    if (userSnap.exists) {
      const uData = userSnap.data();
      if (uData.password !== cleanPwd) {
        throw new Error("❌ 密碼錯誤，請重新輸入！");
      }
      return { success: true, user: uData };
    }

    // 2. 支援以 6 碼學號查詢學生實體登入
    if (/^\d{6}$/.test(cleanAccount)) {
      const snap = await db.collection("students").where("studentId", "==", cleanAccount).get();
      if (!snap.empty) {
        let matched = null;
        snap.forEach((doc) => {
          const d = doc.data();
          const storedPwd = d.password || d.studentId.slice(-4);
          if (storedPwd === cleanPwd) matched = d;
        });
        if (matched) {
          return {
            success: true,
            user: {
              ...matched,
              userType: "STUDENT",
              username: matched.username || matched.studentId
            }
          };
        }
      }
    }

    throw new Error(`❌ 查無帳號或學號【${cleanAccount}】，請確認或重新註冊！`);
  }

  /**
   * 3. 訪客結帳簡易防撞註冊 (registerStudent 相容方法)
   */
  async function registerStudent(db, rawStudentData) {
    return registerUser(db, {
      ...rawStudentData,
      username: rawStudentData.studentId,
      password: rawStudentData.password || rawStudentData.studentId.slice(-4),
      userType: "STUDENT"
    });
  }

  const StudentAuthService = {
    getGradeFromClass,
    registerUser,
    loginUser,
    registerStudent
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = StudentAuthService;
  } else {
    global.StudentAuthService = StudentAuthService;
  }
})(typeof window !== "undefined" ? window : globalThis);
