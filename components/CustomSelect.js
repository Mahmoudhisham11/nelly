"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export default function CustomSelect({
  options = [],
  value,
  onChange,
  placeholder = "اختر...",
  icon: Icon = null,
  style = {}
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Normalize options to { value, label } format
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === "object" && opt !== null) {
      return { value: opt.value, label: opt.label || opt.value };
    }
    return { value: opt, label: opt };
  });

  const selectedOption = normalizedOptions.find((opt) => opt.value === value) || {
    value: value,
    label: value || placeholder
  };

  // Close on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div 
      ref={dropdownRef} 
      style={{ 
        position: "relative", 
        width: "100%",
        userSelect: "none",
        ...style 
      }}
    >
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%",
          padding: "11px 14px",
          background: "#ffffff",
          border: isOpen ? "1.5px solid #db2777" : "1.5px solid #e7d6e1",
          borderRadius: "12px",
          color: "#1e1322",
          fontSize: "0.92rem",
          fontFamily: "var(--font-family)",
          fontWeight: "700",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          cursor: "pointer",
          boxShadow: isOpen 
            ? "0 0 0 3px rgba(236, 72, 153, 0.18), 0 2px 8px rgba(0,0,0,0.04)" 
            : "0 1px 3px rgba(0,0,0,0.03)",
          transition: "all 0.2s ease"
        }}
        onMouseEnter={(e) => {
          if (!isOpen) e.currentTarget.style.borderColor = "#f472b6";
        }}
        onMouseLeave={(e) => {
          if (!isOpen) e.currentTarget.style.borderColor = "#e7d6e1";
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {Icon && <Icon size={16} color="#db2777" style={{ flexShrink: 0 }} />}
          <span style={{ color: "#1e1322", fontWeight: "700" }}>
            {selectedOption.label}
          </span>
        </div>

        <ChevronDown 
          size={18} 
          color="#db2777" 
          style={{ 
            transition: "transform 0.2s ease",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            flexShrink: 0
          }} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          left: 0,
          right: 0,
          background: "#ffffff",
          border: "1.5px solid #eddbe7",
          borderRadius: "14px",
          boxShadow: "0 12px 35px rgba(219, 39, 119, 0.14), 0 4px 12px rgba(0, 0, 0, 0.05)",
          zIndex: 1000,
          maxHeight: "260px",
          overflowY: "auto",
          padding: "6px",
          animation: "scaleUp 0.15s ease-out"
        }}>
          {normalizedOptions.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  fontWeight: isSelected ? "800" : "600",
                  color: isSelected ? "#9d174d" : "#2b1b30",
                  background: isSelected ? "#fdf2f8" : "transparent",
                  transition: "all 0.15s ease",
                  marginBottom: "2px"
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "#fbf5f9";
                    e.currentTarget.style.color = "#db2777";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#2b1b30";
                  }
                }}
              >
                <span>{opt.label}</span>

                {isSelected && (
                  <div style={{
                    width: "22px",
                    height: "22px",
                    borderRadius: "50%",
                    background: "#fce7f3",
                    color: "#db2777",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}>
                    <Check size={14} strokeWidth={3} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
