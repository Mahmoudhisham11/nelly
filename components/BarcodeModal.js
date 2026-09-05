"use client";

import React, { useState, useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { formatNumber } from "@/lib/utils";
import { 
  X, 
  Printer, 
  Barcode as BarcodeIcon, 
  Copy, 
  Check,
  Download
} from "lucide-react";

export default function BarcodeModal({ isOpen, onClose, product }) {
  const [showPrice, setShowPrice] = useState(true);
  const [copied, setCopied] = useState(false);
  const [labelSize, setLabelSize] = useState("50x30"); // Default standard large
  const [fontSizeMode, setFontSizeMode] = useState("compact"); // "compact" | "standard" | "mini"
  const barcodeSvgRef = useRef(null);

  const rawBarcode = product?.barcode || product?.code || "6221001001";
  const barcodeValue = String(rawBarcode).trim().replace(/[^\x20-\x7E]/g, "") || "6221001001";

  // Label sizes in mm
  const sizeMap = {
    "50x30": { w: 50, h: 30, barWidth: 1.8, barHeight: 48, label: "50 × 30 مم", sub: "(المقاس القياسي)" },
    "50x25": { w: 50, h: 25, barWidth: 1.7, barHeight: 38, label: "50 × 25 مم", sub: "(مقاس عريض)" },
    "50x40": { w: 50, h: 40, barWidth: 1.9, barHeight: 58, label: "50 × 40 مم", sub: "(مقاس كبير جداً)" },
    "60x40": { w: 60, h: 40, barWidth: 2.1, barHeight: 62, label: "60 × 40 مم", sub: "(مقاس جامبو)" },
    "38x25": { w: 38, h: 25, barWidth: 1.4, barHeight: 34, label: "38 × 25 مم", sub: "(مقاس وسط)" },
    "38x20": { w: 38, h: 20, barWidth: 1.3, barHeight: 28, label: "38 × 20 مم", sub: "(مقاس صغير)" }
  };

  const displayPrice = product?.sellingPrice ? product.sellingPrice : product?.wholesalePrice || 0;
  const priceLabel = product?.sellingPrice ? "قطاعي" : "جملة";

  // Generate real vector Code128 Barcode using JsBarcode
  useEffect(() => {
    if (!isOpen || !product || !barcodeSvgRef.current) return;

    try {
      const config = sizeMap[labelSize] || sizeMap["50x30"];
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
      console.error("JsBarcode error in BarcodeModal:", err);
    }
  }, [isOpen, product, barcodeValue, labelSize]);

  if (!isOpen || !product) return null;

  // Render high-res sticker on 300 DPI Canvas (100% BORDERLESS - No strokeRect, No setLineDash, No divider lines)
  const createStickerCanvas = (callback) => {
    const config = sizeMap[labelSize] || sizeMap["50x30"];
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
        const scale = 12; // 12 px per mm = ~300 DPI (304.8 DPI exact for thermal crispness)
        const canvasWidth = widthMm * scale;
        const canvasHeight = heightMm * scale;

        const canvas = document.createElement("canvas");
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext("2d");

        // 1. Pure Crisp White Background (100% BORDERLESS - Absolute zero strokeRect or lines touching borders)
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Proportional sizing based on sticker dimensions
        const isSmall = widthMm < 45 || heightMm < 25;
        const fontMult = fontSizeMode === "mini" ? 0.82 : fontSizeMode === "standard" ? 1.18 : 1.0;

        const headerBandHeight = Math.round(canvasHeight * (isSmall ? 0.23 : 0.21));
        const footerBandHeight = Math.round(canvasHeight * (isSmall ? 0.24 : 0.22));

        const fontTitleSize = Math.round((isSmall ? 18 : 24) * fontMult);
        const fontStoreSize = Math.round((isSmall ? 11 : 13) * fontMult);
        const fontBarcodeSize = Math.round((isSmall ? 18 : 24) * fontMult);
        const fontPriceSize = Math.round((isSmall ? 17 : 22) * fontMult);

        const safeMarginX = Math.round(canvasWidth * 0.05); // 5% quiet zone from edges

        // Helper to truncate text safely if product name is extra long
        const truncateToFit = (text, maxW) => {
          if (!text) return "";
          if (ctx.measureText(text).width <= maxW) return text;
          let trimmed = text;
          while (trimmed.length > 2 && ctx.measureText(trimmed + "...").width > maxW) {
            trimmed = trimmed.slice(0, -1);
          }
          return trimmed + "...";
        };

        // 2. Header: Product Name (Right) + Store Brand (Left) - Vertically centered, strictly no collision
        const headerCenterY = Math.round(headerBandHeight / 2) + 2;
        ctx.fillStyle = "#000000";
        ctx.textBaseline = "middle";

        const storeText = "★ NELLY ★";
        ctx.font = `900 ${fontStoreSize}px Arial, Tahoma, sans-serif`;
        const storeWidth = ctx.measureText(storeText).width;

        ctx.textAlign = "left";
        ctx.fillText(storeText, safeMarginX, headerCenterY);

        ctx.font = `900 ${fontTitleSize}px Arial, Tahoma, sans-serif`;
        ctx.textAlign = "right";
        const maxTitleWidth = canvasWidth - (safeMarginX * 2) - storeWidth - 14;
        const safeTitle = truncateToFit(product.name || "منتج", maxTitleWidth);
        ctx.fillText(safeTitle, canvasWidth - safeMarginX, headerCenterY);

        // 3. Barcode Vector Graphic (Proportionally centered horizontally and vertically with safe quiet zones)
        const barcodeTop = headerBandHeight + 2;
        const barcodeAvailableHeight = canvasHeight - headerBandHeight - footerBandHeight - 4;
        const maxSafeW = Math.round(canvasWidth * 0.88); // 6% quiet zone on each side

        const imgAspect = (image.width && image.height) ? (image.width / image.height) : 2.6;
        let drawH = barcodeAvailableHeight;
        let drawW = drawH * imgAspect;

        if (drawW > maxSafeW) {
          drawW = maxSafeW;
          drawH = drawW / imgAspect;
        }

        const drawX = Math.round((canvasWidth - drawW) / 2);
        const drawY = Math.round(barcodeTop + (barcodeAvailableHeight - drawH) / 2);
        ctx.drawImage(image, drawX, drawY, drawW, drawH);

        // 4. Footer: Barcode Digits (Left) + Price (Right) - Vertically centered
        const footerCenterY = canvasHeight - Math.round(footerBandHeight / 2);
        ctx.fillStyle = "#000000";
        ctx.textBaseline = "middle";

        if (showPrice && displayPrice > 0) {
          ctx.font = `900 ${fontBarcodeSize}px monospace, Courier`;
          ctx.textAlign = "left";
          ctx.fillText(barcodeValue, safeMarginX, footerCenterY);

          ctx.font = `900 ${fontPriceSize}px Arial, Tahoma, sans-serif`;
          ctx.textAlign = "right";
          ctx.fillText(`${formatNumber(displayPrice)} ج.م`, canvasWidth - safeMarginX, footerCenterY);
        } else {
          // Centered barcode digits if price is hidden
          ctx.font = `900 ${fontBarcodeSize}px monospace, Courier`;
          ctx.textAlign = "center";
          ctx.fillText(barcodeValue, Math.round(canvasWidth / 2), footerCenterY);
        }

        callback(canvas, widthMm, heightMm);
      } catch (err) {
        console.error("Canvas draw error in BarcodeModal:", err);
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

  // Direct Thermal Printing via Isolated Iframe
  const handlePrint = () => {
    createStickerCanvas((canvas, widthMm, heightMm) => {
      const stickerDataUrl = canvas.toDataURL("image/png");

      const printHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>Product_Barcode_${barcodeValue}</title>
          <style>
            @page {
              size: ${widthMm}mm ${heightMm}mm;
              margin: 0 !important;
            }
            @media print {
              html, body {
                width: ${widthMm}mm !important;
                height: ${heightMm}mm !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                outline: none !important;
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
                border: none !important;
                outline: none !important;
                page-break-after: avoid !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                object-fit: fill !important;
              }
            }
            * {
              box-sizing: border-box !important;
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
              outline: none !important;
            }
            html, body {
              width: ${widthMm}mm;
              height: ${heightMm}mm;
              margin: 0;
              padding: 0;
              overflow: hidden;
              background: #ffffff;
              line-height: 0;
            }
            img {
              width: ${widthMm}mm;
              height: ${heightMm}mm;
              display: block;
              margin: 0;
              padding: 0;
              border: none;
              outline: none;
              object-fit: fill;
            }
          </style>
        </head>
        <body>
          <img src="${stickerDataUrl}" alt="Product Barcode Sticker" />
        </body>
        </html>
      `;

      // Refresh iframe
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
        downloadLink.download = `Barcode_${product?.name || "Product"}_${barcodeValue}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      } catch (err) {
        console.error("Download image error:", err);
      }
    });
  };

  const handleCopyBarcode = () => {
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
          maxWidth: "520px", 
          maxHeight: "min(92vh, 780px)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          padding: 0,
          background: "#ffffff", 
          borderRadius: "20px" 
        }}
      >
        {/* Top Header */}
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between", 
          padding: "16px 20px",
          borderBottom: "1px solid #fce7f3",
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
                طباعة ملصق الباركود للمنتج
              </h3>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: "600" }}>
                ملصق حراري بدون إطار - خط كبير عالي الوضوح
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
          {/* Controls: Size, Price, Font Mode */}
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
                <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontWeight: "700", color: "#db2777", fontSize: "0.78rem" }}>
                  <input 
                    type="checkbox" 
                    checked={showPrice} 
                    onChange={(e) => setShowPrice(e.target.checked)} 
                    style={{ accentColor: "#db2777" }}
                  />
                  <span>إظهار السعر بالملصق</span>
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px" }}>
                {[
                  { id: "50x30", label: "50 × 30 مم", sub: "(المقاس القياسي)" },
                  { id: "50x25", label: "50 × 25 مم", sub: "(مقاس عريض)" },
                  { id: "50x40", label: "50 × 40 مم", sub: "(مقاس كبير جداً)" },
                  { id: "60x40", label: "60 × 40 مم", sub: "(مقاس جامبو)" },
                  { id: "38x25", label: "38 × 25 مم", sub: "(مقاس وسط)" },
                  { id: "38x20", label: "38 × 20 مم", sub: "(مقاس صغير)" }
                ].map((size) => (
                  <button
                    key={size.id}
                    type="button"
                    onClick={() => setLabelSize(size.id)}
                    style={{
                      padding: "6px 4px",
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
                  { id: "compact", label: "متناسق واحترافي (موصى به)" },
                  { id: "standard", label: "خط عريض وكبير" },
                  { id: "mini", label: "ميني صغير" }
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
          </div>

          {/* ===================================================================
              PREVIEW (BORDERLESS 100% - MATCHES PHYSICAL THERMAL STICKER)
             =================================================================== */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            background: "#f8fafc",
            borderRadius: "16px",
            border: "1px solid #e2e8f0"
          }}>
            <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: "700", marginBottom: "8px" }}>
              معاينة ملصق المنتج الفعلي المطبوع ({sizeMap[labelSize]?.label}):
            </span>

            {/* PREVIEW CONTAINER (100% BORDERLESS) */}
            <div 
              style={{
                width: labelSize === "60x40" ? "350px" : labelSize === "50x40" ? "330px" : labelSize === "50x30" ? "320px" : labelSize === "50x25" ? "320px" : labelSize === "38x25" ? "270px" : "260px",
                background: "#ffffff",
                color: "#000000",
                borderRadius: "4px",
                border: "none",
                padding: "8px 12px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "space-between",
                textAlign: "center",
                fontFamily: "Arial, Tahoma, sans-serif",
                boxShadow: "0 4px 14px rgba(0,0,0,0.06)"
              }}
            >
              {/* Product Header (Clean Borderless) */}
              <div style={{ 
                width: "100%", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "space-between",
                paddingBottom: "2px"
              }}>
                <span style={{ 
                  fontSize: labelSize.startsWith("50") || labelSize.startsWith("60") ? "15px" : "13px", 
                  fontWeight: "900", 
                  color: "#000000",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "75%"
                }}>
                  {product.name}
                </span>
                <span style={{ fontSize: labelSize.startsWith("50") || labelSize.startsWith("60") ? "11.5px" : "10px", fontWeight: "900", letterSpacing: "1px", color: "#000000" }}>
                  ★ NELLY ★
                </span>
              </div>

              {/* Barcode Vector Graphic (Centered) */}
              <div style={{ display: "flex", justifyContent: "center", width: "100%", overflow: "hidden", margin: "2px 0" }}>
                <svg ref={barcodeSvgRef} style={{ maxWidth: "90%", height: labelSize === "60x40" || labelSize === "50x40" ? "54px" : labelSize === "50x30" ? "46px" : "34px" }} />
              </div>

              {/* Barcode Digits & Price (Clean Borderless) */}
              <div style={{ 
                width: "100%", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "space-between",
                paddingTop: "2px"
              }}>
                <span className="num-font" dir="ltr" style={{ 
                  fontSize: labelSize.startsWith("50") || labelSize.startsWith("60") ? "15px" : "13.5px", 
                  fontWeight: "900", 
                  letterSpacing: "2px", 
                  fontFamily: "monospace",
                  color: "#000000" 
                }}>
                  {barcodeValue}
                </span>
                {showPrice && displayPrice > 0 && (
                  <span style={{ fontSize: labelSize.startsWith("50") || labelSize.startsWith("60") ? "14px" : "12px", fontWeight: "900", color: "#000000" }}>
                    <span className="num-font" dir="ltr">{formatNumber(displayPrice)}</span> ج.م
                  </span>
                )}
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
              <span style={{ fontSize: "0.75rem", color: "#831843", display: "block" }}>كود الباركود الدولي:</span>
              <strong className="num-font" style={{ fontSize: "0.95rem", color: "#db2777" }}>{barcodeValue}</strong>
            </div>

            <button
              type="button"
              onClick={handleCopyBarcode}
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
          borderTop: "1px solid #fce7f3",
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
