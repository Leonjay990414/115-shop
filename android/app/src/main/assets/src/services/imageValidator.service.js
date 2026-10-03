/**
 * 115校慶園遊會 - 1080P 圖檔解析度檢驗模組 (Image Validator Module)
 * 負責記憶體中解算 naturalWidth / naturalHeight、MIME-Type 校驗與解析度門檻審查
 */

(function (global) {
  "use strict";

  const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];

  /**
   * 檢驗圖檔解析度與格式
   * @param {File|Blob} file 使用者選擇之圖檔
   * @param {number} targetWidth 最小目標寬度 (預設 1080)
   * @param {number} targetHeight 最小目標高度 (預設 1080)
   * @returns {Promise<{ isValid: boolean, width: number, height: number, resText: string, warningMessage: string | null }>}
   */
  function validateImageResolution(file, targetWidth = 1080, targetHeight = 1080) {
    return new Promise((resolve, reject) => {
      if (!file) {
        return reject(new Error("[ImageValidator] 未傳入任何檔案！"));
      }

      // 嚴格校驗 MIME-Type
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return resolve({
          isValid: false,
          width: 0,
          height: 0,
          resText: "不支援的格式",
          warningMessage: `❌ 檔案格式不合規！僅接受 PNG, JPG, WEBP，當前檔案格式為：${file.type || "未知"}`
        });
      }

      const objectUrl = URL.createObjectURL(file);
      const img = new Image();

      img.onload = function () {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        URL.revokeObjectURL(objectUrl);

        const resText = `${width} x ${height} px`;
        const isStandard = width >= targetWidth && height >= targetHeight;

        if (isStandard) {
          return resolve({
            isValid: true,
            width,
            height,
            resText,
            warningMessage: null
          });
        } else {
          return resolve({
            isValid: false,
            width,
            height,
            resText,
            warningMessage: `⚠️ 解析度不足警告：圖檔尺寸為 ${resText}，低於產線 1080P 高清標準（${targetWidth} x ${targetHeight} px），印製成品可能產生顆粒模糊！`
          });
        }
      };

      img.onerror = function () {
        URL.revokeObjectURL(objectUrl);
        return resolve({
          isValid: false,
          width: 0,
          height: 0,
          resText: "解析損毀",
          warningMessage: "❌ 無法讀取圖檔內容，圖檔可能已損毀或非標準影像編碼！"
        });
      };

      img.src = objectUrl;
    });
  }

  // 匯出至全域 window 與模組
  const ImageValidatorService = {
    validateImageResolution,
    ALLOWED_MIME_TYPES
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = ImageValidatorService;
  } else {
    global.ImageValidatorService = ImageValidatorService;
  }
})(typeof window !== "undefined" ? window : globalThis);
