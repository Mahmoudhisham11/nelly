"use client";

import React from "react";
import { formatNumber } from "@/lib/utils";

export default function StatCard({ 
  title, 
  value, 
  suffix = "", 
  subtitle, 
  icon: Icon, 
  theme = "rose",
  trendText,
  onClick
}) {
  const themeStyles = {
    rose: {
      gradient: "linear-gradient(135deg, #ffffff 0%, #fdf2f8 100%)",
      border: "#fbcfe8",
      iconBg: "#fce7f3",
      iconColor: "#db2777",
      numberColor: "#9d174d",
      badgeBg: "#fdf2f8",
      badgeText: "#be185d"
    },
    emerald: {
      gradient: "linear-gradient(135deg, #ffffff 0%, #ecfdf5 100%)",
      border: "#a7f3d0",
      iconBg: "#d1fae5",
      iconColor: "#059669",
      numberColor: "#065f46",
      badgeBg: "#ecfdf5",
      badgeText: "#047857"
    },
    gold: {
      gradient: "linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)",
      border: "#fde68a",
      iconBg: "#fef3c7",
      iconColor: "#d97706",
      numberColor: "#92400e",
      badgeBg: "#fffbeb",
      badgeText: "#b45309"
    },
    ruby: {
      gradient: "linear-gradient(135deg, #ffffff 0%, #fef2f2 100%)",
      border: "#fecaca",
      iconBg: "#fee2e2",
      iconColor: "#dc2626",
      numberColor: "#991b1b",
      badgeBg: "#fef2f2",
      badgeText: "#b91c1c"
    },
    purple: {
      gradient: "linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)",
      border: "#e9d5ff",
      iconBg: "#f3e8ff",
      iconColor: "#9333ea",
      numberColor: "#6b21a8",
      badgeBg: "#faf5ff",
      badgeText: "#7e22ce"
    }
  };

  const currentTheme = themeStyles[theme] || themeStyles.rose;

  return (
    <div 
      className="glass-card" 
      onClick={onClick}
      style={{
        padding: "22px 24px",
        background: currentTheme.gradient,
        borderColor: currentTheme.border,
        position: "relative",
        overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: "145px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.03)"
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
        <div>
          <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)", fontWeight: "700", whiteSpace: "nowrap" }}>
            {title}
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginTop: "8px" }}>
            <span className="num-font" dir="ltr" style={{ fontSize: "2.1rem", fontWeight: "800", color: currentTheme.numberColor, lineHeight: 1 }}>
              {formatNumber(value)}
            </span>
            {suffix && (
              <span style={{ fontSize: "0.95rem", color: currentTheme.iconColor, fontWeight: "800", whiteSpace: "nowrap" }}>
                {suffix}
              </span>
            )}
          </div>
        </div>

        {Icon && (
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "14px",
            background: currentTheme.iconBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: currentTheme.iconColor,
            border: `1px solid ${currentTheme.border}`,
            flexShrink: 0
          }}>
            <Icon size={24} />
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "16px", paddingTop: "10px", borderTop: "1px solid rgba(0,0,0,0.05)" }}>
        <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: "600", whiteSpace: "nowrap" }}>
          {subtitle}
        </span>
        {trendText && (
          <span style={{
            fontSize: "0.75rem",
            fontWeight: "800",
            color: currentTheme.badgeText,
            background: currentTheme.badgeBg,
            padding: "3px 9px",
            borderRadius: "6px",
            border: `1px solid ${currentTheme.border}`,
            whiteSpace: "nowrap"
          }}>
            {trendText}
          </span>
        )}
      </div>
    </div>
  );
}
