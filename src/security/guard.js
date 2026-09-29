/**
 * 115校慶園遊會 - RBAC 權限控管與資料脫敏引擎 (Security & Data Masking Guard)
 */

export const USER_ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",     // 總召
  FINANCE: "FINANCE",             // 財務組
  QC_REVIEWER: "QC_REVIEWER",     // 美術審核組
  PRODUCTION: "PRODUCTION",       // 產線製作組
  LOGISTICS: "LOGISTICS",         // 外送物流組
  STUDENT: "STUDENT"              // 學生/客戶端
};

export class SecurityGuard {
  /**
   * 根據操作者角色對單一工單執行「資料欄位脫敏 (Data Masking)」
   * @param {Object} workOrder 原始工單
   * @param {String} role 操作者角色
   * @returns {Object} 脫敏保護後工單物件
   */
  static maskWorkOrder(workOrder, role) {
    if (!workOrder) return null;
    const cloned = JSON.parse(JSON.stringify(workOrder));

    switch (role) {
      case USER_ROLES.SUPER_ADMIN:
        // 總召：完全解鎖，不作任何遮蔽
        return cloned;

      case USER_ROLES.FINANCE:
        // 財務組：解鎖金額、收款狀態，美術與外送唯讀
        return {
          ...cloned,
          asset_pipeline: {
            ...cloned.asset_pipeline,
            raw_image_url: "[FINANCE_PREVIEW_ONLY]"
          }
        };

      case USER_ROLES.QC_REVIEWER:
        // 美術組：解鎖圖檔連結、解析度數據；學生電話與金額遮蔽
        if (cloned.student_snapshot) {
          cloned.student_snapshot.phone = "***-***-****";
        }
        if (cloned.product_spec) {
          cloned.product_spec.unit_price = "***";
          cloned.product_spec.subtotal = "***";
        }
        return cloned;

      case USER_ROLES.PRODUCTION:
        // 產線製作：解鎖圖檔下載與印製狀態；個資電話、座號、金額全面遮蔽
        if (cloned.student_snapshot) {
          cloned.student_snapshot.name = `學生_${cloned.student_ref.slice(-3)}`;
          cloned.student_snapshot.seat_number = "**";
          cloned.student_snapshot.phone = "**********";
        }
        if (cloned.product_spec) {
          cloned.product_spec.unit_price = "***";
          cloned.product_spec.subtotal = "***";
        }
        return cloned;

      case USER_ROLES.LOGISTICS:
        // 外送物流：解鎖班級、座號、姓名；電話動態脫敏 (09****1234)；金額與圖檔遮蔽
        if (cloned.student_snapshot && cloned.student_snapshot.phone) {
          const p = cloned.student_snapshot.phone;
          cloned.student_snapshot.phone = p.length >= 10 ? `${p.slice(0, 2)}******${p.slice(-2)}` : "**********";
        }
        if (cloned.product_spec) {
          cloned.product_spec.unit_price = "***";
          cloned.product_spec.subtotal = "***";
        }
        delete cloned.asset_pipeline;
        return cloned;

      default:
        // 外部或一般訪客：禁止存取機敏細節
        return {
          work_order_id: cloned.work_order_id,
          slip_serial: cloned.slip_serial,
          fsm_state: cloned.fsm_state
        };
    }
  }

  /**
   * 驗證狀態機流轉是否合法 (FSM Transition Guard)
   * @param {String} currentStatus 當前狀態
   * @param {String} targetStatus 目標狀態
   * @param {String} role 操作角色
   * @param {Object} context 附加條件 (如 finance_status 是否已支付)
   */
  static validateStateTransition(currentStatus, targetStatus, role, context = {}) {
    // 總召擁有覆寫特權
    if (role === USER_ROLES.SUPER_ADMIN) return { allowed: true };

    // 產線製作解鎖守門條件 (Production Gate)
    if (targetStatus === "IN_PRODUCTION") {
      if (context.qc_status !== "QC_APPROVED") {
        return { allowed: false, error: "美術審核尚未通過，產線禁止開工" };
      }
      if (context.finance_status !== "PAID") {
        return { allowed: false, error: "財務尚未確認收款，產線禁止開工" };
      }
      if (role !== USER_ROLES.PRODUCTION) {
        return { allowed: false, error: "無權限更改產線狀態" };
      }
    }

    return { allowed: true };
  }
}
