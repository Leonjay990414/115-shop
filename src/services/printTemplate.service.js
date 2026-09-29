/**
 * 115校慶園遊會 - A4 專業三聯單與即時資料流套印服務 (Realtime Triple-Slip Print Service)
 * 核心標準：
 * 1. 物理 A4 尺寸剛性鎖定 (max-height: 286mm; 絕不溢頁跨頁)
 * 2. 簽名用印區域大幅拓寬 (高度 >= 36px, 長度 >= 180px, 上下獨立垂直間距排版)
 * 3. 上聯新增【取件戳印處】專用方框 (35mm x 35mm 灰色細虛線不遮擋文字)
 * 4. 三聯專屬欄位與權責劃分：
 *    - 上聯【顧客付款與取貨憑證聯】：金流狀態標註、顧客確認簽名、財務實收簽署、取件用印框
 *    - 中聯【行政管考與派送存查聯】：加工備註、圖檢員、精簡為雙人簽章【商品製作合格簽署】、【外送組派送簽收】
 *    - 下聯【財務結算與總召留存聯】：會計編號、實收總額醒目化【紅字粗體 + NT$ + 中文大寫金額】、【財務入帳簽署】、【總召最終審定】
 * 5. 即時資料流對接 (onSnapshot)：支援後台圖審或金流變更 0.3 秒無感響應
 */

(function (global) {
  "use strict";

  /**
   * 中文數字大寫轉換器 (例：300 -> 參佰元整，150 -> 壹佰伍拾元整)
   */
  function numberToArabicChinese(num) {
    const n = Math.floor(Number(num) || 0);
    if (n === 0) return "零元整";
    const digits = ["零", "壹", "貳", "參", "肆", "伍", "陸", "柒", "捌", "玖"];
    const units = ["", "拾", "佰", "仟", "萬", "拾萬", "佰萬"];

    let strNum = String(n);
    let result = "";
    const len = strNum.length;

    for (let i = 0; i < len; i++) {
      const digit = parseInt(strNum[i], 10);
      const unitIndex = len - i - 1;
      if (digit !== 0) {
        result += digits[digit] + (units[unitIndex] || "");
      } else {
        if (!result.endsWith("零") && unitIndex > 0) {
          result += "零";
        }
      }
    }
    result = result.replace(/零+$/, "");
    return result + "元整";
  }

  /**
   * 標準精準時間格式化
   */
  function formatPrintTime(dateInput) {
    if (!dateInput) return "--";
    let dateObj;
    if (typeof dateInput.toDate === "function") {
      dateObj = dateInput.toDate();
    } else {
      dateObj = new Date(dateInput);
    }
    if (isNaN(dateObj.getTime())) return String(dateInput);

    const pad = (n) => String(n).padStart(2, "0");
    const y = dateObj.getFullYear();
    const m = pad(dateObj.getMonth() + 1);
    const d = pad(dateObj.getDate());
    const hh = pad(dateObj.getHours());
    const mm = pad(dateObj.getMinutes());
    const ss = pad(dateObj.getSeconds());
    return `${y}/${m}/${d} ${hh}:${mm}:${ss}`;
  }

  /**
   * 生成單頁 A4 剛性三聯單 HTML 頁面內容 (包含拓寬簽名區與取件方章框)
   */
  function generateSingleA4PageHtml(order) {
    const orderId = order.orderId || order.id || "--";
    const serialNumber = order.slipSerialNo || order.serialNumber || `TR-${String(orderId).slice(-4)}`;
    const createdAt = formatPrintTime(order.createdAt);
    const approvedAt = order.approvedAt ? formatPrintTime(order.approvedAt) : null;
    const studentName = order.studentName || order.name || "--";
    const studentPhone = order.studentPhone || order.phone || "--";
    const studentClass = order.studentClass || order.classCode || "--";
    const studentSeat = order.studentSeat || order.seatNumber || "--";
    const studentId = order.studentId || "--";

    const productName = order.productName || "--";
    const quantity = Number(order.quantity || order.qty || 1);
    const unitPrice = Number(order.unitPrice || 0);
    const subtotal = Number(order.subtotal || (unitPrice * quantity));
    const customerNotes = order.customerNotes || order.orderNotes || "無特殊備註";
    const customNotes = order.customNotes || "依圖檔高解析全彩印製";
    const qcReviewer = order.qcReviewer || "admin_art_core (美術審核組)";

    // 金流狀態判斷
    const isPaid = order.financeStatus === "已收款" || order.financeStatus === "PAID";
    const financeStatusBadge = isPaid 
      ? '<span style="color:#15803d; font-weight:800;">【✅ 財務已收款核銷】</span>'
      : '<span style="color:#b45309; font-weight:800;">【⏳ 待收款（以財務實收簽章為憑）】</span>';

    // 中文大寫金額
    const chineseAmount = numberToArabicChinese(subtotal);

    return `
      <div class="a4-page">
        <!-- ========================================== -->
        <!-- ① 上聯：顧客付款與取貨憑證聯 -->
        <!-- ========================================== -->
        <div class="voucher-part part-top">
          <!-- 取貨用印專用方框 (35mm x 35mm) -->
          <div class="stamp-box">
            <span class="stamp-text">【取件戳印處】<br>(憑此聯取件蓋章)</span>
          </div>

          <div class="part-header" style="padding-right: 38mm;">
            <div>
              <span class="school-name">智光高級商工職業學校 115校慶園遊會</span>
              <span class="part-title">【第一聯：顧客付款與取貨憑證聯】</span>
            </div>
            <div class="header-right">
              <div><strong>訂單編號：</strong><code>${orderId}</code></div>
              <div><strong>防偽序號：</strong><code>${serialNumber}</code></div>
              <div><strong>下單時間：</strong>${createdAt}</div>
            </div>
          </div>

          <div class="info-grid" style="margin-right: 38mm;">
            <div><strong>班級：</strong>${studentClass}</div>
            <div><strong>座號：</strong>${studentSeat} 號</div>
            <div><strong>學號：</strong>${studentId}</div>
            <div><strong>訂購人：</strong>${studentName}</div>
            <div><strong>電話：</strong>${studentPhone}</div>
          </div>

          <table class="item-table">
            <thead>
              <tr>
                <th style="width: 45%; text-align: left;">客製商品品項</th>
                <th style="width: 15%; text-align: center;">單價</th>
                <th style="width: 15%; text-align: center;">訂購數量</th>
                <th style="width: 25%; text-align: right;">應付金額</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="text-align: left;"><strong>${productName}</strong></td>
                <td style="text-align: center;">NT$ ${unitPrice}</td>
                <td style="text-align: center;">${quantity} 件</td>
                <td style="text-align: right; font-weight: 800;">NT$ ${subtotal}</td>
              </tr>
            </tbody>
          </table>

          <div class="notes-legal-row">
            <div class="notes-box">
              <div><strong>客製備註：</strong>${customerNotes}</div>
              <div><strong>金流狀態：</strong>${financeStatusBadge}</div>
            </div>
            <div class="legal-box">
              <strong>權益宣告：</strong>客製化給付商品不適用7日鑑賞期，憑此聯至班級外送或攤位取件核銷。
            </div>
          </div>

          <!-- 拓寬簽名區 (高度 >= 36px, 長度 >= 180px) -->
          <div class="signature-row-spacious">
            <div class="sig-group">
              <span class="sig-label">顧客確認簽名：</span>
              <div class="sig-line"></div>
            </div>
            <div class="sig-group">
              <span class="sig-label">財務實收簽署：</span>
              <div class="sig-line"></div>
            </div>
          <div class="duty-footer">※ 請妥善保存本聯，校慶當日請持本憑證至大會現場攤位驗章取貨；客製商品專屬訂製，無退換貨服務。</div>
        </div>

        <div class="tear-line"><span>✂ - - - - - - - - - - - - - 請沿虛線撕開 - - - - - - - - - - - - - ✂</span></div>

        <!-- ========================================== -->
        <!-- ② 中聯：行政管考與派送存查聯 -->
        <!-- ========================================== -->
        <div class="voucher-part part-middle">
          <div class="part-header">
            <div>
              <span class="school-name">智光高級商工職業學校 115校慶園遊會</span>
              <span class="part-title">【第二聯：行政管考與派送存查聯】</span>
            </div>
            <div class="header-right">
              <div><strong>工單編號：</strong><code>${orderId}</code></div>
              <div><strong>流水號：</strong><code>${serialNumber}</code></div>
              <div><strong>下單時間：</strong>${createdAt}</div>
            </div>
          </div>

          <div class="info-grid">
            <div><strong>班級：</strong>${studentClass}</div>
            <div><strong>座號：</strong>${studentSeat} 號</div>
            <div><strong>學號：</strong>${studentId}</div>
            <div><strong>訂購人：</strong>${studentName}</div>
            <div><strong>電話：</strong>${studentPhone}</div>
          </div>

          <table class="item-table">
            <thead>
              <tr>
                <th style="width: 35%; text-align: left;">製作品項</th>
                <th style="width: 25%; text-align: center;">圖檔審查檢驗員</th>
                <th style="width: 15%; text-align: center;">數量</th>
                <th style="width: 25%; text-align: right;">款項小計</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="text-align: left;"><strong>${productName}</strong></td>
                <td style="text-align: center; color: #1e40af;"><strong>${qcReviewer}</strong>${approvedAt ? '<br><small style="color:#64748b;">(' + approvedAt + ')</small>' : ''}</td>
                <td style="text-align: center;">${quantity} 件</td>
                <td style="text-align: right; font-weight: 800;">NT$ ${subtotal}</td>
              </tr>
            </tbody>
          </table>

          <div class="notes-legal-row">
            <div class="notes-box" style="flex:1;">
              <div><strong>加工工藝備註：</strong>${customNotes}</div>
              <div><strong>外送管考指示：</strong>依班級座號親送至收件人教室，核對無誤後請代收幹部簽收。</div>
            </div>
          </div>

          <!-- 精簡為 2 個關鍵負責人拓寬簽章欄 -->
          <div class="signature-row-spacious">
            <div class="sig-group">
              <span class="sig-label">商品製作合格簽署：</span>
              <div class="sig-line"></div>
            </div>
            <div class="sig-group">
              <span class="sig-label">外送組派送簽收：</span>
              <div class="sig-line"></div>
            </div>
          </div>
          <div class="duty-footer">※ 本聯由行政與外送物流組留存，派送完成後存查歸檔。</div>
        </div>

        <div class="tear-line"><span>✂ - - - - - - - - - - - - - 請沿虛線撕開 - - - - - - - - - - - - - ✂</span></div>

        <!-- ========================================== -->
        <!-- ③ 下聯：財務結算與總召留存聯 -->
        <!-- ========================================== -->
        <div class="voucher-part part-bottom">
          <div class="part-header">
            <div>
              <span class="school-name">智光高級商工職業學校 115校慶園遊會</span>
              <span class="part-title">【第三聯：財務結算與總召留存聯】</span>
            </div>
            <div class="header-right">
              <div><strong>會計編號：</strong><code>ACC-${serialNumber}</code></div>
              <div><strong>工單代碼：</strong><code>${orderId}</code></div>
              <div><strong>收款預留日：</strong>____/____/____</div>
            </div>
          </div>

          <div class="info-grid">
            <div><strong>繳款學生：</strong>${studentName} (${studentId})</div>
            <div><strong>所屬班級：</strong>${studentClass}</div>
            <div><strong>座號：</strong>${studentSeat} 號</div>
            <div><strong>核銷品項：</strong>${productName} x ${quantity}</div>
            <div><strong>防偽識別：</strong><code>${serialNumber}</code></div>
          </div>

          <!-- 實收總額醒目化：紅字粗體 + NT$ + 中文大寫金額 -->
          <div class="finance-amount-banner">
            <div class="amount-left">
              <span class="label">實收核銷總額：</span>
              <span class="amount-highlight">NT$ ${subtotal}</span>
            </div>
            <div class="amount-right">
              <span class="chinese-label">國字大寫：</span>
              <span class="chinese-amount">${chineseAmount}</span>
            </div>
          </div>

          <div class="notes-legal-row" style="margin-top: 1.5mm;">
            <div class="notes-box" style="flex:1;">
              <div><strong>財務核銷說明：</strong>本聯供園遊會總帳決算、各班拆單收益統計與全校查核留存。</div>
            </div>
          </div>

          <!-- 財務與總召拓寬簽署欄 -->
          <div class="signature-row-spacious">
            <div class="sig-group">
              <span class="sig-label">財務入帳簽署：</span>
              <div class="sig-line"></div>
            </div>
            <div class="sig-group">
              <span class="sig-label">總召最終審定：</span>
              <div class="sig-line"></div>
            </div>
          </div>
          <div class="duty-footer">※ 本聯由大會財務組與總召留存，列入正式大會帳務總決算。</div>
        </div>
      </div>
    `;
  }

  /**
   * 生成支援多工單連續列印的完整 HTML 檔案 (包含列印專用樣式)
   */
  function generateA4TripleVoucherHtml(ordersList) {
    const list = Array.isArray(ordersList) ? ordersList : [ordersList];
    const pagesHtml = list.map(order => generateSingleA4PageHtml(order)).join("");

    return `
      <!DOCTYPE html>
      <html lang="zh-TW">
      <head>
        <meta charset="UTF-8">
        <title>115校慶園遊會 - A4專業三聯確認單 (零跑版)</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 4mm 6mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang TC", "Microsoft JhengHei", sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body {
            background: #e2e8f0;
            color: #0f172a;
            padding: 0;
            margin: 0;
          }

          /* 物理 A4 尺寸剛性鎖定 */
          .a4-page {
            width: 198mm;
            height: 286mm;
            max-height: 286mm;
            margin: 10px auto;
            background: #fff;
            padding: 2mm 3.5mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            overflow: hidden;
            page-break-after: always;
            box-shadow: 0 4px 15px rgba(0,0,0,0.15);
          }

          /* 每一聯緊湊鎖定在 90mm 內 */
          .voucher-part {
            height: 90mm;
            max-height: 90mm;
            border: 1.5px solid #1e293b;
            border-radius: 4px;
            padding: 2.5mm 3.5mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            font-size: 10.5px;
            line-height: 1.2;
            background: #fff;
            position: relative;
            overflow: hidden;
          }

          /* 上聯取貨用印專用框 (35mm x 35mm) */
          .stamp-box {
            position: absolute;
            top: 2.5mm;
            right: 3.5mm;
            width: 35mm;
            height: 35mm;
            border: 1.2px dashed #94a3b8;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            background: rgba(248, 250, 252, 0.6);
            z-index: 10;
          }
          .stamp-text {
            font-size: 8.5px;
            color: #94a3b8;
            line-height: 1.3;
            letter-spacing: 0.5px;
            font-weight: 600;
          }

          /* 撕刀虛線 */
          .tear-line {
            height: 4mm;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #64748b;
            font-size: 9px;
            letter-spacing: 1px;
            user-select: none;
          }

          .part-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 1.2px solid #0f172a;
            padding-bottom: 1mm;
          }
          .school-name {
            font-size: 10.5px;
            font-weight: 700;
            color: #334155;
            display: block;
          }
          .part-title {
            font-size: 13px;
            font-weight: 900;
            color: #0f172a;
            display: block;
            margin-top: 1px;
          }
          .header-right {
            text-align: right;
            font-size: 9px;
            color: #334155;
            line-height: 1.2;
          }
          .header-right code {
            font-family: ui-monospace, monospace;
            font-weight: 700;
            color: #0f172a;
          }

          .info-grid {
            display: grid;
            grid-template-columns: 1.1fr 0.8fr 1.1fr 1.1fr 1.4fr;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            padding: 1.2mm 2mm;
            font-size: 9.5px;
            gap: 2px;
            margin-top: 1mm;
          }
          .info-grid > div {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .item-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 1mm;
            font-size: 10px;
          }
          .item-table th, .item-table td {
            border: 1px solid #64748b;
            padding: 1.2mm 2mm;
          }
          .item-table th {
            background: #f1f5f9;
            font-weight: 800;
            color: #1e293b;
          }

          .notes-legal-row {
            display: flex;
            gap: 2mm;
            margin-top: 1mm;
            font-size: 9px;
          }
          .notes-box {
            flex: 1.4;
            border: 1px dashed #cbd5e1;
            padding: 1.2mm 2mm;
            background: #fcfcfc;
            line-height: 1.2;
          }
          .legal-box {
            flex: 1;
            border: 1px solid #e2e8f0;
            padding: 1.2mm 2mm;
            background: #fffbeb;
            color: #92400e;
            line-height: 1.2;
          }

          /* 下聯財務醒目紅字總額橫幅 */
          .finance-amount-banner {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #fef2f2;
            border: 1.2px solid #fecaca;
            border-radius: 4px;
            padding: 1.5mm 3mm;
            margin-top: 1.2mm;
          }
          .amount-highlight {
            color: #d90429;
            font-weight: 900;
            font-size: 15px;
            font-family: ui-monospace, monospace;
          }
          .chinese-amount {
            color: #b91c1c;
            font-weight: 800;
            font-size: 13.5px;
            letter-spacing: 0.5px;
          }

          /* 簽名用印區域大幅拓寬 (高度 >= 36px, 長度 >= 180px) */
          .signature-row-spacious {
            display: flex;
            justify-content: space-between;
            gap: 5mm;
            margin-top: 1.5mm;
            border-top: 1px solid #e2e8f0;
            padding-top: 1.5mm;
          }
          .sig-group {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .sig-label {
            font-size: 10px;
            font-weight: 800;
            color: #1e293b;
          }
          .sig-line {
            width: 100%;
            min-width: 180px;
            height: 36px;
            border-bottom: 1.5px dashed #334155;
            background: rgba(241, 245, 249, 0.3);
          }

          .duty-footer {
            text-align: right;
            font-size: 8px;
            color: #64748b;
            margin-top: 1px;
          }

          /* 頂部列印操作條 */
          .print-toolbar {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            background: #0f172a;
            color: #fff;
            padding: 8px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          }
          .print-btn {
            background: #2563eb;
            color: #fff;
            border: none;
            padding: 8px 18px;
            border-radius: 6px;
            font-weight: 700;
            font-size: 13px;
            cursor: pointer;
          }
          .toolbar-spacer { height: 48px; }

          @media print {
            .print-toolbar, .toolbar-spacer { display: none !important; }
            body { background: #fff !important; }
            .a4-page {
              margin: 0 auto !important;
              box-shadow: none !important;
              page-break-after: always !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="print-toolbar">
          <div>
            <strong>115校慶園遊會 A4專業三聯單系統 (拓寬簽名與取件方章)</strong>
            <span style="color: #94a3b8; font-size: 12px; margin-left: 10px;">總頁數：${list.length} 頁 (每頁對應一項商品)</span>
          </div>
          <button class="print-btn" onclick="window.print()">🖨️ 立即列印 (Ctrl + P 預覽)</button>
        </div>
        <div class="toolbar-spacer"></div>

        ${pagesHtml}
      </body>
      </html>
    `;
  }

  /**
   * 彈出列印視窗
   */
  function printA4TripleVouchers(ordersData) {
    const htmlContent = generateA4TripleVoucherHtml(ordersData);
    const printWindow = window.open("", "_blank", "width=880,height=960");
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
    } else {
      alert("彈出視窗被瀏覽器阻擋，請放行彈跳視窗後重試！");
    }
  }

  /**
   * 建立即時工單監聽管道 (Realtime Order Streaming Pipeline)
   * @param {Object} db Firestore 實例
   * @param {Function} onUpdateCallback 收到變更時之回呼函式
   */
  function subscribeRealtimeOrders(db, onUpdateCallback) {
    if (!db) throw new Error("db 實例不可為空");

    return db.collection("orders")
      .orderBy("createdAt", "desc")
      .onSnapshot(
        (snapshot) => {
          const ordersList = [];
          snapshot.forEach((doc) => {
            ordersList.push({
              id: doc.id,
              ...doc.data()
            });
          });
          if (typeof onUpdateCallback === "function") {
            onUpdateCallback(ordersList);
          }
        },
        (error) => {
          console.error("[PrintTemplateService] 即時工單串流異常：", error);
        }
      );
  }

  // 匯出至全域
  const PrintTemplateService = {
    numberToArabicChinese,
    formatPrintTime,
    generateA4TripleVoucherHtml,
    printA4TripleVouchers,
    subscribeRealtimeOrders
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = PrintTemplateService;
  } else {
    global.PrintTemplateService = PrintTemplateService;
  }
})(typeof window !== "undefined" ? window : globalThis);
