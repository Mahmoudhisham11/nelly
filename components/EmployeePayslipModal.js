"use client";

import React, { useRef } from "react";
import { X, Printer, Calendar, Clock, Award, MinusCircle, DollarSign, FileText } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/utils";

export default function EmployeePayslipModal({ isOpen, onClose, employee, monthSummary }) {
  const printRef = useRef(null);

  if (!isOpen || !employee || !monthSummary) return null;

  const handlePrint = () => {
    window.print();
  };

  const {
    baseSalary = 0,
    hourlyRate = 0,
    earnedSalary = 0,
    totalBonus = 0,
    totalCommission = 0,
    totalPenalty = 0,
    totalAdvance = 0,
    netSalary = 0,
    totalMinutes = 0,
    attendanceDays = 0,
    transactions = []
  } = monthSummary;

  const hoursWorked = Math.floor(totalMinutes / 60);
  const minutesWorked = totalMinutes % 60;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ 
          maxWidth: "680px", 
          maxHeight: "min(92vh, 800px)", 
          display: "flex", 
          flexDirection: "column", 
          overflow: "hidden",
          padding: 0 
        }}
      >
        {/* Header (No print) */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 24px",
          borderBottom: "1px solid #f0e1ec",
          background: "#ffffff",
          flexShrink: 0
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 14px rgba(219, 39, 119, 0.25)"
            }}>
              <FileText size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "900", color: "#1e1322", margin: 0 }}>
                مفردات مرتب ومستحقات الموظف
              </h3>
              <p style={{ fontSize: "0.82rem", color: "#5a4663", margin: "2px 0 0 0", fontWeight: "600" }}>
                كشف حساب شهري مفصل لشهر {monthSummary.monthLabel || ""} (محسوب بساعات العمل والعمولة)
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={handlePrint}
              className="btn-secondary"
              style={{ padding: "8px 14px", display: "flex", alignItems: "center", gap: "6px" }}
            >
              <Printer size={16} color="#db2777" />
              <span>طباعة الكشف</span>
            </button>
            <button 
              type="button"
              onClick={onClose}
              style={{
                background: "#fdf2f8",
                border: "none",
                borderRadius: "10px",
                padding: "8px",
                cursor: "pointer",
                color: "#db2777"
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Area */}
        <div 
          ref={printRef} 
          style={{ 
            padding: "20px 24px", 
            overflowY: "auto", 
            flex: "1 1 auto",
            display: "flex", 
            flexDirection: "column", 
            gap: "18px" 
          }}
        >
          {/* Header of Payslip */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "2px solid #e5e7eb",
            paddingBottom: "12px"
          }}>
            <div>
              <h2 style={{ fontSize: "1.6rem", fontWeight: "900", color: "#db2777", margin: 0 }}>Nelly Store</h2>
              <p style={{ fontSize: "0.82rem", color: "#6b7280", margin: "2px 0 0 0", fontWeight: "600" }}>
                كشف حساب ومفردات الراتب الشهري
              </p>
            </div>
            <div style={{ textAlign: "left", fontSize: "0.82rem", color: "#4b5563", fontWeight: "600" }}>
              <p style={{ margin: 0 }}>تاريخ الإصدار: {new Date().toLocaleDateString("ar-EG")}</p>
              <p style={{ margin: "2px 0 0 0" }}>الفترة: <span className="num-font" style={{ fontWeight: "800" }}>{monthSummary.monthLabel}</span></p>
            </div>
          </div>

          {/* Employee Basic Info Card */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: "12px",
            padding: "14px 16px",
            borderRadius: "14px",
            background: "#fdf2f8",
            border: "1px solid #fbcfe8"
          }}>
            <div>
              <span style={{ fontSize: "0.78rem", color: "#6b7280", fontWeight: "700", display: "block" }}>اسم الموظف</span>
              <span style={{ fontSize: "1rem", fontWeight: "900", color: "#1e1322" }}>{employee.name}</span>
            </div>
            <div>
              <span style={{ fontSize: "0.78rem", color: "#6b7280", fontWeight: "700", display: "block" }}>كود الموظف</span>
              <span className="num-font" style={{ fontSize: "0.95rem", fontWeight: "900", color: "#db2777" }}>{employee.code}</span>
            </div>
            <div>
              <span style={{ fontSize: "0.78rem", color: "#6b7280", fontWeight: "700", display: "block" }}>الوظيفة</span>
              <span style={{ fontSize: "0.9rem", fontWeight: "700", color: "#374151" }}>{employee.role || "بائع ومسؤول مبيعات"}</span>
            </div>
            <div>
              <span style={{ fontSize: "0.78rem", color: "#6b7280", fontWeight: "700", display: "block" }}>رقم الهاتف</span>
              <span className="num-font" style={{ fontSize: "0.9rem", fontWeight: "700", color: "#374151" }}>{employee.phone || "---"}</span>
            </div>
          </div>

          {/* Attendance Stats & Work Shift */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
            <div style={{
              padding: "12px 14px",
              borderRadius: "12px",
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}>
              <Calendar size={22} color="#6366f1" />
              <div>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#6b7280", fontWeight: "700" }}>أيام الحضور الفعلية</p>
                <p className="num-font" style={{ margin: 0, fontSize: "1.05rem", fontWeight: "900", color: "#1e1322" }}>
                  {attendanceDays} يوم عمل
                </p>
              </div>
            </div>

            <div style={{
              padding: "12px 14px",
              borderRadius: "12px",
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}>
              <Clock size={22} color="#0891b2" />
              <div>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#6b7280", fontWeight: "700" }}>إجمالي ساعات العمل</p>
                <p className="num-font" style={{ margin: 0, fontSize: "1.05rem", fontWeight: "900", color: "#1e1322" }}>
                  {hoursWorked} ساعة و {minutesWorked} دقيقة
                </p>
              </div>
            </div>

            <div style={{
              padding: "12px 14px",
              borderRadius: "12px",
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}>
              <DollarSign size={22} color="#db2777" />
              <div>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#6b7280", fontWeight: "700" }}>معدل أجر الساعة (10س/يوم)</p>
                <p className="num-font" style={{ margin: 0, fontSize: "1.05rem", fontWeight: "900", color: "#db2777" }}>
                  {formatCurrency(hourlyRate)} / س
                </p>
              </div>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div style={{ border: "1px solid #e5e7eb", borderRadius: "12px", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "right", fontSize: "0.9rem" }}>
              <thead style={{ background: "#f3f4f6", color: "#374151", fontWeight: "800" }}>
                <tr>
                  <th style={{ padding: "10px 14px" }}>البند المالي</th>
                  <th style={{ padding: "10px 14px", textAlign: "center" }}>البيان / الحساب</th>
                  <th style={{ padding: "10px 14px", textAlign: "left" }}>المبلغ المستحق</th>
                </tr>
              </thead>
              <tbody style={{ fontWeight: "700" }}>
                {/* Contract Base Salary */}
                <tr style={{ borderBottom: "1px solid #e5e7eb", background: "#fdf8fb" }}>
                  <td style={{ padding: "10px 14px", color: "#6b7280" }}>الراتب التعاقدي الشهري (المعياري)</td>
                  <td style={{ padding: "10px 14px", textAlign: "center", fontSize: "0.78rem", color: "#6b7280" }}>30 يوم × 10 ساعات = 300س</td>
                  <td className="num-font" style={{ padding: "10px 14px", textAlign: "left", fontWeight: "700", color: "#6b7280" }}>
                    {formatCurrency(baseSalary)}
                  </td>
                </tr>

                {/* Earned Salary from worked hours */}
                <tr style={{ borderBottom: "1px solid #e5e7eb", color: "#059669" }}>
                  <td style={{ padding: "10px 14px" }}>
                    <div>
                      <span style={{ fontWeight: "800" }}>أجر ساعات العمل الفعلية المستحق</span>
                      <span style={{ display: "block", fontSize: "0.72rem", color: "#6b7280" }}>
                        ({hoursWorked}س و {minutesWorked}د × {formatCurrency(hourlyRate)}/ساعة)
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "center", fontSize: "0.78rem" }}>أساسي فعلي (+)</td>
                  <td className="num-font" style={{ padding: "10px 14px", textAlign: "left", fontWeight: "900", color: "#059669" }}>
                    +{formatCurrency(earnedSalary)}
                  </td>
                </tr>

                {/* Sales Commission */}
                <tr style={{ borderBottom: "1px solid #e5e7eb", color: totalCommission > 0 ? "#2563eb" : "#4b5563" }}>
                  <td style={{ padding: "10px 14px" }}>
                    <div>
                      <span style={{ fontWeight: "800" }}>إجمالي عمولات المبيعات (المحققة من الفواتير)</span>
                      <span style={{ display: "block", fontSize: "0.72rem", color: "#6b7280" }}>تضاف لصافي المرتب مع كل فاتورة بيع</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "center", fontSize: "0.78rem" }}>عمولة مبيعات (+)</td>
                  <td className="num-font" style={{ padding: "10px 14px", textAlign: "left", fontWeight: "900", color: "#2563eb" }}>
                    +{formatCurrency(totalCommission)}
                  </td>
                </tr>

                {/* Bonuses */}
                {totalBonus > 0 && (
                  <tr style={{ borderBottom: "1px solid #e5e7eb", color: "#059669" }}>
                    <td style={{ padding: "10px 14px" }}>إجمالي العلاوات والمكافآت</td>
                    <td style={{ padding: "10px 14px", textAlign: "center", fontSize: "0.78rem" }}>إضافة (+)</td>
                    <td className="num-font" style={{ padding: "10px 14px", textAlign: "left", fontWeight: "900" }}>
                      +{formatCurrency(totalBonus)}
                    </td>
                  </tr>
                )}

                {/* Penalties */}
                {totalPenalty > 0 && (
                  <tr style={{ borderBottom: "1px solid #e5e7eb", color: "#dc2626" }}>
                    <td style={{ padding: "10px 14px" }}>إجمالي الجزاءات والخصومات</td>
                    <td style={{ padding: "10px 14px", textAlign: "center", fontSize: "0.78rem" }}>خصم (-)</td>
                    <td className="num-font" style={{ padding: "10px 14px", textAlign: "left", fontWeight: "900" }}>
                      -{formatCurrency(totalPenalty)}
                    </td>
                  </tr>
                )}

                {/* Advances */}
                {totalAdvance > 0 && (
                  <tr style={{ borderBottom: "1px solid #e5e7eb", color: "#d97706" }}>
                    <td style={{ padding: "10px 14px" }}>إجمالي المسحوبات والسلف</td>
                    <td style={{ padding: "10px 14px", textAlign: "center", fontSize: "0.78rem" }}>خصم (-)</td>
                    <td className="num-font" style={{ padding: "10px 14px", textAlign: "left", fontWeight: "900" }}>
                      -{formatCurrency(totalAdvance)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Net Salary Highlight */}
          <div style={{
            padding: "16px 20px",
            borderRadius: "14px",
            background: "linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)",
            border: "2px solid #db2777",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <div>
              <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: "900", color: "#db2777" }}>
                الصافي النهائي المستحق للصرف
              </p>
              <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: "#6b7280", fontWeight: "600" }}>
                أجر الساعات الفعلية + عمولات المبيعات + العلاوات - الجزاءات - المسحوبات
              </p>
            </div>
            <div className="num-font" style={{ fontSize: "1.9rem", fontWeight: "900", color: "#db2777" }}>
              {formatCurrency(netSalary)}
            </div>
          </div>

          {/* Details of Transactions if any */}
          {transactions.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <h4 style={{ fontSize: "0.82rem", fontWeight: "800", color: "#4b5563", margin: 0 }}>سجل الحركات المالية للشهر</h4>
              <div style={{ maxHeight: "140px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      background: "#f9fafb",
                      border: "1px solid #f3f4f6",
                      fontSize: "0.82rem"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span className="num-font" style={{ color: "#6b7280" }}>{tx.date}</span>
                      <span style={{ fontWeight: "700", color: "#1e1322" }}>{tx.notes || tx.type}</span>
                    </div>
                    <span
                      className="num-font"
                      style={{
                        fontWeight: "900",
                        color: tx.type === "bonus" || tx.type === "commission" ? "#059669" : "#dc2626"
                      }}
                    >
                      {tx.type === "bonus" || tx.type === "commission" ? "+" : "-"}
                      {formatCurrency(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <div style={{
          display: "flex",
          justifyContent: "flex-end",
          padding: "16px 24px",
          borderTop: "1px solid #f0e1ec",
          background: "#ffffff",
          flexShrink: 0
        }}>
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
