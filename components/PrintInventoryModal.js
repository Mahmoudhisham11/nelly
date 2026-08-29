"use client";

import React from "react";
import { formatNumber } from "@/lib/utils";
import { X, Printer, FileText, CheckCircle2 } from "lucide-react";

export default function PrintInventoryModal({ isOpen, onClose, products = [] }) {
  if (!isOpen) return null;

  const totalItemsCount = products.length;
  const totalQuantityCount = products.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);

  const currentDate = new Date();
  const dayNames = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  const formattedDate = `${dayNames[currentDate.getDay()]} ${currentDate.getDate()} ${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay no-print-bg" onClick={onClose}>
      <div 
        className="modal-content print-modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{ 
          maxWidth: "850px", 
          width: "95%",
          padding: "28px", 
          background: "#ffffff",
          maxHeight: "92vh",
          overflowY: "auto"
        }}
      >
        {/* Modal Top Actions (Hidden on physical print) */}
        <div className="no-print" style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between", 
          marginBottom: "20px",
          borderBottom: "1.5px solid #f0e1ec",
          paddingBottom: "14px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff"
            }}>
              <FileText size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.2rem", color: "#1e1322", fontWeight: "800" }}>معاينة كشف جرد المخزن</h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "600" }}>
                كشف جاهز للطباعة والحفظ كـ PDF (اسم المنتج، الباركود، والكمية فقط)
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button 
              onClick={handlePrint} 
              className="btn-primary"
              style={{ padding: "9px 20px", fontSize: "0.92rem" }}
            >
              <Printer size={17} />
              طباعة الكشف الآن
            </button>
            <button 
              onClick={onClose}
              style={{
                background: "#fdf2f8",
                border: "1px solid #fbcfe8",
                borderRadius: "8px",
                width: "36px",
                height: "36px",
                color: "#db2777",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer"
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ========================================================
            PRINTABLE INVENTORY SHEET CONTENT (A4 LUXURY FORMAT)
           ======================================================== */}
        <div id="printable-inventory-document" style={{
          background: "#ffffff",
          color: "#111827",
          padding: "24px 20px",
          borderRadius: "12px",
          border: "1px solid #e5e7eb"
        }}>
          {/* Header */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "2px solid #db2777",
            paddingBottom: "16px",
            marginBottom: "20px"
          }}>
            <div>
              <div style={{ fontSize: "1.4rem", fontWeight: "900", color: "#db2777", letterSpacing: "-0.5px" }}>
                مخزن NELLY للميكاب ومستحضرات التجميل
              </div>
              <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "#1f2937", marginTop: "2px" }}>
                كشف جرد الأصناف والبضاعة بالمخزن
              </div>
              <div style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: "4px" }}>
                تاريخ الجرد: <strong style={{ color: "#374151" }}>{formattedDate}</strong>
              </div>
            </div>

            {/* Quick Stats Summary Box */}
            <div style={{
              background: "#fdf2f8",
              border: "1.5px solid #fbcfe8",
              borderRadius: "12px",
              padding: "10px 18px",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "0.85rem", color: "#6b7280", fontWeight: "600" }}>إجمالي البضاعة</div>
              <div style={{ display: "flex", gap: "16px", marginTop: "4px" }}>
                <div>
                  <span style={{ fontSize: "0.78rem", color: "#9d174d" }}>الأصناف: </span>
                  <strong className="num-font" dir="ltr" style={{ fontSize: "1.1rem", color: "#9d174d" }}>
                    {formatNumber(totalItemsCount)}
                  </strong>
                </div>
                <div style={{ borderRight: "1px solid #fbcfe8", paddingRight: "16px" }}>
                  <span style={{ fontSize: "0.78rem", color: "#047857" }}>إجمالي القطع: </span>
                  <strong className="num-font" dir="ltr" style={{ fontSize: "1.1rem", color: "#047857" }}>
                    {formatNumber(totalQuantityCount)}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Clean 3-Column Table: Name, Barcode, Quantity */}
          <table style={{
            width: "100%",
            borderCollapse: "collapse",
            textAlign: "right",
            fontSize: "0.95rem",
            marginBottom: "24px"
          }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ padding: "12px 14px", width: "50px", textAlign: "center", color: "#4b5563", fontWeight: "800" }}>#</th>
                <th style={{ padding: "12px 14px", color: "#111827", fontWeight: "800" }}>اسم المنتج</th>
                <th style={{ padding: "12px 14px", color: "#111827", fontWeight: "800", textAlign: "center" }}>باركود المنتج</th>
                <th style={{ padding: "12px 14px", color: "#111827", fontWeight: "800", textAlign: "center", width: "130px" }}>الكمية المتوفرة</th>
              </tr>
            </thead>
            <tbody>
              {products.map((item, index) => {
                const isEven = index % 2 === 0;
                return (
                  <tr 
                    key={item.id || index}
                    style={{ 
                      borderBottom: "1px solid #f3f4f6",
                      background: isEven ? "#ffffff" : "#fdfafc"
                    }}
                  >
                    <td style={{ padding: "12px 14px", textAlign: "center", color: "#6b7280", fontWeight: "700" }}>
                      <span className="num-font" dir="ltr">{index + 1}</span>
                    </td>
                    <td style={{ padding: "12px 14px", color: "#111827", fontWeight: "700" }}>
                      {item.name}
                    </td>
                    <td style={{ padding: "12px 14px", textAlign: "center" }}>
                      <span className="num-font" dir="ltr" style={{ 
                        fontWeight: "800", 
                        letterSpacing: "1px",
                        color: "#374151",
                        background: "#f3f4f6",
                        padding: "3px 10px",
                        borderRadius: "6px",
                        border: "1px solid #e5e7eb"
                      }}>
                        {item.barcode || item.code}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px", textAlign: "center" }}>
                      <strong className="num-font" dir="ltr" style={{ 
                        fontSize: "1.15rem", 
                        color: "#111827",
                        fontWeight: "900" 
                      }}>
                        {formatNumber(item.quantity)}
                      </strong>
                      <span style={{ fontSize: "0.8rem", color: "#6b7280", marginRight: "4px" }}>قطعة</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Footer Signature Box */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "30px",
            paddingTop: "16px",
            borderTop: "1px dashed #d1d5db",
            fontSize: "0.88rem",
            color: "#4b5563"
          }}>
            <div>
              تم استخراج الكشف بواسطة نظام مخزن <strong>Nelly</strong>
            </div>
            <div>
              توقيع مسؤول المخزن: _______________________
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
