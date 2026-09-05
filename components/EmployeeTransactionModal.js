"use client";

import React, { useState } from "react";
import { PlusCircle, MinusCircle, DollarSign, Award, X, AlertCircle } from "lucide-react";
import { addEmployeeTransaction } from "@/lib/employeesService";

export default function EmployeeTransactionModal({ isOpen, onClose, employee, onSaved }) {
  const [type, setType] = useState("bonus"); // bonus | penalty | advance | commission
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !employee) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("يرجى إدخال مبلغ صحيح أكبر من الصفر");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await addEmployeeTransaction({
        employeeId: employee.id,
        employeeName: employee.name,
        type,
        amount: numAmount,
        notes: notes.trim(),
        date: date || new Date().toISOString().split("T")[0]
      });

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || "حدث خطأ أثناء حفظ المعاملة");
    } finally {
      setLoading(false);
    }
  };

  const typesConfig = [
    { id: "bonus", label: "علاوة / مكافأة (+)", icon: Award, bg: "#ecfdf5", border: "#a7f3d0", color: "#059669" },
    { id: "penalty", label: "جزاء / خصم (-)", icon: MinusCircle, bg: "#fef2f2", border: "#fecaca", color: "#dc2626" },
    { id: "advance", label: "سلفة / مسحوبات (-)", icon: DollarSign, bg: "#fffbeb", border: "#fde68a", color: "#d97706" },
    { id: "commission", label: "عمولة إضافية (+)", icon: PlusCircle, bg: "#eff6ff", border: "#bfdbfe", color: "#2563eb" }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ 
          maxWidth: "520px", 
          maxHeight: "min(92vh, 760px)", 
          display: "flex", 
          flexDirection: "column", 
          overflow: "hidden",
          padding: 0 
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 24px",
          borderBottom: "1px solid #f0e1ec",
          background: "#ffffff",
          flexShrink: 0
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "900", color: "#1e1322", margin: 0 }}>
                تسجيل حركة مالية
              </h3>
              <span style={{
                fontSize: "0.82rem",
                fontWeight: "800",
                background: "#fdf2f8",
                color: "#db2777",
                padding: "2px 10px",
                borderRadius: "20px",
                border: "1px solid #fbcfe8"
              }}>
                {employee.name}
              </span>
            </div>
            <p style={{ fontSize: "0.8rem", color: "#5a4663", margin: "3px 0 0 0", fontWeight: "600" }}>
              كود الموظف: <span className="num-font" style={{ fontWeight: "800", color: "#1e1322" }}>{employee.code}</span>
            </p>
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
            style={{ 
              padding: "20px 24px", 
              overflowY: "auto", 
              flex: "1 1 auto",
              display: "flex",
              flexDirection: "column",
              gap: "14px"
            }}
          >
            {/* Error Alert */}
            {error && (
              <div style={{
                padding: "12px 16px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "12px",
                color: "#dc2626",
                fontSize: "0.88rem",
                fontWeight: "700"
              }}>
                {error}
              </div>
            )}

            {/* Type Selection */}
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "800", color: "#1e1322", marginBottom: "8px" }}>
                نوع الحركة المالية
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {typesConfig.map((t) => {
                  const Icon = t.icon;
                  const isSelected = type === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setType(t.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "10px 12px",
                        borderRadius: "12px",
                        border: isSelected ? `2px solid ${t.color}` : "1px solid #e5e7eb",
                        background: isSelected ? t.bg : "#ffffff",
                        color: isSelected ? t.color : "#4b5563",
                        fontSize: "0.85rem",
                        fontWeight: "800",
                        cursor: "pointer",
                        transition: "all 0.2s ease"
                      }}
                    >
                      <Icon size={16} />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount */}
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "800", color: "#1e1322", marginBottom: "6px" }}>
                المبلغ (ج.م) *
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="form-input num-font"
                style={{ fontSize: "1.2rem", fontWeight: "900", color: "#1e1322" }}
              />
            </div>

            {/* Date */}
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "800", color: "#1e1322", marginBottom: "6px" }}>
                التاريخ
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="form-input num-font"
              />
            </div>

            {/* Notes / Reason */}
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "800", color: "#1e1322", marginBottom: "6px" }}>
                بيان / سبب الحركة
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: مكافأة مبيعات استثنائية، تأخير غير مبرر، سلفة راتب..."
                className="form-input"
                style={{ resize: "none" }}
              />
            </div>
          </div>

          {/* Fixed Footer */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "10px",
            padding: "16px 24px",
            borderTop: "1px solid #f0e1ec",
            background: "#ffffff",
            flexShrink: 0
          }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? "جاري الحفظ..." : "حفظ الحركة"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
