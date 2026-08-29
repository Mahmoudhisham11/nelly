"use client";

import React from "react";
import { ShieldAlert, X, Lock, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function PermissionDeniedModal({ isOpen, onClose, actionName = "هذه العملية" }) {
  const router = useRouter();
  const { role, logout } = useAuth();

  if (!isOpen) return null;

  const handleSwitchAccount = async () => {
    onClose();
    await logout();
    router.push("/login");
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "460px",
          padding: "30px 26px",
          textAlign: "center",
          background: "#ffffff",
          borderRadius: "22px",
          border: "1.5px solid #fecdd3",
          boxShadow: "0 25px 60px rgba(225, 29, 72, 0.15), 0 4px 16px rgba(0, 0, 0, 0.05)"
        }}
      >
        {/* Animated Warning / Shield Icon */}
        <div style={{
          width: "70px",
          height: "70px",
          borderRadius: "20px",
          background: "linear-gradient(135deg, #ffe4e6 0%, #fecdd3 100%)",
          border: "2px solid #fda4af",
          color: "#e11d48",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "20px",
          boxShadow: "0 8px 20px rgba(225, 29, 72, 0.18)"
        }}>
          <ShieldAlert size={38} />
        </div>

        {/* Title */}
        <h3 style={{ fontSize: "1.3rem", fontWeight: "900", color: "#1e1322", marginBottom: "8px" }}>
          تنبيه الصلاحيات | غير مصرح
        </h3>

        {/* Message */}
        <p style={{ fontSize: "0.94rem", color: "#5a4663", lineHeight: "1.7", marginBottom: "20px", fontWeight: "600" }}>
          عذراً، إجراء <strong style={{ color: "#be185d" }}>"{actionName}"</strong> وتعديل بيانات المخزن ورؤية الأسعار مخصصة فقط لـ <strong style={{ color: "#9d174d" }}>مسؤول المخزن (Admin)</strong>.
        </p>

        {/* Current Role Tag */}
        <div style={{
          background: "#fdf2f8",
          border: "1px solid #fbcfe8",
          borderRadius: "12px",
          padding: "10px 16px",
          marginBottom: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "0.85rem",
          color: "#4a3650"
        }}>
          <span style={{ fontWeight: "700" }}>صلاحية حسابك الحالية:</span>
          <span style={{
            background: "#ffffff",
            color: "#7e22ce",
            border: "1px solid #e9d5ff",
            padding: "3px 10px",
            borderRadius: "14px",
            fontWeight: "800",
            fontSize: "0.82rem"
          }}>
            👤 مستخدم عادي (User)
          </span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
          <button 
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: "10px 22px", fontSize: "0.92rem", flex: 1 }}
          >
            حسناً، فهمت
          </button>
          <button 
            onClick={handleSwitchAccount}
            className="btn-primary"
            style={{ padding: "10px 20px", fontSize: "0.92rem", flex: 1.2 }}
          >
            <LogIn size={16} />
            دخول كمسؤول
          </button>
        </div>
      </div>
    </div>
  );
}
