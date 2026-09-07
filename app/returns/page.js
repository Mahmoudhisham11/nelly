"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { 
  searchSoldProductsInReports, 
  returnProductQuantityFromReports 
} from "@/lib/salesService";
import { formatNumber } from "@/lib/utils";
import confetti from "canvas-confetti";
import { 
  RotateCcw, 
  Search, 
  ShoppingCart, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Sparkles, 
  PackageOpen,
  Boxes,
  Tag,
  ChevronDown,
  ChevronUp,
  Receipt,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Plus,
  Minus
} from "lucide-react";

export default function ReturnsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [searchError, setSearchError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  // Return action state per product key
  const [returnQuantities, setReturnQuantities] = useState({});
  const [processingKey, setProcessingKey] = useState(null);
  const [expandedInvoices, setExpandedInvoices] = useState({});

  // Confirmation Modal state
  const [pendingReturn, setPendingReturn] = useState(null);

  // UI Toast
  const [toastMessage, setToastMessage] = useState("");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Auth protection
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 5000);
  };

  // Perform search across nelly_reports and sync with live shop products
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    const clean = searchQuery.trim();
    if (!clean) {
      setSearchError("يرجى إدخال كود، باركود أو اسم المنتج للبحث عنه.");
      return;
    }

    setSearching(true);
    setSearchError("");
    setHasSearched(true);

    try {
      const results = await searchSoldProductsInReports(clean);
      setSearchResults(results);
      
      // Initialize return quantities
      const initialQtys = {};
      results.forEach(prod => {
        initialQtys[prod.groupKey] = 1;
      });
      setReturnQuantities(initialQtys);

      if (results.length === 0) {
        setSearchError(`لم يتم العثور على أي مبيعات مسجلة في التقارير لهذا الصنف أو الباركود "${clean}".`);
      }
    } catch (err) {
      console.error("Search error in reports:", err);
      setSearchError("حدث خطأ أثناء البحث في تقارير المبيعات. يرجى إعادة المحاولة.");
    } finally {
      setSearching(false);
    }
  };

  // Refresh current search results after return
  const refreshCurrentSearch = async () => {
    const clean = searchQuery.trim();
    if (!clean) return;
    try {
      const results = await searchSoldProductsInReports(clean);
      setSearchResults(results);
      const initialQtys = {};
      results.forEach(prod => {
        initialQtys[prod.groupKey] = 1;
      });
      setReturnQuantities(initialQtys);
    } catch (err) {
      console.error("Refresh error:", err);
    }
  };

  // Change quantity for a specific product card
  const handleQtyChange = (groupKey, maxQty, delta) => {
    setReturnQuantities(prev => {
      const current = prev[groupKey] || 1;
      let next = current + delta;
      if (next < 1) next = 1;
      if (next > maxQty) next = maxQty;
      return { ...prev, [groupKey]: next };
    });
  };

  const handleQtyInput = (groupKey, maxQty, value) => {
    let parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < 1) parsed = 1;
    if (parsed > maxQty) parsed = maxQty;
    setReturnQuantities(prev => ({
      ...prev,
      [groupKey]: parsed
    }));
  };

  // Open confirmation modal
  const openConfirmModal = (prod) => {
    const qty = returnQuantities[prod.groupKey] || 1;
    setPendingReturn({
      product: prod,
      quantity: qty
    });
  };

  // Execute return: deduct from nelly_reports, add to nelly_shop_products
  const handleExecuteReturn = async () => {
    if (!pendingReturn) return;
    const { product, quantity } = pendingReturn;

    setProcessingKey(product.groupKey);
    try {
      const res = await returnProductQuantityFromReports({
        productId: product.productId,
        shopProductId: product.shopProductId,
        barcode: product.barcode,
        name: product.name,
        returnQuantity: quantity
      });

      if (res.success) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });

        showToast(
          `✅ تم استرجاع (${quantity}) قطعة من (${product.name}) بنجاح! زادت كمية المحل إلى (${res.newShopStock} قطعة) وخُصمت من تقارير المبيعات.`
        );

        setPendingReturn(null);
        await refreshCurrentSearch();
      }
    } catch (err) {
      console.error("Execute return error:", err);
      showToast(err.message || "حدث خطأ أثناء تنفيذ عملية المرتجع.");
    } finally {
      setProcessingKey(null);
    }
  };

  const toggleExpandInvoices = (groupKey) => {
    setExpandedInvoices(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  if (authLoading || !user) {
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
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "46px",
                  height: "46px",
                  borderRadius: "14px",
                  background: "linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)",
                  color: "#e11d48",
                  border: "1px solid #fecdd3",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(225, 29, 72, 0.15)"
                }}>
                  <RotateCcw size={24} />
                </div>
                <div>
                  <h2 style={{ fontSize: "1.6rem", fontWeight: "900", color: "#1e1322", margin: 0 }}>
                    استرجاع الأصناف والمنتجات المباعة
                  </h2>
                  <p style={{ color: "#5a4663", fontSize: "0.88rem", marginTop: "4px", fontWeight: "600" }}>
                    ابحث عن أي صنف بكوده أو اسمه، وحدد الكمية المُراد إرجاعها لتُخصم فوراً من تقارير المبيعات وتُضاف لرصيد المحل
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Search Box Panel */}
          <div 
            className="glass-panel" 
            style={{ 
              padding: "24px", 
              marginBottom: "28px", 
              background: "#ffffff", 
              border: "1.5px solid #ebdbe6",
              borderRadius: "18px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.03)"
            }}
          >
            <div style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <Search size={20} color="#db2777" />
                <h3 style={{ fontSize: "1.1rem", fontWeight: "900", color: "#1e1322", margin: 0 }}>
                  البحث عن المنتج في المبيعات
                </h3>
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: "600", margin: 0 }}>
                اكتب اسم المنتج أو امسح الباركود / الكود للبحث في كافة مبيعات التقارير السابقة
              </p>
            </div>

            <form onSubmit={handleSearch} style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: "1", minWidth: "280px" }}>
                <input 
                  type="text"
                  required
                  autoFocus
                  placeholder="اكتب اسم المنتج أو امسح الباركود / كود الصنف..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchError("");
                  }}
                  className="form-input num-font"
                  style={{
                    paddingRight: "46px",
                    fontWeight: "800",
                    fontSize: "1.05rem",
                    border: "2px solid #f472b6",
                    height: "50px",
                    borderRadius: "12px"
                  }}
                />
                <Search 
                  size={22} 
                  color="#db2777" 
                  style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} 
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSearchResults(null);
                      setSearchError("");
                      setHasSearched(false);
                    }}
                    style={{
                      position: "absolute",
                      left: "14px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "#f3f4f6",
                      border: "none",
                      borderRadius: "50%",
                      width: "26px",
                      height: "26px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#6b7280",
                      cursor: "pointer"
                    }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <button 
                type="submit"
                disabled={searching}
                className="btn-primary"
                style={{ 
                  padding: "0 32px", 
                  fontSize: "1rem", 
                  height: "50px",
                  borderRadius: "12px",
                  fontWeight: "800",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                {searching ? (
                  <span>جاري البحث في التقارير...</span>
                ) : (
                  <>
                    <Search size={20} />
                    <span>بحث عن المنتج</span>
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
                fontSize: "0.9rem",
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

          {/* Initial State / Prompt when not searched yet */}
          {!hasSearched && (
            <div 
              style={{ 
                padding: "60px 20px", 
                textAlign: "center", 
                background: "#ffffff", 
                borderRadius: "18px", 
                border: "1.5px dashed #ebdbe6" 
              }}
            >
              <div style={{
                width: "70px",
                height: "70px",
                borderRadius: "20px",
                background: "#fdf2f8",
                color: "#db2777",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px auto"
              }}>
                <Search size={34} />
              </div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "900", color: "#1e1322", marginBottom: "8px" }}>
                ابحث عن المنتج للبدء بعملية الإرجاع
              </h3>
              <p style={{ color: "#705377", fontSize: "0.92rem", maxWidth: "520px", margin: "0 auto", fontWeight: "600" }}>
                قم بمسح باركود المنتج أو كتابة اسمه أو كوده أعلاه لعرض الكمية المباعة المسجلة في تقارير المبيعات واسترجاع أي كمية مطلوبة لرصيد المحل فوراً.
              </p>
            </div>
          )}

          {/* Search Results Display */}
          {hasSearched && searchResults && searchResults.length > 0 && (
            <div>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "10px",
                marginBottom: "18px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <PackageOpen size={22} color="#db2777" />
                  <h3 style={{ fontSize: "1.2rem", fontWeight: "900", color: "#1e1322", margin: 0 }}>
                    نتائج البحث ({searchResults.length} منتج مطابق)
                  </h3>
                </div>
                <span style={{ fontSize: "0.85rem", color: "#705377", fontWeight: "700" }}>
                  حدد الكمية المراد إرجاعها ثم اضغط على زر إرجاع الكمية
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {searchResults.map((prod) => {
                  const currentSelectedQty = returnQuantities[prod.groupKey] || 1;
                  const isProcessingThis = processingKey === prod.groupKey;
                  const isExpanded = !!expandedInvoices[prod.groupKey];

                  return (
                    <div 
                      key={prod.groupKey}
                      className="glass-card"
                      style={{
                        padding: "24px",
                        background: "#ffffff",
                        border: "1.5px solid #ebdbe6",
                        borderRadius: "18px",
                        boxShadow: "0 6px 24px rgba(0,0,0,0.04)"
                      }}
                    >
                      {/* Top Details & Badges */}
                      <div style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "16px",
                        paddingBottom: "18px",
                        borderBottom: "1px solid #f3e8ff"
                      }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                            <h4 style={{ fontSize: "1.35rem", fontWeight: "900", color: "#1e1322", margin: 0 }}>
                              {prod.name}
                            </h4>
                            <span className="badge" style={{ background: "#f3e8ff", color: "#7e22ce", fontWeight: "800" }}>
                              {prod.category || "عام"}
                            </span>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: "8px", flexWrap: "wrap" }}>
                            {prod.barcode && (
                              <span style={{ fontSize: "0.85rem", color: "#5a4663", fontWeight: "700" }}>
                                🏷️ الباركود: <strong className="num-font" dir="ltr" style={{ color: "#7e22ce", fontFamily: "monospace" }}>{prod.barcode}</strong>
                              </span>
                            )}
                            {prod.code && (
                              <span style={{ fontSize: "0.85rem", color: "#5a4663", fontWeight: "700" }}>
                                🔢 الكود: <strong className="num-font" dir="ltr">{prod.code}</strong>
                              </span>
                            )}
                            {prod.sellingPrice > 0 && (
                              <span style={{ fontSize: "0.85rem", color: "#5a4663", fontWeight: "700" }}>
                                💰 سعر البيع: <strong className="num-font" dir="ltr" style={{ color: "#db2777" }}>{formatNumber(prod.sellingPrice)}</strong> ج.م
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Stock & Sold Counter Badges */}
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                          {/* Current Shop Stock */}
                          <div style={{
                            padding: "10px 18px",
                            background: "#ecfdf5",
                            border: "1.5px solid #a7f3d0",
                            borderRadius: "14px",
                            display: "flex",
                            alignItems: "center",
                            gap: "10px"
                          }}>
                            <Boxes size={22} color="#059669" />
                            <div>
                              <div style={{ fontSize: "0.75rem", color: "#065f46", fontWeight: "800" }}>
                                رصيد المحل الحالي
                              </div>
                              <div style={{ fontSize: "1.2rem", fontWeight: "900", color: "#047857" }}>
                                <span className="num-font" dir="ltr">{formatNumber(prod.currentShopStock)}</span> قطعة
                              </div>
                            </div>
                          </div>

                          {/* Total Sold in Reports */}
                          <div style={{
                            padding: "10px 18px",
                            background: "#fff1f2",
                            border: "1.5px solid #fecdd3",
                            borderRadius: "14px",
                            display: "flex",
                            alignItems: "center",
                            gap: "10px"
                          }}>
                            <TrendingDown size={22} color="#e11d48" />
                            <div>
                              <div style={{ fontSize: "0.75rem", color: "#9f1239", fontWeight: "800" }}>
                                المباع في التقارير
                              </div>
                              <div style={{ fontSize: "1.2rem", fontWeight: "900", color: "#be185d" }}>
                                <span className="num-font" dir="ltr">{formatNumber(prod.totalSoldQuantityInReports)}</span> قطعة
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Bar: Quantity to return & Confirm Button */}
                      <div style={{
                        marginTop: "18px",
                        padding: "16px 20px",
                        background: "#faf5ff",
                        borderRadius: "14px",
                        border: "1px solid #e9d5ff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "16px"
                      }}>
                        {/* Quantity Controls */}
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                          <span style={{ fontWeight: "800", color: "#581c87", fontSize: "0.95rem" }}>
                            الكمية المراد إرجاعها:
                          </span>
                          <div style={{
                            display: "inline-flex",
                            alignItems: "center",
                            background: "#ffffff",
                            borderRadius: "10px",
                            border: "1.5px solid #d8b4fe",
                            padding: "3px"
                          }}>
                            <button
                              type="button"
                              onClick={() => handleQtyChange(prod.groupKey, prod.totalSoldQuantityInReports, -1)}
                              disabled={currentSelectedQty <= 1 || isProcessingThis}
                              style={{
                                width: "34px",
                                height: "34px",
                                borderRadius: "8px",
                                border: "none",
                                background: "#f3e8ff",
                                color: "#7e22ce",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: currentSelectedQty <= 1 ? "not-allowed" : "pointer",
                                opacity: currentSelectedQty <= 1 ? 0.4 : 1
                              }}
                            >
                              <Minus size={16} />
                            </button>

                            <input 
                              type="number"
                              min="1"
                              max={prod.totalSoldQuantityInReports}
                              value={currentSelectedQty}
                              onChange={(e) => handleQtyInput(prod.groupKey, prod.totalSoldQuantityInReports, e.target.value)}
                              disabled={isProcessingThis}
                              className="num-font"
                              style={{
                                width: "65px",
                                textAlign: "center",
                                border: "none",
                                outline: "none",
                                fontWeight: "900",
                                fontSize: "1.15rem",
                                color: "#1e1322"
                              }}
                            />

                            <button
                              type="button"
                              onClick={() => handleQtyChange(prod.groupKey, prod.totalSoldQuantityInReports, 1)}
                              disabled={currentSelectedQty >= prod.totalSoldQuantityInReports || isProcessingThis}
                              style={{
                                width: "34px",
                                height: "34px",
                                borderRadius: "8px",
                                border: "none",
                                background: "#f3e8ff",
                                color: "#7e22ce",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: currentSelectedQty >= prod.totalSoldQuantityInReports ? "not-allowed" : "pointer",
                                opacity: currentSelectedQty >= prod.totalSoldQuantityInReports ? 0.4 : 1
                              }}
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                          <span style={{ fontSize: "0.82rem", color: "#7e22ce", fontWeight: "700" }}>
                            (الحد الأقصى المتاح للإرجاع: {prod.totalSoldQuantityInReports} قطعة)
                          </span>
                        </div>

                        {/* Return Action Button */}
                        <button
                          type="button"
                          onClick={() => openConfirmModal(prod)}
                          disabled={isProcessingThis || prod.totalSoldQuantityInReports <= 0}
                          className="btn-primary"
                          style={{
                            padding: "12px 26px",
                            fontSize: "0.95rem",
                            fontWeight: "800",
                            background: "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
                            boxShadow: "0 4px 14px rgba(217, 119, 6, 0.25)",
                            borderRadius: "10px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px"
                          }}
                        >
                          <RotateCcw size={18} />
                          <span>إرجاع {currentSelectedQty} قطعة لرصيد المحل</span>
                        </button>
                      </div>

                      {/* Invoices Breakdown Toggle */}
                      {prod.invoices && prod.invoices.length > 0 && (
                        <div style={{ marginTop: "14px" }}>
                          <button
                            type="button"
                            onClick={() => toggleExpandInvoices(prod.groupKey)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#db2777",
                              fontSize: "0.85rem",
                              fontWeight: "800",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "4px 0"
                            }}
                          >
                            <Receipt size={16} />
                            <span>
                              {isExpanded 
                                ? "إخفاء تفاصيل فواتير التقارير المسجل بها هذا الصنف" 
                                : `عرض تفاصيل الفواتير المسجل بها هذا الصنف (عدد ${prod.invoices.length} فاتورة)`}
                            </span>
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>

                          {isExpanded && (
                            <div style={{ marginTop: "10px", overflowX: "auto" }}>
                              <table className="custom-table" style={{ fontSize: "0.85rem" }}>
                                <thead>
                                  <tr>
                                    <th>رقم الفاتورة</th>
                                    <th>تقرير الوردية</th>
                                    <th>تاريخ الإغلاق</th>
                                    <th>العميل</th>
                                    <th style={{ textAlign: "center" }}>الكمية المباعة</th>
                                    <th style={{ textAlign: "center" }}>سعر البيع</th>
                                    <th style={{ textAlign: "center" }}>الإجمالي</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {prod.invoices.map((invItem, idx) => (
                                    <tr key={idx}>
                                      <td>
                                        <span className="num-font font-bold" dir="ltr" style={{ color: "#1e1322" }}>
                                          {invItem.invoiceNumber}
                                        </span>
                                      </td>
                                      <td>
                                        <span className="badge" style={{ background: "#f3e8ff", color: "#7e22ce" }}>
                                          {invItem.reportNumber || "تقرير وردية"}
                                        </span>
                                      </td>
                                      <td>
                                        {invItem.closedAt ? new Date(invItem.closedAt).toLocaleDateString("ar-EG") : "—"}
                                      </td>
                                      <td>{invItem.customerName || "عميل نقدي"}</td>
                                      <td style={{ textAlign: "center", fontWeight: "900", color: "#db2777" }}>
                                        <span className="num-font" dir="ltr">{invItem.soldQty}</span> قطعة
                                      </td>
                                      <td style={{ textAlign: "center" }}>
                                        <span className="num-font" dir="ltr">{formatNumber(invItem.sellingPrice)}</span> ج.م
                                      </td>
                                      <td style={{ textAlign: "center", fontWeight: "800", color: "#059669" }}>
                                        <span className="num-font" dir="ltr">{formatNumber(invItem.subtotal)}</span> ج.م
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Confirmation Modal */}
      {pendingReturn && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div 
            className="modal-container"
            style={{
              maxWidth: "480px",
              background: "#ffffff",
              borderRadius: "20px",
              padding: "26px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.2)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  background: "#fef3c7",
                  color: "#d97706",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <RotateCcw size={22} />
                </div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "900", color: "#1e1322", margin: 0 }}>
                  تأكيد إرجاع الصنف
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPendingReturn(null)}
                style={{
                  background: "#f3f4f6",
                  border: "none",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer"
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{
              background: "#fdf2f8",
              padding: "16px",
              borderRadius: "14px",
              border: "1px solid #fbcfe8",
              marginBottom: "18px"
            }}>
              <div style={{ fontSize: "0.85rem", color: "#9f1239", fontWeight: "700", marginBottom: "6px" }}>
                الصنف المحدد للإرجاع:
              </div>
              <div style={{ fontSize: "1.1rem", fontWeight: "900", color: "#831843", marginBottom: "6px" }}>
                {pendingReturn.product.name}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "10px", fontSize: "0.9rem" }}>
                <span style={{ color: "#705377", fontWeight: "700" }}>الكمية المرتجعة:</span>
                <span style={{ fontWeight: "900", color: "#be185d", fontSize: "1.1rem" }}>
                  <span className="num-font" dir="ltr">{pendingReturn.quantity}</span> قطعة
                </span>
              </div>
            </div>

            <div style={{
              padding: "14px",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "12px",
              color: "#166534",
              fontSize: "0.85rem",
              fontWeight: "700",
              marginBottom: "22px",
              display: "flex",
              flexDirection: "column",
              gap: "6px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <CheckCircle2 size={16} />
                <span>سيتم زيادة رصيد المحل بمقدار ({pendingReturn.quantity}) قطعة فوراً.</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <CheckCircle2 size={16} />
                <span>سيتم خصم هذه الكمية وتعديل إجماليات فواتير تقارير المبيعات.</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setPendingReturn(null)}
                className="btn-secondary"
                style={{ flex: 1, padding: "12px", fontSize: "0.95rem" }}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleExecuteReturn}
                disabled={processingKey !== null}
                className="btn-primary"
                style={{
                  flex: 1.5,
                  padding: "12px",
                  fontSize: "0.95rem",
                  fontWeight: "800",
                  background: "linear-gradient(135deg, #d97706 0%, #b45309 100%)"
                }}
              >
                {processingKey !== null ? "جاري الإرجاع..." : "تأكيد واسترجاع"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
