"use client";

import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { formatNumber } from "@/lib/utils";
import CustomSelect from "@/components/CustomSelect";
import { 
  X, 
  Sparkles, 
  Barcode, 
  Package, 
  Save,
  Wand2
} from "lucide-react";

export const CATEGORIES = [
  "Makeup",
  "Stainless",
  "Skin Care",
  "Accessories"
];

export default function ProductModal({ 
  isOpen, 
  onClose, 
  onSave, 
  productToEdit = null,
  hideSellingPrice = false,
  isShop = false,
  hideMinThreshold = false
}) {
  const shouldHideThreshold = isShop || hideMinThreshold;

  const [formData, setFormData] = useState({
    barcode: "",
    name: "",
    category: "Makeup",
    quantity: "",
    wholesalePrice: "",
    sellingPrice: "",
    minThreshold: "",
    brand: "",
    description: ""
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (productToEdit) {
        setFormData({
          barcode: productToEdit.barcode || productToEdit.code || "",
          name: productToEdit.name || "",
          category: productToEdit.category || "Makeup",
          quantity: productToEdit.quantity !== undefined ? productToEdit.quantity : "",
          wholesalePrice: productToEdit.wholesalePrice !== undefined ? productToEdit.wholesalePrice : "",
          sellingPrice: productToEdit.sellingPrice !== undefined ? productToEdit.sellingPrice : "",
          minThreshold: productToEdit.minThreshold !== undefined ? productToEdit.minThreshold : 5,
          brand: productToEdit.brand || "",
          description: productToEdit.description || ""
        });
      } else {
        // Pristine and empty for new product registration
        setFormData({
          barcode: "",
          name: "",
          category: "Makeup",
          quantity: "",
          wholesalePrice: "",
          sellingPrice: "",
          minThreshold: "",
          brand: "",
          description: ""
        });
      }
      setErrors({});
    }
  }, [productToEdit, isOpen]);

  const generateAutoBarcode = () => {
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const newBarcode = `622${randomSuffix}`;
    setFormData(prev => ({
      ...prev,
      barcode: newBarcode
    }));
  };

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!formData.barcode.trim()) errs.barcode = "يرجى كتابة أو توليد باركود الصنف";
    if (!formData.name.trim()) errs.name = "يرجى كتابة اسم الصنف";
    
    const qtyNum = Number(formData.quantity);
    if (formData.quantity === "" || isNaN(qtyNum) || !Number.isInteger(qtyNum) || qtyNum < 0) {
      errs.quantity = "الكمية يجب أن تكون رقماً صحيحاً 0 أو أكثر بدون كسور";
    }

    const priceNum = Number(formData.wholesalePrice);
    if (formData.wholesalePrice === "" || isNaN(priceNum) || priceNum < 0) {
      errs.wholesalePrice = "يرجى إدخال سعر جملة صحيح أكبر من أو يساوي صفر";
    }

    const sellingNum = Number(formData.sellingPrice);
    if (formData.sellingPrice !== "" && (isNaN(sellingNum) || sellingNum < 0)) {
      errs.sellingPrice = "يرجى إدخال سعر بيع صحيح";
    }

    if (!shouldHideThreshold) {
      const threshNum = Number(formData.minThreshold);
      if (formData.minThreshold !== "" && (isNaN(threshNum) || !Number.isInteger(threshNum) || threshNum < 0)) {
        errs.minThreshold = "الحد الأدنى يجب أن يكون رقماً صحيحاً 0 أو أكثر";
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const wholesale = parseFloat(formData.wholesalePrice) || 0;
      const selling = formData.sellingPrice !== "" 
        ? parseFloat(formData.sellingPrice) 
        : (wholesale > 0 ? wholesale * 1.25 : 0);

      const dataToSave = {
        barcode: formData.barcode.trim(),
        name: formData.name.trim(),
        category: formData.category,
        quantity: parseInt(formData.quantity, 10) || 0,
        wholesalePrice: wholesale,
        sellingPrice: selling,
        brand: formData.brand ? formData.brand.trim() : "Nelly",
        description: formData.description ? formData.description.trim() : ""
      };

      if (!shouldHideThreshold) {
        dataToSave.minThreshold = parseInt(formData.minThreshold, 10) || 5;
      } else if (productToEdit?.minThreshold !== undefined) {
        dataToSave.minThreshold = productToEdit.minThreshold;
      }

      await onSave(dataToSave, productToEdit?.id);

      if (!productToEdit) {
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 }
          });
        } catch (e) {}
      }

      onClose();
    } catch (err) {
      console.error("Save error:", err);
      setErrors(prev => ({
        ...prev,
        submit: err.message || "حدث خطأ أثناء حفظ بيانات الصنف."
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const cost = Number(formData.wholesalePrice) || 0;
  const retail = Number(formData.sellingPrice) || (cost > 0 ? cost * 1.25 : 0);
  const profitPerUnit = retail - cost;
  const profitMarginPercent = cost > 0 ? Math.round((profitPerUnit / cost) * 100) : 0;
  const totalWholesaleValue = (Number(formData.quantity) || 0) * cost;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ 
          maxWidth: "600px", 
          maxHeight: "min(92vh, 780px)",
          display: "flex", 
          flexDirection: "column",
          overflow: "hidden" 
        }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "42px",
              height: "42px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              flexShrink: 0,
              boxShadow: "0 4px 12px rgba(219, 39, 119, 0.25)"
            }}>
              <Package size={22} />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: "1.2rem", fontWeight: "800", color: "#1e1322", margin: 0 }}>
                {productToEdit 
                  ? (isShop ? "تعديل بيانات الصنف بالمحل" : "تعديل بيانات الصنف") 
                  : (isShop ? "تسجيل صنف جديد بالمحل" : "تسجيل صنف جديد بالمخزن")}
              </h2>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "600", margin: 0, marginTop: "2px" }}>
                {isShop ? "بضاعة محل نيللي لمستحضرات التجميل والميكاب" : "مخزن نيللي لمستحضرات التجميل والميكاب"}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="modal-close-btn"
            title="إغلاق النافذة"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Container */}
        <form 
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            flex: "1 1 auto",
            minHeight: 0,
            overflow: "hidden"
          }}
        >
          {/* Scrollable Body */}
          <div 
            className="modal-body"
            style={{ 
              padding: "20px 24px",
              overflowY: "auto"
            }}
          >
            {errors.submit && (
              <div style={{
                background: "#fef2f2",
                border: "1.5px solid #fecaca",
                borderRadius: "12px",
                padding: "10px 14px",
                marginBottom: "16px",
                color: "#b91c1c",
                fontSize: "0.85rem",
                fontWeight: "700"
              }}>
                {errors.submit}
              </div>
            )}

            {/* Row 1: Barcode & Name */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.8fr", gap: "14px", marginBottom: "14px" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>
                    باركود الصنف <span style={{ color: "#db2777" }}>*</span>
                  </label>
                  <button
                    type="button"
                    onClick={generateAutoBarcode}
                    style={{
                      background: "#fdf2f8",
                      border: "1px solid #fbcfe8",
                      borderRadius: "6px",
                      color: "#db2777",
                      fontSize: "0.75rem",
                      fontWeight: "700",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "2px 8px"
                    }}
                    title="توليد باركود تلقائي"
                  >
                    <Wand2 size={12} />
                    توليد
                  </button>
                </div>
                <input 
                  type="text"
                  className="form-input num-font"
                  dir="ltr"
                  placeholder="622..."
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  style={{ fontWeight: "bold" }}
                />
                {errors.barcode && <span style={{ color: "#dc2626", fontSize: "0.75rem", fontWeight: "bold", display: "block", marginTop: "4px" }}>{errors.barcode}</span>}
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  {isShop ? "اسم الصنف بالمحل" : "اسم الصنف بالمخزن"} <span style={{ color: "#db2777" }}>*</span>
                </label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="مثال: أحمر شفاه مات نيللي - درجة روز 05"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                {errors.name && <span style={{ color: "#dc2626", fontSize: "0.75rem", fontWeight: "bold", display: "block", marginTop: "4px" }}>{errors.name}</span>}
              </div>
            </div>

            {/* Row 2: Category & Brand */}
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "14px", marginBottom: "14px" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">التصنيف / Category</label>
                <CustomSelect 
                  options={CATEGORIES}
                  value={formData.category}
                  onChange={(cat) => setFormData({ ...formData, category: cat })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">الماركة / البراند</label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="Nelly Beauty"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                />
              </div>
            </div>

            {/* Row 3: Quantity, Wholesale Price, and optional Selling Price */}
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: hideSellingPrice ? "1fr 1fr" : "1fr 1fr 1fr", 
              gap: "12px", 
              marginBottom: "14px" 
            }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  {isShop ? "الكمية المتوفرة بالمحل" : "الكمية المتوفرة"} <span style={{ color: "#db2777" }}>*</span>
                </label>
                <input 
                  type="number"
                  min="0"
                  dir="ltr"
                  className="form-input num-font"
                  placeholder="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  style={{ fontSize: "1.05rem", fontWeight: "700" }}
                />
                {errors.quantity && <span style={{ color: "#dc2626", fontSize: "0.75rem", fontWeight: "bold", display: "block", marginTop: "4px" }}>{errors.quantity}</span>}
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  سعر التكلفة/الجملة <span style={{ color: "#db2777" }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <input 
                    type="number"
                    min="0"
                    step="0.5"
                    dir="ltr"
                    className="form-input num-font"
                    placeholder="0.00"
                    value={formData.wholesalePrice}
                    onChange={(e) => setFormData({ ...formData, wholesalePrice: e.target.value })}
                    style={{ fontSize: "1.05rem", fontWeight: "700", paddingLeft: "40px" }}
                  />
                  <span style={{
                    position: "absolute",
                    left: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#9d174d",
                    fontSize: "0.8rem",
                    fontWeight: "bold"
                  }}>
                    ج.م
                  </span>
                </div>
                {errors.wholesalePrice && <span style={{ color: "#dc2626", fontSize: "0.75rem", fontWeight: "bold", display: "block", marginTop: "4px" }}>{errors.wholesalePrice}</span>}
              </div>

              {!hideSellingPrice && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    سعر البيع (قطاعي) <span style={{ color: "#16a34a" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <input 
                      type="number"
                      min="0"
                      step="0.5"
                      dir="ltr"
                      className="form-input num-font"
                      placeholder={cost > 0 ? (cost * 1.25).toFixed(1) : "0.00"}
                      value={formData.sellingPrice}
                      onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                      style={{ fontSize: "1.05rem", fontWeight: "700", paddingLeft: "40px", borderColor: "#86efac" }}
                    />
                    <span style={{
                      position: "absolute",
                      left: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#16a34a",
                      fontSize: "0.8rem",
                      fontWeight: "bold"
                    }}>
                      ج.م
                    </span>
                  </div>
                  {errors.sellingPrice && <span style={{ color: "#dc2626", fontSize: "0.75rem", fontWeight: "bold", display: "block", marginTop: "4px" }}>{errors.sellingPrice}</span>}
                </div>
              )}
            </div>

            {/* Row 4: Min Threshold (Only if warehouse / not hidden) */}
            {!shouldHideThreshold && (
              <div className="form-group" style={{ marginBottom: "14px" }}>
                <label className="form-label">حد التنبيه عند نقص المخزون (إعادة الطلب)</label>
                <input 
                  type="number"
                  min="1"
                  dir="ltr"
                  className="form-input num-font"
                  placeholder="5"
                  value={formData.minThreshold}
                  onChange={(e) => setFormData({ ...formData, minThreshold: e.target.value })}
                />
                {errors.minThreshold && <span style={{ color: "#dc2626", fontSize: "0.75rem", fontWeight: "bold", display: "block", marginTop: "4px" }}>{errors.minThreshold}</span>}
              </div>
            )}

            {/* Real-time valuation & profit banner */}
            <div style={{
              background: "linear-gradient(135deg, #fdf2f8 0%, #fef3f9 100%)",
              border: "1.5px dashed #fbcfe8",
              borderRadius: "14px",
              padding: "14px 18px",
              marginBottom: "4px"
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: (!hideSellingPrice && cost > 0 && retail > 0) ? "8px" : "0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Sparkles size={18} color="#db2777" />
                  <span style={{ fontSize: "0.88rem", color: "#1e1322", fontWeight: "800" }}>
                    {isShop ? "إجمالي قيمة بضاعة هذا الصنف بالمحل (بالجملة):" : "إجمالي قيمة المخزون لهذا الصنف (بالجملة):"}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                  <span className="num-font" dir="ltr" style={{ fontSize: "1.25rem", fontWeight: "900", color: "#9d174d" }}>
                    {formatNumber(totalWholesaleValue)}
                  </span>
                  <span style={{ fontSize: "0.82rem", color: "#9d174d", fontWeight: "800" }}>ج.م</span>
                </div>
              </div>

              {!hideSellingPrice && cost > 0 && retail > 0 && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingTop: "8px",
                  borderTop: "1px dashed #fbcfe8",
                  fontSize: "0.84rem"
                }}>
                  <span style={{ color: "#4b5563", fontWeight: "700" }}>
                    ربح القطعة المتوقع: <strong style={{ color: profitPerUnit >= 0 ? "#16a34a" : "#dc2626" }}>{formatNumber(profitPerUnit)} ج.م</strong>
                  </span>
                  <span style={{
                    background: profitMarginPercent >= 0 ? "#ecfdf5" : "#fef2f2",
                    color: profitMarginPercent >= 0 ? "#059669" : "#dc2626",
                    padding: "2px 8px",
                    borderRadius: "8px",
                    fontWeight: "800",
                    border: `1px solid ${profitMarginPercent >= 0 ? "#a7f3d0" : "#fecaca"}`
                  }}>
                    هامش الربح: %{profitMarginPercent}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="modal-footer" style={{ padding: "14px 24px" }}>
            <button 
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              إلغاء
            </button>
            <button 
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
              style={{ minWidth: "140px" }}
            >
              <Save size={18} />
              {isSubmitting ? "جاري الحفظ..." : (productToEdit ? "حفظ التعديلات" : (isShop ? "إضافة الصنف للمحل" : "إضافة الصنف للمخزن"))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
