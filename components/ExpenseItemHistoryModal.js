"use client";

import React, { useState } from "react";
import { X, History, ArrowDownLeft, Trash2, Calendar, AlertCircle } from "lucide-react";
import { formatNumber } from "@/lib/utils";

export default function ExpenseItemHistoryModal({ 
  isOpen, 
  onClose, 
  item, 
  monthlyRecord, 
  monthLabel,
  onDeleteTransaction 
}) {
  const [confirmTx, setConfirmTx] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !item) return null;

  const transactions = monthlyRecord?.transactions || [];
  const totalAmount = monthlyRecord?.amount || 0;

  const handleConfirmDelete = async () => {
    if (!confirmTx || !onDeleteTransaction) return;
    setIsDeleting(true);
    try {
      await onDeleteTransaction(monthlyRecord.month, item.id, confirmTx.id);
      setConfirmTx(null);
    } catch (err) {
      alert("حدث خطأ أثناء حذف العملية.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "580px", padding: "26px" }}
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
              background: "linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 14px rgba(147, 51, 234, 0.25)"
            }}>
              <History size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "900", color: "#1e1322" }}>
                سجل حركات المصروف
              </h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "600" }}>
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

        {/* Current Total Ribbon */}
        <div style={{
          background: totalAmount > 0 ? "#fdf2f8" : "#ecfdf5",
          border: `1px solid ${totalAmount > 0 ? "#fbcfe8" : "#a7f3d0"}`,
          borderRadius: "12px",
          padding: "12px 16px",
          marginBottom: "18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <span style={{ fontSize: "0.88rem", fontWeight: "700", color: "#4a3650" }}>
            إجمالي المصروف في هذا الشهر:
          </span>
          <strong style={{ fontSize: "1.15rem", color: totalAmount > 0 ? "#be185d" : "#047857" }}>
            <span className="num-font" dir="ltr">{formatNumber(totalAmount)}</span> ج.م
          </strong>
        </div>

        {/* Confirmation Inline Alert */}
        {confirmTx && (
          <div style={{
            background: "#fef2f2",
            border: "1.5px solid #fecaca",
            borderRadius: "12px",
            padding: "12px 16px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            animation: "fadeIn 0.2s ease"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#991b1b", fontSize: "0.85rem", fontWeight: "700" }}>
              <AlertCircle size={18} color="#dc2626" />
              <span>هل تريد حذف هذه الدفعة بمبلغ <span className="num-font" dir="ltr">{formatNumber(confirmTx.amount)}</span> ج.م وخصمها من الإجمالي؟</span>
            </div>
            <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
              <button
                onClick={() => setConfirmTx(null)}
                className="btn-secondary"
                style={{ padding: "5px 12px", fontSize: "0.78rem" }}
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="btn-danger"
                style={{ padding: "5px 14px", fontSize: "0.78rem" }}
              >
                {isDeleting ? "جاري الحذف..." : "نعم، احذف"}
              </button>
            </div>
          </div>
        )}

        {/* Transactions List */}
        <div style={{ maxHeight: "340px", overflowY: "auto", paddingRight: "4px" }}>
          {transactions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)", fontSize: "0.88rem", fontWeight: "600" }}>
              لم يتم صرف أي مبالغ على هذا البند في شهر {monthLabel}.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[...transactions].reverse().map((tx, idx) => (
                <div
                  key={tx.id || idx}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #f0e1ec",
                    borderRadius: "12px",
                    padding: "12px 14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "10px",
                      background: "#fdf2f8",
                      color: "#db2777",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0
                    }}>
                      <ArrowDownLeft size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: "800", fontSize: "0.9rem", color: "#1e1322" }}>
                        {tx.notes || "إضافة مصروف"}
                        {tx.method && <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginRight: "6px", fontWeight: "600" }}>({tx.method})</span>}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px", fontWeight: "600" }}>
                        تاريخ الصرف: <span className="num-font" dir="ltr">{tx.date}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div style={{ fontWeight: "900", fontSize: "1.05rem", color: "#be185d" }}>
                      <span className="num-font" dir="ltr">{formatNumber(tx.amount)}</span> ج.م
                    </div>

                    {onDeleteTransaction && (
                      <button
                        onClick={() => setConfirmTx(tx)}
                        title="حذف هذه الدفعة"
                        style={{
                          background: "#fef2f2",
                          border: "1px solid #fecaca",
                          color: "#dc2626",
                          width: "30px",
                          height: "30px",
                          borderRadius: "8px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer"
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px", paddingTop: "12px", borderTop: "1px solid #f0e1ec" }}>
          <button 
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
