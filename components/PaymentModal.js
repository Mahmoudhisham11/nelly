"use client";

import React, { useState, useEffect } from "react";
import { X, CreditCard, DollarSign, ArrowDownLeft, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { formatNumber, roundCurrency } from "@/lib/utils";

export default function PaymentModal({ isOpen, onClose, supplier, onMakePayment }) {
  const [operationType, setOperationType] = useState("payment"); // "payment" (سداد دفعة) or "charge" (إضافة مستحقات / بضاعة)
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("نقدي");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (supplier && isOpen) {
      setOperationType("payment");
      setAmount("");
      setPaymentMethod("نقدي");
      setNotes("");
    }
  }, [supplier, isOpen]);

  if (!isOpen || !supplier) return null;

  const currentBal = roundCurrency(Number(supplier.balance) || 0);
  const payAmount = Math.abs(parseFloat(amount) || 0);
  
  const simulatedNewBalance = operationType === "payment" 
    ? roundCurrency(currentBal - payAmount) 
    : roundCurrency(currentBal + payAmount);

  const handlePayFull = () => {
    if (currentBal > 0) {
      setOperationType("payment");
      setAmount(String(currentBal));
    } else if (currentBal < 0) {
      setOperationType("charge");
      setAmount(String(Math.abs(currentBal)));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || payAmount <= 0) {
      alert("يرجى إدخال مبلغ صحيح أكبر من صفر.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onMakePayment(supplier.id, currentBal, payAmount, notes, paymentMethod, operationType);
      onClose();
    } catch (err) {
      console.error("Payment error:", err);
      alert("حدث خطأ أثناء تسجيل العملية المالية.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "500px", padding: "26px" }}
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
              background: operationType === "payment" 
                ? "linear-gradient(135deg, #059669 0%, #047857 100%)" 
                : "linear-gradient(135deg, #db2777 0%, #be185d 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 14px rgba(0, 0, 0, 0.15)",
              transition: "all 0.2s ease"
            }}>
              <CreditCard size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "900", color: "#1e1322" }}>
                {operationType === "payment" ? "سداد دفعة حساب للمورد" : "إضافة مستحقات / فاتورة بضاعة"}
              </h3>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: "600" }}>
                المورد: <strong style={{ color: "#1e1322" }}>{supplier.name}</strong>
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

        {/* Current Balance Card */}
        <div style={{
          background: currentBal > 0 ? "#fdf2f8" : currentBal < 0 ? "#faf5ff" : "#ecfdf5",
          border: `1.5px solid ${currentBal > 0 ? "#fbcfe8" : currentBal < 0 ? "#e9d5ff" : "#a7f3d0"}`,
          borderRadius: "14px",
          padding: "14px 16px",
          marginBottom: "18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <div>
            <div style={{ fontSize: "0.8rem", color: "#5a4663", fontWeight: "700" }}>
              الرصيد المالي الحالي للمورد:
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: "900", marginTop: "2px", color: currentBal > 0 ? "#be185d" : currentBal < 0 ? "#7e22ce" : "#047857" }}>
              <span className="num-font" dir="ltr">{formatNumber(Math.abs(currentBal))}</span> ج.م
              <span style={{ fontSize: "0.78rem", marginRight: "6px", fontWeight: "800" }}>
                {currentBal > 0 ? "(له مستحقات علينا)" : currentBal < 0 ? "(عليه مبالغ لنا)" : "(خالص تماماً)"}
              </span>
            </div>
          </div>

          {currentBal !== 0 && (
            <button
              type="button"
              onClick={handlePayFull}
              className="btn-secondary"
              style={{ padding: "6px 12px", fontSize: "0.78rem", background: "#ffffff", fontWeight: "800" }}
            >
              تسوية كامل المبلغ
            </button>
          )}
        </div>

        {/* Operation Type Switcher */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
          background: "#fdf2f8",
          padding: "5px",
          borderRadius: "12px",
          marginBottom: "16px",
          border: "1px solid #fce7f3"
        }}>
          <button
            type="button"
            onClick={() => setOperationType("payment")}
            style={{
              padding: "9px 12px",
              borderRadius: "9px",
              border: "none",
              background: operationType === "payment" ? "#059669" : "transparent",
              color: operationType === "payment" ? "#ffffff" : "#4b5563",
              fontWeight: "800",
              fontSize: "0.85rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transition: "all 0.2s ease"
            }}
          >
            <ArrowDownLeft size={16} />
            سداد دفعة (يخصم من الدين)
          </button>

          <button
            type="button"
            onClick={() => setOperationType("charge")}
            style={{
              padding: "9px 12px",
              borderRadius: "9px",
              border: "none",
              background: operationType === "charge" ? "#db2777" : "transparent",
              color: operationType === "charge" ? "#ffffff" : "#4b5563",
              fontWeight: "800",
              fontSize: "0.85rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transition: "all 0.2s ease"
            }}
          >
            <ArrowUpRight size={16} />
            فاتورة جديدة (يزيد المستحق)
          </button>
        </div>

        {/* Payment Form */}
        <form onSubmit={handleSubmit}>
          {/* Payment Amount */}
          <div className="form-group">
            <label className="form-label">
              {operationType === "payment" ? "مبلغ الدفعة المسددة (ج.م)" : "مبلغ الفاتورة / المستحقات (ج.م)"} <span style={{ color: "#db2777" }}>*</span>
            </label>
            <div style={{ position: "relative" }}>
              <input 
                type="number"
                step="any"
                min="0.01"
                className="form-input num-font"
                dir="ltr"
                placeholder="أدخل المبلغ (مثال: 5000)..."
                value={amount}
                onChange={(e) => {
                  const val = e.target.value;
                  // Only allow positive numbers
                  if (val === "" || parseFloat(val) >= 0) {
                    setAmount(val);
                  }
                }}
                style={{ paddingRight: "40px", textAlign: "right", fontSize: "1.15rem", fontWeight: "800" }}
                required
                autoFocus
              />
              <DollarSign size={20} color={operationType === "payment" ? "#059669" : "#db2777"} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)" }} />
            </div>
          </div>

          {/* New Balance Preview */}
          {amount && payAmount > 0 && (
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
              <span style={{ color: "#4b5563", fontWeight: "700" }}>الرصيد المتوقع بعد العملية:</span>
              <strong style={{
                color: simulatedNewBalance > 0 ? "#be185d" : simulatedNewBalance < 0 ? "#7e22ce" : "#047857",
                fontSize: "1.05rem"
              }}>
                <span className="num-font" dir="ltr">{formatNumber(Math.abs(simulatedNewBalance))}</span> ج.م
                <span style={{ fontSize: "0.75rem", marginRight: "4px" }}>
                  {simulatedNewBalance > 0 ? "(له مستحقات)" : simulatedNewBalance < 0 ? "(عليه مبالغ)" : "(خالص تماماً)"}
                </span>
              </strong>
            </div>
          )}

          {/* Payment Method */}
          <div className="form-group">
            <label className="form-label">طريقة السداد / الدفع</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "6px" }}>
              {["نقدي", "تحويل بنكي", "فودافون كاش", "شيك"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMethod(m)}
                  style={{
                    padding: "7px 4px",
                    borderRadius: "8px",
                    border: paymentMethod === m 
                      ? (operationType === "payment" ? "1.5px solid #059669" : "1.5px solid #db2777")
                      : "1px solid #e5e7eb",
                    background: paymentMethod === m 
                      ? (operationType === "payment" ? "#ecfdf5" : "#fdf2f8")
                      : "#ffffff",
                    color: paymentMethod === m 
                      ? (operationType === "payment" ? "#047857" : "#be185d")
                      : "#4b5563",
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
            <label className="form-label">ملاحظات أو رقم الإيصال / الفاتورة</label>
            <input 
              type="text"
              className="form-input"
              placeholder={operationType === "payment" ? "مثال: دفعة كاش تحت حساب بضاعة..." : "مثال: فاتورة توريد شحنة رقم 102..."}
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
              disabled={isSubmitting || !amount || payAmount <= 0}
              className="btn-primary"
              style={{ 
                padding: "9px 24px", 
                background: operationType === "payment" 
                  ? "linear-gradient(135deg, #059669 0%, #047857 100%)" 
                  : "linear-gradient(135deg, #db2777 0%, #be185d 100%)" 
              }}
            >
              {isSubmitting ? "جاري الحفظ..." : "تأكيد العملية وتحديث الحساب"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
