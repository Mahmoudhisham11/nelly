"use client";

import React from "react";
import { formatNumber } from "@/lib/utils";
import { X, Printer, Barcode, Check } from "lucide-react";

export default function BarcodeModal({ isOpen, onClose, product }) {
  if (!isOpen || !product) return null;

  const handlePrint = () => {
    window.print();
  };

  const barcodeValue = product.barcode || product.code || "6220000000";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "420px", padding: "26px", textAlign: "center", background: "#ffffff" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <h3 style={{ fontSize: "1.1rem", color: "#1e1322", fontWeight: "800" }}>ملصق باركود الصنف</h3>
          <button 
            onClick={onClose}
            style={{
              background: "#fdf2f8",
              border: "1px solid #fbcfe8",
              borderRadius: "8px",
              width: "32px",
              height: "32px",
              color: "#db2777",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer"
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Printable Barcode Label */}
        <div 
          id="printable-barcode-card"
          style={{
            background: "#ffffff",
            color: "#111827",
            padding: "20px",
            borderRadius: "14px",
            margin: "12px 0 20px",
            boxShadow: "0 4px 20px rgba(219, 39, 119, 0.08)",
            border: "2px dashed #db2777"
          }}
        >
          <div style={{ fontSize: "0.85rem", fontWeight: "900", color: "#db2777", textTransform: "uppercase", letterSpacing: "1px" }}>
            NELLY COSMETICS
          </div>
          <div style={{ fontSize: "1.05rem", fontWeight: "800", margin: "6px 0", color: "#111" }}>
            {product.name}
          </div>
          <div style={{ fontSize: "0.82rem", color: "#4b5563", marginBottom: "10px" }}>
            باركود: <span className="num-font" dir="ltr" style={{ fontWeight: "800", color: "#be185d" }}>{barcodeValue}</span>
          </div>

          {/* Barcode visual lines simulation */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "2px",
            height: "48px",
            margin: "8px auto",
            padding: "0 10px"
          }}>
            {[4, 2, 6, 1, 3, 2, 5, 2, 4, 1, 6, 3, 2, 4, 1, 5, 2, 3, 6, 2, 4, 1, 3, 5, 2].map((w, i) => (
              <div 
                key={i} 
                style={{ 
                  width: `${w}px`, 
                  height: "100%", 
                  background: i % 7 === 0 ? "#fff" : "#000",
                  margin: "0 1px"
                }} 
              />
            ))}
          </div>

          <div className="num-font" dir="ltr" style={{ fontSize: "1rem", fontWeight: "900", letterSpacing: "2px", color: "#111" }}>
            {barcodeValue}
          </div>

          <div style={{ display: "flex", justifyContent: "center", marginTop: "12px", paddingTop: "8px", borderTop: "1px solid #e5e7eb", fontSize: "0.9rem" }}>
            <span style={{ color: "#1f2937", fontWeight: "700" }}>سعر الجملة: <strong style={{ color: "#9d174d" }}><span className="num-font" dir="ltr">{formatNumber(product.wholesalePrice)}</span> ج.م</strong></span>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <button onClick={onClose} className="btn-secondary" style={{ padding: "8px 16px" }}>
            إغلاق
          </button>
          <button onClick={handlePrint} className="btn-primary" style={{ padding: "8px 18px" }}>
            <Printer size={16} />
            طباعة الملصق
          </button>
        </div>
      </div>
    </div>
  );
}
