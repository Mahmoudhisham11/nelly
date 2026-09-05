"use client";

import React, { useState, useEffect } from "react";
import { X, UserPlus, User, Hash, DollarSign, Percent, Phone, Briefcase, FileText } from "lucide-react";
import { addEmployee, updateEmployee } from "@/lib/employeesService";

export default function EmployeeModal({ isOpen, onClose, employee, onSaved }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("بائع ومسؤول مبيعات");
  const [baseSalary, setBaseSalary] = useState("");
  const [commissionRate, setCommissionRate] = useState("1"); // 1%
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (employee) {
      setName(employee.name || "");
      setCode(employee.code || "");
      setPhone(employee.phone || "");
      setRole(employee.role || "بائع ومسؤول مبيعات");
      setBaseSalary(employee.baseSalary !== undefined ? String(employee.baseSalary) : "");
      setCommissionRate(employee.commissionRate !== undefined ? String(employee.commissionRate * 100) : "1");
      setNotes(employee.notes || "");
    } else {
      setName("");
      setCode("");
      setPhone("");
      setRole("بائع ومسؤول مبيعات");
      setBaseSalary("");
      setCommissionRate("1");
      setNotes("");
    }
    setError("");
  }, [employee, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("يرجى كتابة اسم الموظف");
      return;
    }
    if (!code.trim()) {
      setError("يرجى كتابة كود الموظف (مثال: EMP-01 أو 101)");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        phone: phone.trim(),
        role: role.trim(),
        baseSalary: parseFloat(baseSalary) || 0,
        commissionRate: (parseFloat(commissionRate) || 0) / 100,
        notes: notes.trim()
      };

      if (employee) {
        await updateEmployee(employee.id, payload);
      } else {
        await addEmployee(payload);
      }

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || "حدث خطأ أثناء حفظ بيانات الموظف");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ 
          maxWidth: "560px", 
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
              <UserPlus size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "900", color: "#1e1322", margin: 0 }}>
                {employee ? "تعديل بيانات الموظف" : "تسجيل موظف جديد"}
              </h3>
              <p style={{ fontSize: "0.82rem", color: "#5a4663", margin: "2px 0 0 0", fontWeight: "600" }}>
                البيانات الأساسية وكود البصمة والراتب والعمولة
              </p>
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

            {/* Name & Code */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "800", color: "#1e1322", marginBottom: "6px" }}>
                  اسم الموظف *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: أحمد محمود"
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "800", color: "#1e1322", marginBottom: "6px" }}>
                  كود الموظف (للبصمة) *
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="مثال: 101 أو EMP-01"
                  className="form-input num-font"
                  style={{ textTransform: "uppercase", fontWeight: "800", color: "#db2777" }}
                />
              </div>
            </div>

            {/* Role & Phone */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "800", color: "#1e1322", marginBottom: "6px" }}>
                  المسمى الوظيفي
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="مثال: كاشير ومسؤول مبيعات"
                  className="form-input"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "800", color: "#1e1322", marginBottom: "6px" }}>
                  رقم الهاتف
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="010XXXXXXXX"
                  className="form-input num-font"
                />
              </div>
            </div>

            {/* Salary & Commission */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "800", color: "#1e1322", marginBottom: "6px" }}>
                  الراتب الأساسي الشهري (ج.م) *
                </label>
                <input
                  type="number"
                  step="50"
                  min="0"
                  value={baseSalary}
                  onChange={(e) => setBaseSalary(e.target.value)}
                  placeholder="0.00"
                  className="form-input num-font"
                  style={{ fontWeight: "800" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "800", color: "#1e1322", marginBottom: "6px" }}>
                  نسبة العمولة على المبيعات (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  placeholder="1"
                  className="form-input num-font"
                  style={{ fontWeight: "800", color: "#2563eb" }}
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "800", color: "#1e1322", marginBottom: "6px" }}>
                ملاحظات إضافية
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أي ملاحظات تخص شروط العمل أو مواعيد الشيفت..."
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
              {loading ? "جاري الحفظ..." : employee ? "حفظ التعديلات" : "إضافة الموظف"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
