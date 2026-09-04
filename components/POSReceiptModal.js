"use client";

import React, { useRef } from "react";
import { formatNumber } from "@/lib/utils";
import { 
  Printer, 
  X, 
  CheckCircle2, 
  MessageCircle,
  ShoppingBag
} from "lucide-react";

export default function POSReceiptModal({ isOpen, onClose, invoice, onNewSale }) {
  const receiptRef = useRef(null);

  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    if (!invoice) return;

    let itemsText = "";
    (invoice.items || []).forEach((it, idx) => {
      itemsText += `\n${idx + 1}. ${it.name} × ${it.quantity} = ${formatNumber(it.subtotal || it.quantity * it.sellingPrice)} ج.م`;
    });

    const msg = 
`🌸 *فاتورة مشتريات - متجر Nelly للميكاب* 🌸
━━━━━━━━━━━━━━━━━━
📄 *رقم الفاتورة:* ${invoice.invoiceNumber || ""}
📅 *التاريخ:* ${new Date(invoice.date || invoice.createdAt).toLocaleString("ar-EG")}
👤 *العميل:* ${invoice.customer?.name || "عميل نقدي"}
🛒 *الأصناف:*${itemsText}
━━━━━━━━━━━━━━━━━━
💵 *الإجمالي قبل الخصم:* ${formatNumber(invoice.subtotal)} ج.م
${invoice.discount > 0 ? `🏷️ *الخصم المطبق:* ${formatNumber(invoice.discount)} ج.م\n` : ""}💎 *الصافي المطلوب:* ${formatNumber(invoice.total)} ج.م
💳 *طريقة الدفع:* ${invoice.paymentMethod || "نقدي"}
━━━━━━━━━━━━━━━━━━
✨ شكراً لثقتكم في متجر Nelly للميكاب ✨`;

    const phone = invoice.customer?.phone ? invoice.customer.phone.replace(/[^0-9]/g, "") : "";
    const cleanPhone = phone.startsWith("01") ? `20${phone.substring(1)}` : phone;
    const url = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;

    window.open(url, "_blank");
  };

  const items = invoice.items || [];
  const dateStr = invoice.date ? new Date(invoice.date).toLocaleString("ar-EG") : new Date().toLocaleString("ar-EG");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "460px", padding: 0 }}
      >
        {/* Modal Header */}
        <div className="modal-header no-print">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "#ecfdf5",
              color: "#059669",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <CheckCircle2 size={22} />
            </div>
            <div>
              <h3 className="modal-title" style={{ fontSize: "1.05rem" }}>تمت عملية البيع بنجاح</h3>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: "600" }}>فاتورة رقم {invoice.invoiceNumber}</span>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="modal-close-btn"
            title="إغلاق"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body with Printable Thermal Receipt */}
        <div className="modal-body" style={{ padding: "1.25rem" }}>
          <div 
            ref={receiptRef}
            id="printable-receipt"
            style={{
              background: "#ffffff",
              border: "1px dashed #d1d5db",
              borderRadius: "12px",
              padding: "20px 16px",
              fontFamily: "var(--font-cairo), sans-serif",
              color: "#111827",
              boxShadow: "0 2px 8px rgba(0,0,0,0.03)"
            }}
          >
            {/* Store Brand Header */}
            <div style={{ textAlign: "center", marginBottom: "12px", borderBottom: "1px dashed #9ca3af", paddingBottom: "10px" }}>
              <h2 style={{ fontSize: "1.3rem", fontWeight: "900", color: "#111827", marginBottom: "2px" }}>
                مخزن ومتجر <span style={{ color: "#db2777" }}>Nelly</span>
              </h2>
              <div style={{ fontSize: "0.8rem", color: "#4b5563", fontWeight: "700" }}>
                مستحضرات التجميل والميكاب
              </div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "4px" }}>
                إيصال مبيعات كاشير
              </div>
            </div>

            {/* Invoice Meta */}
            <div style={{ fontSize: "0.78rem", color: "#374151", marginBottom: "12px", lineHeight: "1.6" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: "700" }}>رقم الفاتورة:</span>
                <span className="num-font" dir="ltr" style={{ fontWeight: "800" }}>{invoice.invoiceNumber}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: "700" }}>التاريخ والوقت:</span>
                <span>{dateStr}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: "700" }}>العميل:</span>
                <span style={{ fontWeight: "800" }}>{invoice.customer?.name || "عميل نقدي"}</span>
              </div>
              {invoice.customer?.phone && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: "700" }}>الهاتف:</span>
                  <span className="num-font" dir="ltr">{invoice.customer.phone}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: "700" }}>الكاشير:</span>
                <span>{invoice.cashier?.name || "كاشير المحل"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: "700" }}>طريقة الدفع:</span>
                <span style={{ fontWeight: "800", color: "#db2777" }}>{invoice.paymentMethod || "نقدي"}</span>
              </div>
            </div>

            {/* Table of Items */}
            <table style={{ width: "100%", fontSize: "0.78rem", borderCollapse: "collapse", marginBottom: "14px", borderTop: "1px dashed #9ca3af", borderBottom: "1px dashed #9ca3af" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ textAlign: "right", padding: "8px 4px", fontWeight: "800" }}>الصنف</th>
                  <th style={{ textAlign: "center", padding: "8px 4px", fontWeight: "800" }}>الكمية</th>
                  <th style={{ textAlign: "center", padding: "8px 4px", fontWeight: "800" }}>السعر</th>
                  <th style={{ textAlign: "left", padding: "8px 4px", fontWeight: "800" }}>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px dotted #f3f4f6" }}>
                    <td style={{ padding: "6px 4px", fontWeight: "700" }}>{it.name}</td>
                    <td style={{ textAlign: "center", padding: "6px 4px" }} className="num-font">
                      {it.quantity}
                    </td>
                    <td style={{ textAlign: "center", padding: "6px 4px" }} className="num-font">
                      {formatNumber(it.sellingPrice)}
                    </td>
                    <td style={{ textAlign: "left", padding: "6px 4px", fontWeight: "800" }} className="num-font">
                      {formatNumber(it.subtotal || it.quantity * it.sellingPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Financial Summary */}
            <div style={{ fontSize: "0.82rem", lineHeight: "1.8", borderBottom: "1px dashed #9ca3af", paddingBottom: "10px", marginBottom: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>إجمالي الأصناف:</span>
                <span className="num-font">{formatNumber(invoice.subtotal)} ج.م</span>
              </div>

              {invoice.discount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "#dc2626" }}>
                  <span>الخصم ({invoice.discountType === "percent" ? `${invoice.discountValue}%` : "مبلغ"}):</span>
                  <span className="num-font">-{formatNumber(invoice.discount)} ج.م</span>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.1rem", fontWeight: "900", color: "#111827", marginTop: "4px" }}>
                <span>الصافي المطلوب:</span>
                <span className="num-font" style={{ color: "#db2777" }}>{formatNumber(invoice.total)} ج.م</span>
              </div>

              {invoice.receivedCash > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "#4b5563" }}>
                  <span>المبلغ المستلم:</span>
                  <span className="num-font">{formatNumber(invoice.receivedCash)} ج.م</span>
                </div>
              )}

              {invoice.changeAmount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "#059669", fontWeight: "700" }}>
                  <span>الباقي للعميل:</span>
                  <span className="num-font">{formatNumber(invoice.changeAmount)} ج.م</span>
                </div>
              )}

              {invoice.remainingDue > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "#dc2626", fontWeight: "800" }}>
                  <span>المتبقي في حساب العميل (آجل):</span>
                  <span className="num-font" dir="ltr">{formatNumber(invoice.remainingDue)} ج.م</span>
                </div>
              )}
            </div>

            {/* Footer Receipt Note */}
            <div style={{ textAlign: "center", marginTop: "14px", paddingTop: "10px", borderTop: "1px dashed #9ca3af", fontSize: "0.74rem", color: "#4b5563" }}>
              <div style={{ fontWeight: "800", color: "#111827" }}>شكراً لاختياركم متجر Nelly! ✨</div>
              <div style={{ marginTop: "2px" }}>البضاعة المباعة تستبدل خلال 14 يوماً مع وجود الفاتورة</div>
            </div>
          </div>
        </div>

        {/* Pinned Action Buttons Footer in Modal (Print, WhatsApp, New Sale) */}
        <div className="modal-footer no-print" style={{ flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", width: "100%" }}>
            <button
              type="button"
              onClick={handlePrint}
              className="btn-primary"
              style={{ padding: "10px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
            >
              <Printer size={16} />
              طباعة الفاتورة (Print)
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              style={{
                padding: "10px",
                borderRadius: "12px",
                background: "#25D366",
                color: "#ffffff",
                border: "none",
                fontWeight: "800",
                fontSize: "0.9rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px"
              }}
            >
              <MessageCircle size={16} />
              مشاركة WhatsApp
            </button>
          </div>

          {onNewSale && (
            <button
              type="button"
              onClick={() => { onClose(); onNewSale(); }}
              className="btn-secondary"
              style={{ width: "100%", padding: "10px" }}
            >
              <ShoppingBag size={16} />
              فاتورة بيع جديدة
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
