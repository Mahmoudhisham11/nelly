"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { 
  LayoutDashboard, 
  Boxes, 
  Truck, 
  Receipt,
  Settings, 
  LogOut, 
  User, 
  Sparkles, 
  X,
  ShieldCheck,
  ChevronLeft
} from "lucide-react";

export default function Sidebar({ isMobileOpen, onCloseMobile }) {
  const pathname = usePathname();
  const { user, isAdmin, logout } = useAuth();

  const navLinks = [
    {
      label: "لوحة التحكم",
      href: "/",
      icon: LayoutDashboard,
      badge: null
    },
    {
      label: "سجل الأصناف والمخزن",
      href: "/products",
      icon: Boxes,
      badge: null
    },
    {
      label: "الموردين والحسابات",
      href: "/suppliers",
      icon: Truck,
      badge: null
    },
    {
      label: "المصاريف والنفقات",
      href: "/expenses",
      icon: Receipt,
      badge: "جديد"
    },
    {
      label: "الإعدادات والمستخدمين",
      href: "/settings",
      icon: Settings,
      badge: null,
      adminOnly: true
    }
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div 
          className="sidebar-mobile-backdrop"
          onClick={onCloseMobile}
        />
      )}

      {/* Main Sidebar Element */}
      <aside className={`app-sidebar ${isMobileOpen ? "mobile-open" : ""}`}>
        {/* Brand Header */}
        <div className="sidebar-brand">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "44px",
              height: "44px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #ec4899 0%, #db2777 60%, #be185d 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 18px rgba(219, 39, 119, 0.3)",
              color: "#ffffff",
              fontSize: "1.4rem",
              fontWeight: "900",
              flexShrink: 0
            }}>
              N
            </div>
            <div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: "900", color: "#1e1322", letterSpacing: "-0.01em" }}>
                مخزن <span className="gradient-text-rose">Nelly</span>
              </h2>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: "700" }}>
                مستحضرات التجميل والميكاب
              </span>
            </div>
          </div>

          {/* Close button for Mobile Drawer */}
          <button 
            onClick={onCloseMobile}
            className="sidebar-mobile-close"
          >
            <X size={20} />
          </button>
        </div>

        {/* User Role Pill */}
        <div style={{ padding: "0 18px", marginBottom: "16px" }}>
          <div style={{
            background: isAdmin ? "#fdf2f8" : "#faf5ff",
            border: `1px solid ${isAdmin ? "#fbcfe8" : "#e9d5ff"}`,
            borderRadius: "12px",
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <span style={{ fontSize: "0.78rem", color: "#5a4663", fontWeight: "700" }}>الصلاحية:</span>
            <span style={{
              fontSize: "0.75rem",
              fontWeight: "900",
              color: isAdmin ? "#db2777" : "#7e22ce"
            }}>
              {isAdmin ? "👑 مسؤول (Admin)" : "👤 مستخدم (User)"}
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="sidebar-nav">
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "800", padding: "0 18px 8px" }}>
            القائمة الرئيسية
          </div>

          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onCloseMobile && onCloseMobile()}
                className={`sidebar-link ${isActive ? "active" : ""}`}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div className="sidebar-link-icon">
                    <Icon size={20} />
                  </div>
                  <span style={{ fontWeight: isActive ? "800" : "700", fontSize: "0.94rem" }}>
                    {item.label}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {item.badge && (
                    <span style={{
                      fontSize: "0.68rem",
                      background: "#fdf2f8",
                      color: "#db2777",
                      border: "1px solid #fbcfe8",
                      padding: "2px 7px",
                      borderRadius: "8px",
                      fontWeight: "900"
                    }}>
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronLeft size={16} color="#db2777" />}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User Footer Profile & Logout */}
        <div className="sidebar-footer">
          {user && (
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
              background: "#ffffff",
              padding: "10px 12px",
              borderRadius: "14px",
              border: "1px solid #ebdbe6"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt="User" 
                    style={{ width: "34px", height: "34px", borderRadius: "50%", border: "2px solid #db2777" }}
                  />
                ) : (
                  <div style={{
                    width: "34px",
                    height: "34px",
                    borderRadius: "50%",
                    background: isAdmin ? "#fce7f3" : "#f3e8ff",
                    color: isAdmin ? "#db2777" : "#7e22ce",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold"
                  }}>
                    <User size={18} />
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: "800", color: "#1e1322", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {user.displayName || (isAdmin ? "مسؤول المخزن" : "مستخدم")}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {user.email || "حساب نشط"}
                  </div>
                </div>
              </div>

              <button
                onClick={logout}
                title="تسجيل الخروج"
                style={{
                  background: "#fee2e2",
                  border: "1px solid #fca5a5",
                  color: "#dc2626",
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                  transition: "all 0.2s"
                }}
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
