"use client";

import { Receipt, X, Search, Eye, RotateCcw } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import styles from "./POSShiftInvoices.module.css";

export default function POSShiftInvoices({
  show,
  onClose,
  invoiceSearchQuery,
  setInvoiceSearchQuery,
  paymentFilter,
  setPaymentFilter,
  loading,
  currentShiftSales = [],
  filteredShiftSales = [],
  onInspectInvoice,
  onReturnFullInvoice
}) {
  if (!show) return null;

  return (
    <div className="pos-invoices-view-container animate-fade-in">
      {/* Top Header of Shift Invoices Table */}
      <div className="pos-invoices-view-header">
        <div className={styles.headerBrand}>
          <div className={styles.headerIconWrapper}>
            <Receipt size={22} />
          </div>
          <div>
            <h2 className={styles.headerTitle}>
              فواتير ومبيعات الوردية المفتوحة
            </h2>
            <p className={styles.headerSubtitle}>
              إجمالي {currentShiftSales.length} فاتورة صادرة خلال الوردية الحالية
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className={`btn-pos-toggle-invoices ${styles.closeBtn}`}
        >
          <X size={16} />
          <span>إغلاق الفواتير والعودة للسلة</span>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="pos-table-filter-bar">
        <div className={`pos-table-search-wrapper ${styles.searchWrapper}`}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="ابحث برقم الفاتورة أو اسم العميل أو الهاتف..."
            value={invoiceSearchQuery}
            onChange={(e) => setInvoiceSearchQuery(e.target.value)}
            className={`pos-table-search-input-field ${styles.searchInput}`}
          />
          {invoiceSearchQuery && (
            <button
              onClick={() => setInvoiceSearchQuery("")}
              className={styles.clearSearchBtn}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="pos-filter-tabs-group">
          {["all", "نقدي", "فيزا", "تحويل", "آجل"].map((m) => (
            <button
              key={m}
              onClick={() => setPaymentFilter(m)}
              className={`btn-pos-filter-tab ${paymentFilter === m ? "active" : ""}`}
            >
              {m === "all" ? "الكل" : m}
            </button>
          ))}
        </div>
      </div>

      {/* Data Table Container with safe horizontal scrolling */}
      <div className="pos-table-scroll-wrap">
        {loading ? (
          <div className={styles.loadingState}>
            <p>جاري تحميل فواتير الوردية...</p>
          </div>
        ) : filteredShiftSales.length === 0 ? (
          <div className={styles.emptyState}>
            <Receipt size={48} className={styles.emptyStateIcon} />
            <h3 className={styles.emptyStateTitle}>
              لا توجد فواتير مبيعات في هذه الوردية حالياً
            </h3>
            <p className={styles.emptyStateText}>
              {currentShiftSales.length === 0
                ? "الوردية جديدة وفارغة. اضغط على زر العودة للسلة لإجراء عمليات البيع."
                : "لا توجد فواتير تطابق نص البحث أو الفلتر المحدد."}
            </p>
          </div>
        ) : (
          <table className="pos-invoices-data-table">
            <thead>
              <tr>
                <th>رقم الفاتورة</th>
                <th>الوقت</th>
                <th>العميل</th>
                <th>الأصناف</th>
                <th>طريقة الدفع</th>
                <th>الإجمالي</th>
                <th>الربح</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredShiftSales.map((inv) => (
                <tr 
                  key={inv.id}
                  onClick={() => onInspectInvoice(inv)}
                  className="pos-table-row-item"
                >
                  <td className={`font-mono font-bold ${styles.invoiceNumberCell}`}>
                    {inv.invoiceNumber}
                  </td>
                  <td className={styles.timeCell}>
                    {new Date(inv.date || inv.createdAt).toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td>
                    <div className="font-bold text-xs text-[var(--text-primary)]">
                      {inv.customer?.name || "عميل نقدي"}
                    </div>
                    {inv.customer?.phone && (
                      <div className="font-mono text-[11px] text-[var(--text-muted)]">
                        {inv.customer.phone}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className="pos-items-pill">
                      {inv.itemsCount || (inv.items || []).reduce((a, c) => a + (c.quantity || 1), 0)} قطعة
                    </span>
                  </td>
                  <td>
                    <span className={`pos-payment-tag tag-${inv.paymentMethod}`}>
                      {inv.paymentMethod || "نقدي"}
                    </span>
                  </td>
                  <td className="font-mono font-bold text-sm text-[var(--text-primary)]">
                    {formatNumber(inv.total)} ج.م
                  </td>
                  <td className="font-mono font-bold text-xs text-emerald-600">
                    +{formatNumber(inv.totalProfit)} ج.م
                  </td>
                  <td>
                    <div className={styles.actionCell} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onInspectInvoice(inv)}
                        className="btn-pos-row-action btn-action-inspect"
                        title="عرض الأصناف وتفاصيل الفاتورة"
                      >
                        <Eye size={14} />
                        <span>الأصناف</span>
                      </button>
                      <button
                        onClick={() => onReturnFullInvoice(inv)}
                        className="btn-pos-row-action btn-action-refund"
                        title="مرتجع كامل الفاتورة وإلغاؤها"
                      >
                        <RotateCcw size={14} />
                        <span>مرتجع</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
