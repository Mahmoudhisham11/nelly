"use client";

import React, { useState, useEffect } from "react";
import { X, PlusCircle, DollarSign, Calendar, CreditCard, CheckCircle2 } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import CustomSelect from "@/components/CustomSelect";

const PAYMENT_METHODS = [
  { value: "نقدي", label: "نقدي (كاش)" },
  { value: "تحويل بنكي", label: "تحويل بنكي" },
  { value: "فودافون كاش", label: "محفظة فودافون كاش" },
  { value: "شيك", label: "شيك بنكي" }
];

export default function AddExpenseAmountModal({ 
  isOpen, 
  onClose, 
  item, 
  currentMonth, 
  monthLabel,
  currentAmount = 0, 
  onAddAmount 
}) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [method, setMethod] = useState("نقدي");
  const [notes, setNotes] = useState("");
  const [dateError, setDateError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && item) {
      setAmount("");
      // Smart date initialization: If today is within currentMonth use today, else use first day of currentMonth
      const todayStr = new Date().toISOString().split("T")[0];
      if (currentMonth && todayStr.startsWith(currentMonth)) {
        setDate(todayStr);
      } else if (currentMonth) {
        setDate(`${currentMonth}-01`);
      } else {
        setDate(todayStr);
      }
      setMethod("نقدي");
      setNotes("");
      setDateError("");
    }
  }, [isOpen, item, currentMonth]);

  if (!isOpen || !item) return null;

  const addVal = parseFloat(amount) || 0;
  const simulatedNewTotal = currentAmount + addVal;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || addVal <= 0) {
      alert("يرجى إدخال مبلغ صحيح أكبر من صفر.");
      return;
    }

    if (currentMonth && date && !date.startsWith(currentMonth)) {
      setDateError(`تاريخ الصرف يجب أن يكون داخل شهر ${monthLabel} (${currentMonth})`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddAmount(
        currentMonth, 
        item.id, 
        item.name, 
        addVal, 
        notes, 
        method, 
        date
      );
      onClose();
    } catch (err) {
      console.error("Error adding expense amount:", err);
      alert("حدث خطأ أثناء إضافة المبلغ.");
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
          marginBottom: "18px",
          paddingBottom: "12px",
          borderBottom: "1px solid #f0e1ec"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 14px rgba(5, 150, 105, 0.25)"
            }}>
              <PlusCircle size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "900", color: "#1e1322" }}>
                إضافة وصرف مبلغ لبند المصروف
              </h3>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: "600" }}>
                البند: <strong style={{ color: "#1e1322" }}>{item.name}</strong> • شهر: <strong style={{ color: "#db2777" }}>{monthLabel}</strong>
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

        {/* Current Month Status Ribbon */}
        <div style={{
          background: currentAmount > 0 ? "#fdf2f8" : "#ecfdf5",
          border: `1px solid ${currentAmount > 0 ? "#fbcfe8" : "#a7f3d0"}`,
          borderRadius: "12px",
          padding: "12px 14px",
          marginBottom: "18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#4a3650" }}>
            إجمالي المصروف الحالي في هذا الشهر:
          </span>
          <strong style={{ fontSize: "1.1rem", color: currentAmount > 0 ? "#be185d" : "#047857" }}>
            <span className="num-font" dir="ltr">{formatNumber(currentAmount)}</span> ج.م
          </strong>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Amount to Add */}
          <div className="form-group">
            <label className="form-label">
              المبلغ المراد إضافته (ج.م) <span style={{ color: "#db2777" }}>*</span>
            </label>
            <div style={{ position: "relative" }}>
              <input 
                type="number"
                step="any"
                min="0.01"
                className="form-input num-font"
                dir="ltr"
                placeholder="أدخل المبلغ..."
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{ paddingRight: "40px", textAlign: "right", fontSize: "1.1rem", fontWeight: "800" }}
                required
                autoFocus
              />
              <DollarSign size={20} color="#059669" style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)" }} />
            </div>
          </div>

          {/* New Total Preview */}
          {addVal > 0 && (
            <div style={{
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
              padding: "10px 14px",
              marginBottom: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "0.85rem"
            }}>
              <span style={{ color: "#4b5563", fontWeight: "700" }}>الإجمالي الجديد بعد الإضافة:</span>
              <strong style={{ color: "#be185d", fontSize: "1.05rem" }}>
                <span className="num-font" dir="ltr">{formatNumber(simulatedNewTotal)}</span> ج.م
              </strong>
            </div>
          )}

          {/* Date & Payment Method */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="form-group">
              <label className="form-label">تاريخ الصرف</label>
              <input 
                type="date"
                className="form-input num-font"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setDateError("");
                }}
                required
              />
              {dateError && (
                <span style={{ color: "#dc2626", fontSize: "0.75rem", fontWeight: "700", marginTop: "3px", display: "block" }}>
                  {dateError}
                </span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">طريقة الدفع</label>
              <CustomSelect
                options={PAYMENT_METHODS}
                value={method}
                onChange={(val) => setMethod(val)}
                icon={CreditCard}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label className="form-label">ملاحظات أو بيان الدفعة</label>
            <input 
              type="text"
              className="form-input"
              placeholder="مثال: دفعة أولى، فاتورة شهرية، إكرامية..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "18px" }}>
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
              disabled={isSubmitting || !amount || addVal <= 0}
              className="btn-primary"
              style={{ padding: "9px 24px", background: "linear-gradient(135deg, #059669 0%, #047857 100%)" }}
            >
              {isSubmitting ? "جاري الحفظ..." : "تأكيد إضافة المبلغ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
