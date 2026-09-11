"use client";

import { Lock, X, CalendarCheck, AlertCircle } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import styles from "./POSCloseShiftModal.module.css";

export default function POSCloseShiftModal({
  isOpen,
  onClose,
  shiftStats = { count: 0, sales: 0, profit: 0, cash: 0 },
  shiftNotes = "",
  setShiftNotes,
  isClosingShift,
  onConfirmCloseShift
}) {
  if (!isOpen) return null;

  const isShiftEmpty = shiftStats.count === 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className={`modal-content ${styles.modalContainer}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className={styles.headerBrand}>
            <div className={styles.headerIcon}>
              <Lock size={20} />
            </div>
            <div>
              <h3 className={`modal-title font-bold ${styles.headerTitle}`}>
                تقفيل الوردية وأرشفة الحسابات
              </h3>
              <p className={styles.headerSubtitle}>
                نقل سجل مبيعات الوردية إلى تقفيلة الأيام (reports) وتصفير الكاشير
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="modal-close-btn"
            title="إلغاء"
          >
            <X size={18} />
          </button>
        </div>

        <div className={`modal-body ${styles.modalBody}`}>
          <div className={`shift-summary-box ${styles.summaryBox}`}>
            <h4 className={styles.summaryTitle}>
              <CalendarCheck size={16} />
              ملخص الحسابات للوردية الحالية
            </h4>

            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>عدد الفواتير:</span>
                <div className={styles.statValue}>{shiftStats.count} فاتورة</div>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>إجمالي المبيعات:</span>
                <div className={`${styles.statValue} ${styles.salesValue}`}>{formatNumber(shiftStats.sales)} ج.م</div>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>صافي الأرباح:</span>
                <div className={`${styles.statValue} ${styles.profitValue}`}>+{formatNumber(shiftStats.profit)} ج.م</div>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>الكاش في الدرج:</span>
                <div className={`${styles.statValue} ${styles.cashValue}`}>{formatNumber(shiftStats.cash)} ج.م</div>
              </div>
            </div>
          </div>

          {isShiftEmpty ? (
            <div className={styles.emptyAlert}>
              <AlertCircle size={18} color="#2563eb" className={styles.alertIcon} />
              <div className={styles.emptyAlertText}>
                <strong>الوردية فارغة حالياً (0 فاتورة):</strong> لا توجد مبيعات في هذه الوردية لأرشفتها. يمكنك البدء بإجراء عمليات البيع أولاً.
              </div>
            </div>
          ) : (
            <div className={`alert-shift-warning ${styles.warningAlert}`}>
              <AlertCircle size={18} color="#b45309" className={styles.alertIcon} />
              <div className={styles.warningAlertText}>
                <strong>تنبيه الإغلاق:</strong> سيتم ترحيل كافة فواتير ومبيعات هذه الوردية إلى سجل تقفيلة الأيام (reports)، وتصفير شاشة المبيعات للبدء بوردية جديدة.
              </div>
            </div>
          )}

          <div className={styles.notesFieldWrapper}>
            <label className={styles.notesLabel}>
              ملاحظات التقفيل (اختياري):
            </label>
            <textarea
              rows="2"
              value={shiftNotes}
              onChange={(e) => setShiftNotes(e.target.value)}
              placeholder="مثلاً: تم تسليم الكاش للمدير بالكامل..."
              className={`pos-input-general ${styles.notesTextarea}`}
              disabled={isShiftEmpty}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button 
            type="button"
            onClick={onClose} 
            className="btn-cancel"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onConfirmCloseShift}
            disabled={isClosingShift || isShiftEmpty}
            className={`btn-confirm-close-shift ${isShiftEmpty ? styles.disabledBtn : ""}`}
          >
            {isClosingShift ? "جاري التقفيل والأرشفة..." : "تأكيد تقفيل الوردية والأرشفة 🔒"}
          </button>
        </div>
      </div>
    </div>
  );
}
