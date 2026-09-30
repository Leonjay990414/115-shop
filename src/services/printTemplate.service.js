/**
 * 115校慶園遊會 - A4 專業三聯單與即時資料流套印服務 (Realtime Triple-Slip Print Service)
 * 核心標準：
 * 1. 物理 A4 尺寸剛性鎖定 (max-height: 286mm; 絕不溢頁跨頁)
 * 2. 簽名用印區域大幅拓寬 (高度 >= 36px, 長度 >= 180px, 上下獨立垂直間距排版)
 * 3. 上聯保留【取件蓋章戳印處】專用方框 (35mm x 35mm 灰色細虛線不遮擋文字)
 * 4. 三聯專屬欄位與權責劃分：
 *    - 第一聯【第一聯：顧客付款與取貨憑證聯】：金流狀態標註、顧客確認簽名、財務實收簽署、取件蓋章戳印處
 *    - 第二聯【第二聯：顧客收執留存聯】：載明客製化保障規範、顧客簽收簽名、外送派送員簽署、隨行財務員簽署
 *    - 第三聯【第三聯：主辦方行政核銷與總召留存聯】：會計編號、實收總額醒目化【紅字粗體 + NT$ + 中文大寫金額】、財務入帳簽署、外送派送員簽署、總召最終審定
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
        <!-- ① 上聯：第一聯：顧客付款與取貨憑證聯 -->
        <!-- ========================================== -->
        <div class="voucher-part part-top">
          <!-- 取貨用印專用方框 (35mm x 35mm) -->
          <div class="stamp-box">
            <span class="stamp-text">【取件蓋章戳印處】<br>(憑此聯取件驗收)</span>
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

          <!-- 簽名欄位：1. 顧客確認簽名 2. 財務實收簽署（右上方設有【取件蓋章戳印處】） -->
          <div class="signature-row-spacious">
            <div class="sig-group">
              <span class="sig-label">顧客確認簽名：</span>
              <div class="sig-line"></div>
            </div>
            <div class="sig-group">
              <span class="sig-label">財務實收簽署：</span>
              <div class="sig-line"></div>
            </div>
          </div>
          <div class="duty-footer">※ 本聯由顧客收執，憑此聯取貨時蓋章收回。</div>
        </div>

        <div class="tear-line"><span>✄ - - - - - 請沿虛線撕開 - - - - - ✄</span></div>

        <!-- ========================================== -->
        <!-- ② 中聯：第二聯：顧客收執留存聯 -->
        <!-- ========================================== -->
        <div class="voucher-part part-middle">
          <div class="part-header">
            <div>
              <span class="school-name">智光高級商工職業學校 115校慶園遊會</span>
              <span class="part-title">【第二聯：顧客收執留存聯】</span>
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
              <div><strong>客製工藝備註：</strong>${customNotes}</div>
              <div><strong>外送派送指引：</strong>派送組連同財務人員到班，當場核對無誤後完成簽收與收款。</div>
            </div>
            <div class="legal-box" style="flex:1;">
              <strong>客製化保障規範：</strong>客製化給付商品不適用7日鑑賞期；簽名後恕不接受退貨。憑此聯留存備查，保障權益。
            </div>
          </div>

          <!-- 各聯三方簽署：1. 顧客簽收簽名 2. 外送派送員簽署 3. 隨行財務員簽署 -->
          <div class="signature-row-spacious">
            <div class="sig-group">
              <span class="sig-label">顧客簽收簽名：</span>
              <div class="sig-line"></div>
            </div>
            <div class="sig-group">
              <span class="sig-label">外送派送員簽署：</span>
              <div class="sig-line"></div>
            </div>
            <div class="sig-group">
              <span class="sig-label">隨行財務員簽署：</span>
              <div class="sig-line"></div>
            </div>
          </div>
          <div class="duty-footer">※ 本聯由顧客永久留存存查，載明客製化保障規範。</div>
        </div>

        <div class="tear-line"><span>✄ - - - - - 請沿虛線撕開 - - - - - ✄</span></div>

        <!-- ========================================== -->
        <!-- ③ 下聯：第三聯：主辦方行政核銷與總召留存聯 -->
        <!-- ========================================== -->
        <div class="voucher-part part-bottom">
          <div class="part-header">
            <div>
              <span class="school-name">智光高級商工職業學校 115校慶園遊會</span>
              <span class="part-title">【第三聯：主辦方行政核銷與總召留存聯】</span>
            </div>
            <div class="header-right">
              <div><strong>會計編號：</strong><code>ACC-${serialNumber}</code></div>
              <div><strong>工單代碼：</strong><code>${orderId}</code></div>
              <div><strong>收款核銷日：</strong>____/____/____</div>
            </div>
          </div>

          <div class="info-grid">
            <div><strong>繳款學生：</strong>${studentName} (${studentId}) 所屬班級：${studentClass}</div>
            <div><strong>座號：</strong>${studentSeat} 號</div>
            <div><strong>核銷品項：</strong>${productName} x ${quantity} 防偽識別：${serialNumber}</div>
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
              <div><strong>行政核銷說明：</strong>本聯供園遊會主辦方總帳決算、各班拆單收益統計與全校行政查核留存。</div>
            </div>
          </div>

          <!-- 各聯三方簽署：1. 財務入帳簽署 2. 外送派送員簽署 3. 總召最終審定 -->
          <div class="signature-row-spacious">
            <div class="sig-group">
              <span class="sig-label">財務入帳簽署：</span>
              <div class="sig-line"></div>
            </div>
            <div class="sig-group">
              <span class="sig-label">外送派送員簽署：</span>
              <div class="sig-line"></div>
            </div>
            <div class="sig-group">
              <span class="sig-label">總召最終審定：</span>
              <div class="sig-line"></div>
            </div>
          </div>
          <div class="duty-footer">※ 現場收款完成後由主辦方帶回留存，列入正式大會帳務總決算。</div>
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
          <button class="print-btn" id="triggerPrintBtn" onclick="doPrintAction()">🖨️ 立即列印 (Ctrl + P 預覽)</button>
        </div>
        <div class="toolbar-spacer"></div>

        ${pagesHtml}

        <script>
          function notifyPrintDone() {
            try {
              if (window.opener && typeof window.opener.__onTripleVouchersPrinted === "function") {
                window.opener.__onTripleVouchersPrinted(${JSON.stringify(list.map(o => o.orderId || o.id))});
              }
            } catch (e) {
              console.warn("[PrintWindow] Opener notification warning:", e);
            }
          }

          function doPrintAction() {
            notifyPrintDone();
            window.print();
          }

          window.onafterprint = function() {
            notifyPrintDone();
          };
        </script>
      </body>
      </html>
    `;
  }

  /**
   * 彈出列印視窗並自動監控列印完成回調
   * @param {Array|Object} ordersData 訂單資料或陣列
   * @param {Function} [onPrintedCallback] 列印完成時之回調函式 (orderIds) => void
   */
  function printA4TripleVouchers(ordersData, onPrintedCallback) {
    const list = Array.isArray(ordersData) ? ordersData : [ordersData];
    const orderIds = list.map(o => o.orderId || o.id).filter(Boolean);

    // 註冊全域暫存監聽回呼，供彈出視窗跨窗通知
    let callbackExecuted = false;
    const executeCallback = () => {
      if (callbackExecuted) return;
      callbackExecuted = true;
      if (typeof onPrintedCallback === "function") {
        try {
          onPrintedCallback(orderIds);
        } catch (err) {
          console.error("[PrintTemplateService] Callback execution error:", err);
        }
      }
    };

    window.__onTripleVouchersPrinted = function(printedIds) {
      executeCallback();
    };

    const htmlContent = generateA4TripleVoucherHtml(ordersData);
    const printWindow = window.open("", "_blank", "width=880,height=960");
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();

      // 在父層亦綁定子視窗 onafterprint 或視窗關閉備用檢測
      try {
        printWindow.onafterprint = function() {
          executeCallback();
        };
      } catch (e) {}

      // 備用機制：當列印視窗被關閉或卸載時，若幹部已開啟並檢視完成亦觸發回調
      const timer = setInterval(() => {
        if (!printWindow || printWindow.closed) {
          clearInterval(timer);
          executeCallback();
        }
      }, 1000);
    } else {
      alert("彈出視窗被瀏覽器阻擋，請放行彈跳視窗後重試！");
    }
  }

  /**
   * 生成美術退件滿 4 天專屬「退貨通知憑證」HTML (單頁 A4 / 派送組線下傳遞)
   */
  function generateOverdueRejectNoticeHtml(ordersList) {
    const list = Array.isArray(ordersList) ? ordersList : [ordersList];

    const cardsHtml = list.map((order) => {
      const orderId = order.orderId || order.id || "--";
      const studentName = order.studentName || order.name || "--";
      const studentPhone = order.studentPhone || order.phone || "--";
      const studentClass = order.studentClass || order.classCode || "--";
      const studentSeat = order.studentSeat || order.seatNumber || "--";
      const studentId = order.studentId || "--";
      const productName = order.productName || "--";
      const quantity = order.quantity || 1;
      const subtotal = order.subtotal || (order.unitPrice ? order.unitPrice * quantity : 0);
      const createdAt = formatPrintTime(order.createdAt);
      const rejectReason = order.qcRejectReason || order.rejectReason || "圖檔解析度過低或內容不符印刷規範，逾期未補件";
      const rejectedAt = order.qcRejectedAt || order.rejectedAt ? formatPrintTime(order.qcRejectedAt || order.rejectedAt) : "超過 4 天未更換圖檔";

      return `
        <div class="overdue-slip-card">
          <div class="overdue-header">
            <div>
              <span class="school-title">智光高級商工職業學校 115校慶園遊會</span>
              <h2 class="voucher-title">⚠️ 客製化商品【退貨／逾期未補件通知憑證】</h2>
            </div>
            <div class="notice-badge">派送組線下送達聯</div>
          </div>

          <div class="overdue-warning-banner">
            <strong>重要提示：</strong>此工單因美術組圖審不通過且已<strong>逾期超過 4 日</strong>未於商城重新上傳合規圖檔，依園遊會生產排程規範進入退貨/退款程序。
          </div>

          <div class="overdue-info-grid">
            <div><strong>訂單編號：</strong><code>${orderId}</code></div>
            <div><strong>下單日期：</strong>${createdAt}</div>
            <div><strong>班級座號：</strong>${studentClass} (${studentSeat} 號)</div>
            <div><strong>訂購人姓名：</strong>${studentName} (學號：${studentId})</div>
            <div><strong>聯絡電話：</strong>${studentPhone}</div>
            <div><strong>預購品項：</strong>${productName} x ${quantity} (金額：NT$ ${subtotal})</div>
          </div>

          <div class="overdue-reason-box">
            <span class="reason-title">🎨 美術組退件審核理由與歷程：</span>
            <p class="reason-content">${rejectReason}</p>
            <span class="reason-time">退件註記時間：${rejectedAt}</span>
          </div>

          <div class="overdue-instructions">
            <strong>📋 後續處理指示：</strong><br>
            1. 請外送/派送組同學將本通知單親送至收件人班級教室交由訂購人簽收。<br>
            2. 若訂購人已於現場繳費，請持本通知單與原顧客第一聯至大會【財務組】辦理現金退費。<br>
            3. 若有任何疑義，請洽校慶資料處理科客製商品專案總召組。
          </div>

          <div class="overdue-signature-row">
            <div class="sig-item">
              <span>派送組送達簽名：</span>
              <div class="sig-line"></div>
            </div>
            <div class="sig-item">
              <span>訂購人簽收確認：</span>
              <div class="sig-line"></div>
            </div>
            <div class="sig-item">
              <span>財務退費簽收：</span>
              <div class="sig-line"></div>
            </div>
          </div>
        </div>
      `;
    }).join("");

    return `
      <!DOCTYPE html>
      <html lang="zh-TW">
      <head>
        <meta charset="UTF-8">
        <title>美術退件逾期退貨通知單</title>
        <style>
          @page { size: A4 portrait; margin: 8mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang TC", sans-serif; }
          body { background: #f1f5f9; padding: 10px; color: #0f172a; }
          .print-bar {
            position: fixed; top: 0; left: 0; width: 100%;
            background: #b91c1c; color: #fff; padding: 10px 20px;
            display: flex; justify-content: space-between; align-items: center; z-index: 9999;
          }
          .print-btn {
            background: #fff; color: #b91c1c; border: none; padding: 6px 16px;
            border-radius: 6px; font-weight: 800; cursor: pointer;
          }
          .overdue-slip-card {
            width: 190mm; min-height: 125mm; max-height: 135mm;
            background: #fff; border: 2px solid #b91c1c; border-radius: 8px;
            padding: 5mm 6mm; margin: 15px auto; page-break-inside: avoid;
            display: flex; flex-direction: column; justify-content: space-between;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          .overdue-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1.5px solid #b91c1c; padding-bottom: 3mm; }
          .school-title { font-size: 11px; color: #64748b; font-weight: 700; display: block; }
          .voucher-title { font-size: 15px; color: #b91c1c; font-weight: 900; }
          .notice-badge { background: #fee2e2; color: #b91c1c; border: 1px solid #ef4444; border-radius: 4px; padding: 3px 8px; font-size: 11px; font-weight: 800; }
          .overdue-warning-banner { background: #fef2f2; border-left: 4px solid #ef4444; padding: 2.5mm 3.5mm; font-size: 10.5px; color: #991b1b; margin: 2.5mm 0; }
          .overdue-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm 4mm; font-size: 10.5px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 2.5mm; }
          .overdue-reason-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 2.5mm 3.5mm; margin: 2mm 0; }
          .reason-title { font-size: 10px; font-weight: 800; color: #b45309; display: block; }
          .reason-content { font-size: 11px; font-weight: 700; color: #92400e; margin: 2px 0; }
          .reason-time { font-size: 9px; color: #78350f; }
          .overdue-instructions { font-size: 10px; color: #475569; line-height: 1.35; }
          .overdue-signature-row { display: flex; justify-content: space-between; gap: 4mm; border-top: 1px solid #e2e8f0; padding-top: 2.5mm; margin-top: 2mm; }
          .sig-item { flex: 1; font-size: 9.5px; font-weight: 700; }
          .sig-line { width: 100%; height: 26px; border-bottom: 1.5px dashed #475569; }
          @media print {
            .print-bar { display: none !important; }
            body { background: #fff !important; padding: 0 !important; }
            .overdue-slip-card { margin: 0 auto 10mm !important; box-shadow: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="print-bar">
          <strong>美術退件滿 4 天【退貨通知單】列印版型 (共 ${list.length} 張)</strong>
          <button class="print-btn" onclick="window.print()">🖨️ 立即列印退貨通知單</button>
        </div>
        <div style="height: 45px;"></div>
        ${cardsHtml}
      </body>
      </html>
    `;
  }

  function printOverdueRejectNotices(ordersData) {
    const htmlContent = generateOverdueRejectNoticeHtml(ordersData);
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
    generateOverdueRejectNoticeHtml,
    printOverdueRejectNotices,
    subscribeRealtimeOrders
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = PrintTemplateService;
  } else {
    global.PrintTemplateService = PrintTemplateService;
  }
})(typeof window !== "undefined" ? window : globalThis);
