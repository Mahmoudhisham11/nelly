"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import StatCard from "@/components/StatCard";
import ProductModal from "@/components/ProductModal";
import BarcodeModal from "@/components/BarcodeModal";
import SupplierModal from "@/components/SupplierModal";
import PaymentModal from "@/components/PaymentModal";
import PermissionDeniedModal from "@/components/PermissionDeniedModal";
import { 
  subscribeToProducts, 
  addProduct, 
  updateProduct 
} from "@/lib/productsService";
import { 
  subscribeToSuppliers, 
  addSupplier, 
  makeSupplierPayment 
} from "@/lib/suppliersService";
import { 
  subscribeToMonthlyExpenses 
} from "@/lib/expensesService";
import { formatNumber, roundCurrency } from "@/lib/utils";
import { 
  Boxes, 
  Layers, 
  DollarSign, 
  AlertTriangle, 
  Plus, 
  Sparkles, 
  ArrowLeft, 
  Barcode, 
  CheckCircle2, 
  Edit3,
  Lock,
  Truck,
  Receipt,
  TrendingDown,
  CreditCard,
  PieChart,
  ArrowDownLeft,
  ChevronLeft
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { user, role, isAdmin, loading: authLoading } = useAuth();
  
  // Real-time states
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [monthlyExpensesMap, setMonthlyExpensesMap] = useState({});
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [barcodeProduct, setBarcodeProduct] = useState(null);

  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [paymentSupplier, setPaymentSupplier] = useState(null);

  const [permissionDeniedAction, setPermissionDeniedAction] = useState(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  // Month string (YYYY-MM)
  const currentMonthStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }, []);

  // Redirect to login if user not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Real-time Firestore subscriptions for all modules
  useEffect(() => {
    if (!user) return;
    
    let loadedCount = 0;
    const checkDone = () => {
      loadedCount++;
      if (loadedCount >= 3) setLoading(false);
    };

    const unsubProducts = subscribeToProducts((data) => {
      setProducts(data);
      checkDone();
    });

    const unsubSuppliers = subscribeToSuppliers((data) => {
      setSuppliers(data);
      checkDone();
    });

    const unsubExpenses = subscribeToMonthlyExpenses(currentMonthStr, (map) => {
      setMonthlyExpensesMap(map);
      checkDone();
    });

    return () => {
      unsubProducts();
      unsubSuppliers();
      unsubExpenses();
    };
  }, [user, currentMonthStr]);

  // Calculations for Products & Stock
  const totalProductTypes = products.length;
  const totalStockItems = products.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
  const totalWholesaleValue = roundCurrency(products.reduce((acc, curr) => {
    const qty = Number(curr.quantity) || 0;
    const price = Number(curr.wholesalePrice) || 0;
    return acc + (qty * price);
  }, 0));
  const lowStockItems = products.filter(p => (Number(p.quantity) || 0) <= (Number(p.minThreshold) || 5));

  // Calculations for Suppliers
  const totalPayableToSuppliers = roundCurrency(suppliers.filter(s => s.balance > 0).reduce((sum, s) => sum + (Number(s.balance) || 0), 0));
  const topCreditorSuppliers = suppliers.filter(s => s.balance > 0).sort((a, b) => b.balance - a.balance).slice(0, 4);

  // Calculations for Current Month Expenses
  const currentMonthTotalExpenses = useMemo(() => {
    return roundCurrency(Object.values(monthlyExpensesMap).reduce((sum, e) => sum + (Number(e.amount) || 0), 0));
  }, [monthlyExpensesMap]);

  const currentMonthActiveExpensesCount = useMemo(() => {
    return Object.values(monthlyExpensesMap).filter(r => (Number(r.amount) || 0) > 0).length;
  }, [monthlyExpensesMap]);

  // Expenses breakdown by item for current month
  const categoryExpensesBreakdown = useMemo(() => {
    return Object.values(monthlyExpensesMap)
      .filter(r => (Number(r.amount) || 0) > 0)
      .map(r => [r.itemName, Number(r.amount) || 0])
      .sort((a, b) => b[1] - a[1]);
  }, [monthlyExpensesMap]);

  // Action handlers
  const handleOpenAddProduct = () => {
    if (!isAdmin) {
      setPermissionDeniedAction("تسجيل وإضافة صنف جديد بالمخزن");
      return;
    }
    setEditingProduct(null);
    setIsAddProductModalOpen(true);
  };

  const handleOpenEditProduct = (product) => {
    if (!isAdmin) {
      setPermissionDeniedAction("تعديل بيانات الصنف");
      return;
    }
    setEditingProduct(product);
    setIsAddProductModalOpen(true);
  };

  const handleOpenAddSupplier = () => {
    if (!isAdmin) {
      setPermissionDeniedAction("إضافة مورد جديد");
      return;
    }
    setIsAddSupplierModalOpen(true);
  };

  const handleOpenPayment = (supplier) => {
    if (!isAdmin) {
      setPermissionDeniedAction("سداد دفعة للمورد");
      return;
    }
    setPaymentSupplier(supplier);
  };

  const handleSaveProduct = async (productData, id) => {
    if (id) {
      await updateProduct(id, productData);
      showToast("تم تحديث بيانات الصنف بنجاح.");
    } else {
      await addProduct(productData);
      showToast("تمت إضافة الصنف الجديد للمخزن بنجاح.");
    }
  };

  const handleSaveSupplier = async (supplierData) => {
    await addSupplier(supplierData);
    showToast("تمت إضافة المورد الجديد بنجاح.");
  };

  const handleMakePayment = async (supplierId, currentBal, payAmount, notes, method, operationType = "payment") => {
    await makeSupplierPayment(supplierId, currentBal, payAmount, notes, method, operationType);
    const actionLabel = operationType === "charge" ? "إضافة المستحقات" : "السداد";
    showToast(`تم تسجيل ${actionLabel} بمبلغ ${formatNumber(payAmount)} ج.م وتحديث الحساب.`);
  };

  if (authLoading || (!user && loading)) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px"
      }}>
        <div style={{
          width: "50px",
          height: "50px",
          borderRadius: "50%",
          border: "4px solid rgba(236, 72, 153, 0.2)",
          borderTopColor: "#db2777",
          animation: "spin 1s linear infinite"
        }} />
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", fontWeight: "700" }}>
          جاري تحميل لوحة التحكم الشاملة...
        </p>
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

      <div className="main-content">
        <Navbar 
          onOpenAddModal={handleOpenAddProduct}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        />

        <main className="page-wrapper">
          {/* Toast Alert */}
          {toastMessage && (
            <div style={{
              position: "fixed",
              bottom: "24px",
              left: "24px",
              background: "#111827",
              color: "#ffffff",
              padding: "14px 20px",
              borderRadius: "14px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "0.92rem",
              fontWeight: "700",
              animation: "fadeIn 0.3s ease"
            }}>
              <Sparkles size={18} color="#f472b6" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Welcome Banner */}
          <section className="glass-panel" style={{
            padding: "24px 28px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "18px",
            background: "linear-gradient(135deg, #ffffff 0%, #fdf2f8 50%, #fce7f3 100%)",
            border: "1.5px solid #fbcfe8",
            boxShadow: "0 4px 20px rgba(219, 39, 119, 0.08)"
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <Sparkles size={20} color="#db2777" />
                <span style={{ fontSize: "0.85rem", color: "#db2777", fontWeight: "800" }}>
                  مركز الإدارة والتحكم الشامل
                </span>
              </div>
              <h2 style={{ fontSize: "1.6rem", fontWeight: "900", color: "#1e1322" }}>
                مرحباً بك في لوحة تحكم مخزن <span className="gradient-text-rose">Nelly</span>
              </h2>
              <p style={{ color: "#5a4663", fontSize: "0.88rem", marginTop: "4px", fontWeight: "600" }}>
                متابعة شاملة للمخزون والبضاعة، حسابات الموردين، والمصاريف التشغيلية
              </p>
            </div>

            {/* Quick Action Hub */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button 
                onClick={handleOpenAddProduct}
                className="btn-primary"
                style={{ padding: "10px 18px", fontSize: "0.88rem" }}
              >
                <Plus size={16} />
                + صنف للمخزن
              </button>

              <Link 
                href="/expenses"
                className="btn-secondary"
                style={{ padding: "10px 16px", fontSize: "0.88rem", background: "#ffffff", textDecoration: "none" }}
              >
                <Receipt size={16} color="#db2777" />
                المصاريف الشهرية
              </Link>

              <button 
                onClick={handleOpenAddSupplier}
                className="btn-secondary"
                style={{ padding: "10px 16px", fontSize: "0.88rem", background: "#ffffff" }}
              >
                <Truck size={16} color="#9333ea" />
                + مورد جديد
              </button>
            </div>
          </section>

          {/* Executive KPI Cards (Swiper on Mobile, Grid on Desktop) */}
          <section className="mobile-cards-swiper">
            {/* 1. Inventory Volume */}
            <div className="mobile-swiper-card">
              <StatCard 
                title="إجمالي بضاعة المخزن"
                value={totalStockItems}
                suffix="قطعة"
                subtitle={`${totalProductTypes} صنف مسجل`}
                icon={Boxes}
                theme="rose"
                trendText="المخزون الحالي"
              />
            </div>

            {/* 2. Total Wholesale Value */}
            <div className="mobile-swiper-card">
              <StatCard 
                title="القيمة المالية للمخزون"
                value={isAdmin ? totalWholesaleValue : "🔒"}
                suffix={isAdmin ? "ج.م" : "خاص بالمسؤول"}
                subtitle="إجمالي سعر الجملة للبضاعة"
                icon={DollarSign}
                theme="gold"
                trendText="رأس مال المخزن"
              />
            </div>

            {/* 3. Monthly Expenses */}
            <div className="mobile-swiper-card">
              <StatCard 
                title="مصاريف الشهر الحالي"
                value={isAdmin ? currentMonthTotalExpenses : "🔒"}
                suffix={isAdmin ? "ج.م" : "خاص بالمسؤول"}
                subtitle={`${currentMonthActiveExpensesCount} بند مصروف نشط`}
                icon={TrendingDown}
                theme="ruby"
                trendText="نفقات هذا الشهر"
              />
            </div>

            {/* 4. Suppliers Dues */}
            <div className="mobile-swiper-card">
              <StatCard 
                title="مستحقات الموردين (له)"
                value={isAdmin ? totalPayableToSuppliers : "🔒"}
                suffix={isAdmin ? "ج.م" : "خاص بالمسؤول"}
                subtitle={`${suppliers.length} مورد مسجل بالنظام`}
                icon={Truck}
                theme="purple"
                trendText="مطلوب سداده"
              />
            </div>
          </section>

          {/* Mobile Swipe Hint */}
          <div className="swiper-mobile-hint">
            <span>👈 اسحب لمشاهدة باقي الإحصائيات 👉</span>
          </div>

          {/* Core Dashboard Insight Grid (2 Columns on Desktop) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "20px", marginBottom: "28px" }}>
            
            {/* Section A: Low Stock Alerts */}
            <section className="glass-panel" style={{ padding: "20px 22px", background: "#ffffff", border: "1.5px solid #fed7aa" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", paddingBottom: "10px", borderBottom: "1px solid #ffedd5" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <AlertTriangle size={20} color="#ea580c" />
                  <h3 style={{ fontSize: "1.1rem", fontWeight: "900", color: "#1e1322" }}>
                    تنبيهات نواقص المخزن ({lowStockItems.length})
                  </h3>
                </div>
                <Link href="/products" style={{ color: "#ea580c", fontSize: "0.82rem", fontWeight: "800", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}>
                  عرض الكل <ChevronLeft size={14} />
                </Link>
              </div>

              {lowStockItems.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)", fontSize: "0.88rem", fontWeight: "700" }}>
                  <CheckCircle2 size={32} color="#059669" style={{ margin: "0 auto 8px" }} />
                  جميع أصناف المخزن بكميات كافية وآمنة!
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "280px", overflowY: "auto" }}>
                  {lowStockItems.slice(0, 5).map((item) => (
                    <div 
                      key={item.id}
                      style={{
                        background: "#fff7ed",
                        border: "1px solid #fed7aa",
                        borderRadius: "12px",
                        padding: "10px 14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "10px"
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: "800", fontSize: "0.9rem", color: "#9a3412" }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: "0.74rem", color: "#7c2d12", marginTop: "2px", fontWeight: "600" }}>
                          باركود: <span className="num-font" dir="ltr">{item.barcode}</span>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span className={Number(item.quantity) === 0 ? "badge badge-out-of-stock" : "badge badge-low-stock"}>
                          {Number(item.quantity) === 0 ? "نفد من المخزن" : `متبقي ${item.quantity}`}
                        </span>
                        <button
                          onClick={() => handleOpenEditProduct(item)}
                          className="btn-secondary"
                          style={{ padding: "5px 10px", fontSize: "0.76rem" }}
                        >
                          تعديل
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Section B: Monthly Expenses Breakdown */}
            <section className="glass-panel" style={{ padding: "20px 22px", background: "#ffffff", border: "1.5px solid #fbcfe8" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", paddingBottom: "10px", borderBottom: "1px solid #fdf2f8" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <PieChart size={20} color="#db2777" />
                  <h3 style={{ fontSize: "1.1rem", fontWeight: "900", color: "#1e1322" }}>
                    مصاريف الشهر حسب القسم
                  </h3>
                </div>
                <Link href="/expenses" style={{ color: "#db2777", fontSize: "0.82rem", fontWeight: "800", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}>
                  سجل المصاريف <ChevronLeft size={14} />
                </Link>
              </div>

              {categoryExpensesBreakdown.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)", fontSize: "0.88rem", fontWeight: "700" }}>
                  <Receipt size={32} color="#db2777" style={{ margin: "0 auto 8px", opacity: 0.6 }} />
                  لم يتم تسجيل أي مصاريف في هذا الشهر بعد.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "280px", overflowY: "auto" }}>
                  {categoryExpensesBreakdown.slice(0, 5).map(([catName, catAmount]) => {
                    const percentage = currentMonthTotalExpenses > 0 ? Math.round((catAmount / currentMonthTotalExpenses) * 100) : 0;
                    return (
                      <div key={catName}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "4px" }}>
                          <strong style={{ color: "#37243b" }}>{catName}</strong>
                          <span style={{ color: "#be185d", fontWeight: "900" }}>
                            {isAdmin ? (
                              <>
                                <span className="num-font" dir="ltr">{formatNumber(catAmount)}</span> ج.م ({percentage}%)
                              </>
                            ) : "🔒"}
                          </span>
                        </div>
                        <div style={{ width: "100%", height: "8px", background: "#f3e8f1", borderRadius: "4px", overflow: "hidden" }}>
                          <div style={{ width: `${percentage}%`, height: "100%", background: "linear-gradient(90deg, #ec4899, #db2777)", borderRadius: "4px" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

          </div>

          {/* Section C: Pending Suppliers Table */}
          <section className="glass-panel" style={{ padding: "20px 22px", marginBottom: "28px", background: "#ffffff", border: "1.5px solid #e9d5ff" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", paddingBottom: "10px", borderBottom: "1px solid #faf5ff" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Truck size={20} color="#7e22ce" />
                <h3 style={{ fontSize: "1.1rem", fontWeight: "900", color: "#1e1322" }}>
                  مستحقات الموردين المطلوب سدادها
                </h3>
              </div>
              <Link href="/suppliers" style={{ color: "#7e22ce", fontSize: "0.82rem", fontWeight: "800", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}>
                صفحة الموردين <ChevronLeft size={14} />
              </Link>
            </div>

            {topCreditorSuppliers.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)", fontSize: "0.88rem", fontWeight: "700" }}>
                <CheckCircle2 size={32} color="#059669" style={{ margin: "0 auto 8px" }} />
                لا توجد مستحقات مالية معلقة لأي مورد حالياً.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px" }}>
                {topCreditorSuppliers.map((sup) => (
                  <div 
                    key={sup.id}
                    style={{
                      background: "#faf5ff",
                      border: "1.5px solid #e9d5ff",
                      borderRadius: "14px",
                      padding: "14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between"
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: "800", fontSize: "0.92rem", color: "#1e1322" }}>
                        {sup.name}
                      </div>
                      <div style={{ fontSize: "1.05rem", fontWeight: "900", color: "#7e22ce", marginTop: "2px" }}>
                        {isAdmin ? (
                          <>
                            <span className="num-font" dir="ltr">{formatNumber(sup.balance)}</span> ج.م
                          </>
                        ) : "🔒"}
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenPayment(sup)}
                      className="btn-primary"
                      style={{
                        padding: "7px 14px",
                        fontSize: "0.8rem",
                        background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                        boxShadow: "0 2px 8px rgba(5, 150, 105, 0.2)"
                      }}
                    >
                      <CreditCard size={13} />
                      سداد دفعة
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Section D: Recent Warehouse Products Table */}
          <section className="glass-panel" style={{ padding: "20px 22px", background: "#ffffff", border: "1.5px solid #ebdbe6" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", paddingBottom: "10px", borderBottom: "1px solid #f8eff4" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Boxes size={20} color="#db2777" />
                <h3 style={{ fontSize: "1.1rem", fontWeight: "900", color: "#1e1322" }}>
                  أحدث أصناف المخزن المضافة
                </h3>
              </div>
              <Link href="/products" className="btn-primary" style={{ padding: "6px 14px", fontSize: "0.82rem" }}>
                عرض كامل سجل المخزن ({products.length})
              </Link>
            </div>

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>الباركود</th>
                    <th>اسم الصنف / المنتج</th>
                    <th>القسم</th>
                    <th>الكمية بالمخزن</th>
                    <th>سعر الجملة</th>
                    <th>حالة التوفر</th>
                    <th style={{ textAlign: "center" }}>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {products.slice(0, 6).map((product) => {
                    const qty = Number(product.quantity) || 0;
                    const min = Number(product.minThreshold) || 5;
                    const isOutOfStock = qty === 0;
                    const isLowStock = qty > 0 && qty <= min;

                    return (
                      <tr key={product.id}>
                        <td>
                          <span className="badge badge-code">
                            {product.barcode || "—"}
                          </span>
                        </td>
                        <td>
                          <strong style={{ color: "#1e1322" }}>{product.name}</strong>
                        </td>
                        <td>
                          <span className="badge badge-category">
                            {product.category || "عام"}
                          </span>
                        </td>
                        <td>
                          <span className="num-font" dir="ltr" style={{ fontWeight: "800", fontSize: "0.95rem" }}>
                            {formatNumber(qty)}
                          </span>
                        </td>
                        <td>
                          {isAdmin ? (
                            <span className="num-font" dir="ltr" style={{ fontWeight: "800", color: "#be185d" }}>
                              {formatNumber(product.wholesalePrice)} ج.م
                            </span>
                          ) : (
                            <span style={{ fontSize: "0.75rem", color: "#6b7280", background: "#f3f4f6", padding: "3px 7px", borderRadius: "6px", fontWeight: "700" }}>
                              خاص بالمسؤول
                            </span>
                          )}
                        </td>
                        <td>
                          {isOutOfStock ? (
                            <span className="badge badge-out-of-stock">نفد من المخزن</span>
                          ) : isLowStock ? (
                            <span className="badge badge-low-stock">منخفض (تحت الأمان)</span>
                          ) : (
                            <span className="badge badge-in-stock">متوفر بالمخزن</span>
                          )}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <div style={{ display: "inline-flex", gap: "6px" }}>
                            <button
                              onClick={() => setBarcodeProduct(product)}
                              className="btn-secondary"
                              style={{ padding: "6px 10px", fontSize: "0.78rem" }}
                              title="طباعة الباركود"
                            >
                              <Barcode size={14} color="#db2777" />
                              باركود
                            </button>
                            <button
                              onClick={() => handleOpenEditProduct(product)}
                              className="btn-secondary"
                              style={{ padding: "6px 10px", fontSize: "0.78rem" }}
                              title="تعديل الصنف"
                            >
                              <Edit3 size={14} />
                              تعديل
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

      {/* Global Modals */}
      <ProductModal 
        isOpen={isAddProductModalOpen}
        onClose={() => { setIsAddProductModalOpen(false); setEditingProduct(null); }}
        onSave={handleSaveProduct}
        productToEdit={editingProduct}
      />

      <SupplierModal 
        isOpen={isAddSupplierModalOpen}
        onClose={() => setIsAddSupplierModalOpen(false)}
        onSave={handleSaveSupplier}
      />

      <PaymentModal 
        isOpen={!!paymentSupplier}
        onClose={() => setPaymentSupplier(null)}
        supplier={paymentSupplier}
        onMakePayment={handleMakePayment}
      />

      <BarcodeModal 
        isOpen={!!barcodeProduct}
        onClose={() => setBarcodeProduct(null)}
        product={barcodeProduct}
      />

      <PermissionDeniedModal 
        isOpen={!!permissionDeniedAction}
        onClose={() => setPermissionDeniedAction(null)}
        actionName={permissionDeniedAction}
      />
    </div>
  );
}
