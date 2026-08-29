"use client";

import React, { useState, useEffect } from "react";
import { X, Receipt, Tag, FileText } from "lucide-react";

export default function ExpenseItemModal({ isOpen, onClose, onSave, itemToEdit }) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (itemToEdit) {
      setName(itemToEdit.name || "");
      setNotes(itemToEdit.notes || "");
    } else {
      setName("");
      setNotes("");
    }
  }, [itemToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave({ name: name.trim(), notes: notes.trim() }, itemToEdit?.id);
      onClose();
    } catch (err) {
      console.error("Error saving expense item:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "480px", padding: "26px" }}
      >
        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "20px",
          paddingBottom: "12px",
          borderBottom: "1px solid #f0e1ec"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 14px rgba(219, 39, 119, 0.25)"
            }}>
              <Receipt size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "900", color: "#1e1322" }}>
                {itemToEdit ? "تعديل بند المصروف" : "إضافة بند مصروف جديد"}
              </h3>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: "600" }}>
                تثبيت بند المصروف ليظهر تلقائياً كل شهر بقيمة 0 ج.م
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            style={{
              background: "#fdf2f8",
              border: "1px solid #fbcfe8",
              color: "#db2777",
              width: "30px",
              height: "30px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer"
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              اسم البند / القسم <span style={{ color: "#db2777" }}>*</span>
            </label>
            <input 
              type="text"
              className="form-input"
              placeholder="مثال: إيجار المحل، رواتب، كهرباء، شحن، دعاية..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">وصف أو ملاحظات</label>
            <input 
              type="text"
              className="form-input"
              placeholder="مثال: موعد الاستحقاق يوم 5 في الشهر..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "22px" }}>
            <button 
              type="button" 
              onClick={onClose}
              className="btn-secondary"
              style={{ padding: "9px 18px" }}
            >
              إلغاء
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting || !name.trim()}
              className="btn-primary"
              style={{ padding: "9px 24px" }}
            >
              {isSubmitting ? "جاري الحفظ..." : (itemToEdit ? "حفظ التعديل" : "إضافة البند")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
