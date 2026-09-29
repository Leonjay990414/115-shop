/**
 * 115校慶園遊會客製化訂單系統 - 雲端與本機統一配置
 * 系統常數字典校準 (34 個智光商工標準班級選項)
 */

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAYunSi8yFHoXxBQD1cabe-uKIA6DUKP_Q",
  authDomain: "project-8372949785937083434.firebaseapp.com",
  projectId: "project-8372949785937083434",
  storageBucket: "project-8372949785937083434.firebasestorage.app",
  messagingSenderId: "353265416024",
  appId: "1:353265416024:web:1a333c4bd6d9ac8220572d"
};

export const CLOUDINARY_CONFIG = {
  cloudName: "demo_115fair",
  uploadPreset: "fair115_unsigned_preset",
  folder: "115_fair_orders"
};

// 34 個智光商工標準班級常數字典 (依年級精準劃分)
export const SCHOOL_CLASSES = {
  GRADE_1: [
    "資處一仁", "餐飲一信甲", "餐飲一義", "餐飲一願", "餐飲入力",
    "電子一慈", "觀光一真", "資訊一圓", "機械一華", "多媒一行", "餐飲一信乙"
  ],
  GRADE_2: [
    "資處二仁", "餐飲二信甲", "餐飲二義", "餐飲二願", "餐飲二力",
    "電子二慈", "觀光二真", "資訊二圓", "機械二華", "多媒二行", "餐飲二信乙"
  ],
  GRADE_3: [
    "資處三仁", "餐飲三信甲", "餐飲三義", "餐飲三願", "餐飲三力",
    "電子三慈", "觀光三真", "資訊三圓", "機械三華", "多媒三行", "多媒三善", "餐飲三信乙"
  ]
};

// 扁平化 34 班清單
export const ALL_SCHOOL_CLASSES = [
  ...SCHOOL_CLASSES.GRADE_1,
  ...SCHOOL_CLASSES.GRADE_2,
  ...SCHOOL_CLASSES.GRADE_3
];

export const SYSTEM_CONSTANTS = {
  ACADEMIC_YEAR: "115",
  EVENT_NAME: "115校慶園遊會",
  TRIPLE_SLIP_PREFIX: "TR-",
  ORDER_PREFIX: "115-2026-",
  MAX_REJECTION_DAYS_BEFORE_PHYSICAL_CHASE: 4
};

// 瀏覽器全域導出支援
if (typeof window !== "undefined") {
  window.SCHOOL_CLASSES = SCHOOL_CLASSES;
  window.ALL_SCHOOL_CLASSES = ALL_SCHOOL_CLASSES;
}
