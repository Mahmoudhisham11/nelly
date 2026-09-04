"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import StatCard from "@/components/StatCard";
import { subscribeToReports, deleteReport } from "@/lib/salesService";
import { formatNumber, roundCurrency } from "@/lib/utils";
import { 
  CalendarCheck, 
  Search, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Banknote, 
  Receipt, 
  ShoppingCart, 
  User, 
  Eye, 
  Printer, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  Trash2,
  FileSpreadsheet,
  AlertCircle,
  Download,
  Boxes,
  Lock,
  Layers,
  CreditCard,
  Building,
  Tag,
  Clock,
  RotateCcw
} from "lucide-react";

export default function ReportsPage() {
  const router = useRouter();
  const { user, isAdmin, loading: authLoading } = useAuth();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateQuery, setDateQuery] = useState(""); // YYYY-MM-DD
  const [searchQuery, setSearchQuery] = useState("");
  const [quickDateFilter, setQuickDateFilter] = useState("all"); // "all" | "today" | "yesterday" | "week" | "month"

  // Modal
  const [selectedReport, setSelectedReport] = useState(null);
  const [modalActiveTab, setModalActiveTab] = useState("invoices"); // "invoices" | "items" | "payments"
  const [expandedInvoiceId, setExpandedInvoiceId] = useState(null);

  // Feedback
  const [toastMessage, setToastMessage] = useState("");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Auth protection
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Subscribe to Shift Reports
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToReports((data) => {
      setReports(data);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4500);
  };

  // Quick date filter handler
  const handleQuickFilter = (type) => {
    setQuickDateFilter(type);
    const now = new Date();

    if (type === "all") {
      setDateQuery("");
    } else if (type === "today") {
      const todayStr = now.toISOString().split("T")[0];
      setDateQuery(todayStr);
    } else if (type === "yesterday") {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      setDateQuery(yest.toISOString().split("T")[0]);
    } else if (type === "week" || type === "month") {
      setDateQuery(""); // Handled in filter logic
    }
  };

  // Filtered reports
  const filteredReports = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return reports.filter((rep) => {
      const repDate = new Date(rep.closedAt || rep.date || rep.createdAt);
      const repDateStr = repDate.toISOString().split("T")[0];

      // Date match
      let dateMatches = true;
      if (quickDateFilter === "week") {
        dateMatches = repDate >= sevenDaysAgo;
      } else if (quickDateFilter === "month") {
        dateMatches = repDate >= firstDayOfMonth;
      } else if (dateQuery) {
        dateMatches = repDateStr === dateQuery;
      }

      // Text search match
      const q = searchQuery.trim().toLowerCase();
      let textMatches = true;
      if (q) {
        textMatches = 
          (rep.reportNumber && rep.reportNumber.toLowerCase().includes(q)) ||
          (rep.closedBy?.name && rep.closedBy.name.toLowerCase().includes(q)) ||
          (rep.notes && rep.notes.toLowerCase().includes(q));
      }

      return dateMatches && textMatches;
    });
  }, [reports, dateQuery, searchQuery, quickDateFilter]);

  // Aggregate KPI stats
  const aggregateStats = useMemo(() => {
    let salesTotal = 0;
    let profitTotal = 0;
    let cashTotal = 0;
    let invCount = 0;

    filteredReports.forEach((rep) => {
      salesTotal += (rep.totalSales || 0);
      profitTotal += (rep.totalProfit || 0);
      cashTotal += (rep.paymentBreakdown?.["نقدي"] || 0);
      invCount += (rep.invoicesCount || (rep.invoices || []).length);
    });

    return {
      shiftsCount: filteredReports.length,
      invoicesCount: invCount,
      totalSales: roundCurrency(salesTotal),
      totalProfit: roundCurrency(profitTotal),
      totalCash: roundCurrency(cashTotal)
    };
  }, [filteredReports]);

  // Consolidated items sold in selected report
  const selectedReportConsolidatedItems = useMemo(() => {
    if (!selectedReport || !selectedReport.invoices) return [];
    const map = {};

    selectedReport.invoices.forEach((inv) => {
      (inv.items || []).forEach((it) => {
        const key = it.productId || it.barcode || it.name;
        if (!map[key]) {
          map[key] = {
            name: it.name,
            barcode: it.barcode || it.code || "—",
            sellingPrice: it.sellingPrice || 0,
            wholesalePrice: it.wholesalePrice || 0,
            quantity: 0,
            totalSales: 0,
            totalProfit: 0
          };
        }
        const qty = Number(it.quantity) || 1;
        const sub = it.subtotal || qty * it.sellingPrice;
        const profit = it.profit || (it.sellingPrice - (it.wholesalePrice || 0)) * qty;

        map[key].quantity += qty;
        map[key].totalSales += sub;
        map[key].totalProfit += profit;
      });
    });

    return Object.values(map).sort((a, b) => b.quantity - a.quantity);
  }, [selectedReport]);

  // Print Shift Report Handler
  const handlePrintReport = () => {
    window.print();
  };

  // Export to CSV
  const exportToCSV = () => {
    if (filteredReports.length === 0) {
      showToast("لا توجد بيانات ورديات لتصديرها.");
      return;
    }

    const headers = [
      "رقم التقفيلة",
      "تاريخ الإغلاق",
      "المسؤول (الكاشير)",
      "عدد الفواتير",
      "إجمالي المبيعات (ج.م)",
      "صافي الأرباح (ج.م)",
      "كاش",
      "فيزا",
      "تحويل",
      "آجل",
      "ملاحظات"
    ];

    const rows = filteredReports.map((rep) => [
      `"${rep.reportNumber || ''}"`,
      `"${new Date(rep.closedAt || rep.date).toLocaleString("ar-EG")}"`,
      `"${rep.closedBy?.name || 'كاشير المحل'}"`,
      rep.invoicesCount || (rep.invoices || []).length,
      rep.totalSales || 0,
      rep.totalProfit || 0,
      rep.paymentBreakdown?.["نقدي"] || 0,
      rep.paymentBreakdown?.["فيزا"] || 0,
      rep.paymentBreakdown?.["تحويل"] || 0,
      rep.paymentBreakdown?.["آجل"] || 0,
      `"${rep.notes || ''}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `تقرير_تقفيلة_الأيام_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Admin delete report
  const handleDeleteReport = async (repId, e) => {
    e.stopPropagation();
    if (!isAdmin) {
      showToast("عفواً، حذف تقرير الوردية مقتصر على المدير فقط.");
      return;
    }

    const isConfirmed = window.confirm("هل أنت متأكد من رغبتك في حذف تقرير الوردية هذا نهائياً من السجلات؟");
    if (!isConfirmed) return;

    try {
      await deleteReport(repId);
      showToast("تم حذف تقرير الوردية بنجاح.");
      if (selectedReport?.id === repId) {
        setSelectedReport(null);
      }
    } catch (err) {
      console.error("Delete report error:", err);
      showToast("حدث خطأ أثناء حذف التقرير.");
    }
  };

  if (authLoading || (!user && loading)) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--text-secondary)", fontWeight: "700" }}>جاري تحميل تقارير تقفيلة الأيام...</p>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {toastMessage && (
        <div className="fixed-toast-notification">
          <Sparkles className="toast-icon" />
          <span>{toastMessage}</span>
        </div>
      )}

      <Sidebar 
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      <div className="main-content">
        <Navbar 
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          title="تقفيلة الأيام (الورديات)"
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
                  width: "42px",
                  height: "42px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)",
                  color: "#9333ea",
                  border: "1px solid #e9d5ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 6px rgba(147, 51, 234, 0.12)"
                }}>
                  <CalendarCheck size={22} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <h2 style={{ fontSize: "1.6rem", fontWeight: "900", color: "#1e1322" }}>
                      سجل تقفيلة الأيام والورديات
                    </h2>
                    <span className="badge badge-code" style={{ fontSize: "0.85rem", background: "#f3e8ff", color: "#7e22ce", borderColor: "#d8b4fe" }}>
                      <span className="num-font" dir="ltr">{formatNumber(filteredReports.length)}</span> وردية مسجلة
                    </span>
                  </div>
                </div>
              </div>
              <p style={{ color: "#5a4663", fontSize: "0.88rem", marginTop: "6px", fontWeight: "600" }}>
                أرشيف شامل ومفصل لكافة الورديات المقفلة، مع استعراض الأرباح، الكاش المحصل، وكافة الفواتير والأصناف المباعة
              </p>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <button 
                onClick={exportToCSV} 
                className="btn-secondary" 
                title="تصدير كشف الورديات إلى ملف CSV" 
                style={{ background: "#ffffff" }}
              >
                <Download size={16} color="#059669" />
                تصدير تقرير الورديات
              </button>
            </div>
          </div>

          {/* 4 KPI Summary Stat Cards */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "16px",
            marginBottom: "24px"
          }}>
            <StatCard 
              title="إجمالي المبيعات المؤرشفة"
              value={aggregateStats.totalSales}
              suffix="ج.م"
              subtitle="إجمالي قيمة فواتير الورديات المحددة"
              icon={DollarSign}
              theme="rose"
            />
            <StatCard 
              title="صافي أرباح الفترة"
              value={aggregateStats.totalProfit}
              suffix="ج.م"
              subtitle="الأرباح الصافية بعد خصم تكلفة البضاعة"
              icon={TrendingUp}
              theme="emerald"
            />
            <StatCard 
              title="إجمالي النقدية (الكاش)"
              value={aggregateStats.totalCash}
              suffix="ج.م"
              subtitle="المبالغ النقدية المحصلة في الدرج"
              icon={Banknote}
              theme="gold"
            />
            <StatCard 
              title="الورديات والفواتير"
              value={aggregateStats.shiftsCount}
              suffix="وردية"
              subtitle={`تتضمن ${formatNumber(aggregateStats.invoicesCount)} فاتورة مباعة`}
              icon={Receipt}
              theme="purple"
            />
          </div>

          {/* Filter & Search Toolbar */}
          <div className="glass-panel" style={{ padding: "18px 20px", marginBottom: "24px", background: "#ffffff", border: "1.5px solid #ebdbe6" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px"
            }}>
              {/* Search text */}
              <div style={{ position: "relative", flex: "1", minWidth: "260px" }}>
                <input 
                  type="text"
                  placeholder="ابحث برقم الوردية، اسم الكاشير، أو الملاحظات..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input"
                  style={{ paddingRight: "38px", fontWeight: "600", fontSize: "0.88rem" }}
                />
                <Search 
                  size={16} 
                  color="#db2777" 
                  style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} 
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#9ca3af", cursor: "pointer" }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Specific Date Picker */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Calendar size={16} color="#db2777" />
                <span style={{ fontSize: "0.82rem", fontWeight: "700", color: "#5a4663" }}>تاريخ محدد:</span>
                <input 
                  type="date"
                  value={dateQuery}
                  onChange={(e) => {
                    setDateQuery(e.target.value);
                    setQuickDateFilter("custom");
                  }}
                  className="form-input num-font"
                  style={{ padding: "7px 12px", fontSize: "0.85rem", width: "auto", fontWeight: "700" }}
                />
                {dateQuery && (
                  <button
                    onClick={() => {
                      setDateQuery("");
                      setQuickDateFilter("all");
                    }}
                    style={{ background: "none", border: "none", color: "#ef4444", fontSize: "0.82rem", fontWeight: "800", cursor: "pointer" }}
                  >
                    مسح
                  </button>
                )}
              </div>

              {/* Quick Date Shortcuts */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                {[
                  { key: "all", label: "كافة الورديات" },
                  { key: "today", label: "اليوم" },
                  { key: "yesterday", label: "الأمس" },
                  { key: "week", label: "آخر 7 أيام" },
                  { key: "month", label: "هذا الشهر" }
                ].map((btn) => (
                  <button
                    key={btn.key}
                    onClick={() => handleQuickFilter(btn.key)}
                    style={{
                      padding: "7px 14px",
                      borderRadius: "10px",
                      fontSize: "0.82rem",
                      fontWeight: "700",
                      cursor: "pointer",
                      border: quickDateFilter === btn.key ? "1.5px solid #9333ea" : "1px solid #e7d8e2",
                      background: quickDateFilter === btn.key ? "#faf5ff" : "#ffffff",
                      color: quickDateFilter === btn.key ? "#9333ea" : "#5a4663",
                      transition: "all 0.15s ease"
                    }}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Shift Reports Table */}
          <div className="table-container" style={{ marginBottom: "30px" }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <p style={{ color: "var(--text-muted)", fontWeight: "700" }}>جاري تحميل تقارير تقفيلة الأيام...</p>
              </div>
            ) : filteredReports.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <CalendarCheck size={48} color="#9333ea" style={{ margin: "0 auto 12px", opacity: 0.7 }} />
                <h3 style={{ fontSize: "1.15rem", marginBottom: "6px", color: "#1e1322", fontWeight: "800" }}>
                  لا توجد تقارير ورديات مسجلة
                </h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontWeight: "600" }}>
                  {searchQuery || dateQuery 
                    ? "لا توجد تقارير تطابق معايير البحث أو التاريخ المحددة." 
                    : "عند تقفيل أي وردية من الكاشير (POS)، سيتم أرشفة بياناتها وتفاصيلها هنا."}
                </p>
              </div>
            ) : (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th style={{ whiteSpace: "nowrap" }}>رقم التقفيلة</th>
                    <th style={{ whiteSpace: "nowrap" }}>تاريخ ووقت الإغلاق</th>
                    <th style={{ whiteSpace: "nowrap" }}>المسؤول (الكاشير)</th>
                    <th style={{ whiteSpace: "nowrap", textAlign: "center" }}>الفواتير والأصناف</th>
                    <th style={{ whiteSpace: "nowrap", textAlign: "center" }}>إجمالي المبيعات</th>
                    <th style={{ whiteSpace: "nowrap", textAlign: "center" }}>صافي الربح</th>
                    <th style={{ whiteSpace: "nowrap" }}>تفصيل المقبوضات</th>
                    <th style={{ whiteSpace: "nowrap" }}>ملاحظات الوردية</th>
                    <th style={{ whiteSpace: "nowrap", textAlign: "center" }}>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((rep) => (
                    <tr 
                      key={rep.id}
                      onClick={() => setSelectedReport(rep)}
                      style={{ cursor: "pointer" }}
                    >
                      <td>
                        <span className="num-font" dir="ltr" style={{
                          fontFamily: "monospace",
                          fontWeight: "800",
                          color: "#7e22ce",
                          background: "#faf5ff",
                          border: "1px solid #e9d5ff",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          fontSize: "0.85rem"
                        }}>
                          {rep.reportNumber}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: "700", color: "#1e1322", fontSize: "0.88rem" }}>
                          {new Date(rep.closedAt || rep.date).toLocaleDateString("ar-EG")}
                        </div>
                        <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }} className="num-font" dir="ltr">
                          {new Date(rep.closedAt || rep.date).toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td style={{ fontWeight: "700", color: "#1e1322" }}>
                        {rep.closedBy?.name || "كاشير المحل"}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{
                          fontSize: "0.82rem",
                          fontWeight: "800",
                          color: "#1e1322",
                          background: "#fdf5f9",
                          border: "1px solid #ebdbe6",
                          padding: "3px 9px",
                          borderRadius: "8px"
                        }}>
                          <span className="num-font" dir="ltr">{rep.invoicesCount || (rep.invoices || []).length}</span> فاتورة 
                          {rep.totalItemsSold ? ` • ${rep.totalItemsSold} قطعة` : ""}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className="num-font" dir="ltr" style={{
                          fontSize: "1rem",
                          fontWeight: "900",
                          color: "#db2777"
                        }}>
                          {formatNumber(rep.totalSales)} ج.م
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className="num-font" dir="ltr" style={{
                          fontSize: "0.95rem",
                          fontWeight: "900",
                          color: "#059669"
                        }}>
                          +{formatNumber(rep.totalProfit)} ج.م
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", fontSize: "0.78rem" }}>
                          {rep.paymentBreakdown?.["نقدي"] > 0 && (
                            <span style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", padding: "2px 6px", borderRadius: "4px", fontWeight: "700" }}>
                              كاش: <strong className="num-font" dir="ltr">{formatNumber(rep.paymentBreakdown["نقدي"])}</strong>
                            </span>
                          )}
                          {rep.paymentBreakdown?.["فيزا"] > 0 && (
                            <span style={{ background: "#faf5ff", border: "1px solid #e9d5ff", color: "#7e22ce", padding: "2px 6px", borderRadius: "4px", fontWeight: "700" }}>
                              فيزا: <strong className="num-font" dir="ltr">{formatNumber(rep.paymentBreakdown["فيزا"])}</strong>
                            </span>
                          )}
                          {rep.paymentBreakdown?.["تحويل"] > 0 && (
                            <span style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af", padding: "2px 6px", borderRadius: "4px", fontWeight: "700" }}>
                              تحويل: <strong className="num-font" dir="ltr">{formatNumber(rep.paymentBreakdown["تحويل"])}</strong>
                            </span>
                          )}
                          {rep.paymentBreakdown?.["آجل"] > 0 && (
                            <span style={{ background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e", padding: "2px 6px", borderRadius: "4px", fontWeight: "700" }}>
                              آجل: <strong className="num-font" dir="ltr">{formatNumber(rep.paymentBreakdown["آجل"])}</strong>
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ fontSize: "0.82rem", color: "var(--text-muted)", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {rep.notes || "—"}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }} onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedReport(rep)}
                            className="btn-secondary"
                            style={{ padding: "6px 12px", fontSize: "0.8rem", fontWeight: "700" }}
                            title="عرض فواتير وأصناف الوردية بالتفصيل"
                          >
                            <Eye size={14} color="#9333ea" />
                            <span>عرض الوردية</span>
                          </button>

                          {isAdmin && (
                            <button
                              onClick={(e) => handleDeleteReport(rep.id, e)}
                              className="btn-danger"
                              style={{ padding: "6px 8px" }}
                              title="حذف هذا التقرير نهائياً (مدير فقط)"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>

      {/* =========================================================
          MODAL: Detailed Shift Report & All Invoices With Items
          ========================================================= */}
      {selectedReport && (
        <div className="modal-overlay" onClick={() => setSelectedReport(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "860px" }}>
            {/* Modal Header */}
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  background: "rgba(147, 51, 234, 0.1)",
                  color: "#9333ea",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <CalendarCheck size={22} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <h3 className="modal-title font-mono font-bold" style={{ fontSize: "1.15rem" }}>
                      تقرير الوردية: {selectedReport.reportNumber}
                    </h3>
                    <span className="badge badge-code" style={{ fontSize: "0.75rem" }}>
                      {selectedReport.closedBy?.name || "كاشير المحل"}
                    </span>
                  </div>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    تاريخ ووقت الإغلاق: {new Date(selectedReport.closedAt || selectedReport.date).toLocaleString("ar-EG")}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  onClick={handlePrintReport}
                  className="btn-secondary"
                  style={{ padding: "6px 14px", fontSize: "0.82rem", fontWeight: "700" }}
                >
                  <Printer size={15} color="#9333ea" />
                  <span>طباعة التقرير</span>
                </button>
                <button onClick={() => setSelectedReport(null)} className="modal-close-btn" type="button">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "20px", overflowY: "auto", maxHeight: "calc(90vh - 120px)" }}>
              {/* Top KPI Cards in Modal */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                gap: "12px",
                marginBottom: "20px"
              }}>
                <div style={{ background: "#fdf2f8", border: "1px solid #fbcfe8", borderRadius: "14px", padding: "12px 16px" }}>
                  <span style={{ fontSize: "0.78rem", color: "#9d174d", fontWeight: "700" }}>إجمالي المبيعات</span>
                  <div className="num-font" dir="ltr" style={{ fontSize: "1.3rem", fontWeight: "900", color: "#db2777", marginTop: "2px" }}>
                    {formatNumber(selectedReport.totalSales)} ج.م
                  </div>
                </div>

                <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "14px", padding: "12px 16px" }}>
                  <span style={{ fontSize: "0.78rem", color: "#065f46", fontWeight: "700" }}>صافي الربح</span>
                  <div className="num-font" dir="ltr" style={{ fontSize: "1.3rem", fontWeight: "900", color: "#059669", marginTop: "2px" }}>
                    +{formatNumber(selectedReport.totalProfit)} ج.م
                  </div>
                </div>

                <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "14px", padding: "12px 16px" }}>
                  <span style={{ fontSize: "0.78rem", color: "#92400e", fontWeight: "700" }}>الكاش المستلم</span>
                  <div className="num-font" dir="ltr" style={{ fontSize: "1.3rem", fontWeight: "900", color: "#d97706", marginTop: "2px" }}>
                    {formatNumber(selectedReport.paymentBreakdown?.["نقدي"] || 0)} ج.م
                  </div>
                </div>

                <div style={{ background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: "14px", padding: "12px 16px" }}>
                  <span style={{ fontSize: "0.78rem", color: "#6b21a8", fontWeight: "700" }}>عدد الفواتير</span>
                  <div className="num-font" dir="ltr" style={{ fontSize: "1.3rem", fontWeight: "900", color: "#9333ea", marginTop: "2px" }}>
                    {selectedReport.invoicesCount || (selectedReport.invoices || []).length} فاتورة
                  </div>
                </div>
              </div>

              {/* Notes Banner if available */}
              {selectedReport.notes && (
                <div style={{
                  background: "#faf5ff",
                  border: "1px solid #e9d5ff",
                  borderRadius: "12px",
                  padding: "12px 16px",
                  marginBottom: "20px",
                  fontSize: "0.85rem",
                  color: "#6b21a8"
                }}>
                  <strong>ملاحظات الإغلاق:</strong> {selectedReport.notes}
                </div>
              )}

              {/* Modal Tabs Navigation */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "16px",
                borderBottom: "1.5px solid #f0e1ec",
                paddingBottom: "10px"
              }}>
                <button
                  onClick={() => setModalActiveTab("invoices")}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "10px",
                    fontSize: "0.88rem",
                    fontWeight: "800",
                    cursor: "pointer",
                    border: "none",
                    background: modalActiveTab === "invoices" ? "#9333ea" : "transparent",
                    color: modalActiveTab === "invoices" ? "#ffffff" : "#5a4663",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <Receipt size={16} />
                  <span>فواتير الوردية ({(selectedReport.invoices || []).length})</span>
                </button>

                <button
                  onClick={() => setModalActiveTab("items")}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "10px",
                    fontSize: "0.88rem",
                    fontWeight: "800",
                    cursor: "pointer",
                    border: "none",
                    background: modalActiveTab === "items" ? "#9333ea" : "transparent",
                    color: modalActiveTab === "items" ? "#ffffff" : "#5a4663",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <Boxes size={16} />
                  <span>الأصناف المباعة بالوردية ({selectedReportConsolidatedItems.length})</span>
                </button>

                <button
                  onClick={() => setModalActiveTab("payments")}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "10px",
                    fontSize: "0.88rem",
                    fontWeight: "800",
                    cursor: "pointer",
                    border: "none",
                    background: modalActiveTab === "payments" ? "#9333ea" : "transparent",
                    color: modalActiveTab === "payments" ? "#ffffff" : "#5a4663",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <Banknote size={16} />
                  <span>تفصيل الخزينة والدفع</span>
                </button>
              </div>

              {/* TAB 1: Invoices Accordion List */}
              {modalActiveTab === "invoices" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {(selectedReport.invoices || []).map((inv, idx) => {
                    const isExpanded = expandedInvoiceId === (inv.id || idx);
                    return (
                      <div
                        key={inv.id || idx}
                        style={{
                          border: isExpanded ? "1.5px solid #9333ea" : "1px solid #ebdbe6",
                          borderRadius: "14px",
                          background: "#ffffff",
                          overflow: "hidden",
                          transition: "all 0.2s ease"
                        }}
                      >
                        {/* Invoice Summary Bar */}
                        <div
                          onClick={() => setExpandedInvoiceId(isExpanded ? null : (inv.id || idx))}
                          style={{
                            padding: "14px 18px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: "10px",
                            cursor: "pointer",
                            background: isExpanded ? "#faf5ff" : "#ffffff"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <span style={{
                              width: "28px",
                              height: "28px",
                              borderRadius: "8px",
                              background: "#f3e8ff",
                              color: "#7e22ce",
                              fontSize: "0.82rem",
                              fontWeight: "900",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }} className="num-font">
                              {idx + 1}
                            </span>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span className="num-font" dir="ltr" style={{ fontWeight: "900", color: "#db2777", fontSize: "0.95rem" }}>
                                  {inv.invoiceNumber}
                                </span>
                                <span style={{
                                  fontSize: "0.75rem",
                                  padding: "2px 8px",
                                  borderRadius: "6px",
                                  background: "#ecfdf5",
                                  color: "#065f46",
                                  fontWeight: "700"
                                }}>
                                  {inv.paymentMethod || "نقدي"}
                                </span>
                              </div>
                              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
                                العميل: {inv.customer?.name || "عميل نقدي"}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                            <span style={{
                              fontSize: "0.8rem",
                              background: "#f8eff4",
                              border: "1px solid #f0e1ec",
                              padding: "3px 8px",
                              borderRadius: "6px",
                              fontWeight: "700"
                            }}>
                              {(inv.items || []).length} صنف ({(inv.items || []).reduce((a, c) => a + (c.quantity || 1), 0)} قطعة)
                            </span>
                            <span className="num-font" dir="ltr" style={{ fontSize: "1.05rem", fontWeight: "900", color: "#1e1322" }}>
                              {formatNumber(inv.total)} ج.م
                            </span>
                            <span style={{ color: "#9333ea" }}>
                              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </span>
                          </div>
                        </div>

                        {/* Expanded Items Table */}
                        {isExpanded && (
                          <div style={{ borderTop: "1px solid #ebdbe6", padding: "12px", background: "#fdfafc" }}>
                            <table className="custom-table" style={{ fontSize: "0.82rem" }}>
                              <thead>
                                <tr>
                                  <th>الصنف</th>
                                  <th style={{ textAlign: "center" }}>الباركود</th>
                                  <th style={{ textAlign: "center" }}>الكمية</th>
                                  <th style={{ textAlign: "center" }}>سعر البيع</th>
                                  <th style={{ textAlign: "center" }}>سعر التكلفة</th>
                                  <th style={{ textAlign: "center" }}>الإجمالي</th>
                                  <th style={{ textAlign: "center" }}>الربح</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(inv.items || []).map((it, iIdx) => (
                                  <tr key={iIdx}>
                                    <td style={{ fontWeight: "700" }}>{it.name}</td>
                                    <td style={{ textAlign: "center" }}>
                                      <span className="num-font" dir="ltr" style={{ fontFamily: "monospace", fontSize: "0.78rem" }}>
                                        {it.barcode || "—"}
                                      </span>
                                    </td>
                                    <td style={{ textAlign: "center", fontWeight: "800" }} className="num-font">
                                      {it.quantity}
                                    </td>
                                    <td style={{ textAlign: "center" }} className="num-font">
                                      {formatNumber(it.sellingPrice)} ج.م
                                    </td>
                                    <td style={{ textAlign: "center", color: "var(--text-muted)" }} className="num-font">
                                      {formatNumber(it.wholesalePrice)} ج.م
                                    </td>
                                    <td style={{ textAlign: "center", fontWeight: "800", color: "#db2777" }} className="num-font">
                                      {formatNumber(it.subtotal || it.quantity * it.sellingPrice)} ج.م
                                    </td>
                                    <td style={{ textAlign: "center", fontWeight: "800", color: "#059669" }} className="num-font">
                                      +{formatNumber(it.profit || (it.sellingPrice - (it.wholesalePrice || 0)) * it.quantity)} ج.م
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 2: Consolidated Products Sold */}
              {modalActiveTab === "items" && (
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>اسم الصنف</th>
                        <th style={{ textAlign: "center" }}>الباركود</th>
                        <th style={{ textAlign: "center" }}>سعر البيع</th>
                        <th style={{ textAlign: "center" }}>الكمية المباعة</th>
                        <th style={{ textAlign: "center" }}>إجمالي المبيعات</th>
                        <th style={{ textAlign: "center" }}>صافي الربح</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReportConsolidatedItems.map((it, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: "800", color: "#1e1322" }}>{it.name}</td>
                          <td style={{ textAlign: "center" }}>
                            <span className="num-font" dir="ltr" style={{ fontFamily: "monospace", fontSize: "0.82rem", background: "#f3e8ff", color: "#7e22ce", padding: "2px 6px", borderRadius: "4px" }}>
                              {it.barcode}
                            </span>
                          </td>
                          <td style={{ textAlign: "center" }} className="num-font">
                            {formatNumber(it.sellingPrice)} ج.م
                          </td>
                          <td style={{ textAlign: "center", fontWeight: "900" }} className="num-font">
                            {it.quantity} قطعة
                          </td>
                          <td style={{ textAlign: "center", fontWeight: "900", color: "#db2777" }} className="num-font">
                            {formatNumber(it.totalSales)} ج.م
                          </td>
                          <td style={{ textAlign: "center", fontWeight: "900", color: "#059669" }} className="num-font">
                            +{formatNumber(it.totalProfit)} ج.م
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 3: Payment Breakdown */}
              {modalActiveTab === "payments" && (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "14px"
                }}>
                  <div style={{ background: "#ecfdf5", border: "1.5px solid #a7f3d0", borderRadius: "14px", padding: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#065f46", fontWeight: "800", fontSize: "0.95rem" }}>
                      <Banknote size={20} />
                      <span>النقدية (كاش الدرج)</span>
                    </div>
                    <div className="num-font" dir="ltr" style={{ fontSize: "1.6rem", fontWeight: "900", color: "#059669", marginTop: "10px" }}>
                      {formatNumber(selectedReport.paymentBreakdown?.["نقدي"] || 0)} ج.م
                    </div>
                  </div>

                  <div style={{ background: "#faf5ff", border: "1.5px solid #e9d5ff", borderRadius: "14px", padding: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#6b21a8", fontWeight: "800", fontSize: "0.95rem" }}>
                      <CreditCard size={20} />
                      <span>مدفوعات الفيزا / البطاقات</span>
                    </div>
                    <div className="num-font" dir="ltr" style={{ fontSize: "1.6rem", fontWeight: "900", color: "#9333ea", marginTop: "10px" }}>
                      {formatNumber(selectedReport.paymentBreakdown?.["فيزا"] || 0)} ج.م
                    </div>
                  </div>

                  <div style={{ background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: "14px", padding: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#1e40af", fontWeight: "800", fontSize: "0.95rem" }}>
                      <Building size={20} />
                      <span>تحويلات بنكية / فودافون كاش</span>
                    </div>
                    <div className="num-font" dir="ltr" style={{ fontSize: "1.6rem", fontWeight: "900", color: "#2563eb", marginTop: "10px" }}>
                      {formatNumber(selectedReport.paymentBreakdown?.["تحويل"] || 0)} ج.م
                    </div>
                  </div>

                  <div style={{ background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: "14px", padding: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#92400e", fontWeight: "800", fontSize: "0.95rem" }}>
                      <Receipt size={20} />
                      <span>حسابات آجلة (ذمم عملاء)</span>
                    </div>
                    <div className="num-font" dir="ltr" style={{ fontSize: "1.6rem", fontWeight: "900", color: "#d97706", marginTop: "10px" }}>
                      {formatNumber(selectedReport.paymentBreakdown?.["آجل"] || 0)} ج.م
                    </div>
                  </div>
                </div>
              )}

              {/* ===================================================================
                  PRINTABLE SHIFT REPORT DOCUMENT (A4 OFFICIAL REPORT)
                 =================================================================== */}
              <div id="printable-shift-report" style={{ display: "none" }}>
                <div style={{
                  background: "#ffffff",
                  color: "#000000",
                  padding: "16px 20px",
                  fontFamily: "var(--font-family), Arial, Tahoma, sans-serif"
                }}>
                  {/* Header */}
                  <div style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    borderBottom: "2.5px solid #111827",
                    paddingBottom: "12px",
                    marginBottom: "16px"
                  }}>
                    <div>
                      <div style={{ fontSize: "1.4rem", fontWeight: "900", color: "#db2777" }}>
                        NELLY COSMETICS | متجر ومخزن نيللي
                      </div>
                      <h1 style={{ fontSize: "1.2rem", fontWeight: "900", color: "#111827", marginTop: "3px" }}>
                        تقرير تقفيلة الوردية والحسابات الرسمية
                      </h1>
                      <div style={{ fontSize: "0.82rem", color: "#4b5563", marginTop: "4px" }}>
                        تاريخ ووقت الإغلاق: <strong>{new Date(selectedReport.closedAt || selectedReport.date).toLocaleString("ar-EG")}</strong>
                      </div>
                    </div>

                    <div style={{
                      background: "#f9fafb",
                      border: "1.5px solid #d1d5db",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      textAlign: "right",
                      fontSize: "0.8rem",
                      minWidth: "180px"
                    }}>
                      <div>رقم التقفيلة: <strong className="num-font" dir="ltr" style={{ color: "#7e22ce" }}>{selectedReport.reportNumber}</strong></div>
                      <div style={{ marginTop: "2px" }}>المسؤول: <strong>{selectedReport.closedBy?.name || "كاشير المحل"}</strong></div>
                    </div>
                  </div>

                  {/* Financial KPI Summary */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "8px",
                    marginBottom: "16px"
                  }}>
                    <div style={{ background: "#fdf2f8", border: "1px solid #fbcfe8", borderRadius: "6px", padding: "8px 10px" }}>
                      <div style={{ fontSize: "0.72rem", color: "#9d174d", fontWeight: "700" }}>إجمالي المبيعات</div>
                      <div className="num-font" dir="ltr" style={{ fontSize: "1.2rem", fontWeight: "900", color: "#db2777" }}>
                        {formatNumber(selectedReport.totalSales)} ج.م
                      </div>
                    </div>

                    <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "6px", padding: "8px 10px" }}>
                      <div style={{ fontSize: "0.72rem", color: "#065f46", fontWeight: "700" }}>صافي الأرباح</div>
                      <div className="num-font" dir="ltr" style={{ fontSize: "1.2rem", fontWeight: "900", color: "#059669" }}>
                        +{formatNumber(selectedReport.totalProfit)} ج.م
                      </div>
                    </div>

                    <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "6px", padding: "8px 10px" }}>
                      <div style={{ fontSize: "0.72rem", color: "#92400e", fontWeight: "700" }}>النقدية المستلمة (كاش)</div>
                      <div className="num-font" dir="ltr" style={{ fontSize: "1.2rem", fontWeight: "900", color: "#d97706" }}>
                        {formatNumber(selectedReport.paymentBreakdown?.["نقدي"] || 0)} ج.م
                      </div>
                    </div>

                    <div style={{ background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: "6px", padding: "8px 10px" }}>
                      <div style={{ fontSize: "0.72rem", color: "#6b21a8", fontWeight: "700" }}>الفواتير والقطع المباعة</div>
                      <div className="num-font" dir="ltr" style={{ fontSize: "1.2rem", fontWeight: "900", color: "#9333ea" }}>
                        {selectedReport.invoicesCount || (selectedReport.invoices || []).length} فاتورة
                      </div>
                    </div>
                  </div>

                  {/* Payment Breakdown Tiles */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "8px",
                    marginBottom: "16px",
                    fontSize: "0.78rem"
                  }}>
                    <div style={{ border: "1px solid #d1d5db", padding: "6px 8px", borderRadius: "6px" }}>
                      <span>كاش: </span>
                      <strong className="num-font" dir="ltr">{formatNumber(selectedReport.paymentBreakdown?.["نقدي"] || 0)} ج.م</strong>
                    </div>
                    <div style={{ border: "1px solid #d1d5db", padding: "6px 8px", borderRadius: "6px" }}>
                      <span>فيزا: </span>
                      <strong className="num-font" dir="ltr">{formatNumber(selectedReport.paymentBreakdown?.["فيزا"] || 0)} ج.م</strong>
                    </div>
                    <div style={{ border: "1px solid #d1d5db", padding: "6px 8px", borderRadius: "6px" }}>
                      <span>تحويل بنكي: </span>
                      <strong className="num-font" dir="ltr">{formatNumber(selectedReport.paymentBreakdown?.["تحويل"] || 0)} ج.م</strong>
                    </div>
                    <div style={{ border: "1px solid #d1d5db", padding: "6px 8px", borderRadius: "6px" }}>
                      <span>آجل (ذمم): </span>
                      <strong className="num-font" dir="ltr">{formatNumber(selectedReport.paymentBreakdown?.["آجل"] || 0)} ج.م</strong>
                    </div>
                  </div>

                  {selectedReport.notes && (
                    <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "8px 12px", marginBottom: "14px", fontSize: "0.8rem" }}>
                      <strong>ملاحظات الإغلاق:</strong> {selectedReport.notes}
                    </div>
                  )}

                  {/* Consolidated Items Table */}
                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ fontSize: "0.88rem", fontWeight: "900", marginBottom: "6px" }}>
                      الأصناف المباعة خلال الوردية ({selectedReportConsolidatedItems.length} صنف):
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "right" }}>
                      <thead>
                        <tr style={{ background: "#f3f4f6", borderTop: "1.5px solid #111827", borderBottom: "1.5px solid #111827" }}>
                          <th style={{ padding: "6px 8px" }}>اسم الصنف</th>
                          <th style={{ padding: "6px 8px", textAlign: "center" }}>الباركود</th>
                          <th style={{ padding: "6px 8px", textAlign: "center" }}>الكمية المباعة</th>
                          <th style={{ padding: "6px 8px", textAlign: "center" }}>سعر البيع</th>
                          <th style={{ padding: "6px 8px", textAlign: "center" }}>إجمالي المبيعات</th>
                          <th style={{ padding: "6px 8px", textAlign: "center" }}>صافي الربح</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedReportConsolidatedItems.map((it, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
                            <td style={{ padding: "5px 8px", fontWeight: "700" }}>{it.name}</td>
                            <td style={{ padding: "5px 8px", textAlign: "center", fontFamily: "monospace" }}>{it.barcode}</td>
                            <td style={{ padding: "5px 8px", textAlign: "center", fontWeight: "900" }} className="num-font">{it.quantity} قطعة</td>
                            <td style={{ padding: "5px 8px", textAlign: "center" }} className="num-font">{formatNumber(it.sellingPrice)} ج.م</td>
                            <td style={{ padding: "5px 8px", textAlign: "center", fontWeight: "800" }} className="num-font">{formatNumber(it.totalSales)} ج.م</td>
                            <td style={{ padding: "5px 8px", textAlign: "center", fontWeight: "800" }} className="num-font">+{formatNumber(it.totalProfit)} ج.م</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Signatures */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "20px",
                    marginTop: "24px",
                    paddingTop: "12px",
                    borderTop: "2px solid #111827",
                    textAlign: "center",
                    fontSize: "0.8rem"
                  }}>
                    <div>
                      <div style={{ fontWeight: "800", marginBottom: "30px" }}>توقيع مسؤول الكاشير:</div>
                      <div style={{ borderTop: "1px dashed #6b7280", paddingTop: "4px" }}>{selectedReport.closedBy?.name || "الكاشير"}</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: "800", marginBottom: "30px" }}>مراجعة الحسابات:</div>
                      <div style={{ borderTop: "1px dashed #6b7280", paddingTop: "4px" }}>التوقيع والتاريخ</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: "800", marginBottom: "30px" }}>اعتماد الإدارة:</div>
                      <div style={{ borderTop: "1px dashed #6b7280", paddingTop: "4px" }}>الختم والتوقيع</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px", marginTop: "24px", paddingTop: "14px", borderTop: "1px solid #f0e1ec" }}>
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="btn-secondary"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
