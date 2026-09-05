"use client";

import React, { useState, useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { 
  X, 
  Printer, 
  Barcode as BarcodeIcon, 
  Copy, 
  Check, 
  Sparkles
} from "lucide-react";

export default function EmployeeBarcodeModal({ isOpen, onClose, employee }) {
  const [copied, setCopied] = useState(false);
  const [labelSize, setLabelSize] = useState("38x25"); // "38x25" | "40x20" | "50x30"
  const [includeStoreName, setIncludeStoreName] = useState(true);
  const barcodeSvgRef = useRef(null);

  const barcodeValue = employee?.code ? String(employee.code).trim().toUpperCase() : "EMP-01";

  // Generate real vector Code128 Barcode sized perfectly for thermal stickers
  useEffect(() => {
    if (!isOpen || !employee || !barcodeSvgRef.current) return;

    try {
      const barcodeConfig = {
        "38x25": { width: 1.8, height: 38 },
        "40x20": { width: 1.5, height: 28 },
        "50x30": { width: 2.0, height: 46 }
      };

      const { width, height } = barcodeConfig[labelSize] || barcodeConfig["38x25"];

      JsBarcode(barcodeSvgRef.current, barcodeValue, {
        format: "CODE128",
        width: width,
        height: height,
        displayValue: false, // Digits rendered in sharp bold text below
        margin: 0,
        background: "#ffffff",
        lineColor: "#000000"
      });
    } catch (err) {
      console.error("JsBarcode error:", err);
    }
  }, [isOpen, employee, barcodeValue, labelSize]);

  if (!isOpen || !employee) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyCode = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(barcodeValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ 
          maxWidth: "480px", 
          maxHeight: "min(92vh, 760px)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          padding: 0,
          background: "#ffffff", 
          borderRadius: "20px" 
        }}
      >
        {/* Header (No print) */}
        <div className="no-print" style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between", 
          padding: "16px 20px",
          borderBottom: "1px solid #f0e1ec",
          background: "#ffffff",
          flexShrink: 0
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
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(219, 39, 119, 0.25)"
            }}>
              <BarcodeIcon size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: "900", color: "#1e1322", margin: 0 }}>
                طباعة ملصق باركود الموظف
              </h3>
              <span style={{ fontSize: "0.78rem", color: "#6b7280", fontWeight: "600" }}>
                مقاس مخصص لطابعات الاستيكر الحراري (38×25 مم)
              </span>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            style={{
              background: "#fdf2f8",
              border: "none",
              borderRadius: "10px",
              padding: "8px",
              cursor: "pointer",
              color: "#db2777"
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div style={{ 
          padding: "18px 22px", 
          overflowY: "auto", 
          flex: "1 1 auto",
          display: "flex",
          flexDirection: "column",
          gap: "16px"
        }}>
          {/* Label Size Selector (No print) */}
          <div className="no-print" style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            padding: "12px 14px",
            display: "flex",
            flexDirection: "column",
            gap: "8px"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: "800", color: "#334155" }}>
                مقاس ورقة الاستيكر الحراري:
              </span>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", fontWeight: "700", color: "#64748b", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={includeStoreName}
                  onChange={(e) => setIncludeStoreName(e.target.checked)}
                  style={{ accentColor: "#db2777" }}
                />
                <span>إظهار اسم Nelly</span>
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
              {[
                { id: "38x25", label: "38 × 25 مم", sub: "(المقاس القياسي بالصورة)" },
                { id: "40x20", label: "40 × 20 مم", sub: "(مقاس صغير ومضغوط)" },
                { id: "50x30", label: "50 × 30 مم", sub: "(مقاس عريض)" }
              ].map((size) => (
                <button
                  key={size.id}
                  type="button"
                  onClick={() => setLabelSize(size.id)}
                  style={{
                    padding: "8px 6px",
                    borderRadius: "10px",
                    border: labelSize === size.id ? "2px solid #db2777" : "1px solid #cbd5e1",
                    background: labelSize === size.id ? "#fdf2f8" : "#ffffff",
                    color: labelSize === size.id ? "#db2777" : "#475569",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.15s ease"
                  }}
                >
                  <strong style={{ fontSize: "0.82rem", display: "block" }}>{size.label}</strong>
                  <span style={{ fontSize: "0.68rem", opacity: 0.85 }}>{size.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Realistic Sticker Preview */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px 0",
            background: "#f1f5f9",
            borderRadius: "16px",
            border: "1px dashed #cbd5e1"
          }}>
            <span className="no-print" style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: "700", marginBottom: "8px" }}>
              معاينة ملصق الاستيكر الفعلي:
            </span>

            {/* THE THERMAL STICKER PRINT CONTAINER (Uses classes from globals.css) */}
            <div 
              id="printable-barcode-card"
              className="thermal-barcode-sticker"
              style={{
                width: labelSize === "38x25" ? "260px" : labelSize === "40x20" ? "240px" : "300px",
                background: "#ffffff",
                color: "#000000",
                borderRadius: "8px",
                border: "1.5px dashed #000000",
                padding: "10px 14px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                fontFamily: "Arial, Tahoma, sans-serif"
              }}
            >
              {/* Header: Store Name & Employee Name */}
              <div style={{ 
                width: "100%", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "space-between",
                borderBottom: "1px solid #000000",
                paddingBottom: "3px",
                marginBottom: "4px"
              }}>
                <span style={{ fontSize: "12px", fontWeight: "900", color: "#000000" }}>
                  {employee.name}
                </span>
                {includeStoreName && (
                  <span style={{ fontSize: "10px", fontWeight: "900", letterSpacing: "1px", color: "#000000" }}>
                    ★ NELLY ★
                  </span>
                )}
              </div>

              {/* Barcode Vector Graphic */}
              <div style={{ display: "flex", justifyContent: "center", width: "100%", overflow: "hidden", margin: "2px 0" }}>
                <svg ref={barcodeSvgRef} style={{ maxWidth: "100%", height: labelSize === "40x20" ? "28px" : labelSize === "38x25" ? "38px" : "46px" }} />
              </div>

              {/* Barcode Numbers & Code */}
              <div style={{ 
                width: "100%", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "space-between",
                paddingTop: "3px",
                borderTop: "1px solid #000000",
                marginTop: "3px"
              }}>
                <span className="num-font" dir="ltr" style={{ 
                  fontSize: "12px", 
                  fontWeight: "900", 
                  letterSpacing: "2px", 
                  fontFamily: "monospace",
                  color: "#000000" 
                }}>
                  {barcodeValue}
                </span>
                <span style={{ fontSize: "10px", fontWeight: "800", color: "#000000" }}>
                  {employee.role || "بائع"}
                </span>
              </div>
            </div>
          </div>

          {/* Barcode info and copy */}
          <div className="no-print" style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#fdf2f8",
            padding: "10px 14px",
            borderRadius: "12px",
            border: "1px solid #fbcfe8"
          }}>
            <div>
              <span style={{ fontSize: "0.75rem", color: "#831843", display: "block" }}>كود البصمة المبرمج:</span>
              <strong className="num-font" style={{ fontSize: "0.95rem", color: "#db2777" }}>{barcodeValue}</strong>
            </div>

            <button
              type="button"
              onClick={handleCopyCode}
              className="btn-secondary"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "6px 12px",
                fontSize: "0.8rem",
                background: "#ffffff"
              }}
            >
              {copied ? <Check size={14} color="#059669" /> : <Copy size={14} />}
              <span>{copied ? "تم النسخ!" : "نسخ الكود"}</span>
            </button>
          </div>
        </div>

        {/* Fixed Footer (No print) */}
        <div className="no-print" style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderTop: "1px solid #f0e1ec",
          background: "#ffffff",
          flexShrink: 0
        }}>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
          >
            إغلاق
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="btn-primary"
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 22px" }}
          >
            <Printer size={18} />
            <span>طباعة الاستيكر الحراري</span>
          </button>
        </div>
      </div>
    </div>
  );
}
