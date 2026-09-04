"use client";

import React, { useState, useMemo } from "react";
import { formatNumber, roundCurrency } from "@/lib/utils";
import { 
  X, 
  Printer, 
  FileText, 
  CheckCircle2, 
  Boxes, 
  Layers, 
  DollarSign, 
  AlertTriangle,
  SlidersHorizontal,
  Check,
  ShieldAlert
} from "lucide-react";

export default function PrintInventoryModal({ 
  isOpen, 
  onClose, 
  products = [],
  title = "كشف جرد الأصناف ومطابقة المخزون",
  locationName = "مخزن نيللي لمستحضرات التجميل"
}) {
  const [includeValuation, setIncludeValuation] = useState(true);
  const [includeAuditColumn, setIncludeAuditColumn] = useState(true);
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortBy, setSortBy] = useState("name_asc"); // "name_asc" | "qty_asc" | "qty_desc" | "category"

  if (!isOpen) return null;

  // Categories list
  const categories = useMemo(() => {
    const set = new Set(products.map(p => p.category).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [products]);

  // Filtered and sorted products
  const processedProducts = useMemo(() => {
    let list = products.filter(p => filterCategory === "all" || p.category === filterCategory);

    return list.sort((a, b) => {
      if (sortBy === "name_asc") return (a.name || "").localeCompare(b.name || "", "ar");
      if (sortBy === "qty_asc") return (Number(a.quantity) || 0) - (Number(b.quantity) || 0);
      if (sortBy === "qty_desc") return (Number(b.quantity) || 0) - (Number(a.quantity) || 0);
      if (sortBy === "category") return (a.category || "").localeCompare(b.category || "", "ar");
      return 0;
    });
  }, [products, filterCategory, sortBy]);

  // Calculations
  const totalItemsCount = processedProducts.length;
  const totalQuantityCount = processedProducts.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
  const totalWholesaleValue = roundCurrency(
    processedProducts.reduce((acc, curr) => acc + ((Number(curr.quantity) || 0) * (Number(curr.wholesalePrice) || 0)), 0)
  );
  const lowStockCount = processedProducts.filter(p => (Number(p.quantity) || 0) <= (Number(p.minThreshold) || 5)).length;

  const currentDate = new Date();
  const dayNames = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  const formattedDate = `${dayNames[currentDate.getDay()]} ${currentDate.getDate()} ${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  
  let hours = currentDate.getHours();
  const minutes = String(currentDate.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "م" : "ص";
  hours = hours % 12 || 12;
  const formattedTime = `${hours}:${minutes} ${ampm}`;

  const reportSerial = `INV-${currentDate.getFullYear()}${String(currentDate.getMonth() + 1).padStart(2, '0')}${String(currentDate.getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ 
          maxWidth: "1050px", 
          width: "96%",
          padding: "24px", 
          background: "#ffffff", 
          maxHeight: "92vh",
          overflowY: "auto",
          borderRadius: "22px"
        }}
      >
        {/* Top Control Bar (Hidden on Print) */}
        <div className="no-print" style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between", 
          marginBottom: "18px",
          borderBottom: "1.5px solid #fce7f3",
          paddingBottom: "14px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff"
            }}>
              <FileText size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.25rem", color: "#1e1322", fontWeight: "900" }}>
                {title}
              </h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "600" }}>
                تقرير معتمد جاهز للطباعة المباشرة على ورق A4 أو الحفظ كملف PDF
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button 
              onClick={handlePrint} 
              className="btn-primary"
              style={{ padding: "10px 24px", fontSize: "0.95rem" }}
            >
              <Printer size={18} />
              طباعة الكشف الآن (A4)
            </button>
            <button 
              onClick={onClose}
              className="modal-close-btn"
              type="button"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Print Options Toolbar (Hidden on Print) */}
        <div className="no-print" style={{
          background: "#fdf5f9",
          border: "1px solid #fbcfe8",
          borderRadius: "14px",
          padding: "12px 18px",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          fontSize: "0.85rem"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontWeight: "700", color: "#374151" }}>
              <input 
                type="checkbox" 
                checked={includeValuation} 
                onChange={(e) => setIncludeValuation(e.target.checked)} 
                style={{ accentColor: "#db2777" }}
              />
              إظهار الأسعار والقيم المالية (للمسؤول والمحاسب)
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontWeight: "700", color: "#374151" }}>
              <input 
                type="checkbox" 
                checked={includeAuditColumn} 
                onChange={(e) => setIncludeAuditColumn(e.target.checked)} 
                style={{ accentColor: "#db2777" }}
              />
              إضافة خانة "الجرد الفعلي بالقلم ✍️"
            </label>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="form-input"
              style={{ padding: "6px 12px", fontSize: "0.82rem", borderRadius: "8px", width: "auto" }}
            >
              <option value="all">جميع الأقسام ({products.length})</option>
              {categories.filter(c => c !== "all").map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="form-input"
              style={{ padding: "6px 12px", fontSize: "0.82rem", borderRadius: "8px", width: "auto" }}
            >
              <option value="name_asc">الترتيب: أبجدياً</option>
              <option value="qty_asc">الترتيب: النواقص أولاً</option>
              <option value="qty_desc">الترتيب: الأعلى كمية</option>
              <option value="category">الترتيب: حسب القسم</option>
            </select>
          </div>
        </div>

        {/* ===================================================================
            PRINTABLE ENTERPRISE INVENTORY SHEET (Official A4 Format)
           =================================================================== */}
        <div id="printable-inventory-document" style={{
          background: "#ffffff",
          color: "#000000",
          padding: "20px 24px",
          borderRadius: "12px",
          border: "1.5px solid #d1d5db",
          fontFamily: "var(--font-family), Arial, Tahoma, sans-serif"
        }}>
          {/* Document Header */}
          <div style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            borderBottom: "2.5px solid #111827",
            paddingBottom: "14px",
            marginBottom: "16px"
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.4rem", fontWeight: "900", color: "#db2777", letterSpacing: "-0.5px" }}>
                  NELLY COSMETICS
                </span>
                <span style={{ fontSize: "1.1rem", fontWeight: "800", color: "#111827" }}>
                  | {locationName}
                </span>
              </div>
              <h1 style={{ fontSize: "1.2rem", fontWeight: "900", color: "#111827", marginTop: "4px" }}>
                {title}
              </h1>
              <div style={{ fontSize: "0.82rem", color: "#4b5563", marginTop: "4px", display: "flex", gap: "16px" }}>
                <span>تاريخ التقرير: <strong>{formattedDate}</strong></span>
                <span>توقيت الطباعة: <strong className="num-font">{formattedTime}</strong></span>
              </div>
            </div>

            {/* Official Serial & Meta Box */}
            <div style={{
              background: "#f9fafb",
              border: "1.5px solid #d1d5db",
              borderRadius: "10px",
              padding: "8px 14px",
              textAlign: "right",
              fontSize: "0.8rem",
              minWidth: "190px"
            }}>
              <div>رقم التقرير: <strong className="num-font" dir="ltr" style={{ color: "#db2777" }}>{reportSerial}</strong></div>
              <div style={{ marginTop: "2px" }}>نوع المستند: <strong>كشف جرد معتمد</strong></div>
              <div style={{ marginTop: "2px" }}>حالة المخزون: <strong>مطابقة دورية</strong></div>
            </div>
          </div>

          {/* Executive KPI Statistics Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: includeValuation ? "repeat(4, 1fr)" : "repeat(3, 1fr)",
            gap: "10px",
            marginBottom: "18px"
          }}>
            <div style={{ background: "#fdf2f8", border: "1px solid #fbcfe8", borderRadius: "8px", padding: "8px 12px" }}>
              <div style={{ fontSize: "0.75rem", color: "#9d174d", fontWeight: "700" }}>إجمالي الأصناف</div>
              <div className="num-font" dir="ltr" style={{ fontSize: "1.3rem", fontWeight: "900", color: "#831843" }}>
                {formatNumber(totalItemsCount)}
              </div>
            </div>

            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "8px 12px" }}>
              <div style={{ fontSize: "0.75rem", color: "#15803d", fontWeight: "700" }}>إجمالي عدد القطع</div>
              <div className="num-font" dir="ltr" style={{ fontSize: "1.3rem", fontWeight: "900", color: "#14532d" }}>
                {formatNumber(totalQuantityCount)}
              </div>
            </div>

            {includeValuation && (
              <div style={{ background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: "8px", padding: "8px 12px" }}>
                <div style={{ fontSize: "0.75rem", color: "#7e22ce", fontWeight: "700" }}>قيمة رأس المال (جملة)</div>
                <div style={{ fontSize: "1.3rem", fontWeight: "900", color: "#581c87" }}>
                  <span className="num-font" dir="ltr">{formatNumber(totalWholesaleValue)}</span> <span style={{ fontSize: "0.75rem" }}>ج.م</span>
                </div>
              </div>
            )}

            <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "8px", padding: "8px 12px" }}>
              <div style={{ fontSize: "0.75rem", color: "#c2410c", fontWeight: "700" }}>أصناف منخفضة / حرجة</div>
              <div className="num-font" dir="ltr" style={{ fontSize: "1.3rem", fontWeight: "900", color: "#9a3412" }}>
                {formatNumber(lowStockCount)}
              </div>
            </div>
          </div>

          {/* Clean Enterprise Inventory Table */}
          <table style={{
            width: "100%",
            borderCollapse: "collapse",
            textAlign: "right",
            fontSize: "0.85rem",
            marginBottom: "20px"
          }}>
            <thead>
              <tr style={{ background: "#f3f4f6", borderTop: "2px solid #111827", borderBottom: "2px solid #111827" }}>
                <th style={{ padding: "8px 10px", width: "35px", textAlign: "center", fontWeight: "900" }}>#</th>
                <th style={{ padding: "8px 10px", width: "130px", fontWeight: "900" }}>الباركود</th>
                <th style={{ padding: "8px 10px", fontWeight: "900" }}>اسم الصنف / الماركة</th>
                <th style={{ padding: "8px 10px", width: "110px", fontWeight: "900" }}>القسم</th>
                <th style={{ padding: "8px 10px", textAlign: "center", width: "95px", fontWeight: "900" }}>رصيد السيستم</th>
                {includeAuditColumn && (
                  <th style={{ padding: "8px 10px", textAlign: "center", width: "100px", fontWeight: "900", background: "#fef3c7" }}>
                    الجرد الفعلي ✍️
                  </th>
                )}
                {includeValuation && (
                  <>
                    <th style={{ padding: "8px 10px", textAlign: "center", width: "95px", fontWeight: "900" }}>سعر الجملة</th>
                    <th style={{ padding: "8px 10px", textAlign: "center", width: "110px", fontWeight: "900" }}>إجمالي القيمة</th>
                  </>
                )}
                <th style={{ padding: "8px 10px", textAlign: "center", width: "90px", fontWeight: "900" }}>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {processedProducts.map((item, index) => {
                const qty = Number(item.quantity) || 0;
                const cost = Number(item.wholesalePrice) || 0;
                const lineVal = qty * cost;
                const minThresh = Number(item.minThreshold) || 5;
                const isOut = qty === 0;
                const isLow = qty > 0 && qty <= minThresh;

                return (
                  <tr 
                    key={item.id || index}
                    style={{ 
                      borderBottom: "1px solid #e5e7eb",
                      background: index % 2 === 0 ? "#ffffff" : "#fdfafc"
                    }}
                  >
                    <td style={{ padding: "7px 8px", textAlign: "center", fontWeight: "700" }}>
                      <span className="num-font" dir="ltr">{index + 1}</span>
                    </td>
                    <td style={{ padding: "7px 8px" }}>
                      <span className="num-font" dir="ltr" style={{ 
                        fontFamily: "monospace", 
                        fontWeight: "900", 
                        color: "#000000",
                        letterSpacing: "0.5px"
                      }}>
                        {item.barcode || item.code || "—"}
                      </span>
                    </td>
                    <td style={{ padding: "7px 8px", fontWeight: "700", color: "#111827" }}>
                      {item.name}
                      {item.brand && <span style={{ fontSize: "0.75rem", color: "#6b7280", marginRight: "4px" }}>({item.brand})</span>}
                    </td>
                    <td style={{ padding: "7px 8px", fontSize: "0.8rem", color: "#4b5563" }}>
                      {item.category || "عام"}
                    </td>
                    <td style={{ padding: "7px 8px", textAlign: "center" }}>
                      <strong className="num-font" dir="ltr" style={{ fontSize: "0.95rem", color: isOut ? "#dc2626" : isLow ? "#c2410c" : "#111827" }}>
                        {formatNumber(qty)}
                      </strong>
                    </td>
                    {includeAuditColumn && (
                      <td style={{ padding: "7px 8px", textAlign: "center", borderLeft: "1px dashed #d1d5db", borderRight: "1px dashed #d1d5db" }}>
                        <span style={{ display: "inline-block", width: "45px", height: "18px", borderBottom: "1.5px solid #000000" }}></span>
                      </td>
                    )}
                    {includeValuation && (
                      <>
                        <td style={{ padding: "7px 8px", textAlign: "center" }}>
                          <span className="num-font" dir="ltr" style={{ fontWeight: "700" }}>{formatNumber(cost)}</span>
                        </td>
                        <td style={{ padding: "7px 8px", textAlign: "center" }}>
                          <strong className="num-font" dir="ltr" style={{ fontWeight: "900" }}>{formatNumber(lineVal)}</strong>
                        </td>
                      </>
                    )}
                    <td style={{ padding: "7px 8px", textAlign: "center", fontSize: "0.75rem", fontWeight: "800" }}>
                      {isOut ? (
                        <span style={{ color: "#dc2626" }}>نفد ❌</span>
                      ) : isLow ? (
                        <span style={{ color: "#ea580c" }}>قليل ⚠️</span>
                      ) : (
                        <span style={{ color: "#059669" }}>متوفر ✓</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Official Signatures & Approval Footer */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "20px",
            marginTop: "24px",
            paddingTop: "14px",
            borderTop: "2px solid #111827",
            textAlign: "center",
            fontSize: "0.82rem",
            color: "#111827"
          }}>
            <div>
              <div style={{ fontWeight: "800", marginBottom: "30px" }}>إعداد / مسؤول الجرد:</div>
              <div style={{ borderTop: "1px dashed #6b7280", paddingTop: "4px", color: "#6b7280" }}>التوقيع والتاريخ</div>
            </div>

            <div>
              <div style={{ fontWeight: "800", marginBottom: "30px" }}>مراجعة / مراقب المخزون:</div>
              <div style={{ borderTop: "1px dashed #6b7280", paddingTop: "4px", color: "#6b7280" }}>التوقيع والتاريخ</div>
            </div>

            <div>
              <div style={{ fontWeight: "800", marginBottom: "30px" }}>اعتماد / المدير العام:</div>
              <div style={{ borderTop: "1px dashed #6b7280", paddingTop: "4px", color: "#6b7280" }}>الختم والتوقيع الرسمي</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
