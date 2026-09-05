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
  const [labelSize, setLabelSize] = useState("38x20"); // "38x20" | "38x25" | "40x20" | "50x30"
  const [orientation, setOrientation] = useState("landscape"); // "landscape" | "portrait"
  const [includeStoreName, setIncludeStoreName] = useState(true);
  const [fontSizeMode, setFontSizeMode] = useState("compact"); // "compact" (صغير ومناسب) | "mini" (فائق الصغر) | "standard" (عادي)
  const barcodeSvgRef = useRef(null);
  const printIframeRef = useRef(null);

  const rawBarcodeValue = employee?.code ? String(employee.code).trim().toUpperCase() : "EMP-01";
  // Code128 supports ASCII printable characters (letters, numbers, dashes)
  const barcodeValue = rawBarcodeValue.replace(/[^\x20-\x7E]/g, "") || "EMP01";

  // Sizes in mm (Strict thermal printer dimensions)
  const sizeMap = {
    "38x20": { w: 38, h: 20, barWidth: 1.3, barHeight: 28 },
    "38x25": { w: 38, h: 25, barWidth: 1.4, barHeight: 34 },
    "40x20": { w: 40, h: 20, barWidth: 1.3, barHeight: 28 },
    "50x30": { w: 50, h: 30, barWidth: 1.8, barHeight: 42 }
  };

  // Generate real vector Code128 Barcode
  useEffect(() => {
    if (!isOpen || !employee || !barcodeSvgRef.current) return;

    try {
      const config = sizeMap[labelSize] || sizeMap["38x20"];
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
      console.error("JsBarcode generation error:", err);
    }
  }, [isOpen, employee, barcodeValue, labelSize, orientation]);

  if (!isOpen || !employee) return null;

  // Render high-res sticker on 300 DPI Canvas
  const createStickerCanvas = (callback) => {
    const config = sizeMap[labelSize] || sizeMap["38x20"];
    const widthMm = config.w;
    const heightMm = config.h;

    const svgElement = barcodeSvgRef.current;
    if (!svgElement) {
      console.warn("Barcode SVG element not found.");
      return;
    }

    let svgString = new XMLSerializer().serializeToString(svgElement);
    if (!svgString.includes("xmlns")) {
      svgString = svgString.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const URL = window.URL || window.webkitURL || window;
    const blobURL = URL.createObjectURL(svgBlob);

    const image = new Image();
    image.onload = () => {
      try {
        const scale = 12; // 12 px per mm = ~300 DPI
        const canvasWidth = widthMm * scale;
        const canvasHeight = heightMm * scale;

        const canvas = document.createElement("canvas");
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext("2d");

        // Crisp white background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Clean outer border (thin & sharp)
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(4, 4, canvasWidth - 8, canvasHeight - 8);

        // Font size presets
        const fontHeaderSize = fontSizeMode === "mini" ? 11 : fontSizeMode === "compact" ? 13 : 16;
        const fontFooterCode = fontSizeMode === "mini" ? 12 : fontSizeMode === "compact" ? 14 : 17;
        const fontFooterRole = fontSizeMode === "mini" ? 10 : fontSizeMode === "compact" ? 12 : 14;

        const headerBandHeight = fontSizeMode === "mini" ? 18 : 22;
        const footerBandHeight = fontSizeMode === "mini" ? 18 : 22;

        // 1. Header: Employee Name (Right) + NELLY (Left)
        ctx.fillStyle = "#000000";
        ctx.font = `bold ${fontHeaderSize}px Arial, Tahoma, sans-serif`;
        ctx.textAlign = "right";
        ctx.fillText(employee.name || "", canvasWidth - 10, headerBandHeight - 5);

        if (includeStoreName) {
          ctx.font = `bold ${Math.max(fontHeaderSize - 2, 9)}px Arial, Tahoma, sans-serif`;
          ctx.textAlign = "left";
          ctx.fillText("★ NELLY ★", 10, headerBandHeight - 5);
        }

        // Divider Line 1
        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.moveTo(6, headerBandHeight);
        ctx.lineTo(canvasWidth - 6, headerBandHeight);
        ctx.stroke();

        // 2. Barcode Vector Graphic (Takes maximum available center height)
        const barcodeTop = headerBandHeight + 3;
        const barcodeHeight = canvasHeight - headerBandHeight - footerBandHeight - 6;
        ctx.drawImage(image, 10, barcodeTop, canvasWidth - 20, barcodeHeight);

        // Divider Line 2
        const footerDividerY = canvasHeight - footerBandHeight;
        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.moveTo(6, footerDividerY);
        ctx.lineTo(canvasWidth - 6, footerDividerY);
        ctx.stroke();

        // 3. Footer: Barcode Code (Left) + Role (Right)
        ctx.font = `bold ${fontFooterCode}px monospace, Courier`;
        ctx.textAlign = "left";
        ctx.fillText(barcodeValue, 10, canvasHeight - 6);

        ctx.font = `bold ${fontFooterRole}px Arial, Tahoma, sans-serif`;
        ctx.textAlign = "right";
        ctx.fillText(employee.role || "بائع", canvasWidth - 10, canvasHeight - 6);

        callback(canvas, widthMm, heightMm);
      } catch (err) {
        console.error("Canvas draw error:", err);
      } finally {
        URL.revokeObjectURL(blobURL);
      }
    };

    image.onerror = (err) => {
      console.error("Image decode error from SVG blob:", err);
      URL.revokeObjectURL(blobURL);
    };

    image.src = blobURL;
  };

  // Direct Thermal Printing via High-DPI Canvas
  const handlePrint = () => {
    createStickerCanvas((canvas, widthMm, heightMm) => {
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

      // Remove existing iframe to prevent reuse state issues
      const oldIframe = document.getElementById("thermal-print-hidden-iframe");
      if (oldIframe) {
        oldIframe.remove();
      }

      const iframe = document.createElement("iframe");
      iframe.id = "thermal-print-hidden-iframe";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      iframe.style.zIndex = "-9999";
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(printHtml);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch (printErr) {
          console.error("Print invocation error:", printErr);
        }
      }, 250);
    });
  };

  // Download barcode image directly
  const handleDownloadImage = () => {
    createStickerCanvas((canvas) => {
      try {
        const pngUrl = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `Barcode_${employee?.name || "Employee"}_${barcodeValue}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      } catch (err) {
        console.error("Download image error:", err);
      }
    });
  };

  const handleCopyCode = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(barcodeValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const previewFontHeader = fontSizeMode === "mini" ? "9.5px" : fontSizeMode === "compact" ? "11px" : "13px";
  const previewFontCode = fontSizeMode === "mini" ? "10px" : fontSizeMode === "compact" ? "11.5px" : "14px";
  const previewFontRole = fontSizeMode === "mini" ? "9px" : fontSizeMode === "compact" ? "10px" : "12px";

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
          gap: "14px"
        }}>
          {/* Controls: Size, Orientation, Font Density */}
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
                  { id: "38x20", label: "38 × 20 مم", sub: "(استيكر الرول)" },
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

            {/* Font Density Options */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "8px", borderTop: "1px dashed #cbd5e1" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: "800", color: "#334155" }}>
                حجم الكتابة على الاستيكر:
              </span>
              <div style={{ display: "flex", gap: "6px" }}>
                {[
                  { id: "compact", label: "صغير ومناسب (موصى به)" },
                  { id: "mini", label: "ميني فائق الصغر" },
                  { id: "standard", label: "عادي" }
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setFontSizeMode(mode.id)}
                    style={{
                      padding: "4px 8px",
                      borderRadius: "8px",
                      border: fontSizeMode === mode.id ? "2px solid #db2777" : "1px solid #cbd5e1",
                      background: fontSizeMode === mode.id ? "#fdf2f8" : "#ffffff",
                      color: fontSizeMode === mode.id ? "#db2777" : "#475569",
                      fontSize: "0.74rem",
                      fontWeight: "800",
                      cursor: "pointer"
                    }}
                  >
                    {mode.label}
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
                    padding: "4px 10px",
                    borderRadius: "8px",
                    border: orientation === "landscape" ? "2px solid #db2777" : "1px solid #cbd5e1",
                    background: orientation === "landscape" ? "#db2777" : "#ffffff",
                    color: orientation === "landscape" ? "#ffffff" : "#475569",
                    fontSize: "0.76rem",
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
                    padding: "4px 10px",
                    borderRadius: "8px",
                    border: orientation === "portrait" ? "2px solid #db2777" : "1px solid #cbd5e1",
                    background: orientation === "portrait" ? "#db2777" : "#ffffff",
                    color: orientation === "portrait" ? "#ffffff" : "#475569",
                    fontSize: "0.76rem",
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
              معاينة ملصق الاستيكر الفعلي المطبوع:
            </span>

            {/* PREVIEW CONTAINER */}
            <div 
              style={{
                width: labelSize === "38x20" ? "250px" : labelSize === "38x25" ? "260px" : labelSize === "40x20" ? "250px" : "300px",
                background: "#ffffff",
                color: "#000000",
                borderRadius: "6px",
                border: "1px solid #000000",
                padding: "6px 10px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                fontFamily: "Arial, Tahoma, sans-serif",
                boxShadow: "0 4px 12px rgba(0,0,0,0.06)"
              }}
            >
              {/* Header */}
              <div style={{ 
                width: "100%", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "space-between",
                borderBottom: "1px solid #000000",
                paddingBottom: "2px",
                marginBottom: "3px"
              }}>
                <span style={{ fontSize: previewFontHeader, fontWeight: "900", color: "#000000" }}>
                  {employee.name}
                </span>
                {includeStoreName && (
                  <span style={{ fontSize: `calc(${previewFontHeader} - 2px)`, fontWeight: "900", letterSpacing: "1px", color: "#000000" }}>
                    ★ NELLY ★
                  </span>
                )}
              </div>

              {/* Barcode Vector Graphic */}
              <div style={{ display: "flex", justifyContent: "center", width: "100%", overflow: "hidden", margin: "2px 0" }}>
                <svg ref={barcodeSvgRef} style={{ maxWidth: "100%", height: labelSize === "38x20" || labelSize === "40x20" ? "30px" : "38px" }} />
              </div>

              {/* Barcode Numbers & Code */}
              <div style={{ 
                width: "100%", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "space-between",
                paddingTop: "2px",
                borderTop: "1px solid #000000",
                marginTop: "2px"
              }}>
                <span className="num-font" dir="ltr" style={{ 
                  fontSize: previewFontCode, 
                  fontWeight: "900", 
                  letterSpacing: "1.5px", 
                  fontFamily: "monospace",
                  color: "#000000" 
                }}>
                  {barcodeValue}
                </span>
                <span style={{ fontSize: previewFontRole, fontWeight: "800", color: "#000000" }}>
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
