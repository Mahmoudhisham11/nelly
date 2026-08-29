"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { 
  Menu, 
  Clock, 
  PlusCircle, 
  User, 
  LogOut,
  Sparkles
} from "lucide-react";

export default function Navbar({ onOpenAddModal, onOpenMobileSidebar }) {
  const { user, isAdmin, logout } = useAuth();
  const pathname = usePathname();
  const [timeStr, setTimeStr] = useState("");

  const pageTitles = {
    "/": "لوحة التحكم والإحصائيات",
    "/products": "سجل أصناف وبضاعة المخزن",
    "/suppliers": "إدارة الموردين والحسابات المالية",
    "/expenses": "سجل المصاريف والنفقات التشغيلية",
    "/settings": "إعدادات النظام وإدارة المستخدمين"
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const dayNames = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
      const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
      
      const dayName = dayNames[now.getDay()];
      const monthName = monthNames[now.getMonth()];
      const dayNum = now.getDate();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "م" : "ص";
      hours = hours % 12 || 12;

      setTimeStr(`${dayName} ${dayNum} ${monthName} - ${hours}:${minutes} ${ampm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000 * 30);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="navbar-header glass-panel">
      {/* Right Side: Mobile Menu Button & Page Title */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {onOpenMobileSidebar && (
          <button 
            onClick={onOpenMobileSidebar}
            className="navbar-mobile-toggle"
            title="فتح القائمة الجانبية"
          >
            <Menu size={22} />
          </button>
        )}

        <div>
          <h1 style={{ fontSize: "1.2rem", fontWeight: "900", color: "#1e1322", letterSpacing: "-0.01em" }}>
            {pageTitles[pathname] || "مخزن Nelly للميكاب"}
          </h1>
          <p style={{ fontSize: "0.76rem", color: "var(--text-muted)", fontWeight: "600", marginTop: "1px" }}>
            مستحضرات التجميل وجرد المخزون
          </p>
        </div>
      </div>

      {/* Left Side: Live Clock & Quick Add Button */}
      <div className="navbar-user-actions">
        {/* Live Clock */}
        {timeStr && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "0.82rem",
            color: "var(--text-secondary)",
            background: "#fbf6f9",
            padding: "6px 12px",
            borderRadius: "10px",
            border: "1px solid #ebdbe6",
            fontWeight: "600",
            whiteSpace: "nowrap"
          }}>
            <Clock size={14} color="#db2777" />
            <span className="num-font" dir="ltr">{timeStr}</span>
          </div>
        )}

        {/* Quick Add Product Button */}
        {onOpenAddModal && (
          <button 
            onClick={onOpenAddModal}
            className="btn-primary"
            style={{ padding: "8px 18px", fontSize: "0.88rem" }}
          >
            <PlusCircle size={17} />
            إضافة صنف جديد
          </button>
        )}
      </div>
    </header>
  );
}
