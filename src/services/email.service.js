/**
 * 115校慶園遊會 - 全方位 Email 郵件樣板與發信引擎 (Email Service)
 * 核心規範：
 * 1. UI/UX Pro Max 淺色粉彩高質感 HTML 郵件模板 (PingFang TC / 圓角卡片 / 柔和粉 / 奶油金 / 天空藍)
 * 2. 涵蓋四大必備功能矩陣：
 *    - 會員註冊成功信 (WELCOME_MEMBER)
 *    - 下單成功確認信 (ORDER_CONFIRMATION)
 *    - 審核進度通知信 (QC_STATUS_UPDATE: 通過/退件)
 *    - 取貨憑證通知信 (PICKUP_PASS: 內嵌高解析動態取貨條碼與序號)
 * 3. 雙向支援前端 Web、後台 Admin 及原生行動 App 呼叫
 */

(function (global) {
  "use strict";

  const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzVxFfgUkLWnG_CuSwvE0RVW9UWECmLL_iKSwXckZAPGUvsvEu8m4jdcGoCE02BvSVy/exec";
  const SHOP_URL = "https://leonjay990414.github.io/115-shop/index/shop.html";
  const NOTICE_URL = "https://leonjay990414.github.io/115-shop/index/notice.html";

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * 生成共用 UI/UX Pro Max 淺色粉彩排版封裝
   */
  function wrapEmailTemplate({ title, badgeText, badgeColor = "#ff7597", contentHtml }) {
    return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'PingFang TC', 'Noto Sans TC', 'Microsoft JhengHei', sans-serif; color: #1e293b; line-height: 1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; padding: 24px 12px;">
    <tr>
      <td align="center">
        <!-- 主卡片容器 -->
        <table role="presentation" width="100%" style="max-width: 600px; background: #ffffff; border-radius: 24px; overflow: hidden; border: 1.5px solid #fecdd3; box-shadow: 0 10px 25px -5px rgba(244, 63, 94, 0.08);" cellspacing="0" cellpadding="0" border="0">
          
          <!-- 頂部粉彩漸層 Header -->
          <tr>
            <td style="padding: 28px 24px; background: linear-gradient(135deg, #fff1f2 0%, #fef3c7 50%, #f0f9ff 100%); text-align: center; border-bottom: 1px dashed #fecdd3;">
              <div style="display: inline-block; padding: 4px 14px; background: rgba(255, 255, 255, 0.9); border: 1px solid #fda4af; border-radius: 999px; font-size: 12px; font-weight: 700; color: ${badgeColor}; margin-bottom: 8px;">
                ${escapeHtml(badgeText)}
              </div>
              <h1 style="margin: 0; font-size: 20px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px;">
                🏫 智光商工 115 週年校慶 ‧ 紀念品專案
              </h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: #64748b; font-weight: 500;">
                資料處理科客製化產線 ‧ 專屬服務信件
              </p>
            </td>
          </tr>

          <!-- 內容主體 -->
          <tr>
            <td style="padding: 28px 24px;">
              ${contentHtml}
            </td>
          </tr>

          <!-- 頁尾宣告與幫助 -->
          <tr>
            <td style="padding: 20px 24px; background: #fdf2f8; text-align: center; border-top: 1px dashed #fbcfe8; font-size: 12px; color: #94a3b8;">
              <p style="margin: 0 0 6px;">智光商工 115 校慶園遊會客製專案籌備團隊 敬祝活動愉快！</p>
              <p style="margin: 0;">遇到任何問題？歡迎親洽資料處理科 6 樓辦公室或向攤位現場工作人員洽詢。</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  /**
   * 1. 會員註冊成功信模板
   */
  function generateWelcomeMemberTemplate(data) {
    const { name, username, userType, classCode, seatNumber, email } = data;
    const isStudent = userType !== "FACULTY";

    const contentHtml = `
      <p style="font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 0;">
        親愛的 <span style="color: #e11d48;">${escapeHtml(name)}</span> ${isStudent ? "同學" : "老師/同仁"} 您好：
      </p>
      <p style="font-size: 14px; color: #475569; line-height: 1.7;">
        恭喜您！您的 115 校慶紀念商城專屬帳號已成功啟用 🎉<br>
        現在您可以隨時選購限定文青帆布袋、雷雕保溫杯、校慶徽章及壓克力吊飾，並能自訂圖片線上預覽印製效果！
      </p>

      <!-- 前往商城按鈕 -->
      <div style="text-align: center; margin: 26px 0;">
        <a href="${SHOP_URL}" target="_blank" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #ff7597, #f43f5e); color: #ffffff; text-decoration: none; border-radius: 999px; font-weight: 800; font-size: 15px; box-shadow: 0 8px 20px rgba(244, 63, 94, 0.35);">
          🛍️ 前往校慶紀念品官方商城
        </a>
      </div>

      <!-- 個人會員資料卡 -->
      <div style="background: #fdf4ff; border-radius: 16px; padding: 18px 20px; border: 1px solid #f5d0fe; margin-bottom: 20px;">
        <div style="font-size: 13px; font-weight: 800; color: #a21caf; margin-bottom: 10px;">✦ 您的會員檔案確認：</div>
        <table width="100%" style="font-size: 13px; color: #475569;" cellpadding="4">
          <tr><td width="30%"><strong>會員帳號：</strong></td><td style="font-family: monospace; font-weight: 700; color: #0f172a;">${escapeHtml(username)}</td></tr>
          <tr><td><strong>就讀班級：</strong></td><td>${escapeHtml(classCode || "無班級紀錄")}</td></tr>
          <tr><td><strong>座號：</strong></td><td>${escapeHtml(seatNumber || 0)} 號</td></tr>
          <tr><td><strong>認證信箱：</strong></td><td>${escapeHtml(email)}</td></tr>
        </table>
      </div>

      <!-- 校慶活動提醒 -->
      <div style="background: #f0fdf4; border-radius: 14px; padding: 14px 18px; border: 1px solid #bbf7d0; font-size: 13px; color: #166534;">
        🎪 <strong>校慶園遊會特別叮嚀：</strong><br>
        本商城為校慶限定客製化預購，所有商品將在校慶日前排單製作完畢。校慶當天請出示訂單條碼至指定專屬攤位即可兌領！
      </div>
    `;

    return wrapEmailTemplate({
      title: "【智光商工115校慶】會員帳號已成功啟用 🎉",
      badgeText: "✨ 帳號開通通知",
      badgeColor: "#a21caf",
      contentHtml
    });
  }

  /**
   * 2. 下單成功確認信模板
   */
  function generateOrderConfirmationTemplate(data) {
    const { parentOrderId, studentName, studentClass, studentSeat, workOrders = [], totalAmount, notes } = data;

    let itemsTableRows = "";
    workOrders.forEach((item, index) => {
      const code = item.productCode || "";
      const name = item.productName || "紀念品";
      const qty = item.quantity || 1;
      const price = item.unitPrice || 0;
      const subtotal = item.subtotal || (price * qty);
      const imgThumb = item.imageUrl ? `<img src="${item.imageUrl}" width="42" height="42" style="border-radius: 6px; object-fit: cover; border: 1px solid #e2e8f0; vertical-align: middle; margin-right: 8px;">` : "";

      itemsTableRows += `
        <tr style="border-bottom: 1px dashed #e2e8f0;">
          <td style="padding: 10px 0; font-size: 13px;">
            ${imgThumb}
            <strong>${escapeHtml(name)}</strong>
            <span style="font-size: 11px; color: #64748b; display: block;">工單號：${escapeHtml(item.orderId || `${parentOrderId}-${code}`)}</span>
          </td>
          <td align="center" style="padding: 10px 4px; font-size: 13px; font-variant-numeric: tabular-nums;">${qty}</td>
          <td align="right" style="padding: 10px 0; font-size: 13px; font-weight: 700; color: #0f172a; font-variant-numeric: tabular-nums;">NT$ ${subtotal}</td>
        </tr>
      `;
    });

    const displayOrderId = parentOrderId.startsWith("#") ? parentOrderId : `#${parentOrderId}`;

    const contentHtml = `
      <p style="font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 0;">
        親愛的 <span style="color: #e11d48;">${escapeHtml(studentName)}</span> 同學 您好：
      </p>
      <p style="font-size: 14px; color: #475569; line-height: 1.7;">
        您的校慶客製化商品訂單已成功送達！工作人員將開始進行圖檔解析度核驗與排產前置作業。
      </p>

      <!-- 訂單資訊看板 -->
      <div style="background: #fff7ed; border-radius: 16px; padding: 18px 20px; border: 1px solid #fed7aa; margin: 18px 0;">
        <table width="100%" cellpadding="3" style="font-size: 13px; color: #475569;">
          <tr>
            <td width="30%"><strong>母訂單編號：</strong></td>
            <td style="font-size: 16px; font-weight: 900; color: #c2410c; font-family: monospace;">${escapeHtml(displayOrderId)}</td>
          </tr>
          <tr>
            <td><strong>訂購人班級：</strong></td>
            <td>${escapeHtml(studentClass)} (${studentSeat} 號)</td>
          </tr>
          <tr>
            <td><strong>印製備註：</strong></td>
            <td>${escapeHtml(notes || "無特殊備註")}</td>
          </tr>
        </table>
      </div>

      <!-- 商品明細表 -->
      <div style="border: 1px solid #f1f5f9; border-radius: 16px; padding: 16px; background: #fafafa; margin-bottom: 20px;">
        <table width="100%" cellspacing="0" cellpadding="0">
          <thead>
            <tr style="border-bottom: 2px solid #e2e8f0; font-size: 12px; color: #64748b;">
              <th align="left" style="padding-bottom: 8px;">品項規格</th>
              <th align="center" style="padding-bottom: 8px;" width="18%">數量</th>
              <th align="right" style="padding-bottom: 8px;" width="25%">小計</th>
            </tr>
          </thead>
          <tbody>
            ${itemsTableRows}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" align="right" style="padding-top: 14px; font-size: 14px; font-weight: 700; color: #475569;">訂單總金額：</td>
              <td align="right" style="padding-top: 14px; font-size: 18px; font-weight: 900; color: #e11d48; font-variant-numeric: tabular-nums;">
                NT$ ${totalAmount || 0}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- 取貨規範條款提醒 -->
      <div style="background: #f8fafc; border-radius: 14px; padding: 14px 18px; border: 1px dashed #cbd5e1; font-size: 12px; color: #64748b; line-height: 1.7;">
        ⚠️ <strong>重要叮嚀與取件流程：</strong><br>
        1. 派送組將於校慶日前送交三聯單並向您完成款項收訖，簽名後即代表完成確認契約。<br>
        2. 校慶當天一律憑第一聯【顧客付款與取貨憑證聯】或此 Email 至專屬攤位兌領商品。<br>
        3. 詳細規範請參閱 <a href="${NOTICE_URL}" target="_blank" style="color: #6366f1; font-weight: 700;">預購與退換貨規範須知</a>。
      </div>
    `;

    return wrapEmailTemplate({
      title: `【智光商工115校慶】訂購成功通知 - ${displayOrderId}`,
      badgeText: "📦 訂單成立確認",
      badgeColor: "#ea580c",
      contentHtml
    });
  }

  /**
   * 3. 審核進度通知信模板 (通過 / 退件待補)
   */
  function generateQcStatusUpdateTemplate(data) {
    const { orderId, studentName, productName, qcStatus, qcRejectedReason, reuploadUrl } = data;
    const isApproved = qcStatus === "審核通過" || qcStatus === "APPROVED";

    const statusBadge = isApproved
      ? `<div style="background: #ecfdf5; border: 1.5px solid #6ee7b7; color: #047857; padding: 12px 18px; border-radius: 14px; font-size: 15px; font-weight: 800; text-align: center; margin: 16px 0;">
           ✅ 圖檔 1080P 解析度核驗合格！已排入客製雷雕/印刷產線
         </div>`
      : `<div style="background: #fff1f2; border: 1.5px solid #fda4af; color: #be123c; padding: 14px 18px; border-radius: 14px; font-size: 14px; margin: 16px 0;">
           <strong style="font-size: 15px; display: block; margin-bottom: 4px;">⚠️ 圖檔審核不通過 (退件待補)</strong>
           退件理由：${escapeHtml(qcRejectedReason || "圖檔解析度不足 1080P 或比例不符，可能導致印製品顆粒模糊。")}
         </div>`;

    const actionButton = isApproved
      ? `<div style="text-align: center; margin: 24px 0;">
           <a href="${SHOP_URL}" target="_blank" style="display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; text-decoration: none; border-radius: 999px; font-weight: 800; font-size: 14px;">
             🔍 查看工單三軌進度
           </a>
         </div>`
      : `<div style="text-align: center; margin: 24px 0;">
           <a href="${reuploadUrl || SHOP_URL}" target="_blank" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #f43f5e, #e11d48); color: #ffffff; text-decoration: none; border-radius: 999px; font-weight: 800; font-size: 15px; box-shadow: 0 8px 20px rgba(225, 29, 72, 0.35);">
             📤 點此立即重新上傳高清圖檔
           </a>
           <p style="font-size: 12px; color: #94a3b8; margin-top: 8px;">依規範：請於 4 天內補傳圖檔，避免影響校慶製作時效</p>
         </div>`;

    const contentHtml = `
      <p style="font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 0;">
        親愛的 <span style="color: #e11d48;">${escapeHtml(studentName)}</span> 同學 您好：
      </p>
      <p style="font-size: 14px; color: #475569; line-height: 1.7;">
        您訂購的紀念品【<strong>${escapeHtml(productName)}</strong>】（工單號：<code>${escapeHtml(orderId)}</code>），美術技術組已完成審核作業。
      </p>

      ${statusBadge}

      ${actionButton}

      <div style="background: #f8fafc; border-radius: 12px; padding: 12px 16px; font-size: 12px; color: #64748b;">
        🎨 <strong>美術組貼心小提示：</strong><br>
        如果您需要生成高解析度圖檔，歡迎利用商城的【AI 1分鐘生圖教學】，內建日系、毛線、復古等熱門提示詞，輕鬆生成 1080P 高清圖檔！
      </div>
    `;

    return wrapEmailTemplate({
      title: `【智光商工115校慶】客製圖檔審查結果通知 - ${orderId}`,
      badgeText: isApproved ? "✨ 圖檔審核通過" : "⚠️ 圖檔退件提醒",
      badgeColor: isApproved ? "#059669" : "#e11d48",
      contentHtml
    });
  }

  /**
   * 4. 取貨憑證通知信模板 (包含高解析 QR Code / 條碼條)
   */
  function generatePickupPassTemplate(data) {
    const { orderId, parentOrderId, studentName, studentClass, productName, quantity = 1, pickupLocation } = data;
    const barcodeCode = orderId || parentOrderId;
    // 使用 Google Chart API 或可信任 QR Code 服務動態生成驗證 QR
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(barcodeCode)}&bgcolor=ffffff&color=0f172a&margin=6`;

    const contentHtml = `
      <p style="font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 0;">
        親愛的 <span style="color: #e11d48;">${escapeHtml(studentName)}</span> 同學 您好：
      </p>
      <p style="font-size: 14px; color: #475569; line-height: 1.7;">
        🎉 歡慶校慶！您預購的【<strong>${escapeHtml(productName)}</strong>】已全數製作並質檢包裝完畢！<br>
        校慶當日請攜帶本憑證或出示下方 QR Code，至指定攤位即可快速領取。
      </p>

      <!-- 取貨 QR 憑證卡片 -->
      <div style="background: linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%); border-radius: 20px; border: 2px dashed #38bdf8; padding: 24px; text-align: center; margin: 20px 0;">
        <span style="display: inline-block; padding: 4px 12px; background: #0284c7; color: #fff; font-size: 11px; font-weight: 800; border-radius: 999px; margin-bottom: 12px;">
          🎟️ 官方快速取貨通行證
        </span>
        <div style="background: #ffffff; display: inline-block; padding: 12px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); margin-bottom: 10px;">
          <img src="${qrCodeUrl}" width="160" height="160" alt="取貨條碼" style="display: block; border-radius: 8px;">
        </div>
        <div style="font-family: monospace; font-size: 18px; font-weight: 900; color: #0f172a; letter-spacing: 2px; margin-bottom: 8px;">
          ${escapeHtml(barcodeCode)}
        </div>
        <div style="font-size: 13px; color: #475569;">
          領取品項：<strong>${escapeHtml(productName)}</strong> (共 ${quantity} 件)<br>
          登記班級：<strong>${escapeHtml(studentClass)}</strong>
        </div>
      </div>

      <!-- 取件地點與指引 -->
      <div style="background: #fffbeb; border-radius: 14px; padding: 16px 20px; border: 1px solid #fde68a; font-size: 13px; color: #92400e; margin-bottom: 16px;">
        📍 <strong>指定領取攤位地點：</strong><br>
        <strong>${escapeHtml(pickupLocation || "智光商工 校慶園遊會 ‧ 資料處理科客製商品專屬攤位")}</strong><br>
        領貨時段：校慶當天上午 09:00 至 下午 15:30 止。
      </div>

      <div style="font-size: 12px; color: #94a3b8; text-align: center;">
        憑證備註：本憑證具唯一序號，一經現場掃碼領訖即完成核銷。
      </div>
    `;

    return wrapEmailTemplate({
      title: `【智光商工115校慶】紀念品已完工！專屬取貨憑證與 QR Code - ${barcodeCode}`,
      badgeText: "🎁 紀念品完工取貨通行證",
      badgeColor: "#0284c7",
      contentHtml
    });
  }

  /**
   * 統一對接 Google Apps Script 發信 API
   */
  async function sendEmailViaGas(action, toEmail, subject, htmlBody, extraPayload = {}) {
    if (!toEmail) {
      console.warn("[EmailService] 未提供收件者信箱，略過發信。");
      return { success: false, reason: "NO_EMAIL" };
    }

    const payload = {
      action: action,
      to: toEmail,
      subject: subject,
      htmlBody: htmlBody,
      timestamp: new Date().toISOString(),
      ...extraPayload
    };

    try {
      const response = await fetch(GAS_API_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
      console.log(`[EmailService] 郵件請求已排程送出 (Action: ${action}, To: ${toEmail})`);
      return { success: true };
    } catch (err) {
      console.error("[EmailService Send Error]", err);
      return { success: false, error: err.message };
    }
  }

  // 對外公開介面
  const EmailService = {
    // 模板生成器
    generateWelcomeMemberTemplate,
    generateOrderConfirmationTemplate,
    generateQcStatusUpdateTemplate,
    generatePickupPassTemplate,

    // 發信快捷方法
    async sendWelcomeMemberEmail(memberData) {
      const html = generateWelcomeMemberTemplate(memberData);
      return sendEmailViaGas("send_welcome_member", memberData.email, "【智光商工115校慶】會員帳號已成功啟用 🎉", html, memberData);
    },

    async sendOrderConfirmationEmail(orderData) {
      const html = generateOrderConfirmationTemplate(orderData);
      const displayOrderId = (orderData.parentOrderId || "").startsWith("#") ? orderData.parentOrderId : `#${orderData.parentOrderId}`;
      return sendEmailViaGas("send_order_confirmation", orderData.email, `【智光商工115校慶】訂購成功通知 - ${displayOrderId}`, html, orderData);
    },

    async sendQcStatusUpdateEmail(qcData) {
      const html = generateQcStatusUpdateTemplate(qcData);
      const isApproved = qcData.qcStatus === "審核通過" || qcData.qcStatus === "APPROVED";
      const subject = isApproved 
        ? `【智光商工115校慶】圖檔審核通過通知 - ${qcData.orderId}`
        : `【智光商工115校慶】圖檔退件通知 (需重新上傳) - ${qcData.orderId}`;
      return sendEmailViaGas("send_qc_update", qcData.email, subject, html, qcData);
    },

    async sendPickupPassEmail(pickupData) {
      const html = generatePickupPassTemplate(pickupData);
      const subject = `【智光商工115校慶】紀念品已完工！專屬取貨憑證與 QR Code - ${pickupData.orderId || pickupData.parentOrderId}`;
      return sendEmailViaGas("send_pickup_pass", pickupData.email, subject, html, pickupData);
    }
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = EmailService;
  } else {
    global.EmailService = EmailService;
  }
})(typeof window !== "undefined" ? window : globalThis);
