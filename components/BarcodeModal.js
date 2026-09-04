"use client";

import React, { useState, useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { formatNumber } from "@/lib/utils";
import { 
  X, 
  Printer, 
  Barcode as BarcodeIcon, 
  Copy, 
  Check 
} from "lucide-react";

export default function BarcodeModal({ isOpen, onClose, product }) {
  const [showPrice, setShowPrice] = useState(true);
  const [copied, setCopied] = useState(false);
  const barcodeSvgRef = useRef(null);

  const barcodeValue = product?.barcode || product?.code || "6221001001";

  // Generate real vector Code128 Barcode using JsBarcode
  useEffect(() => {
    if (!isOpen || !product || !barcodeSvgRef.current) return;

    try {
      JsBarcode(barcodeSvgRef.current, barcodeValue, {
        format: "CODE128",
        width: 1.8,
        height: 50,
        displayValue: false, // Clean custom rendered digits below
        margin: 0,
        background: "#ffffff",
        lineColor: "#000000"
      });
    } catch (err) {
      console.error("JsBarcode error:", err);
    }
  }, [isOpen, product, barcodeValue]);

  if (!isOpen || !product) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyBarcode = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(barcodeValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const displayPrice = product.sellingPrice ? product.sellingPrice : product.wholesalePrice;
  const priceLabel = product.sellingPrice ? "سعر القطاعي" : "سعر الجملة";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ 
          maxWidth: "460px", 
          padding: "24px", 
          background: "#ffffff", 
          borderRadius: "20px" 
        }}
      >
        {/* Top Header */}
        <div className="no-print" style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between", 
          marginBottom: "16px", 
          borderBottom: "1px solid #fce7f3", 
          paddingBottom: "12px" 
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <BarcodeIcon size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: "900", color: "#1e1322" }}>
                طباعة ملصق الباركود
              </h3>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: "600" }}>
                ملصق قياسي عالي الوضوح لطابعات الباركود
              </span>
            </div>
          </div>

          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#6b7280" }}>
            <X size={20} />
          </button>
        </div>

        {/* Quick Toolbar (Copy Code + Show Price) */}
        <div className="no-print" style={{
          background: "#fdf5f9",
          border: "1px solid #fbcfe8",
          borderRadius: "12px",
          padding: "10px 14px",
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "0.84rem"
        }}>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontWeight: "700", color: "#374151" }}>
            <input 
              type="checkbox" 
              checked={showPrice} 
              onChange={(e) => setShowPrice(e.target.checked)} 
              style={{ accentColor: "#db2777" }}
            />
            إظهار السعر بالملصق
          </label>

          <button
            type="button"
            onClick={handleCopyBarcode}
            className="btn-secondary"
            style={{ padding: "5px 10px", fontSize: "0.78rem", background: "#ffffff", borderRadius: "8px" }}
            title="نسخ رقم الباركود"
          >
            {copied ? <Check size={13} color="#059669" /> : <Copy size={13} />}
            {copied ? "تم النسخ!" : "نسخ الكود"}
          </button>
        </div>

        {/* ===================================================================
            PREVIEW & PRINTABLE THERMAL BARCODE STICKER
           =================================================================== */}
        <div style={{ display: "flex", justifyContent: "center", margin: "10px 0 20px" }}>
          <div 
            id="printable-barcode-card"
            className="thermal-barcode-sticker"
            style={{
              width: "290px",
              background: "#ffffff",
              color: "#000000",
              padding: "14px 16px 12px",
              borderRadius: "10px",
              border: "1.5px dashed #000000",
              boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
              textAlign: "center",
              fontFamily: "Arial, Tahoma, sans-serif"
            }}
          >
            {/* Brand Header */}
            <div style={{
              fontSize: "11px",
              fontWeight: "900",
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              color: "#000000",
              borderBottom: "1px solid #000000",
              paddingBottom: "3px",
              marginBottom: "5px"
            }}>
              ★ NELLY COSMETICS ★
            </div>

            {/* Product Name */}
            <div 
              dir="rtl"
              style={{
                fontSize: "13px",
                fontWeight: "900",
                color: "#000000",
                lineHeight: "1.3",
                margin: "4px 0 6px",
                wordBreak: "break-word"
              }}
            >
              {product.name}
            </div>

            {/* Real Vector SVG Barcode */}
            <div style={{ margin: "4px auto 2px", display: "flex", justifyContent: "center" }}>
              <svg ref={barcodeSvgRef} style={{ maxWidth: "100%", height: "46px" }} />
            </div>

            {/* Barcode Numbers */}
            <div className="num-font" dir="ltr" style={{
              fontSize: "13px",
              fontWeight: "900",
              letterSpacing: "2.5px",
              color: "#000000",
              fontFamily: "monospace",
              marginTop: "1px"
            }}>
              {barcodeValue}
            </div>

            {/* Price Tag */}
            {showPrice && displayPrice > 0 && (
              <div style={{
                marginTop: "6px",
                paddingTop: "5px",
                borderTop: "1px dashed #000000",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "11px",
                fontWeight: "900"
              }}>
                <span>{priceLabel}:</span>
                <span style={{ fontSize: "13px", fontWeight: "900" }}>
                  <span className="num-font" dir="ltr">{formatNumber(displayPrice)}</span> EGP
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="no-print" style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button onClick={onClose} className="btn-secondary" style={{ padding: "9px 18px" }}>
            إغلاق
          </button>
          <button onClick={handlePrint} className="btn-primary" style={{ padding: "9px 24px" }}>
            <Printer size={16} />
            طباعة ملصق الباركود الآن
          </button>
        </div>
      </div>
    </div>
  );
}
