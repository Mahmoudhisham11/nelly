"use client";

import React, { useRef, useState } from "react";
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
  const [includePolicy, setIncludePolicy] = useState(true);

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
`🌸 *فاتورة مشتريات - Nelly* 🌸
━━━━━━━━━━━━━━━━━━
📄 *رقم الفاتورة:* ${invoice.invoiceNumber || ""}
📅 *التاريخ:* ${new Date(invoice.date || invoice.createdAt).toLocaleString("ar-EG")}
👤 *العميل:* ${invoice.customer?.name || "عميل نقدي"}
🛒 *الأصناف:*${itemsText}
━━━━━━━━━━━━━━━━━━
💵 *الإجمالي:* ${formatNumber(invoice.total)} ج.م
💳 *طريقة الدفع:* ${invoice.paymentMethod || "نقدي"}
━━━━━━━━━━━━━━━━━━
✨ شكراً لتعاملكم معنا ونسعد بزيارتكم ✨${includePolicy ? "\nℹ️ *البضاعة المباعة لا ترد ولكن تستبدل خلال 14 يوماً*" : ""}`;

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
        style={{ 
          maxWidth: "420px", 
          maxHeight: "min(92vh, 800px)",
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
              width: "34px",
              height: "34px",
              borderRadius: "10px",
              background: "#ecfdf5",
              color: "#059669",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}>
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h3 className="modal-title" style={{ fontSize: "1.05rem", fontWeight: "800", color: "#111827", margin: 0 }}>
                تمت عملية البيع بنجاح
              </h3>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: "700" }}>
                فاتورة #{invoice.invoiceNumber}
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
        <div className="modal-body custom-scrollbar" style={{ padding: "1rem", overflowY: "auto", flex: 1 }}>
          <div 
            ref={receiptRef}
            id="printable-receipt"
            className="thermal-receipt"
            style={{
              background: "#ffffff",
              border: "1.5px solid #000000",
              borderRadius: "10px",
              padding: "14px 14px",
              fontFamily: "var(--font-cairo), 'Segoe UI', Tahoma, sans-serif",
              color: "#000000",
              boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
              fontSize: "0.8rem",
              lineHeight: 1.4
            }}
          >
            {/* 1. Header: Nelly Title & Invoice Number */}
            <div style={{ textAlign: "center", marginBottom: "10px", borderBottom: "1.5px solid #000000", paddingBottom: "8px" }}>
              <h1 style={{ 
                fontSize: "1.6rem", 
                fontWeight: "900", 
                color: "#000000", 
                margin: 0,
                letterSpacing: "1px",
                lineHeight: 1.1
              }}>
                Nelly
              </h1>
              <div style={{ 
                fontSize: "0.76rem", 
                fontWeight: "800", 
                color: "#111827",
                marginTop: "4px"
              }}>
                رقم الفاتورة: <span className="num-font" dir="ltr" style={{ fontWeight: "900" }}>#{invoice.invoiceNumber}</span>
              </div>
            </div>

            {/* 2. Sequential Invoice Meta */}
            <div style={{ 
              fontSize: "0.78rem", 
              color: "#000000", 
              fontWeight: "800",
              marginBottom: "10px",
              lineHeight: 1.5,
              borderBottom: "1px dashed #000000",
              paddingBottom: "8px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                <span>التاريخ:</span>
                <span>{dateStr}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                <span>العميل:</span>
                <span>{invoice.customer?.name || "عميل نقدي"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                <span>الكاشير:</span>
                <span>{invoice.cashier?.name || "كاشير المحل"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>طريقة الدفع:</span>
                <span>{invoice.paymentMethod || "نقدي"}</span>
              </div>
            </div>

            {/* 3. Items Table - All Columns Center-Aligned */}
            <div style={{ marginBottom: "10px" }}>
              <table style={{ 
                width: "100%", 
                fontSize: "0.78rem", 
                borderCollapse: "collapse", 
                color: "#000000"
              }}>
                <thead>
                  <tr style={{ 
                    background: "#f9fafb", 
                    borderTop: "1.5px solid #000000", 
                    borderBottom: "1.5px solid #000000" 
                  }}>
                    <th style={{ textAlign: "center", padding: "6px 4px", fontWeight: "900", color: "#000000" }}>
                      اسم المنتج
                    </th>
                    <th style={{ textAlign: "center", padding: "6px 4px", fontWeight: "900", color: "#000000", width: "45px" }}>
                      الكمية
                    </th>
                    <th style={{ textAlign: "center", padding: "6px 4px", fontWeight: "900", color: "#000000", width: "55px" }}>
                      السعر
                    </th>
                    <th style={{ textAlign: "center", padding: "6px 4px", fontWeight: "900", color: "#000000", width: "65px" }}>
                      الإجمالي
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr 
                      key={idx} 
                      style={{ 
                        borderBottom: "1px dashed #d1d5db"
                      }}
                    >
                      <td style={{ textAlign: "center", padding: "6px 4px", fontWeight: "800", color: "#000000", wordBreak: "break-word" }}>
                        {it.name}
                      </td>
                      <td style={{ textAlign: "center", padding: "6px 4px", fontWeight: "900", color: "#000000" }} className="num-font">
                        {it.quantity}
                      </td>
                      <td style={{ textAlign: "center", padding: "6px 4px", fontWeight: "800", color: "#000000" }} className="num-font">
                        {formatNumber(it.sellingPrice)}
                      </td>
                      <td style={{ textAlign: "center", padding: "6px 4px", fontWeight: "900", color: "#000000" }} className="num-font">
                        {formatNumber(it.subtotal || it.quantity * it.sellingPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 4. Total Card (كارت الإجمالي) */}
            <div style={{ 
              border: "1.5px solid #000000", 
              borderRadius: "8px", 
              padding: "8px 10px", 
              marginBottom: "10px",
              background: "#fafafa",
              fontSize: "0.82rem",
              lineHeight: 1.5
            }}>
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center",
                fontWeight: "900",
                fontSize: "0.95rem"
              }}>
                <span>الإجمالي:</span>
                <span className="num-font" style={{ fontSize: "1.05rem" }}>
                  {formatNumber(invoice.total)} ج.م
                </span>
              </div>

              {invoice.discount > 0 && (
                <div style={{ 
                  display: "flex", 
                  justifyContent: "space-between", 
                  color: "#dc2626", 
                  fontWeight: "800",
                  fontSize: "0.75rem",
                  borderTop: "1px dashed #e5e7eb",
                  paddingTop: "3px",
                  marginTop: "3px"
                }}>
                  <span>الخصم المطبق:</span>
                  <span className="num-font">-{formatNumber(invoice.discount)} ج.م</span>
                </div>
              )}

              {invoice.receivedCash > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: "800", color: "#374151", marginTop: "2px" }}>
                  <span>المبلغ المدفوع:</span>
                  <span className="num-font">{formatNumber(invoice.receivedCash)} ج.م</span>
                </div>
              )}

              {invoice.changeAmount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#059669", fontWeight: "800", marginTop: "2px" }}>
                  <span>الباقي للعميل:</span>
                  <span className="num-font">{formatNumber(invoice.changeAmount)} ج.م</span>
                </div>
              )}

              {invoice.remainingDue > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#b91c1c", fontWeight: "900", marginTop: "2px" }}>
                  <span>المتبقي آجل:</span>
                  <span className="num-font">{formatNumber(invoice.remainingDue)} ج.م</span>
                </div>
              )}
            </div>

            {/* 5. Footer: Thank You Message & Optional Exchange Policy */}
            <div style={{ 
              textAlign: "center", 
              borderTop: "1.5px solid #000000", 
              paddingTop: "8px", 
              fontSize: "0.78rem", 
              fontWeight: "900",
              color: "#000000" 
            }}>
              <div>شكراً لتعاملكم معنا ونسعد بزيارتكم</div>
              {includePolicy && (
                <div style={{ 
                  marginTop: "4px", 
                  fontSize: "0.73rem", 
                  fontWeight: "800", 
                  color: "#1f2937" 
                }}>
                  البضاعة المباعة لا ترد ولكن تستبدل خلال 14 يوماً مع وجود الفاتورة
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pinned Action Buttons Footer in Modal (Print, WhatsApp, Policy Toggle, New Sale) */}
        <div className="modal-footer no-print" style={{ flexDirection: "column", gap: "8px", flexShrink: 0, padding: "12px 16px" }}>
          {/* Policy Toggle Option */}
          <label style={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "space-between", 
            width: "100%",
            padding: "6px 12px", 
            background: "#f8fafc", 
            border: "1px solid #e2e8f0", 
            borderRadius: "8px", 
            cursor: "pointer", 
            userSelect: "none" 
          }}>
            <span style={{ fontSize: "0.8rem", fontWeight: "700", color: "#334155" }}>
              طباعة سياسة الاستبدال (14 يوم) بالفاتورة
            </span>
            <input 
              type="checkbox" 
              checked={includePolicy} 
              onChange={(e) => setIncludePolicy(e.target.checked)}
              style={{ width: "17px", height: "17px", accentColor: "#db2777", cursor: "pointer" }}
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", width: "100%" }}>
            <button
              type="button"
              onClick={handlePrint}
              className="btn-primary"
              style={{ 
                padding: "10px", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                gap: "6px",
                fontSize: "0.9rem",
                fontWeight: "800"
              }}
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
              style={{ 
                width: "100%", 
                padding: "9px", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                gap: "6px",
                fontWeight: "800",
                fontSize: "0.85rem"
              }}
            >
              <ShoppingBag size={15} />
              بدء فاتورة بيع جديدة
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
