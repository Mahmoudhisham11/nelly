"use client";

import React, { useState } from "react";
import { X, Tags, Plus, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { DEFAULT_EXPENSE_CATEGORIES } from "@/lib/expensesService";

export default function ExpenseCategoryModal({ isOpen, onClose, customCategories = [], onAddCategory, onDeleteCategory }) {
  const [newCatName, setNewCatName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddCategory(newCatName.trim());
      setNewCatName("");
    } catch (err) {
      alert("حدث خطأ أثناء إضافة القسم.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "520px", padding: "26px" }}
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
              <Tags size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "900", color: "#1e1322" }}>
                إدارة وتخصيص أقسام المصاريف
              </h3>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: "600" }}>
                إضافة أقسام جديدة لتصنيف النفقات بدقة
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

        {/* Add New Category Input */}
        <form onSubmit={handleAdd} style={{ marginBottom: "22px" }}>
          <label className="form-label" style={{ marginBottom: "8px", display: "block" }}>
            إضافة قسم جديد:
          </label>
          <div style={{ display: "flex", gap: "8px" }}>
            <input 
              type="text"
              className="form-input"
              placeholder="مثال: رسوم شحن دولي، بنزين، تصوير..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              required
            />
            <button 
              type="submit" 
              disabled={isSubmitting || !newCatName.trim()}
              className="btn-primary"
              style={{ flexShrink: 0, padding: "10px 18px" }}
            >
              <Plus size={16} />
              {isSubmitting ? "جاري الإضافة..." : "إضافة قسم"}
            </button>
          </div>
        </form>

        {/* Categories List */}
        <div>
          <div style={{ fontSize: "0.85rem", fontWeight: "800", color: "#4a3650", marginBottom: "10px" }}>
            الأقسام المتاحة بالنظام:
          </div>

          <div style={{ maxHeight: "280px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
            {/* Custom Categories First */}
            {customCategories.map((cat) => (
              <div 
                key={cat.id}
                style={{
                  background: "#fdf2f8",
                  border: "1.5px solid #fbcfe8",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#db2777"
                  }} />
                  <span style={{ fontWeight: "800", color: "#be185d", fontSize: "0.92rem" }}>
                    {cat.name}
                  </span>
                  <span style={{ fontSize: "0.72rem", background: "#fce7f3", color: "#db2777", padding: "2px 6px", borderRadius: "6px", fontWeight: "700" }}>
                    مخصص
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onDeleteCategory && onDeleteCategory(cat.id)}
                  title="حذف هذا القسم"
                  style={{
                    background: "#fee2e2",
                    border: "1px solid #fecaca",
                    color: "#dc2626",
                    width: "28px",
                    height: "28px",
                    borderRadius: "6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer"
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}

            {/* Default System Categories */}
            {DEFAULT_EXPENSE_CATEGORIES.map((name) => (
              <div 
                key={name}
                style={{
                  background: "#faf6f9",
                  border: "1px solid #ebdbe6",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "#a88da3"
                  }} />
                  <span style={{ fontWeight: "700", color: "#37243b", fontSize: "0.9rem" }}>
                    {name}
                  </span>
                </div>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: "600" }}>
                  افتراضي
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px", paddingTop: "12px", borderTop: "1px solid #f0e1ec" }}>
          <button 
            type="button"
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: "8px 22px" }}
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
