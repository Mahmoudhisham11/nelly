"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import {
  Users,
  UserPlus,
  Clock,
  DollarSign,
  Award,
  MinusCircle,
  Calendar,
  Search,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  FileText,
  Edit3,
  Trash2,
  Sparkles,
  Phone,
  Briefcase,
  Barcode
} from "lucide-react";
import {
  subscribeToEmployees,
  subscribeToAttendance,
  subscribeToTodayAttendance,
  subscribeToEmployeeTransactions,
  punchEmployeeAttendance,
  deleteEmployee,
  deleteEmployeeTransaction
} from "@/lib/employeesService";
import EmployeeModal from "@/components/EmployeeModal";
import EmployeeTransactionModal from "@/components/EmployeeTransactionModal";
import EmployeePayslipModal from "@/components/EmployeePayslipModal";
import EmployeeBarcodeModal from "@/components/EmployeeBarcodeModal";
import { formatCurrency, formatDateTime, formatNumber, roundCurrency } from "@/lib/utils";

export default function EmployeesPage() {
  const router = useRouter();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // State
  const [employees, setEmployees] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active Tab: 'directory' | 'attendance' | 'payroll' | 'transactions'
  const [activeTab, setActiveTab] = useState("directory");

  // Punch in/out state
  const [punchCode, setPunchCode] = useState("");
  const [punchFeedback, setPunchFeedback] = useState(null);
  const [punching, setPunching] = useState(false);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7) // YYYY-MM
  );

  // Modals state
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionTargetEmployee, setTransactionTargetEmployee] = useState(null);

  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);
  const [payslipEmployee, setPayslipEmployee] = useState(null);
  const [payslipData, setPayslipData] = useState(null);

  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [barcodeEmployee, setBarcodeEmployee] = useState(null);

  // Auth protection
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Subscriptions
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const unsubEmployees = subscribeToEmployees((list) => {
      setEmployees(list);
      setLoading(false);
    });

    const unsubAttendance = subscribeToAttendance((list) => {
      setAttendanceLogs(list);
    });

    const unsubToday = subscribeToTodayAttendance((list) => {
      setTodayAttendance(list);
    });

    const unsubTx = subscribeToEmployeeTransactions((list) => {
      setTransactions(list);
    });

    return () => {
      unsubEmployees();
      unsubAttendance();
      unsubToday();
      unsubTx();
    };
  }, [user]);

  // Quick Attendance Punch Handler
  const handleQuickPunch = async (e) => {
    e.preventDefault();
    if (!punchCode.trim() || punching) return;

    setPunching(true);
    setPunchFeedback(null);

    try {
      const result = await punchEmployeeAttendance(punchCode);
      setPunchFeedback({
        type: "success",
        action: result.action,
        employeeName: result.employeeName,
        message:
          result.action === "check_in"
            ? `تم تسجيل حضور الموظف ${result.employeeName} بنجاح`
            : `تم تسجيل انصراف الموظف ${result.employeeName} - مدة العمل: ${result.durationText || ""}`
      });
      setPunchCode("");
      setTimeout(() => {
        setPunchFeedback((prev) => (prev?.employeeName === result.employeeName ? null : prev));
      }, 5000);
    } catch (err) {
      setPunchFeedback({
        type: "error",
        message: err.message || "فشل تسجيل الحضور / الانصراف"
      });
    } finally {
      setPunching(false);
    }
  };

  // Delete employee
  const handleDeleteEmployee = async (emp) => {
    if (confirm(`هل أنت متأكد من حذف الموظف "${emp.name}" نهائياً من النظام؟`)) {
      try {
        await deleteEmployee(emp.id);
      } catch (err) {
        alert("فشل حذف الموظف: " + err.message);
      }
    }
  };

  // Delete transaction
  const handleDeleteTransaction = async (txId) => {
    if (confirm("هل أنت متأكد من إلغاء هذه الحركة المالية؟")) {
      try {
        await deleteEmployeeTransaction(txId);
      } catch (err) {
        alert("فشل حذف الحركة: " + err.message);
      }
    }
  };

  // Open Payslip for an Employee
  const handleOpenPayslip = (emp) => {
    const summary = getMonthlySummaryForEmployee(emp.id, selectedMonth);
    setPayslipEmployee(emp);
    setPayslipData({
      ...summary,
      monthLabel: selectedMonth
    });
    setIsPayslipModalOpen(true);
  };

  // Helper: Get Monthly Summary for an Employee
  const getMonthlySummaryForEmployee = (employeeId, yyyyMm) => {
    const emp = employees.find((e) => e.id === employeeId);
    const baseSalary = Number(emp?.baseSalary || emp?.salary || 0);

    const empTxs = transactions.filter((tx) => {
      if (tx.employeeId !== employeeId) return false;
      const txMonth = (tx.date || "").slice(0, 7);
      return txMonth === yyyyMm;
    });

    let totalBonus = 0;
    let totalCommission = 0;
    let totalPenalty = 0;
    let totalAdvance = 0;

    empTxs.forEach((tx) => {
      const amt = Number(tx.amount || 0);
      if (tx.type === "bonus") totalBonus += amt;
      else if (tx.type === "commission") totalCommission += amt;
      else if (tx.type === "penalty") totalPenalty += amt;
      else if (tx.type === "advance") totalAdvance += amt;
    });

    const empAttendance = attendanceLogs.filter((att) => {
      if (att.employeeId !== employeeId) return false;
      const attMonth = (att.date || "").slice(0, 7);
      return attMonth === yyyyMm;
    });

    const attendanceDays = new Set(empAttendance.map((a) => a.date)).size;
    const totalMinutes = empAttendance.reduce((sum, a) => sum + (Number(a.durationMinutes) || 0), 0);
    const hoursWorked = Math.floor(totalMinutes / 60);
    const minutesWorked = totalMinutes % 60;
    const totalHoursWorked = totalMinutes / 60;

    // Standard work shift: 10 hours/day * 30 days = 300 hours/month
    const hourlyRate = baseSalary > 0 ? (baseSalary / 300) : 0;
    // Earned base wage strictly based on actual hours clocked in
    const earnedSalary = roundCurrency(totalHoursWorked * hourlyRate);

    // Net Salary = Earned Hours Wage + Sales Commission + Bonuses - Penalties - Advances
    const netSalary = roundCurrency(earnedSalary + totalBonus + totalCommission - totalPenalty - totalAdvance);

    return {
      baseSalary,
      hourlyRate,
      earnedSalary,
      totalBonus,
      totalCommission,
      totalPenalty,
      totalAdvance,
      netSalary,
      attendanceDays,
      totalMinutes,
      hoursWorked,
      minutesWorked,
      transactions: empTxs
    };
  };

  // Currently on Shift
  const activeStaffIds = useMemo(() => {
    return new Set(
      todayAttendance
        .filter((a) => a.status === "in_progress")
        .map((a) => a.employeeId)
    );
  }, [todayAttendance]);

  // KPIs
  const stats = useMemo(() => {
    const totalEmployeesCount = employees.length;
    const workingNowCount = activeStaffIds.size;
    
    let totalBasePayroll = 0;
    let totalEarnedPayroll = 0;
    let totalNetEstimatedPayroll = 0;

    employees.forEach(emp => {
      const s = getMonthlySummaryForEmployee(emp.id, selectedMonth);
      totalBasePayroll += s.baseSalary;
      totalEarnedPayroll += s.earnedSalary;
      totalNetEstimatedPayroll += s.netSalary;
    });

    const totalMonthlyBonuses = transactions
      .filter((t) => (t.date || "").startsWith(selectedMonth) && (t.type === "bonus" || t.type === "commission"))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const totalMonthlyDeductions = transactions
      .filter((t) => (t.date || "").startsWith(selectedMonth) && (t.type === "penalty" || t.type === "advance"))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    return {
      totalEmployeesCount,
      workingNowCount,
      totalBasePayroll,
      totalEarnedPayroll,
      totalMonthlyBonuses,
      totalMonthlyDeductions,
      netEstimatedPayroll: totalNetEstimatedPayroll
    };
  }, [employees, activeStaffIds, transactions, selectedMonth, attendanceLogs]);

  // Filtered lists
  const filteredEmployees = useMemo(() => {
    if (!searchTerm.trim()) return employees;
    const q = searchTerm.toLowerCase();
    return employees.filter(
      (e) =>
        e.name?.toLowerCase().includes(q) ||
        e.code?.toLowerCase().includes(q) ||
        e.phone?.includes(q) ||
        e.role?.toLowerCase().includes(q)
    );
  }, [employees, searchTerm]);

  if (authLoading || (!user && loading)) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--text-secondary)", fontWeight: "700" }}>جاري تحميل بيانات الموظفين...</p>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <Sidebar 
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="main-content">
        <Navbar 
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        />

        <main className="page-wrapper">
          {/* Page Header */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
            marginBottom: "24px"
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff"
                }}>
                  <Users size={22} />
                </div>
                <h2 style={{ fontSize: "1.6rem", fontWeight: "900", color: "#1e1322", margin: 0 }}>
                  إدارة الموظفين والرواتب
                </h2>
              </div>
              <p style={{ color: "#5a4663", fontSize: "0.88rem", marginTop: "4px", fontWeight: "600" }}>
                تسجيل الحضور السريع بالكود، الرواتب والعمولات، الجزاءات ومسير الرواتب الشهري
              </p>
            </div>

            <button
              onClick={() => {
                setEditingEmployee(null);
                setIsEmployeeModalOpen(true);
              }}
              className="btn-primary"
              style={{ padding: "10px 20px" }}
            >
              <UserPlus size={18} />
              إضافة موظف جديد
            </button>
          </div>

          {/* Quick Punch Bar & Working Live Staff */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "18px",
            marginBottom: "24px"
          }}>
            {/* Punch In/Out Card */}
            <div className="glass-card" style={{ padding: "22px", borderRight: "4px solid #db2777" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Clock size={20} color="#db2777" />
                  <span style={{ fontSize: "1.05rem", fontWeight: "900", color: "#1e1322" }}>
                    تسجيل الحضور والانصراف السريع
                  </span>
                </div>
                <span style={{
                  fontSize: "0.78rem",
                  fontWeight: "800",
                  background: "#ecfdf5",
                  color: "#059669",
                  padding: "3px 10px",
                  borderRadius: "20px",
                  border: "1px solid #a7f3d0"
                }}>
                  اليوم: {new Date().toLocaleDateString("ar-EG")}
                </span>
              </div>

              <form onSubmit={handleQuickPunch} style={{ display: "flex", gap: "10px" }}>
                <input
                  type="text"
                  value={punchCode}
                  onChange={(e) => setPunchCode(e.target.value)}
                  placeholder="اكتب كود الموظف واضغط Enter..."
                  disabled={punching}
                  className="form-input num-font"
                  style={{
                    fontWeight: "800",
                    fontSize: "1rem",
                    padding: "12px 14px",
                    textTransform: "uppercase"
                  }}
                />
                <button
                  type="submit"
                  disabled={punching || !punchCode.trim()}
                  className="btn-primary"
                  style={{ whiteSpace: "nowrap", padding: "12px 18px", display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <ArrowRightLeft size={16} />
                  <span>{punching ? "جاري..." : "تسجيل بصمة"}</span>
                </button>
              </form>

              {punchFeedback && (
                <div style={{
                  marginTop: "12px",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  fontSize: "0.85rem",
                  fontWeight: "700",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: punchFeedback.type === "success" ? "#ecfdf5" : "#fef2f2",
                  color: punchFeedback.type === "success" ? "#059669" : "#dc2626",
                  border: punchFeedback.type === "success" ? "1px solid #a7f3d0" : "1px solid #fecaca"
                }}>
                  {punchFeedback.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{punchFeedback.message}</span>
                </div>
              )}
            </div>

            {/* Live Staff on Shift Card */}
            <div className="glass-card" style={{ padding: "22px", borderRight: "4px solid #059669", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
                    <span style={{ fontSize: "1.05rem", fontWeight: "900", color: "#1e1322" }}>
                      الموظفون على رأس العمل الآن
                    </span>
                  </div>
                  <span style={{
                    fontSize: "0.78rem",
                    fontWeight: "900",
                    background: "#ecfdf5",
                    color: "#059669",
                    padding: "2px 8px",
                    borderRadius: "20px"
                  }}>
                    {activeStaffIds.size} متواجد
                  </span>
                </div>

                {activeStaffIds.size === 0 ? (
                  <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: "14px 0", fontWeight: "600" }}>
                    لا يوجد موظفون مسجلين بالشيفت حالياً
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "120px", overflowY: "auto" }}>
                    {todayAttendance
                      .filter((a) => a.status === "in_progress")
                      .map((att) => (
                        <div
                          key={att.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "8px 12px",
                            borderRadius: "10px",
                            background: "#f9fafb",
                            border: "1px solid #f3f4f6",
                            fontSize: "0.82rem"
                          }}
                        >
                          <span style={{ fontWeight: "800", color: "#1e1322" }}>{att.employeeName}</span>
                          <span className="num-font" style={{ color: "#059669", fontWeight: "700" }}>
                            حضور: {formatDateTime(att.checkIn, true)}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#6b7280", marginTop: "10px" }}>
                <span>إجمالي فريق العمل: {employees.length}</span>
                <span
                  onClick={() => setActiveTab("attendance")}
                  style={{ color: "#db2777", fontWeight: "800", cursor: "pointer" }}
                >
                  عرض سجل الحضور &larr;
                </span>
              </div>
            </div>
          </div>

          {/* KPI Stats Cards */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            marginBottom: "24px"
          }}>
            <div className="glass-card" style={{ padding: "20px", borderRight: "4px solid #db2777" }}>
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: "700" }}>عدد الموظفين</div>
              <div className="num-font" style={{ fontSize: "1.8rem", fontWeight: "900", color: "#1e1322", marginTop: "4px" }}>
                {formatNumber(stats.totalEmployeesCount)}
              </div>
            </div>

            <div className="glass-card" style={{ padding: "20px", borderRight: "4px solid #059669" }}>
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: "700" }}>أجور الساعات المستحقة (الفعلي)</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginTop: "4px" }}>
                <span className="num-font" style={{ fontSize: "1.8rem", fontWeight: "900", color: "#059669" }}>
                  {formatNumber(stats.totalEarnedPayroll)}
                </span>
                <span style={{ fontSize: "0.85rem", color: "#059669", fontWeight: "800" }}>ج.م</span>
              </div>
            </div>

            <div className="glass-card" style={{ padding: "20px", borderRight: "4px solid #2563eb" }}>
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: "700" }}>إضافات الشهر (علاوات وعمولات)</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginTop: "4px" }}>
                <span className="num-font" style={{ fontSize: "1.8rem", fontWeight: "900", color: "#2563eb" }}>
                  +{formatNumber(stats.totalMonthlyBonuses)}
                </span>
                <span style={{ fontSize: "0.85rem", color: "#2563eb", fontWeight: "800" }}>ج.م</span>
              </div>
            </div>

            <div className="glass-card" style={{ padding: "20px", borderRight: "4px solid #dc2626" }}>
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: "700" }}>خصومات ومسحوبات الشهر</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginTop: "4px" }}>
                <span className="num-font" style={{ fontSize: "1.8rem", fontWeight: "900", color: "#dc2626" }}>
                  -{formatNumber(stats.totalMonthlyDeductions)}
                </span>
                <span style={{ fontSize: "0.85rem", color: "#dc2626", fontWeight: "800" }}>ج.م</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs Bar */}
          <div className="glass-panel" style={{ padding: "16px 20px", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
              {/* Tabs */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {[
                  { id: "directory", label: `دليل الموظفين (${employees.length})`, icon: Users },
                  { id: "attendance", label: "سجل الحضور والانصراف", icon: Clock },
                  { id: "payroll", label: "مسير الرواتب الشهري", icon: DollarSign },
                  { id: "transactions", label: `سجل المعاملات المالية (${transactions.length})`, icon: FileText }
                ].map((t) => {
                  const Icon = t.icon;
                  const isActive = activeTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "8px 16px",
                        borderRadius: "12px",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "0.88rem",
                        fontWeight: "800",
                        transition: "all 0.2s ease",
                        background: isActive ? "linear-gradient(135deg, #ec4899 0%, #db2777 100%)" : "#f3f4f6",
                        color: isActive ? "#ffffff" : "#4b5563",
                        boxShadow: isActive ? "0 4px 12px rgba(219, 39, 119, 0.25)" : "none"
                      }}
                    >
                      <Icon size={16} />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Filters / Search */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {(activeTab === "payroll" || activeTab === "transactions" || activeTab === "attendance") && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#ffffff", padding: "6px 12px", borderRadius: "10px", border: "1px solid #e5e7eb" }}>
                    <Calendar size={16} color="#db2777" />
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="num-font"
                      style={{ border: "none", outline: "none", fontWeight: "700", fontSize: "0.85rem", color: "#1e1322" }}
                    />
                  </div>
                )}

                {activeTab === "directory" && (
                  <div style={{ position: "relative", minWidth: "220px" }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="بحث باسم أو كود الموظف..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{ paddingRight: "34px", paddingLeft: "10px", height: "38px" }}
                    />
                    <Search size={16} color="#db2777" style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)" }} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* TAB 1: EMPLOYEE DIRECTORY */}
          {activeTab === "directory" && (
            <div>
              {filteredEmployees.length === 0 ? (
                <div className="glass-card" style={{ padding: "40px", textAlign: "center" }}>
                  <Users size={42} color="#9ca3af" style={{ margin: "0 auto 12px auto" }} />
                  <h4 style={{ fontWeight: "800", color: "#4b5563", margin: "0 0 6px 0" }}>لا يوجد موظفون مسجلون</h4>
                  <p style={{ fontSize: "0.85rem", color: "#9ca3af", margin: 0 }}>اضغط على زر "إضافة موظف جديد" للبدء</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
                  {filteredEmployees.map((emp) => {
                    const isWorking = activeStaffIds.has(emp.id);
                    return (
                      <div
                        key={emp.id}
                        className="glass-card"
                        style={{
                          padding: "20px",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          borderTop: isWorking ? "3px solid #10b981" : "1px solid rgba(255,255,255,0.7)"
                        }}
                      >
                        <div>
                          {/* Header */}
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px" }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <h3 style={{ fontSize: "1.15rem", fontWeight: "900", color: "#1e1322", margin: 0 }}>
                                  {emp.name}
                                </h3>
                                {isWorking ? (
                                  <span style={{
                                    fontSize: "0.72rem",
                                    fontWeight: "800",
                                    background: "#ecfdf5",
                                    color: "#059669",
                                    padding: "2px 8px",
                                    borderRadius: "12px",
                                    border: "1px solid #a7f3d0"
                                  }}>
                                    ● في الشيفت
                                  </span>
                                ) : (
                                  <span style={{
                                    fontSize: "0.72rem",
                                    fontWeight: "700",
                                    background: "#f3f4f6",
                                    color: "#6b7280",
                                    padding: "2px 8px",
                                    borderRadius: "12px"
                                  }}>
                                    غير متواجد
                                  </span>
                                )}
                              </div>
                              <span className="num-font" style={{ fontSize: "0.82rem", color: "#db2777", fontWeight: "800", marginTop: "2px", display: "block" }}>
                                كود: {emp.code}
                              </span>
                            </div>

                            <div style={{ display: "flex", gap: "4px" }}>
                              <button
                                onClick={() => {
                                  setBarcodeEmployee(emp);
                                  setIsBarcodeModalOpen(true);
                                }}
                                style={{ 
                                  background: "#fdf2f8", 
                                  border: "1px solid #fbcfe8", 
                                  borderRadius: "8px", 
                                  cursor: "pointer", 
                                  color: "#db2777", 
                                  padding: "5px 8px",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  fontSize: "0.75rem",
                                  fontWeight: "800"
                                }}
                                title="طباعة باركود وبطاقة الموظف"
                              >
                                <Barcode size={15} />
                                <span>باركود</span>
                              </button>
                              <button
                                onClick={() => {
                                  setEditingEmployee(emp);
                                  setIsEmployeeModalOpen(true);
                                }}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", padding: "4px" }}
                                title="تعديل"
                              >
                                <Edit3 size={17} />
                              </button>
                              <button
                                onClick={() => handleDeleteEmployee(emp)}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", padding: "4px" }}
                                title="حذف"
                              >
                                <Trash2 size={17} />
                              </button>
                            </div>
                          </div>

                          {/* Grid info */}
                          <div style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "8px",
                            padding: "10px 12px",
                            background: "#fdf2f8",
                            borderRadius: "10px",
                            fontSize: "0.82rem",
                            marginBottom: "10px"
                          }}>
                            <div>
                              <span style={{ color: "#6b7280", display: "block", fontSize: "0.75rem" }}>الوظيفة</span>
                              <strong style={{ color: "#1e1322" }}>{emp.role || "موظف مبيعات"}</strong>
                            </div>
                            <div>
                              <span style={{ color: "#6b7280", display: "block", fontSize: "0.75rem" }}>الراتب الأساسي</span>
                              <strong className="num-font" style={{ color: "#1e1322" }}>{formatCurrency(emp.baseSalary || emp.salary)}</strong>
                            </div>
                            <div>
                              <span style={{ color: "#6b7280", display: "block", fontSize: "0.75rem" }}>نسبة العمولة</span>
                              <strong className="num-font" style={{ color: "#2563eb" }}>{((emp.commissionRate || 0.01) * 100).toFixed(1)}%</strong>
                            </div>
                            <div>
                              <span style={{ color: "#6b7280", display: "block", fontSize: "0.75rem" }}>الهاتف</span>
                              <strong className="num-font" style={{ color: "#1e1322" }}>{emp.phone || "---"}</strong>
                            </div>
                          </div>

                          {/* Live Month Net Salary Pill */}
                          {(() => {
                            const empSummary = getMonthlySummaryForEmployee(emp.id, selectedMonth);
                            return (
                              <div style={{
                                padding: "10px 12px",
                                borderRadius: "10px",
                                background: "#f8fafc",
                                border: "1px solid #e2e8f0",
                                display: "flex",
                                flexDirection: "column",
                                gap: "6px",
                                marginBottom: "12px",
                                fontSize: "0.82rem"
                              }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                  <span style={{ color: "#6b7280", fontSize: "0.75rem" }}>ساعات العمل ({selectedMonth}):</span>
                                  <strong className="num-font" style={{ color: "#0891b2" }}>
                                    {empSummary.hoursWorked}س و {empSummary.minutesWorked}د ({formatCurrency(empSummary.earnedSalary)})
                                  </strong>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                  <span style={{ color: "#6b7280", fontSize: "0.75rem" }}>عمولات المبيعات:</span>
                                  <strong className="num-font" style={{ color: "#2563eb" }}>
                                    +{formatCurrency(empSummary.totalCommission)}
                                  </strong>
                                </div>
                                <div style={{
                                  display: "flex", 
                                  alignItems: "center", 
                                  justifyContent: "space-between",
                                  paddingTop: "6px",
                                  borderTop: "1px dashed #cbd5e1"
                                }}>
                                  <span style={{ fontWeight: "900", color: "#1e1322" }}>
                                    الصافي المستحق:
                                  </span>
                                  <span className="num-font" style={{ fontWeight: "900", fontSize: "1.1rem", color: "#db2777" }}>
                                    {formatCurrency(empSummary.netSalary)}
                                  </span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: "flex", gap: "8px", paddingTop: "10px", borderTop: "1px solid #f3f4f6" }}>
                          <button
                            onClick={() => {
                              setTransactionTargetEmployee(emp);
                              setIsTransactionModalOpen(true);
                            }}
                            className="btn-secondary"
                            style={{ flex: 1, padding: "8px", fontSize: "0.82rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
                          >
                            <Award size={15} color="#d97706" />
                            <span>حركة مالية</span>
                          </button>

                          <button
                            onClick={() => handleOpenPayslip(emp)}
                            className="btn-secondary"
                            style={{ flex: 1, padding: "8px", fontSize: "0.82rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", color: "#db2777" }}
                          >
                            <FileText size={15} />
                            <span>كشف الحساب</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ATTENDANCE LOGS */}
          {activeTab === "attendance" && (
            <div className="glass-panel" style={{ padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <h3 style={{ fontSize: "1.15rem", fontWeight: "900", color: "#1e1322", margin: 0 }}>
                  سجل الحضور والانصراف لشهر {selectedMonth}
                </h3>
                <span className="num-font" style={{ fontSize: "0.85rem", color: "#6b7280", fontWeight: "700" }}>
                  {attendanceLogs.filter((a) => (a.date || "").startsWith(selectedMonth)).length} حركة حضور
                </span>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table className="data-table" style={{ width: "100%", textAlign: "right" }}>
                  <thead>
                    <tr>
                      <th>التاريخ</th>
                      <th>الموظف</th>
                      <th>كود الموظف</th>
                      <th>وقت الحضور</th>
                      <th>وقت الانصراف</th>
                      <th>مدة العمل</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceLogs
                      .filter((a) => (a.date || "").startsWith(selectedMonth))
                      .map((log) => {
                        const hours = Math.floor((log.durationMinutes || 0) / 60);
                        const mins = (log.durationMinutes || 0) % 60;
                        return (
                          <tr key={log.id}>
                            <td className="num-font" style={{ color: "#4b5563", fontWeight: "700" }}>{log.date}</td>
                            <td style={{ fontWeight: "800", color: "#1e1322" }}>{log.employeeName}</td>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span className="num-font" style={{ fontWeight: "900", color: "#db2777" }}>{log.employeeCode}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const matchingEmp = employees.find(e => e.id === log.employeeId || e.code === log.employeeCode);
                                    setBarcodeEmployee(matchingEmp || { name: log.employeeName, code: log.employeeCode });
                                    setIsBarcodeModalOpen(true);
                                  }}
                                  style={{ background: "none", border: "none", cursor: "pointer", color: "#db2777", padding: "2px" }}
                                  title="طباعة باركود هذا الموظف"
                                >
                                  <Barcode size={15} />
                                </button>
                              </div>
                            </td>
                            <td className="num-font" style={{ color: "#059669", fontWeight: "700" }}>
                              {formatDateTime(log.checkIn, true)}
                            </td>
                            <td className="num-font" style={{ color: "#d97706", fontWeight: "700" }}>
                              {log.checkOut ? formatDateTime(log.checkOut, true) : "---"}
                            </td>
                            <td className="num-font" style={{ fontWeight: "800", color: "#1e1322" }}>
                              {log.status === "completed" ? `${hours} س و ${mins} د` : "جاري العمل..."}
                            </td>
                            <td>
                              {log.status === "completed" ? (
                                <span style={{
                                  fontSize: "0.75rem",
                                  fontWeight: "800",
                                  background: "#ecfdf5",
                                  color: "#059669",
                                  padding: "2px 8px",
                                  borderRadius: "12px",
                                  border: "1px solid #a7f3d0"
                                }}>
                                  مكتمل
                                </span>
                              ) : (
                                <span style={{
                                  fontSize: "0.75rem",
                                  fontWeight: "800",
                                  background: "#fffbeb",
                                  color: "#d97706",
                                  padding: "2px 8px",
                                  borderRadius: "12px",
                                  border: "1px solid #fde68a"
                                }}>
                                  على رأس العمل
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    {attendanceLogs.filter((a) => (a.date || "").startsWith(selectedMonth)).length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", padding: "30px", color: "#9ca3af" }}>
                          لا توجد سجلات حضور مسجلة لهذا الشهر
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: MONTHLY PAYROLL LEDGER */}
          {activeTab === "payroll" && (
            <div className="glass-panel" style={{ padding: "20px" }}>
              <div style={{ marginBottom: "16px" }}>
                <h3 style={{ fontSize: "1.15rem", fontWeight: "900", color: "#1e1322", margin: 0 }}>
                  مسير الرواتب والمستحقات لشهر {selectedMonth}
                </h3>
                <p style={{ fontSize: "0.82rem", color: "#6b7280", margin: "2px 0 0 0", fontWeight: "600" }}>
                  الصافي المستحق = أجر الساعات الفعلية (10س/يوم) + عمولات المبيعات + العلاوات - الجزاءات - المسحوبات
                </p>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table className="data-table" style={{ width: "100%", textAlign: "right" }}>
                  <thead>
                    <tr>
                      <th>الموظف</th>
                      <th style={{ textAlign: "center" }}>ساعات العمل</th>
                      <th style={{ textAlign: "left" }}>الأساسي التعاقدي</th>
                      <th style={{ textAlign: "left", color: "#059669" }}>أجر الساعات (+)</th>
                      <th style={{ textAlign: "left", color: "#2563eb" }}>العمولات (+)</th>
                      <th style={{ textAlign: "left", color: "#10b981" }}>العلاوات (+)</th>
                      <th style={{ textAlign: "left", color: "#dc2626" }}>الجزاءات (-)</th>
                      <th style={{ textAlign: "left", color: "#d97706" }}>المسحوبات (-)</th>
                      <th style={{ textAlign: "left", color: "#db2777" }}>الصافي المستحق</th>
                      <th style={{ textAlign: "center" }}>كشف الحساب</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => {
                      const summary = getMonthlySummaryForEmployee(emp.id, selectedMonth);
                      return (
                        <tr key={emp.id}>
                          <td>
                            <strong style={{ color: "#1e1322", display: "block" }}>{emp.name}</strong>
                            <span className="num-font" style={{ fontSize: "0.78rem", color: "#6b7280" }}>{emp.code}</span>
                          </td>
                          <td className="num-font" style={{ textAlign: "center", fontWeight: "800" }}>
                            {summary.hoursWorked}س و {summary.minutesWorked}د
                          </td>
                          <td className="num-font" style={{ textAlign: "left", color: "#6b7280" }}>
                            {formatCurrency(summary.baseSalary)}
                          </td>
                          <td className="num-font" style={{ textAlign: "left", fontWeight: "900", color: "#059669" }}>
                            +{formatCurrency(summary.earnedSalary)}
                          </td>
                          <td className="num-font" style={{ textAlign: "left", fontWeight: "800", color: "#2563eb" }}>
                            +{formatCurrency(summary.totalCommission)}
                          </td>
                          <td className="num-font" style={{ textAlign: "left", fontWeight: "800", color: "#10b981" }}>
                            +{formatCurrency(summary.totalBonus)}
                          </td>
                          <td className="num-font" style={{ textAlign: "left", fontWeight: "800", color: "#dc2626" }}>
                            -{formatCurrency(summary.totalPenalty)}
                          </td>
                          <td className="num-font" style={{ textAlign: "left", fontWeight: "800", color: "#d97706" }}>
                            -{formatCurrency(summary.totalAdvance)}
                          </td>
                          <td className="num-font" style={{ textAlign: "left", fontWeight: "900", color: "#db2777", fontSize: "1.08rem" }}>
                            {formatCurrency(summary.netSalary)}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              onClick={() => handleOpenPayslip(emp)}
                              className="btn-secondary"
                              style={{ padding: "6px 10px", color: "#db2777" }}
                              title="عرض كشف الحساب"
                            >
                              <FileText size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: TRANSACTIONS AUDIT */}
          {activeTab === "transactions" && (
            <div className="glass-panel" style={{ padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <h3 style={{ fontSize: "1.15rem", fontWeight: "900", color: "#1e1322", margin: 0 }}>
                  سجل الحركات المالية (العلاوات، الجزاءات، المسحوبات والعمولات)
                </h3>
                <span className="num-font" style={{ fontSize: "0.85rem", color: "#6b7280", fontWeight: "700" }}>
                  {transactions.filter((t) => (t.date || "").startsWith(selectedMonth)).length} حركة
                </span>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table className="data-table" style={{ width: "100%", textAlign: "right" }}>
                  <thead>
                    <tr>
                      <th>التاريخ</th>
                      <th>الموظف</th>
                      <th>نوع الحركة</th>
                      <th>البيان / الملاحظات</th>
                      <th style={{ textAlign: "left" }}>المبلغ</th>
                      <th style={{ textAlign: "center" }}>إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions
                      .filter((t) => (t.date || "").startsWith(selectedMonth))
                      .map((tx) => {
                        const typeConfig = {
                          bonus: { label: "علاوة / مكافأة", color: "#059669", bg: "#ecfdf5" },
                          commission: { label: "عمولة مبيعات", color: "#2563eb", bg: "#eff6ff" },
                          penalty: { label: "جزاء / خصم", color: "#dc2626", bg: "#fef2f2" },
                          advance: { label: "سلفة / مسحوبات", color: "#d97706", bg: "#fffbeb" }
                        };
                        const meta = typeConfig[tx.type] || { label: tx.type, color: "#4b5563", bg: "#f3f4f6" };

                        return (
                          <tr key={tx.id}>
                            <td className="num-font" style={{ color: "#4b5563", fontWeight: "700" }}>{tx.date}</td>
                            <td style={{ fontWeight: "800", color: "#1e1322" }}>{tx.employeeName}</td>
                            <td>
                              <span style={{
                                fontSize: "0.78rem",
                                fontWeight: "800",
                                background: meta.bg,
                                color: meta.color,
                                padding: "3px 10px",
                                borderRadius: "12px"
                              }}>
                                {meta.label}
                              </span>
                            </td>
                            <td style={{ color: "#374151", fontWeight: "600" }}>{tx.notes || "---"}</td>
                            <td className="num-font" style={{ textAlign: "left", fontWeight: "900", color: meta.color, fontSize: "1rem" }}>
                              {tx.type === "bonus" || tx.type === "commission" ? "+" : "-"}
                              {formatCurrency(tx.amount)}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <button
                                onClick={() => handleDeleteTransaction(tx.id)}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", padding: "4px" }}
                                title="حذف الحركة"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    {transactions.filter((t) => (t.date || "").startsWith(selectedMonth)).length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center", padding: "30px", color: "#9ca3af" }}>
                          لا توجد حركات مالية مسجلة لهذا الشهر
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>

        {/* Modals placed outside page-wrapper so print media queries do not hide them */}
        <EmployeeModal
          isOpen={isEmployeeModalOpen}
          onClose={() => setIsEmployeeModalOpen(false)}
          employee={editingEmployee}
          onSaved={() => {}}
        />

        <EmployeeTransactionModal
          isOpen={isTransactionModalOpen}
          onClose={() => {
            setIsTransactionModalOpen(false);
            setTransactionTargetEmployee(null);
          }}
          employee={transactionTargetEmployee}
          onSaved={() => {}}
        />

        <EmployeePayslipModal
          isOpen={isPayslipModalOpen}
          onClose={() => {
            setIsPayslipModalOpen(false);
            setPayslipEmployee(null);
            setPayslipData(null);
          }}
          employee={payslipEmployee}
          monthSummary={payslipData}
        />

        <EmployeeBarcodeModal
          isOpen={isBarcodeModalOpen}
          onClose={() => {
            setIsBarcodeModalOpen(false);
            setBarcodeEmployee(null);
          }}
          employee={barcodeEmployee}
        />
      </div>
    </div>
  );
}
