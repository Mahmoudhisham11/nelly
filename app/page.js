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
import { 
  subscribeToSales,
  subscribeToReports
} from "@/lib/salesService";
import { formatNumber, roundCurrency, getLocalDateString, getLocalMonthString } from "@/lib/utils";
import { 
  Boxes, 
  DollarSign, 
  AlertTriangle, 
  Plus, 
  Sparkles, 
  Barcode, 
  CheckCircle2, 
  Truck, 
  Receipt, 
  TrendingDown, 
  TrendingUp,
  CreditCard, 
  PieChart, 
  ChevronLeft,
  ShoppingCart,
  ShoppingBag,
  Edit3
} from "lucide-react";
import styles from "./dashboard.module.css";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAdmin, loading: authLoading } = useAuth();
  
  // Real-time states
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [sales, setSales] = useState([]);
  const [reports, setReports] = useState([]);
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

  // Month & Day strings (Local timezone)
  const currentMonthStr = useMemo(() => getLocalMonthString(), []);
  const todayStr = useMemo(() => getLocalDateString(), []);

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
      if (loadedCount >= 5) setLoading(false);
    };

    const unsubProducts = subscribeToProducts((data) => {
      setProducts(data);
      checkDone();
    });

    const unsubSuppliers = subscribeToSuppliers((data) => {
      setSuppliers(data);
      checkDone();
    });

    const unsubSales = subscribeToSales((data) => {
      setSales(data);
      checkDone();
    });

    const unsubReports = subscribeToReports((data) => {
      setReports(data);
      checkDone();
    });

    const unsubExpenses = subscribeToMonthlyExpenses(currentMonthStr, (map) => {
      setMonthlyExpensesMap(map);
      checkDone();
    });

    return () => {
      unsubProducts();
      unsubSuppliers();
      unsubSales();
      unsubReports();
      unsubExpenses();
    };
  }, [user, currentMonthStr]);

  // Calculations for Sales & Profits
  const activeSales = useMemo(() => sales.filter(s => s.status !== "مرتجعة"), [sales]);

  // Filter closed reports for current month
  const currentMonthReports = useMemo(() => {
    return reports.filter(r => {
      const rDate = r.closedAt || r.date || r.createdAt;
      if (!rDate) return false;
      return getLocalDateString(rDate).startsWith(currentMonthStr);
    });
  }, [reports, currentMonthStr]);

  // Filter closed reports for today
  const todayReports = useMemo(() => {
    return reports.filter(r => {
      const rDate = r.closedAt || r.date || r.createdAt;
      if (!rDate) return false;
      return getLocalDateString(rDate) === todayStr;
    });
  }, [reports, todayStr]);

  // Active open shift sales for today
  const todayActiveSales = useMemo(() => {
    return activeSales.filter(s => s.date && getLocalDateString(s.date) === todayStr);
  }, [activeSales, todayStr]);

  // Today's total sales revenue = today's active shift + today's closed shift reports
  const todaySalesRevenue = useMemo(() => {
    const fromActive = todayActiveSales.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
    const fromReports = todayReports.reduce((acc, curr) => acc + (Number(curr.totalSales) || 0), 0);
    return roundCurrency(fromActive + fromReports);
  }, [todayActiveSales, todayReports]);

  // Current month total sales revenue = current month closed reports + active sales in current month
  const currentMonthSalesRevenue = useMemo(() => {
    const fromReports = currentMonthReports.reduce((acc, curr) => acc + (Number(curr.totalSales) || 0), 0);
    const fromActive = activeSales
      .filter(s => s.date && getLocalDateString(s.date).startsWith(currentMonthStr))
      .reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
    return roundCurrency(fromReports + fromActive);
  }, [currentMonthReports, activeSales, currentMonthStr]);

  // Current month gross sales profit
  const currentMonthGrossProfit = useMemo(() => {
    const fromReports = currentMonthReports.reduce((acc, curr) => acc + (Number(curr.totalProfit) || 0), 0);
    const fromActive = activeSales
      .filter(s => s.date && getLocalDateString(s.date).startsWith(currentMonthStr))
      .reduce((acc, curr) => acc + (Number(curr.totalProfit) || 0), 0);
    return roundCurrency(fromReports + fromActive);
  }, [currentMonthReports, activeSales, currentMonthStr]);

  // Current month total invoices count
  const currentMonthInvoicesCount = useMemo(() => {
    const fromReports = currentMonthReports.reduce((acc, curr) => acc + (Number(curr.invoicesCount) || (curr.invoices || []).length), 0);
    const fromActive = activeSales.filter(s => s.date && getLocalDateString(s.date).startsWith(currentMonthStr)).length;
    return fromReports + fromActive;
  }, [currentMonthReports, activeSales, currentMonthStr]);

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

  // Net Profit = Month Gross Profit - Current Month Expenses
  const currentMonthNetProfit = useMemo(() => {
    return roundCurrency(currentMonthGrossProfit - currentMonthTotalExpenses);
  }, [currentMonthGrossProfit, currentMonthTotalExpenses]);

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
      <div className={styles.loadingWrapper}>
        <div className={styles.loadingSpinner} />
        <p className={styles.loadingText}>
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
            <div className={styles.toastWrapper}>
              <Sparkles size={18} color="#f472b6" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Welcome Banner */}
          <section className={`glass-panel ${styles.welcomeBanner}`}>
            <div>
              <div className={styles.bannerTagRow}>
                <Sparkles size={20} color="#db2777" />
                <span className={styles.bannerTagText}>
                  مركز الإدارة والتحكم الشامل
                </span>
              </div>
              <h2 className={styles.bannerTitle}>
                مرحباً بك في لوحة تحكم مخزن <span className="gradient-text-rose">Nelly</span>
              </h2>
              <p className={styles.bannerSubtitle}>
                متابعة شاملة للمخزون والبضاعة، حسابات الموردين، والمصاريف التشغيلية
              </p>
            </div>

            {/* Quick Action Hub */}
            <div className={styles.actionHub}>
              <Link 
                href="/pos"
                className={`btn-primary ${styles.posBtn}`}
              >
                <ShoppingCart size={18} />
                نقطة البيع (الكاشير)
              </Link>

              <button 
                onClick={handleOpenAddProduct}
                className={`btn-secondary ${styles.whiteActionBtn}`}
              >
                <Plus size={16} />
                + صنف للمخزن
              </button>

              <Link 
                href="/pos"
                className={`btn-secondary ${styles.whiteActionBtn}`}
              >
                <Receipt size={16} color="#db2777" />
                فواتير ونقطة البيع
              </Link>

              <Link 
                href="/expenses"
                className={`btn-secondary ${styles.whiteActionBtn}`}
              >
                <TrendingDown size={16} color="#dc2626" />
                المصاريف
              </Link>
            </div>
          </section>

          {/* Executive KPI Cards (Swiper on Mobile, Grid on Desktop) */}
          <section className="mobile-cards-swiper">
            {/* 1. Month & Today Sales */}
            <div className="mobile-swiper-card">
              <StatCard 
                title="مبيعات الشهر الحالي"
                value={currentMonthSalesRevenue}
                suffix="ج.م"
                subtitle={`مبيعات اليوم: ${formatNumber(todaySalesRevenue)} ج.م`}
                icon={ShoppingBag}
                theme="rose"
                trendText={`${currentMonthInvoicesCount} فاتورة هذا الشهر`}
              />
            </div>

            {/* 2. Total Net Profit (Admin) */}
            <div className="mobile-swiper-card">
              <StatCard 
                title="صافي أرباح الشهر (بعد المصاريف)"
                value={isAdmin ? currentMonthNetProfit : "🔒"}
                suffix={isAdmin ? "ج.م" : "خاص بالمسؤول"}
                subtitle={`مجمل أرباح المبيعات: ${isAdmin ? `${formatNumber(currentMonthGrossProfit)} ج.م` : "🔒"}`}
                icon={TrendingUp}
                theme={currentMonthNetProfit >= 0 ? "emerald" : "ruby"}
                trendText="صافي أرباح المتجر"
              />
            </div>

            {/* 3. Inventory Volume */}
            <div className="mobile-swiper-card">
              <StatCard 
                title="إجمالي بضاعة المخزن"
                value={totalStockItems}
                suffix="قطعة"
                subtitle={`${totalProductTypes} صنف مسجل`}
                icon={Boxes}
                theme="purple"
                trendText="المخزون الحالي"
              />
            </div>

            {/* 4. Total Wholesale Value */}
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

            {/* 5. Monthly Expenses */}
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

            {/* 6. Suppliers Dues */}
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
          <div className={styles.insightsGrid}>
            
            {/* Section A: Low Stock Alerts */}
            <section className={`glass-panel ${styles.lowStockPanel}`}>
              <div className={styles.lowStockHeader}>
                <div className={styles.panelTitleGroup}>
                  <AlertTriangle size={20} color="#ea580c" />
                  <h3 className={styles.panelTitle}>
                    تنبيهات نواقص المخزن ({lowStockItems.length})
                  </h3>
                </div>
                <Link href="/products" className={styles.lowStockLink}>
                  عرض الكل <ChevronLeft size={14} />
                </Link>
              </div>

              {lowStockItems.length === 0 ? (
                <div className={styles.emptyCenteredBox}>
                  <CheckCircle2 size={32} color="#059669" className={styles.emptyCheckIcon} />
                  جميع أصناف المخزن بكميات كافية وآمنة!
                </div>
              ) : (
                <div className={styles.lowStockList}>
                  {lowStockItems.slice(0, 5).map((item) => (
                    <div 
                      key={item.id}
                      className={styles.lowStockItemCard}
                    >
                      <div>
                        <div className={styles.lowStockItemName}>
                          {item.name}
                        </div>
                        <div className={styles.lowStockBarcodeRow}>
                          باركود: <span className="num-font" dir="ltr">{item.barcode}</span>
                        </div>
                      </div>

                      <div className={styles.lowStockActions}>
                        <span className={Number(item.quantity) === 0 ? "badge badge-out-of-stock" : "badge badge-low-stock"}>
                          {Number(item.quantity) === 0 ? "نفد من المخزن" : `متبقي ${item.quantity}`}
                        </span>
                        <button
                          onClick={() => handleOpenEditProduct(item)}
                          className={`btn-secondary ${styles.editItemBtn}`}
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
            <section className={`glass-panel ${styles.expensesPanel}`}>
              <div className={styles.expensesHeader}>
                <div className={styles.panelTitleGroup}>
                  <PieChart size={20} color="#db2777" />
                  <h3 className={styles.panelTitle}>
                    مصاريف الشهر حسب القسم
                  </h3>
                </div>
                <Link href="/expenses" className={styles.expensesLink}>
                  سجل المصاريف <ChevronLeft size={14} />
                </Link>
              </div>

              {categoryExpensesBreakdown.length === 0 ? (
                <div className={styles.emptyCenteredBox}>
                  <Receipt size={32} color="#db2777" className={styles.expensesEmptyIcon} />
                  لم يتم تسجيل أي مصاريف في هذا الشهر بعد.
                </div>
              ) : (
                <div className={styles.expensesList}>
                  {categoryExpensesBreakdown.slice(0, 5).map(([catName, catAmount]) => {
                    const percentage = currentMonthTotalExpenses > 0 ? Math.round((catAmount / currentMonthTotalExpenses) * 100) : 0;
                    return (
                      <div key={catName}>
                        <div className={styles.expenseItemRow}>
                          <strong className={styles.expenseItemName}>{catName}</strong>
                          <span className={styles.expenseItemVal}>
                            {isAdmin ? (
                              <>
                                <span className="num-font" dir="ltr">{formatNumber(catAmount)}</span> ج.م ({percentage}%)
                              </>
                            ) : "🔒"}
                          </span>
                        </div>
                        <div className={styles.expenseBarBg}>
                          <div className={styles.expenseBarFill} style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

          </div>

          {/* Section: Recent Sales Invoices */}
          <section className={`glass-panel ${styles.salesPanel}`}>
            <div className={styles.salesHeader}>
              <div className={styles.panelTitleGroup}>
                <Receipt size={20} color="#db2777" />
                <h3 className={styles.panelTitle}>
                  أحدث فواتير المبيعات الصادرة ({activeSales.length})
                </h3>
              </div>
              <div className={styles.salesHeaderActions}>
                <Link href="/pos" className={`btn-primary ${styles.salesActionBtn}`}>
                  <Plus size={14} />
                  فاتورة جديدة (POS)
                </Link>
                <Link href="/pos" className={`btn-secondary ${styles.salesActionBtn}`}>
                  عرض كل الفواتير (POS) <ChevronLeft size={14} />
                </Link>
              </div>
            </div>

            {activeSales.length === 0 ? (
              <div className={styles.emptyCenteredBox}>
                <ShoppingBag size={32} color="#db2777" className={styles.salesEmptyIcon} />
                لا توجد فواتير مبيعات مسجلة حتى الآن. ابدأ البيع من نقطة البيع!
              </div>
            ) : (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>رقم الفاتورة</th>
                      <th>التاريخ والوقت</th>
                      <th>العميل</th>
                      <th>القطع</th>
                      <th>إجمالي الفاتورة</th>
                      <th>طريقة الدفع</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSales.slice(0, 5).map((inv) => (
                      <tr key={inv.id}>
                        <td>
                          <span className={`num-font ${styles.invoiceNumberBadge}`} dir="ltr">
                            {inv.invoiceNumber}
                          </span>
                        </td>
                        <td>
                          <span className={styles.invoiceDateText}>
                            {inv.date ? new Date(inv.date).toLocaleDateString("ar-EG") : "—"}
                          </span>
                        </td>
                        <td>
                          <span className={styles.customerNameText}>
                            {inv.customer?.name || "عميل نقدي"}
                          </span>
                        </td>
                        <td>
                          <span className={`num-font ${styles.itemsCountText}`}>
                            {inv.itemsCount || inv.items?.length || 1}
                          </span>
                        </td>
                        <td>
                          <strong className={styles.totalPriceText}>
                            <span className="num-font" dir="ltr">{formatNumber(inv.total)}</span> ج.م
                          </strong>
                        </td>
                        <td>
                          <span className={`badge ${styles.paymentMethodBadge}`}>
                            {inv.paymentMethod || "نقدي"}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${styles.statusCompletedBadge}`}>
                            ✓ مكتملة
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Section C: Pending Suppliers Table */}
          <section className={`glass-panel ${styles.suppliersPanel}`}>
            <div className={styles.suppliersHeader}>
              <div className={styles.panelTitleGroup}>
                <Truck size={20} color="#7e22ce" />
                <h3 className={styles.panelTitle}>
                  مستحقات الموردين المطلوب سدادها
                </h3>
              </div>
              <Link href="/suppliers" className={styles.suppliersLink}>
                صفحة الموردين <ChevronLeft size={14} />
              </Link>
            </div>

            {topCreditorSuppliers.length === 0 ? (
              <div className={styles.emptyCenteredBox}>
                <CheckCircle2 size={32} color="#059669" className={styles.emptyCheckIcon} />
                لا توجد مستحقات مالية معلقة لأي مورد حالياً.
              </div>
            ) : (
              <div className={styles.suppliersGrid}>
                {topCreditorSuppliers.map((sup) => (
                  <div 
                    key={sup.id}
                    className={styles.supplierCard}
                  >
                    <div>
                      <div className={styles.supplierName}>
                        {sup.name}
                      </div>
                      <div className={styles.supplierBal}>
                        {isAdmin ? (
                          <>
                            <span className="num-font" dir="ltr">{formatNumber(sup.balance)}</span> ج.م
                          </>
                        ) : "🔒"}
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenPayment(sup)}
                      className={`btn-primary ${styles.paySupplierBtn}`}
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
          <section className={`glass-panel ${styles.warehouseProductsPanel}`}>
            <div className={styles.warehouseHeader}>
              <div className={styles.panelTitleGroup}>
                <Boxes size={20} color="#db2777" />
                <h3 className={styles.panelTitle}>
                  أحدث أصناف المخزن المضافة
                </h3>
              </div>
              <Link href="/products" className={`btn-primary ${styles.viewAllWarehouseBtn}`}>
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
                    <th className={styles.thCenter}>الإجراءات</th>
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
                          <strong className={styles.productNameStrong}>{product.name}</strong>
                        </td>
                        <td>
                          <span className="badge badge-category">
                            {product.category || "عام"}
                          </span>
                        </td>
                        <td>
                          <span className={`num-font ${styles.qtyValue}`} dir="ltr">
                            {formatNumber(qty)}
                          </span>
                        </td>
                        <td>
                          {isAdmin ? (
                            <span className={`num-font ${styles.wholesaleVal}`} dir="ltr">
                              {formatNumber(product.wholesalePrice)} ج.م
                            </span>
                          ) : (
                            <span className={styles.adminLockedTag}>
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
                        <td className={styles.thCenter}>
                          <div className={styles.productActionBtns}>
                            <button
                              onClick={() => setBarcodeProduct(product)}
                              className={`btn-secondary ${styles.productSmallBtn}`}
                              title="طباعة الباركود"
                            >
                              <Barcode size={14} color="#db2777" />
                              باركود
                            </button>
                            <button
                              onClick={() => handleOpenEditProduct(product)}
                              className={`btn-secondary ${styles.productSmallBtn}`}
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
