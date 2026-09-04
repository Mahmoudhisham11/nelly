"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import StatCard from "@/components/StatCard";
import { 
  findInvoiceByNumber, 
  returnSaleItemOrInvoice, 
  subscribeToReturns 
} from "@/lib/salesService";
import { formatNumber, roundCurrency } from "@/lib/utils";
import confetti from "canvas-confetti";
import { 
  RotateCcw, 
  Search, 
  Receipt, 
  ShoppingCart, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  User, 
  Calendar, 
  X, 
  Sparkles, 
  Check, 
  ArrowLeft,
  PackageOpen,
  History,
  FileText,
  Boxes,
  Banknote,
  DollarSign,
  CalendarCheck,
  Printer,
  Download,
  Eye,
  Plus,
  Minus,
  Trash2,
  Lock,
  Tag,
  CreditCard,
  Building
} from "lucide-react";

export default function ReturnsPage() {
  const router = useRouter();
  const { user, isAdmin, loading: authLoading } = useAuth();

  // Search invoice state
  const [invoiceQuery, setInvoiceQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState("");

  // Returns History state
  const [returnsHistory, setReturnsHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // History Filter state
  const [historySearch, setHistorySearch] = useState("");
  const [historyDateFilter, setHistoryDateFilter] = useState("all"); // "all" | "today" | "yesterday" | "week"
  const [historyCustomDate, setHistoryCustomDate] = useState("");

  // Return item modal / action
  const [selectedItemToReturn, setSelectedItemToReturn] = useState(null);
  const [returnQty, setReturnQty] = useState(1);
  const [returnReason, setReturnReason] = useState("طلب العميل إرجاع البضاعة");
  const [isProcessingReturn, setIsProcessingReturn] = useState(false);

  // Receipt Slip Modal
  const [selectedReturnSlip, setSelectedReturnSlip] = useState(null);

  // General UI
  const [toastMessage, setToastMessage] = useState("");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Auth protection
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Subscribe to Returns History
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToReturns((data) => {
      setReturnsHistory(data);
      setLoadingHistory(false);
    });
    return () => unsub();
  }, [user]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4500);
  };

  // Search invoice handler
  const handleSearchInvoice = async (e) => {
    if (e) e.preventDefault();
    const clean = invoiceQuery.trim();
    if (!clean) {
      setSearchError("يرجى إدخال رقم الفاتورة أو مسح الباركود للبحث.");
      return;
    }

    setSearching(true);
    setSearchError("");
    setSearchResult(null);

    try {
      const result = await findInvoiceByNumber(clean);
      if (!result) {
        setSearchError(`لم يتم العثور على أي فاتورة مطابقة للرقم "${clean}". تأكد من كتابة الرقم بشكل صحيح.`);
      } else {
        setSearchResult(result);
      }
    } catch (err) {
      console.error("Search invoice error:", err);
      setSearchError("حدث خطأ أثناء البحث عن الفاتورة. يرجى المحاولة مرة أخرى.");
    } finally {
      setSearching(false);
    }
  };

  // Confirm Single Item Return
  const handleConfirmSingleReturn = async () => {
    if (!selectedItemToReturn || !searchResult) return;

    setIsProcessingReturn(true);
    try {
      const cashierData = user ? {
        uid: user.uid,
        name: user.displayName || user.email || "الكاشير",
        email: user.email
      } : null;

      const res = await returnSaleItemOrInvoice({
        invoiceId: searchResult.invoice.id,
        invoiceNumber: searchResult.invoice.invoiceNumber,
        itemsToReturn: [{
          ...selectedItemToReturn,
          quantity: returnQty
        }],
        returnReason: returnReason,
        cashier: cashierData
      });

      if (res.success) {
        confetti({
          particleCount: 70,
          spread: 70,
          origin: { y: 0.6 }
        });
        showToast(`تم استرجاع الصنف بنجاح وإعادته لرصيد المحل (إشعار مرتجع: ${res.returnNumber}).`);
        setSelectedItemToReturn(null);
        // Refresh invoice search to reflect new items
        handleSearchInvoice();
      }
    } catch (err) {
      console.error("Return item error:", err);
      showToast(err.message || "حدث خطأ أثناء إتمام عملية المرتجع.");
    } finally {
      setIsProcessingReturn(false);
    }
  };

  // Confirm Full Invoice Return
  const handleReturnEntireInvoice = async () => {
    if (!searchResult || !searchResult.invoice) return;

    const inv = searchResult.invoice;
    const isConfirmed = window.confirm(
      `هل أنت متأكد من رغبتك في إرجاع كامل الفاتورة (${inv.invoiceNumber})؟\n\nسيتم استرجاع كافة الأصناف والكميات إلى رصيد بضاعة المحل، وإلغاء الفاتورة من مبيعات الوردية.`
    );
    if (!isConfirmed) return;

    setIsProcessingReturn(true);
    try {
      const cashierData = user ? {
        uid: user.uid,
        name: user.displayName || user.email || "الكاشير",
        email: user.email
      } : null;

      const res = await returnSaleItemOrInvoice({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        itemsToReturn: inv.items || [],
        returnReason: "مرتجع كامل الفاتورة",
        cashier: cashierData
      });

      if (res.success) {
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.5 }
        });
        showToast(`تم إرجاع كامل الفاتورة بنجاح وإعادة كافة القطع إلى المحل.`);
        setSearchResult(null);
        setInvoiceQuery("");
      }
    } catch (err) {
      console.error("Return full invoice error:", err);
      showToast(err.message || "حدث خطأ أثناء إرجاع الفاتورة.");
    } finally {
      setIsProcessingReturn(false);
    }
  };

  // Filtered Returns History
  const filteredReturnsHistory = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    const yesterdayStr = yest.toISOString().split("T")[0];
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return returnsHistory.filter((ret) => {
      const retDate = new Date(ret.date || ret.createdAt);
      const retDateStr = retDate.toISOString().split("T")[0];

      // Date matching
      let matchDate = true;
      if (historyDateFilter === "today") {
        matchDate = retDateStr === todayStr;
      } else if (historyDateFilter === "yesterday") {
        matchDate = retDateStr === yesterdayStr;
      } else if (historyDateFilter === "week") {
        matchDate = retDate >= sevenDaysAgo;
      } else if (historyDateFilter === "custom" && historyCustomDate) {
        matchDate = retDateStr === historyCustomDate;
      }

      // Search matching
      const q = historySearch.trim().toLowerCase();
      let matchSearch = true;
      if (q) {
        const retNum = (ret.returnNumber || "").toLowerCase();
        const invNum = (ret.invoiceNumber || "").toLowerCase();
        const custName = (ret.customer?.name || "").toLowerCase();
        const reason = (ret.returnReason || "").toLowerCase();
        const cashierName = (ret.cashier?.name || "").toLowerCase();
        const hasItemMatch = (ret.returnedItems || []).some(it => 
          (it.name || "").toLowerCase().includes(q) || (it.barcode || "").toLowerCase().includes(q)
        );

        matchSearch = retNum.includes(q) || invNum.includes(q) || custName.includes(q) || reason.includes(q) || cashierName.includes(q) || hasItemMatch;
      }

      return matchDate && matchSearch;
    });
  }, [returnsHistory, historySearch, historyDateFilter, historyCustomDate]);

  // Aggregate KPI Stats
  const kpiStats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    let totalRefunded = 0;
    let totalItems = 0;
    let todayCount = 0;
    let todayRefunded = 0;

    returnsHistory.forEach((r) => {
      const rDateStr = new Date(r.date || r.createdAt).toISOString().split("T")[0];
      const amount = Number(r.refundedAmount) || 0;
      totalRefunded += amount;

      const itemsCount = (r.returnedItems || []).reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);
      totalItems += itemsCount;

      if (rDateStr === todayStr) {
        todayCount += 1;
        todayRefunded += amount;
      }
    });

    return {
      totalCount: returnsHistory.length,
      totalRefunded: roundCurrency(totalRefunded),
      totalItems,
      todayCount,
      todayRefunded: roundCurrency(todayRefunded)
    };
  }, [returnsHistory]);

  // Export to CSV
  const exportToCSV = () => {
    if (filteredReturnsHistory.length === 0) {
      showToast("لا توجد بيانات مرتجعات لتصديرها.");
      return;
    }

    const headers = [
      "رقم المرتجع",
      "رقم الفاتورة الأصلية",
      "تاريخ المرتجع",
      "العميل",
      "الكاشير",
      "الأصناف المسترجعة",
      "المبلغ المسترد (ج.م)",
      "سبب المرتجع"
    ];

    const rows = filteredReturnsHistory.map((ret) => {
      const itemsStr = (ret.returnedItems || []).map(it => `${it.name} (${it.quantity})`).join(" + ");
      return [
        `"${ret.returnNumber || ''}"`,
        `"${ret.invoiceNumber || ''}"`,
        `"${new Date(ret.date || ret.createdAt).toLocaleString("ar-EG")}"`,
        `"${ret.customer?.name || 'عميل نقدي'}"`,
        `"${ret.cashier?.name || 'كاشير المحل'}"`,
        `"${itemsStr}"`,
        ret.refundedAmount || 0,
        `"${ret.returnReason || ''}"`
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `تقرير_المرتجعات_نيللي_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Return Slip
  const handlePrintSlip = () => {
    window.print();
  };

  if (authLoading || (!user && loadingHistory)) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--text-secondary)", fontWeight: "700" }}>جاري تحميل قسم المرتجعات...</p>
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
          title="إدارة المرتجعات"
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
                  background: "linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)",
                  color: "#e11d48",
                  border: "1px solid #fecdd3",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 6px rgba(225, 29, 72, 0.12)"
                }}>
                  <RotateCcw size={22} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <h2 style={{ fontSize: "1.6rem", fontWeight: "900", color: "#1e1322" }}>
                      إدارة المرتجعات واسترداد البضاعة
                    </h2>
                    <span className="badge badge-code" style={{ fontSize: "0.85rem" }}>
                      <span className="num-font" dir="ltr">{formatNumber(returnsHistory.length)}</span> عملية مرتجع
                    </span>
                  </div>
                </div>
              </div>
              <p style={{ color: "#5a4663", fontSize: "0.88rem", marginTop: "6px", fontWeight: "600" }}>
                البحث في فواتير المبيعات برقم الفاتورة، استرجاع صنف محدد أو كامل الفاتورة، وإعادة القطع لرصيد المحل فورياً
              </p>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <button 
                onClick={exportToCSV} 
                className="btn-secondary" 
                title="تصدير سجل المرتجعات إلى ملف CSV" 
                style={{ background: "#ffffff" }}
              >
                <Download size={16} color="#059669" />
                تصدير سجل المرتجعات
              </button>
            </div>
          </div>

          {/* 4 Summary Stat Cards */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "16px",
            marginBottom: "24px"
          }}>
            <StatCard 
              title="إجمالي العمليات المرتجعة"
              value={kpiStats.totalCount}
              suffix="عملية"
              subtitle="إجمالي كافة الفواتير والأصناف المرجعة"
              icon={RotateCcw}
              theme="rose"
            />
            <StatCard 
              title="إجمالي المبالغ المستردة"
              value={kpiStats.totalRefunded}
              suffix="ج.م"
              subtitle="المبالغ المالية التي تم ردها للعملاء"
              icon={Banknote}
              theme="ruby"
            />
            <StatCard 
              title="إجمالي القطع المسترجعة"
              value={kpiStats.totalItems}
              suffix="قطعة"
              subtitle="قطع تمت إعادتها لرصيد بضاعة المحل"
              icon={Boxes}
              theme="gold"
            />
            <StatCard 
              title="مرتجعات اليوم"
              value={kpiStats.todayCount}
              suffix="عملية"
              subtitle={`بقيمة ${formatNumber(kpiStats.todayRefunded)} ج.م اليوم`}
              icon={CalendarCheck}
              theme="purple"
            />
          </div>

          {/* Invoice Search Panel */}
          <div className="glass-panel" style={{ padding: "24px", marginBottom: "24px", background: "#ffffff", border: "1.5px solid #ebdbe6" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <Search size={20} color="#db2777" />
              <h3 style={{ fontSize: "1.1rem", fontWeight: "800", color: "#1e1322" }}>
                البحث عن فاتورة لإجراء مرتجع
              </h3>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "16px", fontWeight: "600" }}>
              أدخل رقم الفاتورة (مثلاً: <span className="num-font font-bold text-pink-600">INV-20260904-XXXX</span>) أو رقم الفاتورة المختصر للبحث عن بياناتها:
            </p>

            <form onSubmit={handleSearchInvoice} style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: "1", minWidth: "280px" }}>
                <input 
                  type="text"
                  required
                  placeholder="اكتب أو امسح باركود رقم الفاتورة..."
                  value={invoiceQuery}
                  onChange={(e) => {
                    setInvoiceQuery(e.target.value);
                    setSearchError("");
                  }}
                  className="form-input num-font"
                  style={{
                    paddingRight: "44px",
                    fontWeight: "800",
                    fontSize: "1rem",
                    border: "2px solid #f472b6"
                  }}
                />
                <Search 
                  size={20} 
                  color="#db2777" 
                  style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} 
                />
                {invoiceQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setInvoiceQuery("");
                      setSearchResult(null);
                      setSearchError("");
                    }}
                    style={{
                      position: "absolute",
                      left: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "#9ca3af",
                      cursor: "pointer"
                    }}
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              <button 
                type="submit"
                disabled={searching}
                className="btn-primary"
                style={{ padding: "12px 28px", fontSize: "0.95rem" }}
              >
                {searching ? (
                  <span>جاري البحث...</span>
                ) : (
                  <>
                    <Search size={18} />
                    <span>بحث عن الفاتورة</span>
                  </>
                )}
              </button>
            </form>

            {/* Error Message */}
            {searchError && (
              <div style={{
                marginTop: "16px",
                padding: "14px 18px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "12px",
                color: "#dc2626",
                fontSize: "0.88rem",
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                gap: "10px"
              }}>
                <AlertCircle size={20} style={{ flexShrink: 0 }} />
                <span>{searchError}</span>
              </div>
            )}
          </div>

          {/* Invoice Search Result Box */}
          {searchResult && searchResult.invoice && (
            <div className="glass-card" style={{
              padding: "24px",
              marginBottom: "28px",
              border: "2px solid #db2777",
              background: "#ffffff",
              boxShadow: "0 8px 24px rgba(219, 39, 119, 0.12)"
            }}>
              {/* Invoice Header */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "16px",
                paddingBottom: "18px",
                borderBottom: "1.5px solid #f0e1ec"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "14px",
                    background: "rgba(219, 39, 119, 0.1)",
                    color: "#db2777",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}>
                    <Receipt size={24} />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <span className="num-font" dir="ltr" style={{ fontSize: "1.25rem", fontWeight: "900", color: "#db2777" }}>
                        {searchResult.invoice.invoiceNumber}
                      </span>
                      <span className="badge badge-code" style={{ background: "#f3e8ff", color: "#7e22ce", borderColor: "#d8b4fe" }}>
                        {searchResult.sourceLabel || "الوردية الحالية"}
                      </span>
                    </div>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginTop: "3px", fontWeight: "600" }}>
                      تاريخ البيع: {new Date(searchResult.invoice.date || searchResult.invoice.createdAt).toLocaleString("ar-EG")}
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <button
                    onClick={handleReturnEntireInvoice}
                    disabled={isProcessingReturn}
                    className="btn-danger"
                    style={{ padding: "10px 20px", fontSize: "0.9rem", fontWeight: "800" }}
                  >
                    <RotateCcw size={16} />
                    <span>إرجاع كامل الفاتورة وإلغاؤها</span>
                  </button>
                </div>
              </div>

              {/* Invoice Quick Summary Chips */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "12px",
                margin: "18px 0"
              }}>
                <div style={{ background: "#fcf9fb", border: "1px solid #ebdbe6", borderRadius: "12px", padding: "12px 16px" }}>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: "700" }}>العميل:</span>
                  <div style={{ fontSize: "0.95rem", fontWeight: "800", color: "#1e1322", marginTop: "2px" }}>
                    {searchResult.invoice.customer?.name || "عميل نقدي"}
                  </div>
                </div>

                <div style={{ background: "#fcf9fb", border: "1px solid #ebdbe6", borderRadius: "12px", padding: "12px 16px" }}>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: "700" }}>الكاشير المسؤول:</span>
                  <div style={{ fontSize: "0.95rem", fontWeight: "800", color: "#1e1322", marginTop: "2px" }}>
                    {searchResult.invoice.cashier?.name || "كاشير المحل"}
                  </div>
                </div>

                <div style={{ background: "#fcf9fb", border: "1px solid #ebdbe6", borderRadius: "12px", padding: "12px 16px" }}>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: "700" }}>طريقة السداد:</span>
                  <div style={{ fontSize: "0.95rem", fontWeight: "800", color: "#059669", marginTop: "2px" }}>
                    {searchResult.invoice.paymentMethod || "نقدي"}
                  </div>
                </div>

                <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: "12px", padding: "12px 16px" }}>
                  <span style={{ fontSize: "0.78rem", color: "#be123c", fontWeight: "700" }}>إجمالي قيمة الفاتورة:</span>
                  <div style={{ fontSize: "1.15rem", fontWeight: "900", color: "#e11d48", marginTop: "2px" }}>
                    <span className="num-font" dir="ltr">{formatNumber(searchResult.invoice.total)}</span> ج.م
                  </div>
                </div>
              </div>

              {/* Items in Invoice Table */}
              <div style={{ marginTop: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                  <ShoppingCart size={18} color="#db2777" />
                  <h4 style={{ fontSize: "0.95rem", fontWeight: "800", color: "#1e1322" }}>
                    الأصناف المشمولة بالفاتورة:
                  </h4>
                </div>

                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>اسم الصنف</th>
                        <th style={{ textAlign: "center" }}>الباركود</th>
                        <th style={{ textAlign: "center" }}>الكمية المباعة</th>
                        <th style={{ textAlign: "center" }}>سعر القطعة</th>
                        <th style={{ textAlign: "center" }}>الإجمالي</th>
                        <th style={{ textAlign: "center" }}>إجراء المرتجع</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(searchResult.invoice.items || []).map((itm, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: "800", color: "#1e1322" }}>
                            {itm.name}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span className="num-font" dir="ltr" style={{
                              fontFamily: "monospace",
                              fontSize: "0.88rem",
                              color: "#7e22ce",
                              background: "#f3e8ff",
                              padding: "3px 8px",
                              borderRadius: "6px"
                            }}>
                              {itm.barcode || itm.code || "—"}
                            </span>
                          </td>
                          <td style={{ textAlign: "center", fontWeight: "800" }}>
                            <span className="num-font" dir="ltr" style={{ fontSize: "1rem" }}>{itm.quantity}</span> قطعة
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span className="num-font" dir="ltr" style={{ fontWeight: "800" }}>{formatNumber(itm.sellingPrice)}</span> ج.م
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span className="num-font" dir="ltr" style={{ fontWeight: "900", color: "#db2777", fontSize: "1rem" }}>
                              {formatNumber(itm.subtotal || itm.quantity * itm.sellingPrice)}
                            </span> ج.م
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              onClick={() => {
                                setSelectedItemToReturn(itm);
                                setReturnQty(1);
                                setReturnReason("طلب العميل إرجاع الصنف");
                              }}
                              className="btn-secondary"
                              style={{
                                padding: "6px 14px",
                                fontSize: "0.82rem",
                                fontWeight: "800",
                                color: "#b45309",
                                background: "#fffbeb",
                                borderColor: "#fde68a"
                              }}
                            >
                              <RotateCcw size={14} />
                              <span>استرجاع الصنف</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Returns History Section */}
          <div className="glass-panel" style={{ padding: "20px 24px", marginBottom: "24px", background: "#ffffff", border: "1.5px solid #ebdbe6" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "14px",
              marginBottom: "16px",
              paddingBottom: "14px",
              borderBottom: "1px solid #f0e1ec"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <History size={22} color="#db2777" />
                <h3 style={{ fontSize: "1.15rem", fontWeight: "800", color: "#1e1322" }}>
                  سجل عمليات المرتجعات السابقة
                </h3>
                <span className="badge badge-code" style={{ fontSize: "0.82rem" }}>
                  <span className="num-font" dir="ltr">{filteredReturnsHistory.length}</span> نتيجة
                </span>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
              marginBottom: "16px"
            }}>
              {/* Search text in history */}
              <div style={{ position: "relative", flex: "1", minWidth: "240px" }}>
                <input 
                  type="text"
                  placeholder="ابحث برقم المرتجع، رقم الفاتورة، اسم العميل، أو الصنف..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="form-input"
                  style={{ paddingRight: "38px", fontWeight: "600", fontSize: "0.88rem" }}
                />
                <Search 
                  size={16} 
                  color="#db2777" 
                  style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} 
                />
                {historySearch && (
                  <button
                    onClick={() => setHistorySearch("")}
                    style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#9ca3af", cursor: "pointer" }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Specific date input */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Calendar size={16} color="#db2777" />
                <input 
                  type="date"
                  value={historyCustomDate}
                  onChange={(e) => {
                    setHistoryCustomDate(e.target.value);
                    setHistoryDateFilter("custom");
                  }}
                  className="form-input num-font"
                  style={{ padding: "7px 12px", fontSize: "0.85rem", width: "auto", fontWeight: "700" }}
                />
                {historyCustomDate && (
                  <button
                    onClick={() => {
                      setHistoryCustomDate("");
                      setHistoryDateFilter("all");
                    }}
                    style={{ background: "none", border: "none", color: "#ef4444", fontSize: "0.82rem", fontWeight: "800", cursor: "pointer" }}
                  >
                    مسح
                  </button>
                )}
              </div>

              {/* Quick Date Chips */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {[
                  { key: "all", label: "كافة السجلات" },
                  { key: "today", label: "اليوم" },
                  { key: "yesterday", label: "الأمس" },
                  { key: "week", label: "آخر 7 أيام" }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setHistoryDateFilter(tab.key);
                      setHistoryCustomDate("");
                    }}
                    style={{
                      padding: "7px 14px",
                      borderRadius: "10px",
                      fontSize: "0.82rem",
                      fontWeight: "700",
                      cursor: "pointer",
                      border: historyDateFilter === tab.key ? "1.5px solid #db2777" : "1px solid #e7d8e2",
                      background: historyDateFilter === tab.key ? "#fdf2f8" : "#ffffff",
                      color: historyDateFilter === tab.key ? "#db2777" : "#5a4663",
                      transition: "all 0.15s ease"
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* History Table */}
            <div className="table-container">
              {loadingHistory ? (
                <div style={{ textAlign: "center", padding: "60px 20px" }}>
                  <p style={{ color: "var(--text-muted)", fontWeight: "700" }}>جاري تحميل سجل المرتجعات...</p>
                </div>
              ) : filteredReturnsHistory.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px" }}>
                  <PackageOpen size={48} color="#db2777" style={{ margin: "0 auto 12px", opacity: 0.7 }} />
                  <h3 style={{ fontSize: "1.15rem", marginBottom: "6px", color: "#1e1322", fontWeight: "800" }}>
                    لا توجد عمليات مرتجعات مسجلة
                  </h3>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontWeight: "600" }}>
                    {historySearch || historyDateFilter !== "all" 
                      ? "لا توجد نتائج تطابق معايير البحث أو التاريخ المحددة." 
                      : "عند إرجاع أي صنف سيتم توثيقه هنا تلقائياً في السجل."}
                  </p>
                </div>
              ) : (
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th style={{ whiteSpace: "nowrap" }}>رقم إشعار المرتجع</th>
                      <th style={{ whiteSpace: "nowrap" }}>رقم الفاتورة الأصلية</th>
                      <th style={{ whiteSpace: "nowrap" }}>تاريخ ووقت المرتجع</th>
                      <th style={{ whiteSpace: "nowrap" }}>العميل</th>
                      <th style={{ whiteSpace: "nowrap" }}>المسؤول (الكاشير)</th>
                      <th style={{ whiteSpace: "nowrap" }}>الأصناف المسترجعة</th>
                      <th style={{ whiteSpace: "nowrap", textAlign: "center" }}>المبلغ المسترد</th>
                      <th style={{ whiteSpace: "nowrap" }}>سبب المرتجع</th>
                      <th style={{ whiteSpace: "nowrap", textAlign: "center" }}>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReturnsHistory.map((ret) => (
                      <tr key={ret.id}>
                        <td>
                          <span className="num-font" dir="ltr" style={{
                            fontFamily: "monospace",
                            fontWeight: "800",
                            color: "#b45309",
                            background: "#fffbeb",
                            border: "1px solid #fde68a",
                            padding: "4px 8px",
                            borderRadius: "6px",
                            fontSize: "0.85rem"
                          }}>
                            {ret.returnNumber}
                          </span>
                        </td>
                        <td>
                          <span className="num-font" dir="ltr" style={{
                            fontFamily: "monospace",
                            fontWeight: "800",
                            color: "#db2777",
                            background: "#fdf2f8",
                            border: "1px solid #fbcfe8",
                            padding: "4px 8px",
                            borderRadius: "6px",
                            fontSize: "0.85rem"
                          }}>
                            {ret.invoiceNumber}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: "700", color: "#1e1322", fontSize: "0.88rem" }}>
                            {new Date(ret.date || ret.createdAt).toLocaleDateString("ar-EG")}
                          </div>
                          <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }} className="num-font" dir="ltr">
                            {new Date(ret.date || ret.createdAt).toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td style={{ fontWeight: "700", color: "#1e1322" }}>
                          {ret.customer?.name || "عميل نقدي"}
                        </td>
                        <td style={{ fontSize: "0.85rem", color: "#5a4663", fontWeight: "600" }}>
                          {ret.cashier?.name || "كاشير المحل"}
                        </td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                            {(ret.returnedItems || []).map((it, i) => (
                              <span key={i} style={{
                                fontSize: "0.8rem",
                                background: "#f8eff4",
                                border: "1px solid #f0e1ec",
                                padding: "2px 8px",
                                borderRadius: "6px",
                                color: "#1e1322",
                                fontWeight: "600"
                              }}>
                                • {it.name} <strong className="num-font" style={{ color: "#db2777" }}>({it.quantity} قطعة)</strong>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span className="num-font" dir="ltr" style={{
                            fontSize: "1rem",
                            fontWeight: "900",
                            color: "#dc2626",
                            background: "#fef2f2",
                            border: "1px solid #fecaca",
                            padding: "4px 10px",
                            borderRadius: "8px"
                          }}>
                            -{formatNumber(ret.refundedAmount)} ج.م
                          </span>
                        </td>
                        <td style={{ fontSize: "0.82rem", color: "#5a4663", fontWeight: "600" }}>
                          {ret.returnReason || "طلب العميل"}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            onClick={() => setSelectedReturnSlip(ret)}
                            className="btn-secondary"
                            style={{ padding: "6px 12px", fontSize: "0.8rem", fontWeight: "700" }}
                            title="معاينة وطباعة إشعار المرتجع"
                          >
                            <Printer size={14} color="#db2777" />
                            <span>إيصال</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* =========================================================
          MODAL 1: Confirm Single Item Return
          ========================================================= */}
      {selectedItemToReturn && (
        <div className="modal-overlay" onClick={() => setSelectedItemToReturn(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "10px",
                  background: "#fffbeb",
                  color: "#b45309",
                  border: "1px solid #fde68a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <RotateCcw size={20} />
                </div>
                <h3 className="modal-title font-bold">تأكيد استرجاع صنف إلى المحل</h3>
              </div>
              <button onClick={() => setSelectedItemToReturn(null)} className="modal-close-btn" type="button">
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "20px" }}>
              <div style={{
                background: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: "12px",
                padding: "14px",
                marginBottom: "16px",
                color: "#92400e"
              }}>
                <div style={{ fontWeight: "800", fontSize: "0.95rem" }}>
                  الصنف: {selectedItemToReturn.name}
                </div>
                <div style={{ fontSize: "0.82rem", marginTop: "4px", color: "#b45309", fontWeight: "700" }}>
                  الكمية المباعة بالفاتورة: <span className="num-font font-bold">{selectedItemToReturn.quantity}</span> قطعة
                </div>
              </div>

              {/* Quantity Selector */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "800", color: "#1e1322", marginBottom: "6px" }}>
                  الكمية المراد إرجاعها:
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <button 
                    type="button"
                    onClick={() => setReturnQty(Math.max(1, returnQty - 1))}
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "10px",
                      border: "1px solid #e7d8e2",
                      background: "#fdf5f9",
                      color: "#db2777",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer"
                    }}
                  >
                    <Minus size={16} />
                  </button>

                  <input 
                    type="number"
                    min="1"
                    max={selectedItemToReturn.quantity}
                    value={returnQty}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 1;
                      setReturnQty(Math.min(selectedItemToReturn.quantity, Math.max(1, val)));
                    }}
                    className="form-input num-font"
                    style={{ width: "90px", textAlign: "center", fontSize: "1.1rem", fontWeight: "900" }}
                  />

                  <button 
                    type="button"
                    onClick={() => setReturnQty(Math.min(selectedItemToReturn.quantity, returnQty + 1))}
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "10px",
                      border: "1px solid #e7d8e2",
                      background: "#fdf5f9",
                      color: "#db2777",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer"
                    }}
                  >
                    <Plus size={16} />
                  </button>

                  <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: "600" }}>
                    من أصل {selectedItemToReturn.quantity} قطعة
                  </span>
                </div>
              </div>

              {/* Refund Amount Preview */}
              <div style={{
                background: "#ecfdf5",
                border: "1px solid #a7f3d0",
                borderRadius: "12px",
                padding: "12px 16px",
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "800", color: "#065f46" }}>
                  المبلغ المسترد للعميل:
                </span>
                <span className="num-font" dir="ltr" style={{ fontSize: "1.25rem", fontWeight: "900", color: "#059669" }}>
                  {formatNumber(returnQty * (selectedItemToReturn.sellingPrice || 0))} ج.م
                </span>
              </div>

              {/* Reason input */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "800", color: "#1e1322", marginBottom: "6px" }}>
                  سبب المرتجع:
                </label>
                <input 
                  type="text"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="سبب إرجاع الصنف..."
                  className="form-input"
                  style={{ fontWeight: "600" }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px", paddingTop: "14px", borderTop: "1px solid #f0e1ec" }}>
                <button
                  type="button"
                  onClick={() => setSelectedItemToReturn(null)}
                  className="btn-secondary"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSingleReturn}
                  disabled={isProcessingReturn}
                  className="btn-primary"
                  style={{ background: "linear-gradient(135deg, #d97706 0%, #b45309 100%)", boxShadow: "0 4px 14px rgba(217, 119, 6, 0.25)" }}
                >
                  {isProcessingReturn ? "جاري المعالجة..." : "تأكيد إرجاع الصنف للمحل"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 2: View / Print Return Receipt Slip
          ========================================================= */}
      {selectedReturnSlip && (
        <div className="modal-overlay" onClick={() => setSelectedReturnSlip(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "460px" }}>
            <div className="modal-header no-print">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "10px",
                  background: "#fdf2f8",
                  color: "#db2777",
                  border: "1px solid #fbcfe8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <Receipt size={20} />
                </div>
                <div>
                  <h3 className="modal-title font-bold">إشعار مرتجع مبيعات</h3>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }} className="num-font" dir="ltr">
                    {selectedReturnSlip.returnNumber}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button 
                  onClick={handlePrintSlip} 
                  className="btn-secondary"
                  style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                >
                  <Printer size={14} color="#db2777" />
                  <span>طباعة</span>
                </button>
                <button onClick={() => setSelectedReturnSlip(null)} className="modal-close-btn" type="button">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div style={{ padding: "20px" }}>
              <div 
                id="printable-return-slip"
                style={{
                  border: "1px dashed #db2777",
                  borderRadius: "14px",
                  padding: "16px",
                  background: "#fdfafc"
                }}
              >
                <div style={{ textAlign: "center", marginBottom: "14px", paddingBottom: "10px", borderBottom: "1px solid #ebdbe6" }}>
                  <h4 style={{ fontSize: "1.1rem", fontWeight: "900", color: "#1e1322" }}>
                    محلات نيللي لمستحضرات التجميل
                  </h4>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    إشعار استرجاع بضاعة رسمي
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.85rem", marginBottom: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>رقم المرتجع:</span>
                    <span className="num-font font-bold" dir="ltr">{selectedReturnSlip.returnNumber}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>رقم الفاتورة الأصلية:</span>
                    <span className="num-font font-bold text-pink-600" dir="ltr">{selectedReturnSlip.invoiceNumber}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>التاريخ والوقت:</span>
                    <span className="num-font">{new Date(selectedReturnSlip.date || selectedReturnSlip.createdAt).toLocaleString("ar-EG")}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>العميل:</span>
                    <span style={{ fontWeight: "700" }}>{selectedReturnSlip.customer?.name || "عميل نقدي"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)" }}>الكاشير:</span>
                    <span style={{ fontWeight: "700" }}>{selectedReturnSlip.cashier?.name || "كاشير المحل"}</span>
                  </div>
                </div>

                {/* Returned items */}
                <div style={{ borderTop: "1px solid #ebdbe6", paddingTop: "10px", marginBottom: "12px" }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: "800", color: "#1e1322", display: "block", marginBottom: "6px" }}>
                    الأصناف المسترجعة:
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {(selectedReturnSlip.returnedItems || []).map((it, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                        <span>• {it.name} <strong className="num-font">({it.quantity} قطعة)</strong></span>
                        <span className="num-font font-bold">{formatNumber((it.quantity || 1) * (it.sellingPrice || 0))} ج.م</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Refund Total */}
                <div style={{
                  borderTop: "2px solid #db2777",
                  paddingTop: "10px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <span style={{ fontWeight: "900", fontSize: "0.95rem", color: "#1e1322" }}>
                    إجمالي المبلغ المسترد:
                  </span>
                  <span className="num-font" dir="ltr" style={{ fontSize: "1.25rem", fontWeight: "900", color: "#dc2626" }}>
                    {formatNumber(selectedReturnSlip.refundedAmount)} ج.م
                  </span>
                </div>

                {selectedReturnSlip.returnReason && (
                  <div style={{ marginTop: "10px", fontSize: "0.78rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                    السبب: {selectedReturnSlip.returnReason}
                  </div>
                )}
              </div>

              <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
                <button
                  type="button"
                  onClick={() => setSelectedReturnSlip(null)}
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
