"use client";

import React, { useState, useEffect } from "react";
import { X, Truck, Phone, DollarSign, FileText, CheckCircle2 } from "lucide-react";

export default function SupplierModal({ isOpen, onClose, onSave, supplierToEdit }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [balanceType, setBalanceType] = useState("payable"); // "payable" (له +), "receivable" (عليه -), "zero" (0)
  const [balanceAmount, setBalanceAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (supplierToEdit) {
      setName(supplierToEdit.name || "");
      setPhone(supplierToEdit.phone || "");
      const bal = Number(supplierToEdit.balance) || 0;
      if (bal > 0) {
        setBalanceType("payable");
        setBalanceAmount(String(bal));
      } else if (bal < 0) {
        setBalanceType("receivable");
        setBalanceAmount(String(Math.abs(bal)));
      } else {
        setBalanceType("zero");
        setBalanceAmount("0");
      }
      setNotes(supplierToEdit.notes || "");
    } else {
      setName("");
      setPhone("");
      setBalanceType("payable");
      setBalanceAmount("");
      setNotes("");
    }
  }, [supplierToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    let finalBalance = 0;
    if (balanceType === "payable") {
      finalBalance = Math.abs(parseFloat(balanceAmount) || 0);
    } else if (balanceType === "receivable") {
      finalBalance = -Math.abs(parseFloat(balanceAmount) || 0);
    } else {
      finalBalance = 0;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        notes: notes.trim()
      };

      if (!supplierToEdit) {
        payload.balance = finalBalance;
      }

      await onSave(payload, supplierToEdit?.id);
      onClose();
    } catch (err) {
      console.error("Error saving supplier:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "520px", padding: "28px" }}
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
              <Truck size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "900", color: "#1e1322" }}>
                {supplierToEdit ? "تعديل بيانات المورد" : "إضافة مورد جديد"}
              </h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "600" }}>
                تسجيل بيانات المورد والحساب والرصيد المالي
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
          {/* Supplier Name */}
          <div className="form-group">
            <label className="form-label">
              اسم المورد / الشركة <span style={{ color: "#db2777" }}>*</span>
            </label>
            <input 
              type="text"
              className="form-input"
              placeholder="مثال: شركة الهنا لمستحضرات التجميل"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Phone (Optional) */}
          <div className="form-group">
            <label className="form-label">
              رقم الهاتف / الواتساب <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: "normal" }}>(اختياري)</span>
            </label>
            <div style={{ position: "relative" }}>
              <input 
                type="tel"
                className="form-input num-font"
                dir="ltr"
                placeholder="01012345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{ paddingRight: "40px", textAlign: "right" }}
              />
              <Phone size={18} color="#db2777" style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)" }} />
            </div>
          </div>

          {/* Initial Balance Configuration (Only on Add or explicitly shown) */}
          {!supplierToEdit && (
            <div style={{
              background: "#fcf8fa",
              border: "1.5px solid #f0e1ec",
              borderRadius: "14px",
              padding: "16px",
              marginBottom: "16px"
            }}>
              <label className="form-label" style={{ marginBottom: "10px", display: "block" }}>
                الرصيد المالي الافتتاحي:
              </label>

              {/* Balance Type Selector */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "12px" }}>
                <button
                  type="button"
                  onClick={() => setBalanceType("payable")}
                  style={{
                    padding: "8px",
                    borderRadius: "10px",
                    border: balanceType === "payable" ? "1.5px solid #db2777" : "1px solid #e5e7eb",
                    background: balanceType === "payable" ? "#fdf2f8" : "#ffffff",
                    color: balanceType === "payable" ? "#be185d" : "#4b5563",
                    fontWeight: "800",
                    fontSize: "0.82rem",
                    cursor: "pointer"
                  }}
                >
                  له فلوس (+)
                </button>

                <button
                  type="button"
                  onClick={() => setBalanceType("receivable")}
                  style={{
                    padding: "8px",
                    borderRadius: "10px",
                    border: balanceType === "receivable" ? "1.5px solid #7e22ce" : "1px solid #e5e7eb",
                    background: balanceType === "receivable" ? "#faf5ff" : "#ffffff",
                    color: balanceType === "receivable" ? "#7e22ce" : "#4b5563",
                    fontWeight: "800",
                    fontSize: "0.82rem",
                    cursor: "pointer"
                  }}
                >
                  عليه فلوس (-)
                </button>

                <button
                  type="button"
                  onClick={() => { setBalanceType("zero"); setBalanceAmount("0"); }}
                  style={{
                    padding: "8px",
                    borderRadius: "10px",
                    border: balanceType === "zero" ? "1.5px solid #059669" : "1px solid #e5e7eb",
                    background: balanceType === "zero" ? "#ecfdf5" : "#ffffff",
                    color: balanceType === "zero" ? "#047857" : "#4b5563",
                    fontWeight: "800",
                    fontSize: "0.82rem",
                    cursor: "pointer"
                  }}
                >
                  حسابه خالص (0)
                </button>
              </div>

              {balanceType !== "zero" && (
                <div style={{ position: "relative" }}>
                  <input 
                    type="number"
                    step="any"
                    className="form-input num-font"
                    dir="ltr"
                    placeholder="أدخل المبلغ بالجنيه (ج.م)..."
                    value={balanceAmount}
                    onChange={(e) => setBalanceAmount(e.target.value)}
                    style={{ paddingRight: "40px", textAlign: "right" }}
                    required
                  />
                  <DollarSign size={18} color="#db2777" style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)" }} />
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="form-group">
            <label className="form-label">ملاحظات إضافية</label>
            <textarea 
              className="form-textarea"
              rows="3"
              placeholder="مثال: مواعيد التوريد، عنوان المخزن، بيانات التحويل..."
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
              {isSubmitting ? "جاري الحفظ..." : (supplierToEdit ? "حفظ التعديلات" : "إضافة المورد")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
