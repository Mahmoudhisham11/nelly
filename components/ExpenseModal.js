"use client";

import React, { useState, useEffect } from "react";
import { X, Receipt, DollarSign, Calendar, FileText, PlusCircle, CheckCircle2 } from "lucide-react";
import { DEFAULT_EXPENSE_CATEGORIES } from "@/lib/expensesService";

export default function ExpenseModal({ 
  isOpen, 
  onClose, 
  onSave, 
  expenseToEdit, 
  customCategories = [],
  onOpenManageCategories 
}) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("إيجار ومقر العمل");
  const [date, setDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("نقدي");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Combine default and custom categories
  const allCategories = [
    ...customCategories.map(c => c.name),
    ...DEFAULT_EXPENSE_CATEGORIES
  ];

  useEffect(() => {
    if (expenseToEdit) {
      setTitle(expenseToEdit.title || "");
      setAmount(String(expenseToEdit.amount || ""));
      setCategory(expenseToEdit.category || "إيجار ومقر العمل");
      setDate(expenseToEdit.date || new Date().toISOString().split("T")[0]);
      setPaymentMethod(expenseToEdit.paymentMethod || "نقدي");
      setNotes(expenseToEdit.notes || "");
    } else {
      setTitle("");
      setAmount("");
      setCategory(allCategories[0] || "إيجار ومقر العمل");
      setDate(new Date().toISOString().split("T")[0]);
      setPaymentMethod("نقدي");
      setNotes("");
    }
  }, [expenseToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !amount) return;

    setIsSubmitting(true);
    try {
      await onSave({
        title: title.trim(),
        amount: parseFloat(amount) || 0,
        category: category,
        date: date || new Date().toISOString().split("T")[0],
        paymentMethod: paymentMethod,
        notes: notes.trim()
      }, expenseToEdit?.id);
      onClose();
    } catch (err) {
      console.error("Error saving expense:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "540px", padding: "28px" }}
      >
        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "22px",
          paddingBottom: "14px",
          borderBottom: "1px solid #f0e1ec"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "42px",
              height: "42px",
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
              <h3 style={{ fontSize: "1.25rem", fontWeight: "900", color: "#1e1322" }}>
                {expenseToEdit ? "تعديل بيانات المصروف" : "تسجيل مصروف جديد"}
              </h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "600" }}>
                إدراج بند النفقات والمصاريف التشغيلية للمخزن
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            style={{
              background: "#fdf2f8",
              border: "1px solid #fbcfe8",
              color: "#db2777",
              width: "32px",
              height: "32px",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer"
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div className="form-group">
            <label className="form-label">
              بيان / اسم المصروف <span style={{ color: "#db2777" }}>*</span>
            </label>
            <input 
              type="text"
              className="form-input"
              placeholder="مثال: فاتورة كهرباء شهر أغسطس، شراء كراتين تغليف..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* Amount & Date */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div className="form-group">
              <label className="form-label">
                المبلغ (ج.م) <span style={{ color: "#db2777" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <input 
                  type="number"
                  step="any"
                  className="form-input num-font"
                  dir="ltr"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{ paddingRight: "38px", textAlign: "right", fontWeight: "800", fontSize: "1.05rem" }}
                  required
                />
                <DollarSign size={18} color="#db2777" style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)" }} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                تاريخ الصرف <span style={{ color: "#db2777" }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <input 
                  type="date"
                  className="form-input num-font"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Category with Manage Link */}
          <div className="form-group">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
              <label className="form-label" style={{ marginBottom: 0 }}>
                قسم / تصنيف المصروف <span style={{ color: "#db2777" }}>*</span>
              </label>
              {onOpenManageCategories && (
                <button
                  type="button"
                  onClick={onOpenManageCategories}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#db2777",
                    fontSize: "0.78rem",
                    fontWeight: "800",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  <PlusCircle size={13} />
                  إدارة الأقسام
                </button>
              )}
            </div>

            <select 
              className="form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              {allCategories.map((c, i) => (
                <option key={`${c}-${i}`} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Payment Method */}
          <div className="form-group">
            <label className="form-label">طريقة الدفع</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "6px" }}>
              {["نقدي", "تحويل بنكي", "فودافون كاش", "شيك"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMethod(m)}
                  style={{
                    padding: "8px 4px",
                    borderRadius: "8px",
                    border: paymentMethod === m ? "1.5px solid #db2777" : "1px solid #e5e7eb",
                    background: paymentMethod === m ? "#fdf2f8" : "#ffffff",
                    color: paymentMethod === m ? "#db2777" : "#4b5563",
                    fontWeight: "800",
                    fontSize: "0.78rem",
                    cursor: "pointer"
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label className="form-label">ملاحظات أو تفاصيل إضافية</label>
            <textarea 
              className="form-textarea"
              rows="2"
              placeholder="مثال: رقم الإيصال، اسم المستلم، تفاصيل الفاتورة..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "22px" }}>
            <button 
              type="button" 
              onClick={onClose}
              className="btn-secondary"
              style={{ padding: "10px 20px" }}
            >
              إلغاء
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="btn-primary"
              style={{ padding: "10px 24px" }}
            >
              {isSubmitting ? "جاري الحفظ..." : (expenseToEdit ? "حفظ التعديلات" : "تسجيل المصروف")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
