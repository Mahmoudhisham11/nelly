"use client";

import React, { useRef } from "react";
import { formatNumber } from "@/lib/utils";
import { 
  Printer, 
  X, 
  CheckCircle2, 
  MessageCircle,
  ShoppingBag,
  Sparkles
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
  const totalQuantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const dateStr = invoice.date ? new Date(invoice.date).toLocaleString("ar-EG") : new Date().toLocaleString("ar-EG");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ 
          maxWidth: "480px", 
          maxHeight: "min(94vh, 850px)",
          display: "flex",
          flexDirection: "column",
          padding: 0,
          overflow: "hidden"
        }}
      >
        {/* Modal Header */}
        <div className="modal-header no-print">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background: "#ecfdf5",
              color: "#059669",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}>
              <CheckCircle2 size={22} />
            </div>
            <div>
              <h3 className="modal-title" style={{ fontSize: "1.1rem", fontWeight: "800", color: "#111827", margin: 0 }}>
                تمت عملية البيع بنجاح
              </h3>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "700" }}>
                فاتورة رقم #{invoice.invoiceNumber}
              </span>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="modal-close-btn"
            title="إغلاق النافذة"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body with Printable Thermal Receipt */}
        <div className="modal-body custom-scrollbar" style={{ padding: "1.25rem", overflowY: "auto", flex: 1 }}>
          <div 
            ref={receiptRef}
            id="printable-receipt"
            className="thermal-receipt"
            style={{
              background: "#ffffff",
              border: "1.5px solid #111827",
              borderRadius: "12px",
              padding: "20px 18px",
              fontFamily: "var(--font-cairo), 'Segoe UI', Tahoma, sans-serif",
              color: "#000000",
              boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
              fontSize: "0.88rem",
              lineHeight: 1.45
            }}
          >
            {/* Store Brand Header */}
            <div style={{ 
              textAlign: "center", 
              marginBottom: "14px", 
              paddingBottom: "12px",
              borderBottom: "2px solid #000000"
            }}>
              <div style={{ 
                fontSize: "0.78rem", 
                fontWeight: "900", 
                letterSpacing: "2px", 
                color: "#db2777",
                textTransform: "uppercase",
                marginBottom: "2px"
              }}>
                NELLY BEAUTY STORE
              </div>
              <h2 style={{ 
                fontSize: "1.35rem", 
                fontWeight: "900", 
                color: "#000000", 
                margin: "2px 0 4px 0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px"
              }}>
                محل <span style={{ color: "#db2777" }}>نيللي</span> لمستحضرات التجميل
              </h2>
              <div style={{ fontSize: "0.82rem", color: "#000000", fontWeight: "800" }}>
                أرقى الماركات والمكياج والعناية بالبشرة
              </div>
              <div style={{ 
                fontSize: "0.78rem", 
                color: "#111827", 
                fontWeight: "800",
                marginTop: "6px",
                display: "inline-block",
                padding: "2px 12px",
                background: "#f3f4f6",
                borderRadius: "6px",
                border: "1px solid #d1d5db"
              }}>
                فاتورة مبيعات كاشير
              </div>
            </div>

            {/* Invoice Meta Grid */}
            <div style={{ 
              background: "#fafafa", 
              border: "1px solid #e5e7eb", 
              borderRadius: "8px", 
              padding: "10px 12px", 
              marginBottom: "14px",
              fontSize: "0.84rem",
              color: "#000000",
              fontWeight: "700"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontWeight: "800", color: "#374151" }}>رقم الفاتورة:</span>
                <span className="num-font" dir="ltr" style={{ fontWeight: "900", fontSize: "0.95rem", color: "#000000" }}>
                  #{invoice.invoiceNumber}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontWeight: "800", color: "#374151" }}>التاريخ والوقت:</span>
                <span style={{ fontWeight: "800" }}>{dateStr}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontWeight: "800", color: "#374151" }}>اسم العميل:</span>
                <span style={{ fontWeight: "900", color: "#000000" }}>{invoice.customer?.name || "عميل نقدي"}</span>
              </div>
              {invoice.customer?.phone && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontWeight: "800", color: "#374151" }}>هاتف العميل:</span>
                  <span className="num-font" dir="ltr" style={{ fontWeight: "800" }}>{invoice.customer.phone}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontWeight: "800", color: "#374151" }}>الكاشير:</span>
                <span style={{ fontWeight: "800" }}>{invoice.cashier?.name || "كاشير المحل"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: "800", color: "#374151" }}>طريقة الدفع:</span>
                <span style={{ 
                  fontWeight: "900", 
                  color: "#9d174d",
                  background: "#fdf2f8",
                  padding: "1px 8px",
                  borderRadius: "4px",
                  border: "1px solid #fbcfe8"
                }}>
                  {invoice.paymentMethod || "نقدي"}
                </span>
              </div>
            </div>

            {/* Table of Items - Professional & Heavy Typography */}
            <div style={{ marginBottom: "14px", overflow: "hidden" }}>
              <table style={{ 
                width: "100%", 
                fontSize: "0.84rem", 
                borderCollapse: "collapse", 
                color: "#000000"
              }}>
                <thead>
                  <tr style={{ 
                    background: "#111827", 
                    color: "#ffffff",
                    borderTop: "2px solid #000000",
                    borderBottom: "2px solid #000000"
                  }}>
                    <th style={{ textAlign: "center", padding: "8px 4px", fontWeight: "900", width: "24px" }}>م</th>
                    <th style={{ textAlign: "right", padding: "8px 6px", fontWeight: "900" }}>بيان الصنف</th>
                    <th style={{ textAlign: "center", padding: "8px 4px", fontWeight: "900", width: "45px" }}>الكمية</th>
                    <th style={{ textAlign: "center", padding: "8px 4px", fontWeight: "900", width: "60px" }}>السعر</th>
                    <th style={{ textAlign: "left", padding: "8px 6px", fontWeight: "900", width: "70px" }}>الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr 
                      key={idx} 
                      style={{ 
                        borderBottom: "1px solid #e5e7eb",
                        background: idx % 2 === 0 ? "#ffffff" : "#fdf9fc"
                      }}
                    >
                      <td style={{ textAlign: "center", padding: "8px 4px", fontWeight: "900", color: "#4b5563" }} className="num-font">
                        {idx + 1}
                      </td>
                      <td style={{ padding: "8px 6px", fontWeight: "800", color: "#000000", wordBreak: "break-word" }}>
                        <div>{it.name}</div>
                        {it.brand && it.brand !== "Nelly" && (
                          <span style={{ fontSize: "0.72rem", color: "#6b7280", fontWeight: "700" }}>
                            {it.brand}
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "center", padding: "8px 4px", fontWeight: "900", color: "#000000" }} className="num-font">
                        {it.quantity}
                      </td>
                      <td style={{ textAlign: "center", padding: "8px 4px", fontWeight: "800", color: "#111827" }} className="num-font">
                        {formatNumber(it.sellingPrice)}
                      </td>
                      <td style={{ textAlign: "left", padding: "8px 6px", fontWeight: "900", color: "#000000" }} className="num-font">
                        {formatNumber(it.subtotal || it.quantity * it.sellingPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ 
                    borderTop: "2px solid #000000", 
                    borderBottom: "2px solid #000000", 
                    background: "#f9fafb",
                    fontWeight: "900" 
                  }}>
                    <td colSpan={2} style={{ padding: "6px 6px", textAlign: "right", fontWeight: "900" }}>
                      إجمالي عدد الأصناف: <span className="num-font" style={{ color: "#db2777" }}>{items.length}</span> (عدد القطع: <span className="num-font" style={{ color: "#db2777" }}>{totalQuantity}</span>)
                    </td>
                    <td colSpan={3} style={{ padding: "6px 6px", textAlign: "left" }}>
                      <span className="num-font" style={{ fontWeight: "900", fontSize: "0.95rem" }}>
                        {formatNumber(invoice.subtotal)} ج.م
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Financial Totals Summary */}
            <div style={{ 
              border: "1.5px solid #000000", 
              borderRadius: "8px", 
              padding: "12px 14px", 
              marginBottom: "14px",
              background: "#ffffff",
              fontSize: "0.88rem",
              lineHeight: 1.6
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontWeight: "800", color: "#374151" }}>إجمالي المشتريات:</span>
                <span className="num-font" style={{ fontWeight: "800" }}>{formatNumber(invoice.subtotal)} ج.م</span>
              </div>

              {invoice.discount > 0 && (
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  color: "#dc2626", 
                  fontWeight: "900",
                  borderTop: "1px dashed #e5e7eb",
                  paddingTop: "4px",
                  marginBottom: "4px"
                }}>
                  <span>الخصم الممنوح ({invoice.discountType === "percent" ? `${invoice.discountValue}%` : "مبلغ"}):</span>
                  <span className="num-font">-{formatNumber(invoice.discount)} ج.م</span>
                </div>
              )}

              {/* Highlighted Net Payable */}
              <div style={{ 
                display: "flex", 
                alignItems: "center",
                justifyContent: "space-between", 
                fontSize: "1.2rem", 
                fontWeight: "900", 
                color: "#ffffff", 
                background: "#111827",
                padding: "8px 12px",
                borderRadius: "6px",
                margin: "8px 0"
              }}>
                <span>الصافي المطلوب:</span>
                <span className="num-font" style={{ color: "#ffffff", fontSize: "1.3rem" }}>
                  {formatNumber(invoice.total)} ج.م
                </span>
              </div>

              {invoice.receivedCash > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "#111827", fontWeight: "800" }}>
                  <span>المبلغ المدفوع / المستلم:</span>
                  <span className="num-font">{formatNumber(invoice.receivedCash)} ج.م</span>
                </div>
              )}

              {invoice.changeAmount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "#059669", fontWeight: "900" }}>
                  <span>الباقي للعميل:</span>
                  <span className="num-font">{formatNumber(invoice.changeAmount)} ج.م</span>
                </div>
              )}

              {invoice.remainingDue > 0 && (
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  color: "#b91c1c", 
                  fontWeight: "900",
                  background: "#fef2f2",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  marginTop: "4px",
                  border: "1px solid #fecaca"
                }}>
                  <span>المتبقي في حساب العميل (آجل):</span>
                  <span className="num-font" dir="ltr">{formatNumber(invoice.remainingDue)} ج.م</span>
                </div>
              )}
            </div>

            {/* Footer Receipt Note & Policy */}
            <div style={{ 
              textAlign: "center", 
              borderTop: "2px dashed #000000", 
              paddingTop: "12px", 
              fontSize: "0.8rem", 
              color: "#000000" 
            }}>
              <div style={{ fontWeight: "900", fontSize: "0.9rem", color: "#000000", marginBottom: "3px" }}>
                ✨ شكراً لتعاملكم معنا ونسعد بزيارتكم دائماً ✨
              </div>
              <div style={{ fontWeight: "800", color: "#374151" }}>
                الاستبدال والاسترجاع خلال 14 يوماً مع وجود الفاتورة وبحالة المنتج الأصلية
              </div>
              <div style={{ 
                marginTop: "8px", 
                fontSize: "0.72rem", 
                color: "#6b7280", 
                fontWeight: "700",
                letterSpacing: "1px"
              }}>
                نظام إدارة كاشير نيللي • NELLY POS
              </div>
            </div>
          </div>
        </div>

        {/* Pinned Action Buttons Footer in Modal (Print, WhatsApp, New Sale) */}
        <div className="modal-footer no-print" style={{ flexDirection: "column", gap: "8px", flexShrink: 0, padding: "14px 20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", width: "100%" }}>
            <button
              type="button"
              onClick={handlePrint}
              className="btn-primary"
              style={{ 
                padding: "11px", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                gap: "8px",
                fontSize: "0.95rem",
                fontWeight: "800"
              }}
            >
              <Printer size={18} />
              طباعة الفاتورة (Print)
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              style={{
                padding: "11px",
                borderRadius: "12px",
                background: "#25D366",
                color: "#ffffff",
                border: "none",
                fontWeight: "800",
                fontSize: "0.95rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "opacity 0.2s"
              }}
            >
              <MessageCircle size={18} />
              مشاركة WhatsApp
            </button>
          </div>

          {onNewSale && (
            <button
              type="button"
              onClick={() => { onClose(); onNewSale(); }}
              className="btn-secondary"
              style={{ 
                width: "100%", 
                padding: "10px", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                gap: "8px",
                fontWeight: "800",
                fontSize: "0.9rem"
              }}
            >
              <ShoppingBag size={16} />
              بدء فاتورة بيع جديدة
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
