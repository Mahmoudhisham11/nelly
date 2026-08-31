"use client";

import React, { useState } from "react";
import { X, History, FileText, ArrowDownLeft, ArrowUpRight, Trash2, AlertCircle, Edit3 } from "lucide-react";
import { formatNumber } from "@/lib/utils";

export default function SupplierHistoryModal({ isOpen, onClose, supplier, onDeleteTransaction }) {
  const [deletingTxId, setDeletingTxId] = useState(null);
  const [confirmTx, setConfirmTx] = useState(null);

  if (!isOpen || !supplier) return null;

  const transactions = supplier.transactions || [];
  const currentBal = Number(supplier.balance) || 0;

  const handleConfirmDelete = async () => {
    if (!confirmTx || !onDeleteTransaction) return;
    setDeletingTxId(confirmTx.id);
    try {
      await onDeleteTransaction(supplier.id, confirmTx.id);
      setConfirmTx(null);
    } catch (err) {
      alert("حدث خطأ أثناء حذف العملية.");
    } finally {
      setDeletingTxId(null);
    }
  };

  const getTxConfig = (tx) => {
    const type = tx.type || "حركة مالية";
    if (type === "سداد دفعة") {
      return {
        bg: "#ecfdf5",
        color: "#059669",
        icon: ArrowDownLeft,
        label: "سداد دفعة (يقلل المديونية)"
      };
    }
    if (type === "رصيد افتتاحي") {
      return {
        bg: "#faf5ff",
        color: "#7e22ce",
        icon: FileText,
        label: "رصيد افتتاحي"
      };
    }
    if (type.includes("فاتورة") || type.includes("مستحقات")) {
      return {
        bg: "#fdf2f8",
        color: "#db2777",
        icon: ArrowUpRight,
        label: "إضافة مستحقات / فاتورة"
      };
    }
    return {
      bg: "#eff6ff",
      color: "#2563eb",
      icon: Edit3,
      label: "تعديل رصيد يدوي"
    };
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "680px", padding: "26px" }}
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
                كشف حساب وسجل حركات المورد
              </h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "600" }}>
                {supplier.name} {supplier.phone && `(${supplier.phone})`}
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

        {/* Current Balance Ribbon */}
        <div style={{
          background: currentBal > 0 ? "#fdf2f8" : currentBal < 0 ? "#faf5ff" : "#ecfdf5",
          border: `1.5px solid ${currentBal > 0 ? "#fbcfe8" : currentBal < 0 ? "#e9d5ff" : "#a7f3d0"}`,
          borderRadius: "12px",
          padding: "12px 16px",
          marginBottom: "18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <span style={{ fontSize: "0.88rem", fontWeight: "700", color: "#4a3650" }}>
            الرصيد المالي الحالي المسجل:
          </span>
          <strong style={{ fontSize: "1.15rem", color: currentBal > 0 ? "#be185d" : currentBal < 0 ? "#7e22ce" : "#047857" }}>
            <span className="num-font" dir="ltr">{formatNumber(Math.abs(currentBal))}</span> ج.م
            <span style={{ fontSize: "0.8rem", marginRight: "6px", fontWeight: "800" }}>
              {currentBal > 0 ? "(له مستحقات علينا)" : currentBal < 0 ? "(عليه مبالغ لنا)" : "(خالص تماماً)"}
            </span>
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
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#991b1b", fontSize: "0.86rem", fontWeight: "700" }}>
              <AlertCircle size={18} color="#dc2626" />
              <span>هل تريد بالتأكيد حذف هذه الحركة بمبلغ <span className="num-font" dir="ltr">{formatNumber(confirmTx.amount)}</span> ج.م وتعديل الرصيد تلقائياً؟</span>
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
                disabled={deletingTxId === confirmTx.id}
                className="btn-danger"
                style={{ padding: "5px 14px", fontSize: "0.78rem" }}
              >
                {deletingTxId === confirmTx.id ? "جاري الحذف..." : "نعم، احذف"}
              </button>
            </div>
          </div>
        )}

        {/* Transactions Log List */}
        <div style={{ maxHeight: "360px", overflowY: "auto", paddingRight: "4px" }}>
          {transactions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)", fontSize: "0.88rem", fontWeight: "600" }}>
              لا توجد عمليات سداد أو حركات مسجلة لهذا المورد بعد.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[...transactions].reverse().map((tx, idx) => {
                const cfg = getTxConfig(tx);
                const TxIcon = cfg.icon;
                const txNewBal = Number(tx.newBalance) || 0;

                return (
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
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        background: cfg.bg,
                        color: cfg.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      }}>
                        <TxIcon size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: "800", fontSize: "0.9rem", color: "#1e1322" }}>
                          {tx.type || "حركة مالية"}
                          {tx.method && <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginRight: "6px", fontWeight: "600" }}>({tx.method})</span>}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px", fontWeight: "600" }}>
                          {tx.date ? new Date(tx.date).toLocaleDateString("ar-EG", { hour: "2-digit", minute: "2-digit" }) : "—"}
                          {tx.notes && ` • ${tx.notes}`}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontWeight: "900", fontSize: "1rem", color: cfg.color }}>
                          <span className="num-font" dir="ltr">{formatNumber(tx.amount)}</span> ج.م
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                          الرصيد بعد الحركة: <strong className="num-font" dir="ltr">{formatNumber(Math.abs(txNewBal))}</strong>
                          <span style={{ fontSize: "0.68rem", marginRight: "3px" }}>
                            {txNewBal > 0 ? "(له)" : txNewBal < 0 ? "(عليه)" : "(خالص)"}
                          </span>
                        </div>
                      </div>

                      {/* Delete Transaction Button */}
                      {onDeleteTransaction && (
                        <button
                          onClick={() => setConfirmTx(tx)}
                          title="حذف هذه العملية وتعديل الرصيد"
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
                            cursor: "pointer",
                            transition: "all 0.2s ease"
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
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
