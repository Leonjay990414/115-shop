/**
 * 115校慶園遊會 - 工單有限狀態機與時程管理服務 (Order FSM & Timeline Service)
 * 核心營運時程：
 * 1. 審核通過 (approveQcOrder)：工單標記為「待產線排印 (READY_FOR_PRODUCTION)」，移除 3 天倒數限制，供製作組於校慶前依品項統一批次製作
 * 2. 審核退件 (rejectQcOrder)：記錄 rejectedReason 與 rejectedAt 時間戳
 * 3. 逾期退件警報查詢 (getOverdueRejectedOrders)：當退件時間超過 4 天且尚未補件，自動標記 requirePhysicalNotice: true，供外送組列印實體催單單據
 */

(function (global) {
  "use strict";

  const FSM_QC_STATUS = {
    PENDING: "待審核",
    APPROVED: "審核通過",
    REJECTED: "退件待補"
  };

  /**
   * 1. 審核通過 (APPROVE_QC)
   * 審核通過後，工單直接標記為「待產線排印 (READY_FOR_PRODUCTION)」，供製作組於校慶前依品項批次製作
   * @param {Object} db Firestore 實例
   * @param {string} orderId 工單編號
   * @param {string} reviewerStaffId 審核人帳號
   */
  async function approveQcOrder(db, orderId, reviewerStaffId = "admin_art_core") {
    if (!db) throw new Error("db 實例不可為空");
    if (!orderId) throw new Error("工單編號不可為空");

    const orderDocRef = db.collection("orders").doc(orderId);
    const snap = await orderDocRef.get();
    if (!snap.exists) {
      throw new Error(`查無工單【${orderId}】！`);
    }

    const now = new Date();

    const updatePayload = {
      qcStatus: FSM_QC_STATUS.APPROVED,
      prodStatus: "待產線排印",
      qcReviewer: reviewerStaffId,
      approvedAt: now.toISOString(),
      qcRejectedReason: null,
      requirePhysicalNotice: false
    };

    await orderDocRef.update(updatePayload);

    return {
      success: true,
      orderId,
      approvedAt: updatePayload.approvedAt,
      message: `✅ 工單【${orderId}】已審核通過！已標記為「待產線排印」，納入校慶前批次排程。`
    };
  }

  /**
   * 2. 審核退件 (REJECT_QC)
   */
  async function rejectQcOrder(db, orderId, reason, reviewerStaffId = "admin_art_core") {
    if (!db) throw new Error("db 實例不可為空");
    if (!orderId) throw new Error("工單編號不可為空");
    if (!reason || !reason.trim()) {
      throw new Error("退件必須填寫原因（如：解析度嚴重不足、尺寸比例錯誤）！");
    }

    const orderDocRef = db.collection("orders").doc(orderId);
    const snap = await orderDocRef.get();
    if (!snap.exists) {
      throw new Error(`查無工單【${orderId}】！`);
    }

    const now = new Date();
    const updatePayload = {
      qcStatus: FSM_QC_STATUS.REJECTED,
      prodStatus: "退件暫停",
      qcReviewer: reviewerStaffId,
      qcRejectedReason: reason.trim(),
      rejectedAt: now.toISOString(),
      requirePhysicalNotice: false
    };

    await orderDocRef.update(updatePayload);

    return {
      success: true,
      orderId,
      rejectedAt: updatePayload.rejectedAt,
      reason: updatePayload.qcRejectedReason,
      message: `⚠️ 工單【${orderId}】已標記退件！原因：${updatePayload.qcRejectedReason}`
    };
  }

  /**
   * 3. 逾期退件警報查詢 (4 天逾期催單檢測)
   */
  async function getOverdueRejectedOrders(db) {
    if (!db) throw new Error("db 實例不可為空");

    const fourDaysAgo = new Date(Date.now() - (4 * 24 * 60 * 60 * 1000));
    const snapshot = await db.collection("orders")
      .where("qcStatus", "==", FSM_QC_STATUS.REJECTED)
      .get();

    const overdueList = [];
    const batch = db.batch();
    let needCommit = false;

    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.rejectedAt) {
        const rejectedDate = new Date(data.rejectedAt);
        if (rejectedDate < fourDaysAgo) {
          overdueList.push({ id: doc.id, ...data });
          if (!data.requirePhysicalNotice) {
            batch.update(doc.ref, { requirePhysicalNotice: true });
            needCommit = true;
          }
        }
      }
    });

    if (needCommit) {
      await batch.commit();
    }

    return overdueList;
  }

  // 匯出全域物件
  global.OrderFsmService = {
    FSM_QC_STATUS,
    approveQcOrder,
    rejectQcOrder,
    getOverdueRejectedOrders
  };

})(typeof window !== "undefined" ? window : global);
