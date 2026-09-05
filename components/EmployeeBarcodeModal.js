"use client";

import React, { useState, useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { 
  X, 
  Printer, 
  Barcode as BarcodeIcon, 
  Copy, 
  Check, 
  Sparkles,
  Download,
  RotateCw
} from "lucide-react";

export default function EmployeeBarcodeModal({ isOpen, onClose, employee }) {
  const [copied, setCopied] = useState(false);
  const [labelSize, setLabelSize] = useState("38x25"); // "38x25" | "40x20" | "50x30"
  const [orientation, setOrientation] = useState("landscape"); // "landscape" (بالعرض) | "portrait" (بالطول)
  const [includeStoreName, setIncludeStoreName] = useState(true);
  const barcodeSvgRef = useRef(null);
  const printIframeRef = useRef(null);

  const barcodeValue = employee?.code ? String(employee.code).trim().toUpperCase() : "EMP-01";

  // Sizes in mm (Strict thermal printer dimensions)
  const sizeMap = {
    "38x25": { w: 38, h: 25, barWidth: 1.4, barHeight: 24, maxSvgHeight: "9mm", fontSize: "7pt", numSize: "7.5pt" },
    "38x20": { w: 38, h: 20, barWidth: 1.3, barHeight: 20, maxSvgHeight: "7mm", fontSize: "6.5pt", numSize: "7pt" },
    "40x20": { w: 40, h: 20, barWidth: 1.3, barHeight: 20, maxSvgHeight: "7mm", fontSize: "6.5pt", numSize: "7pt" },
    "50x30": { w: 50, h: 30, barWidth: 1.8, barHeight: 32, maxSvgHeight: "13mm", fontSize: "8pt", numSize: "8.5pt" }
  };

  // Generate real vector Code128 Barcode
  useEffect(() => {
    if (!isOpen || !employee || !barcodeSvgRef.current) return;

    try {
      const config = sizeMap[labelSize] || sizeMap["38x25"];
      JsBarcode(barcodeSvgRef.current, barcodeValue, {
        format: "CODE128",
        width: config.barWidth,
        height: config.barHeight,
        displayValue: false,
        margin: 0,
        background: "#ffffff",
        lineColor: "#000000"
      });
    } catch (err) {
      console.error("JsBarcode error:", err);
    }
  }, [isOpen, employee, barcodeValue, labelSize, orientation]);

  if (!isOpen || !employee) return null;

  // Direct Thermal Printing via High-DPI Canvas (Guarantees 1 Single Sticker, Never Sliced)
  const handlePrint = () => {
    const config = sizeMap[labelSize] || sizeMap["38x25"];
    const widthMm = config.w;
    const heightMm = config.h;
    
    const svgElement = barcodeSvgRef.current;
    if (!svgElement) return;

    const svgString = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const URL = window.URL || window.webkitURL || window;
    const blobURL = URL.createObjectURL(svgBlob);
    
    const image = new Image();
    image.onload = () => {
      // 300 DPI high resolution canvas
      const scale = 12; // 12 px per mm
      const canvasWidth = widthMm * scale;
      const canvasHeight = heightMm * scale;

      const canvas = document.createElement("canvas");
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext("2d");

      // Crisp background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Clean outer border
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(6, 6, canvasWidth - 12, canvasHeight - 12);

      // Header: Employee name + NELLY
      ctx.fillStyle = "#000000";
      ctx.font = "bold 20px Arial, Tahoma, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(employee.name || "", canvasWidth - 16, 28);

      if (includeStoreName) {
        ctx.font = "bold 16px Arial, Tahoma, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("★ NELLY ★", 16, 28);
      }

      // Divider 1
      ctx.beginPath();
      ctx.moveTo(10, 36);
      ctx.lineTo(canvasWidth - 10, 36);
      ctx.stroke();

      // Barcode image
      const barcodeTop = 42;
      const barcodeHeight = canvasHeight - 88;
      ctx.drawImage(image, 14, barcodeTop, canvasWidth - 28, barcodeHeight);

      // Divider 2
      const footerDividerY = canvasHeight - 38;
      ctx.beginPath();
      ctx.moveTo(10, footerDividerY);
      ctx.lineTo(canvasWidth - 10, footerDividerY);
      ctx.stroke();

      // Footer: Code (Left) + Role (Right)
      ctx.font = "bold 20px monospace, Courier";
      ctx.textAlign = "left";
      ctx.fillText(barcodeValue, 16, canvasHeight - 14);

      ctx.font = "bold 18px Arial, Tahoma, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(employee.role || "بائع", canvasWidth - 16, canvasHeight - 14);

      const stickerDataUrl = canvas.toDataURL("image/png");

      const printHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>Sticker_${barcodeValue}</title>
          <style>
            @page {
              size: ${widthMm}mm ${heightMm}mm;
              margin: 0mm !important;
            }
            @media print {
              html, body {
                width: ${widthMm}mm !important;
                height: ${heightMm}mm !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden !important;
                background: #ffffff !important;
                page-break-after: avoid !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              img {
                width: ${widthMm}mm !important;
                height: ${heightMm}mm !important;
                max-width: ${widthMm}mm !important;
                max-height: ${heightMm}mm !important;
                display: block !important;
                margin: 0 !important;
                padding: 0 !important;
                page-break-after: avoid !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              width: ${widthMm}mm;
              height: ${heightMm}mm;
              margin: 0;
              padding: 0;
              overflow: hidden;
              background: #ffffff;
            }
            img {
              width: ${widthMm}mm;
              height: ${heightMm}mm;
              display: block;
              margin: 0;
            }
          </style>
        </head>
        <body>
          <img src="${stickerDataUrl}" alt="Barcode Sticker" />
        </body>
        </html>
      `;

      let iframe = document.getElementById("thermal-print-hidden-iframe");
      if (!iframe) {
        iframe = document.createElement("iframe");
        iframe.id = "thermal-print-hidden-iframe";
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "none";
        document.body.appendChild(iframe);
      }

      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(printHtml);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }, 250);
    };
    image.src = blobURL;
  };

  // Download barcode image directly
  const handleDownloadImage = () => {
    const svgElement = barcodeSvgRef.current;
    if (!svgElement) return;

    const svgString = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const URL = window.URL || window.webkitURL || window;
    const blobURL = URL.createObjectURL(svgBlob);
    
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 250;
      const ctx = canvas.getContext("2d");
      
      // White background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw border
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 3;
      ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
      
      // Header text
      ctx.fillStyle = "#000000";
      ctx.font = "bold 18px Arial";
      ctx.textAlign = "right";
      ctx.fillText(employee.name || "", canvas.width - 24, 38);
      if (includeStoreName) {
        ctx.textAlign = "left";
        ctx.fillText("NELLY", 24, 38);
      }
      
      // Separator line
      ctx.beginPath();
      ctx.moveTo(15, 48);
      ctx.lineTo(canvas.width - 15, 48);
      ctx.stroke();
      
      // Draw Barcode image
      ctx.drawImage(image, 20, 58, 360, 120);
      
      // Separator line
      ctx.beginPath();
      ctx.moveTo(15, 192);
      ctx.lineTo(canvas.width - 15, 192);
      ctx.stroke();
      
      // Footer text
      ctx.font = "bold 18px monospace";
      ctx.textAlign = "left";
      ctx.fillText(barcodeValue, 24, 222);
      
      ctx.font = "bold 16px Arial";
      ctx.textAlign = "right";
      ctx.fillText(employee.role || "بائع", canvas.width - 24, 222);
      
      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `Barcode_${employee.name}_${barcodeValue}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };
    image.src = blobURL;
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
          maxWidth: "500px", 
          maxHeight: "min(92vh, 780px)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          padding: 0,
          background: "#ffffff", 
          borderRadius: "20px" 
        }}
      >
        {/* Header */}
        <div style={{ 
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
                طباعة باركود الموظف للاستيكر الحراري
              </h3>
              <span style={{ fontSize: "0.78rem", color: "#6b7280", fontWeight: "600" }}>
                مقاس مخصص لطابعات الباركود الحرارية (Sticker Label)
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
          {/* Controls: Size & Orientation */}
          <div style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            padding: "12px 14px",
            display: "flex",
            flexDirection: "column",
            gap: "10px"
          }}>
            {/* Label Size Buttons */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontSize: "0.82rem", fontWeight: "800", color: "#334155" }}>
                  مقاس الاستيكر الحراري:
                </span>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", fontWeight: "700", color: "#64748b", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={includeStoreName}
                    onChange={(e) => setIncludeStoreName(e.target.checked)}
                    style={{ accentColor: "#db2777" }}
                  />
                  <span>اسم نيللي</span>
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "6px" }}>
                {[
                  { id: "38x20", label: "38 × 20 مم", sub: "(استيكر الرول بالصورة)" },
                  { id: "38x25", label: "38 × 25 مم", sub: "(مقاس قياسي)" },
                  { id: "40x20", label: "40 × 20 مم", sub: "(مقاس صغير)" },
                  { id: "50x30", label: "50 × 30 مم", sub: "(مقاس عريض)" }
                ].map((size) => (
                  <button
                    key={size.id}
                    type="button"
                    onClick={() => setLabelSize(size.id)}
                    style={{
                      padding: "6px 2px",
                      borderRadius: "10px",
                      border: labelSize === size.id ? "2px solid #db2777" : "1px solid #cbd5e1",
                      background: labelSize === size.id ? "#fdf2f8" : "#ffffff",
                      color: labelSize === size.id ? "#db2777" : "#475569",
                      cursor: "pointer",
                      textAlign: "center",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <strong style={{ fontSize: "0.78rem", display: "block" }}>{size.label}</strong>
                    <span style={{ fontSize: "0.64rem", opacity: 0.85 }}>{size.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Orientation Buttons (Landscape vs Portrait) */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "8px", borderTop: "1px dashed #cbd5e1" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: "800", color: "#334155" }}>
                اتجاه سحب الورقة في الطابعة:
              </span>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => setOrientation("landscape")}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "8px",
                    border: orientation === "landscape" ? "2px solid #db2777" : "1px solid #cbd5e1",
                    background: orientation === "landscape" ? "#db2777" : "#ffffff",
                    color: orientation === "landscape" ? "#ffffff" : "#475569",
                    fontSize: "0.78rem",
                    fontWeight: "800",
                    cursor: "pointer"
                  }}
                >
                  بالعرض (Landscape)
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation("portrait")}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "8px",
                    border: orientation === "portrait" ? "2px solid #db2777" : "1px solid #cbd5e1",
                    background: orientation === "portrait" ? "#db2777" : "#ffffff",
                    color: orientation === "portrait" ? "#ffffff" : "#475569",
                    fontSize: "0.78rem",
                    fontWeight: "800",
                    cursor: "pointer"
                  }}
                >
                  بالطول (Portrait)
                </button>
              </div>
            </div>
          </div>

          {/* Preview Box */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            background: "#f1f5f9",
            borderRadius: "16px",
            border: "1px dashed #cbd5e1"
          }}>
            <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: "700", marginBottom: "8px" }}>
              معاينة ملصق الاستيكر الفعلي:
            </span>

            {/* PREVIEW CONTAINER */}
            <div 
              style={{
                width: labelSize === "38x25" ? "260px" : labelSize === "40x20" ? "240px" : "300px",
                background: "#ffffff",
                color: "#000000",
                borderRadius: "8px",
                border: "1.5px solid #000000",
                padding: "10px 14px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                fontFamily: "Arial, Tahoma, sans-serif",
                boxShadow: "0 6px 16px rgba(0,0,0,0.08)"
              }}
            >
              {/* Header */}
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

          {/* Quick Copy */}
          <div style={{
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

        {/* Fixed Footer */}
        <div style={{
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

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={handleDownloadImage}
              className="btn-secondary"
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px" }}
              title="تنزيل ملصق الباركود كصورة عالية الجودة"
            >
              <Download size={16} />
              <span>حفظ صورة الاستيكر</span>
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
    </div>
  );
}
