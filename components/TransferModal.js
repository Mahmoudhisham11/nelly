"use client";

import React, { useState } from "react";
import { formatNumber } from "@/lib/utils";
import confetti from "canvas-confetti";
import { 
  ArrowLeftRight, 
  X, 
  Store, 
  Package, 
  Boxes, 
  ArrowLeft, 
  CheckCircle2, 
  Sparkles 
} from "lucide-react";

export default function TransferModal({ 
  isOpen, 
  onClose, 
  product, 
  onConfirmTransfer,
  direction = "warehouse_to_shop" // "warehouse_to_shop" | "shop_to_warehouse"
}) {
  const [transferQty, setTransferQty] = useState("1");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen || !product) return null;

  const sourceName = direction === "warehouse_to_shop" ? "المخزن الرئيسي" : "المحل التجاري";
  const targetName = direction === "warehouse_to_shop" ? "المحل التجاري" : "المخزن الرئيسي";
  const currentAvailableQty = Math.max(0, parseInt(product.quantity, 10) || 0);

  const numQty = parseInt(transferQty, 10) || 0;
  const remainingInSource = Math.max(0, currentAvailableQty - numQty);

  const handleQtyChange = (e) => {
    const val = e.target.value;
    if (val === "") {
      setTransferQty("");
      setErrorMsg("");
      return;
    }

    const parsed = parseInt(val, 10);
    if (isNaN(parsed)) {
      setTransferQty("");
      setErrorMsg("يرجى إدخال رقم صحيح.");
      return;
    }

    if (parsed > currentAvailableQty) {
      setTransferQty(currentAvailableQty.toString());
      setErrorMsg(`⚠️ تنبيه: لا يمكن تحويل أكثر من الكمية المتوفرة بالمخزن (${currentAvailableQty} قطعة). تم ضبط الكمية على الحد الأقصى.`);
      return;
    }

    if (parsed < 1) {
      setTransferQty("1");
      setErrorMsg("الحد الأدنى للتحويل هو قطعة واحدة.");
      return;
    }

    setTransferQty(parsed.toString());
    setErrorMsg("");
  };

  const handleQuickSelect = (amount) => {
    if (amount === "all") {
      setTransferQty(currentAvailableQty.toString());
    } else {
      setTransferQty(Math.min(currentAvailableQty, amount).toString());
    }
    setErrorMsg("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (currentAvailableQty <= 0) {
      setErrorMsg("عذراً، هذا الصنف غير متوفر بالمخزن (الكمية 0). لا يمكن إجراء تحويل.");
      return;
    }

    if (!numQty || numQty <= 0) {
      setErrorMsg("يرجى إدخال كمية تحويل صحيحة أكبر من صفر.");
      return;
    }

    if (numQty > currentAvailableQty) {
      setErrorMsg(`ممنوع نهائياً: الكمية المطلوبة (${numQty}) أكبر من الرصيد المتوفر في المخزن (${currentAvailableQty}).`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirmTransfer(product, numQty);
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch (e) {}
      onClose();
    } catch (err) {
      setErrorMsg(err.message || "حدث خطأ أثناء تنفيذ التحويل.");
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "460px", padding: "26px", background: "#ffffff", borderRadius: "22px" }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px", borderBottom: "1px solid #fce7f3", paddingBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "42px",
              height: "42px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <ArrowLeftRight size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "900", color: "#1e1322" }}>
                {direction === "warehouse_to_shop" ? "تحويل بضاعة إلى المحل" : "إرجاع بضاعة إلى المخزن"}
              </h3>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: "600" }}>
                من {sourceName} ⬅️ إلى {targetName}
              </span>
            </div>
          </div>

          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#6b7280" }}>
            <X size={20} />
          </button>
        </div>

        {/* Product Details Card */}
        <div style={{
          background: "#faf5f8",
          border: "1px solid #fce7f3",
          borderRadius: "14px",
          padding: "12px 16px",
          marginBottom: "18px"
        }}>
          <div style={{ fontWeight: "800", color: "#1e1322", fontSize: "0.95rem" }}>
            {product.name}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px", fontSize: "0.82rem" }}>
            <span style={{ color: "var(--text-muted)" }}>
              الباركود: <strong className="num-font" dir="ltr" style={{ color: "#db2777" }}>{product.barcode || "—"}</strong>
            </span>
            <span style={{ color: "#15803d", fontWeight: "800" }}>
              المتوفر حالياً: <strong className="num-font" dir="ltr">{currentAvailableQty}</strong> قطعة
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "10px",
            padding: "10px 14px",
            marginBottom: "14px",
            color: "#b91c1c",
            fontSize: "0.85rem",
            fontWeight: "700"
          }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Transfer Quantity Input */}
          <div className="form-group" style={{ marginBottom: "12px" }}>
            <label className="form-label" style={{ fontWeight: "800" }}>
              الكمية المراد تحويلها (بالقطعة) <span style={{ color: "#db2777" }}>*</span>
            </label>
            <input 
              type="number"
              min="1"
              max={currentAvailableQty}
              dir="ltr"
              className="form-input num-font"
              value={transferQty}
              onChange={handleQtyChange}
              style={{ fontSize: "1.2rem", fontWeight: "900", textAlign: "center" }}
              required
              autoFocus
              disabled={currentAvailableQty === 0}
            />
          </div>

          {/* Quick Select Buttons */}
          <div style={{ display: "flex", gap: "6px", marginBottom: "18px" }}>
            {[1, 2, 5, 10, 20].filter(n => n <= currentAvailableQty).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => handleQuickSelect(n)}
                style={{
                  flex: 1,
                  padding: "6px 2px",
                  borderRadius: "8px",
                  border: numQty === n ? "1.5px solid #db2777" : "1px solid #e5e7eb",
                  background: numQty === n ? "#fdf2f8" : "#ffffff",
                  color: numQty === n ? "#db2777" : "#4b5563",
                  fontWeight: "800",
                  fontSize: "0.82rem",
                  cursor: "pointer"
                }}
              >
                +{n}
              </button>
            ))}
            {currentAvailableQty > 0 && (
              <button
                type="button"
                onClick={() => handleQuickSelect("all")}
                style={{
                  flex: 1.2,
                  padding: "6px 2px",
                  borderRadius: "8px",
                  border: numQty === currentAvailableQty ? "1.5px solid #db2777" : "1px solid #e5e7eb",
                  background: numQty === currentAvailableQty ? "#fdf2f8" : "#ffffff",
                  color: numQty === currentAvailableQty ? "#db2777" : "#4b5563",
                  fontWeight: "800",
                  fontSize: "0.82rem",
                  cursor: "pointer"
                }}
              >
                الكل ({currentAvailableQty})
              </button>
            )}
          </div>

          {/* Live Balance Impact Preview */}
          <div style={{
            background: "#f0fdf4",
            border: "1px dashed #86efac",
            borderRadius: "12px",
            padding: "12px 14px",
            marginBottom: "20px",
            fontSize: "0.85rem",
            lineHeight: "1.6"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#374151", fontWeight: "600" }}>المتبقي في {sourceName}:</span>
              <strong className="num-font" dir="ltr" style={{ color: remainingInSource === 0 ? "#dc2626" : "#1e1322" }}>
                {remainingInSource} قطعة
              </strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "3px" }}>
              <span style={{ color: "#374151", fontWeight: "600" }}>الكمية المضافة إلى {targetName}:</span>
              <strong className="num-font" dir="ltr" style={{ color: "#15803d", fontWeight: "900" }}>
                + {numQty} قطعة
              </strong>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ padding: "10px 18px" }}>
              إلغاء
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting || currentAvailableQty === 0 || numQty <= 0 || numQty > currentAvailableQty} 
              className="btn-primary" 
              style={{ padding: "10px 22px" }}
            >
              <CheckCircle2 size={16} />
              {isSubmitting ? "جاري التحويل..." : "تأكيد التحويل الآن"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
