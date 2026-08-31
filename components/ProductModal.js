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
  "أحمر شفاه وروج",
  "كريم أساس وفونديشن",
  "ظلال عيون وايشادو",
  "ماسكارا وآيلاينر",
  "أحمر خدود وبلاشر",
  "كونتور وهايلايتر",
  "برايمر ومثبتات مكياج",
  "بودرة تثبيت ولوس باودر",
  "عطور وميست للجسم",
  "عناية بالبشرة وسيروم",
  "فرش وإسفنجات ميكاب",
  "أظافر ومناكير",
  "أصناف أخرى"
];

export default function ProductModal({ isOpen, onClose, onSave, productToEdit = null }) {
  const [formData, setFormData] = useState({
    barcode: "",
    name: "",
    category: "أحمر شفاه وروج",
    quantity: 1,
    wholesalePrice: "",
    minThreshold: 5,
    brand: "Nelly",
    description: ""
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (productToEdit) {
      setFormData({
        barcode: productToEdit.barcode || productToEdit.code || "",
        name: productToEdit.name || "",
        category: productToEdit.category || "أحمر شفاه وروج",
        quantity: productToEdit.quantity !== undefined ? productToEdit.quantity : 1,
        wholesalePrice: productToEdit.wholesalePrice !== undefined ? productToEdit.wholesalePrice : "",
        minThreshold: productToEdit.minThreshold !== undefined ? productToEdit.minThreshold : 5,
        brand: productToEdit.brand || "Nelly",
        description: productToEdit.description || ""
      });
    } else {
      generateAutoBarcode();
    }
    setErrors({});
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

    const threshNum = Number(formData.minThreshold);
    if (formData.minThreshold !== "" && (isNaN(threshNum) || !Number.isInteger(threshNum) || threshNum < 0)) {
      errs.minThreshold = "الحد الأدنى يجب أن يكون رقماً صحيحاً 0 أو أكثر";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const dataToSave = {
        barcode: formData.barcode.trim(),
        name: formData.name.trim(),
        category: formData.category,
        quantity: parseInt(formData.quantity, 10) || 0,
        wholesalePrice: parseFloat(formData.wholesalePrice) || 0,
        minThreshold: parseInt(formData.minThreshold, 10) || 5,
        brand: formData.brand ? formData.brand.trim() : "Nelly",
        description: formData.description ? formData.description.trim() : ""
      };

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

  const totalWholesaleValue = (Number(formData.quantity) || 0) * (Number(formData.wholesalePrice) || 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ padding: "28px" }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", borderBottom: "1px solid #f0e1ec", paddingBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff"
            }}>
              <Package size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.25rem", color: "#1e1322", fontWeight: "800" }}>
                {productToEdit ? "تعديل بيانات الصنف" : "تسجيل صنف جديد بالمخزن"}
              </h2>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "600" }}>
                مخزن نيللي لمستحضرات التجميل والميكاب
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: "#fdf2f8",
              border: "1px solid #fbcfe8",
              borderRadius: "8px",
              width: "34px",
              height: "34px",
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

        {/* Form */}
        <form onSubmit={handleSubmit}>
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
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <label className="form-label">
                  باركود الصنف <span style={{ color: "#db2777" }}>*</span>
                </label>
                <button
                  type="button"
                  onClick={generateAutoBarcode}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#db2777",
                    fontSize: "0.75rem",
                    fontWeight: "bold",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "3px"
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
              {errors.barcode && <span style={{ color: "#dc2626", fontSize: "0.75rem", fontWeight: "bold" }}>{errors.barcode}</span>}
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                اسم الصنف بالمخزن <span style={{ color: "#db2777" }}>*</span>
              </label>
              <input 
                type="text"
                className="form-input"
                placeholder="مثال: أحمر شفاه مات نيللي - درجة روز 05"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              {errors.name && <span style={{ color: "#dc2626", fontSize: "0.75rem", fontWeight: "bold" }}>{errors.name}</span>}
            </div>
          </div>

          {/* Row 2: Category & Brand */}
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "14px", marginBottom: "14px" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">قسم الميكاب / التصنيف</label>
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

          {/* Row 3: Quantity & Wholesale Price */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                الكمية المتوفرة بالمخزن <span style={{ color: "#db2777" }}>*</span>
              </label>
              <input 
                type="number"
                min="0"
                dir="ltr"
                className="form-input num-font"
                placeholder="0"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                style={{ fontSize: "1.1rem", fontWeight: "700" }}
              />
              {errors.quantity && <span style={{ color: "#dc2626", fontSize: "0.75rem", fontWeight: "bold" }}>{errors.quantity}</span>}
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                سعر الجملة (ج.م) <span style={{ color: "#db2777" }}>*</span>
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
                  style={{ fontSize: "1.1rem", fontWeight: "700", paddingLeft: "45px" }}
                />
                <span style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#9d174d",
                  fontSize: "0.85rem",
                  fontWeight: "bold"
                }}>
                  ج.م
                </span>
              </div>
              {errors.wholesalePrice && <span style={{ color: "#dc2626", fontSize: "0.75rem", fontWeight: "bold" }}>{errors.wholesalePrice}</span>}
            </div>
          </div>

          {/* Row 4: Min Threshold */}
          <div className="form-group" style={{ marginBottom: "16px" }}>
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
          </div>

          {/* Real-time valuation banner */}
          <div style={{
            background: "linear-gradient(135deg, #fdf2f8 0%, #fef3f9 100%)",
            border: "1.5px dashed #fbcfe8",
            borderRadius: "14px",
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "20px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Sparkles size={18} color="#db2777" />
              <span style={{ fontSize: "0.92rem", color: "#1e1322", fontWeight: "800" }}>
                إجمالي قيمة البضاعة لهذا الصنف بسعر الجملة:
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
              <span className="num-font" dir="ltr" style={{ fontSize: "1.4rem", fontWeight: "900", color: "#9d174d" }}>
                {formatNumber(totalWholesaleValue)}
              </span>
              <span style={{ fontSize: "0.9rem", color: "#9d174d", fontWeight: "800" }}>ج.م</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "12px" }}>
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
              {isSubmitting ? "جاري الحفظ..." : (productToEdit ? "حفظ التعديلات" : "إضافة الصنف للمخزن")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
