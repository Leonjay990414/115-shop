/**
 * 115校慶園遊會 - Excel 產線與財務總表匯出服務 (Excel Export Service)
 * 引用 SheetJS (xlsx) 將訂單轉換為標準試算表
 * 關鍵技術：圖檔欄位注入 `=HYPERLINK("${order.imageUrl}", "開啟高畫質原圖")` 公式，點擊即開原圖
 */

(function (global) {
  "use strict";

  /**
   * 匯出工單清單為 Excel (.xlsx) 檔案
   * @param {Array} ordersList 工單資料陣列
   * @param {string} fileName 匯出檔案名稱 (預設：115校慶園遊會_訂單生產總表.xlsx)
   */
  function exportOrdersToExcel(ordersList, fileName = "115校慶園遊會_訂單生產總表.xlsx") {
    if (!ordersList || !Array.isArray(ordersList) || ordersList.length === 0) {
      throw new Error("匯出失敗：工單清單不可為空！");
    }

    if (!global.XLSX) {
      throw new Error("匯出失敗：未偵測到 SheetJS (XLSX) 函式庫，請確認已載入 xlsx.full.min.js！");
    }

    // 1. 定義表頭欄位
    const headers = [
      "工單號 (Order ID)",
      "母單號 (Parent ID)",
      "三聯防偽號",
      "下單時間",
      "班級",
      "座號",
      "學號",
      "姓名",
      "商品品項",
      "單價",
      "數量",
      "小計金額",
      "審核狀態",
      "生產進度",
      "財務狀態",
      "顧客備註",
      "圖檔超連結 (點擊開啟原圖)"
    ];

    // 2. 建構二維資料列
    const dataRows = [headers];

    ordersList.forEach((order) => {
      const orderId = order.orderId || "--";
      const parentOrderId = order.parentOrderId || "--";
      const slipSerialNo = order.slipSerialNo || "--";
      const createdAt = order.createdAt ? (typeof order.createdAt === "string" ? order.createdAt : new Date(order.createdAt).toLocaleString("zh-TW")) : "--";
      const studentClass = order.studentClass || order.classCode || "--";
      const studentSeat = order.studentSeat || order.seatNumber || "--";
      const studentId = order.studentId || "--";
      const studentName = order.studentName || order.name || "--";
      const productName = order.productName || "--";
      const unitPrice = Number(order.unitPrice || 0);
      const quantity = Number(order.quantity || order.qty || 1);
      const subtotal = Number(order.subtotal || (unitPrice * quantity));
      const qcStatus = order.qcStatus || "待審核";
      const prodStatus = order.prodStatus || "待製作";
      const financeStatus = order.financeStatus || "未收款";
      const customerNotes = order.customerNotes || "無";
      const imageUrl = order.imageUrl || "";

      // 關鍵技術：圖檔超連結注入 Excel HYPERLINK 函數
      // 公式格式：=HYPERLINK("https://...", "開啟高畫質原圖")
      const formulaHyperlink = imageUrl 
        ? { f: `HYPERLINK("${imageUrl}", "開啟高畫質原圖")` }
        : "未上傳圖檔";

      dataRows.push([
        orderId,
        parentOrderId,
        slipSerialNo,
        createdAt,
        studentClass,
        studentSeat,
        studentId,
        studentName,
        productName,
        unitPrice,
        quantity,
        subtotal,
        qcStatus,
        prodStatus,
        financeStatus,
        customerNotes,
        formulaHyperlink
      ]);
    });

    // 3. 建立工作表 (Worksheet)
    const worksheet = global.XLSX.utils.aoa_to_sheet(dataRows);

    // 設定欄寬自適應
    worksheet["!cols"] = [
      { wch: 22 }, // 工單號
      { wch: 18 }, // 母單號
      { wch: 14 }, // 三聯防偽號
      { wch: 20 }, // 下單時間
      { wch: 12 }, // 班級
      { wch: 8 },  // 座號
      { wch: 12 }, // 學號
      { wch: 12 }, // 姓名
      { wch: 20 }, // 商品品項
      { wch: 10 }, // 單價
      { wch: 8 },  // 數量
      { wch: 12 }, // 小計金額
      { wch: 12 }, // 審核狀態
      { wch: 12 }, // 生產進度
      { wch: 12 }, // 財務狀態
      { wch: 22 }, // 顧客備註
      { wch: 24 }  // 圖檔超連結
    ];

    // 4. 建立活頁簿 (Workbook) 並寫入匯出
    const workbook = global.XLSX.utils.book_new();
    global.XLSX.utils.book_append_sheet(workbook, worksheet, "生產與財務總表");

    // 觸發瀏覽器下載檔案
    global.XLSX.writeFile(workbook, fileName);

    return {
      success: true,
      fileName,
      totalExported: ordersList.length,
      message: `✅ 已成功匯出 ${ordersList.length} 筆工單至 Excel！圖檔超連結公式已就緒。`
    };
  }

  // 匯出至全域
  const ExcelExportService = {
    exportOrdersToExcel
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = ExcelExportService;
  } else {
    global.ExcelExportService = ExcelExportService;
  }
})(typeof window !== "undefined" ? window : globalThis);
