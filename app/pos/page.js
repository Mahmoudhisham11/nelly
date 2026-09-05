"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import POSReceiptModal from "@/components/POSReceiptModal";
import { subscribeToShopProducts } from "@/lib/shopService";
import { subscribeToCustomers, addCustomer } from "@/lib/customersService";
import { subscribeToEmployees } from "@/lib/employeesService";
import { 
  subscribeToSales, 
  createSaleInvoice, 
  closeShiftAndMoveToReports, 
  returnSaleItemOrInvoice 
} from "@/lib/salesService";
import { formatNumber, roundCurrency } from "@/lib/utils";
import confetti from "canvas-confetti";
import { 
  ShoppingCart, 
  Barcode, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Banknote, 
  Smartphone, 
  Clock, 
  User, 
  UserPlus, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  Sparkles,
  Receipt,
  X,
  Store,
  PauseCircle,
  FolderClock,
  Lock,
  Eye,
  CalendarCheck,
  Printer,
  TrendingUp,
  DollarSign,
  Coins,
  Users
} from "lucide-react";

export default function POSPage() {
  const router = useRouter();
  const { user, isAdmin, loading: authLoading } = useAuth();

  // Data states
  const [shopProducts, setShopProducts] = useState([]);
  const [currentShiftSales, setCurrentShiftSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedSellerEmployee, setSelectedSellerEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  // Search & Cart states
  const [searchTerm, setSearchTerm] = useState("");
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [discountType, setDiscountType] = useState("fixed"); // "fixed" | "percent"
  const [discountValue, setDiscountValue] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("نقدي");
  const [receivedCash, setReceivedCash] = useState("");
  const [orderNotes, setOrderNotes] = useState("");

  // Suspended Invoices (الفواتير المعلقة)
  const [heldInvoices, setHeldInvoices] = useState([]);
  const [isHeldInvoicesModalOpen, setIsHeldInvoicesModalOpen] = useState(false);

  // Modals & Feedback
  const [completedInvoice, setCompletedInvoice] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Shift Invoices Table State & Filters
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [selectedInvoiceForDetails, setSelectedInvoiceForDetails] = useState(null);

  // Return Modal State
  const [itemToReturn, setItemToReturn] = useState(null);
  const [returnQuantity, setReturnQuantity] = useState(1);
  const [returnReason, setReturnReason] = useState("طلب العميل");
  const [isReturning, setIsReturning] = useState(false);

  // Close Shift Modal State
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);
  const [shiftNotes, setShiftNotes] = useState("");
  const [isClosingShift, setIsClosingShift] = useState(false);

  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Auth Protection
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Load suspended invoices from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("nelly_held_invoices");
      if (saved) {
        setHeldInvoices(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Error reading held invoices:", e);
    }
  }, []);

  const saveHeldInvoicesToStorage = (list) => {
    setHeldInvoices(list);
    try {
      localStorage.setItem("nelly_held_invoices", JSON.stringify(list));
    } catch (e) {
      console.error("Error saving held invoices:", e);
    }
  };

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target)
      ) {
        setSearchDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Real-time Subscriptions: Shop Products, Current Shift Sales, and Customers
  useEffect(() => {
    if (!user) return;

    let pLoaded = false;
    let sLoaded = false;
    let cLoaded = false;

    const unsubShop = subscribeToShopProducts((data) => {
      setShopProducts(data);
      pLoaded = true;
      if (sLoaded && cLoaded) setLoading(false);
    });

    const unsubSales = subscribeToSales((data) => {
      setCurrentShiftSales(data);
      sLoaded = true;
      if (pLoaded && cLoaded) setLoading(false);
    });

    const unsubCust = subscribeToCustomers((data) => {
      setCustomers(data);
      cLoaded = true;
      if (pLoaded && sLoaded) setLoading(false);
    });

    const unsubEmp = subscribeToEmployees((data) => {
      setEmployees(data);
    });

    return () => {
      unsubShop();
      unsubSales();
      unsubCust();
      unsubEmp();
    };
  }, [user]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4500);
  };

  // Autocomplete products matching search term in shop
  const matchingShopProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];
    return shopProducts.filter(p => 
      (p.name && p.name.toLowerCase().includes(term)) ||
      (p.barcode && p.barcode.toLowerCase().includes(term)) ||
      (p.category && p.category.toLowerCase().includes(term))
    ).slice(0, 8);
  }, [searchTerm, shopProducts]);

  // Cart Management
  const addToCart = (product) => {
    if (!product) return;
    if (product.quantity <= 0) {
      showToast(`عفواً، الصنف "${product.name}" نفد رصيده من المحل.`);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) {
          showToast(`الكمية المتاحة في المحل (${product.quantity}) تم وضعها بالكامل في السلة.`);
          return prev;
        }
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        return [...prev, {
          id: product.id,
          productId: product.id,
          barcode: product.barcode || "",
          name: product.name,
          category: product.category || "عام",
          wholesalePrice: roundCurrency(product.wholesalePrice || 0),
          sellingPrice: roundCurrency(product.sellingPrice || 0),
          stock: product.quantity,
          quantity: 1
        }];
      }
    });

    setSearchTerm("");
    setSearchDropdownOpen(false);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Handle Search Input KeyPress (Scanner support)
  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const term = searchTerm.trim().toLowerCase();
      if (!term) return;

      // Exact barcode match first
      const exactBarcode = shopProducts.find(p => (p.barcode || "").toLowerCase() === term);
      if (exactBarcode) {
        addToCart(exactBarcode);
        return;
      }

      // Name or partial match
      if (matchingShopProducts.length > 0) {
        addToCart(matchingShopProducts[0]);
      } else {
        showToast(`لا يوجد صنف في المحل يطابق "${searchTerm}".`);
      }
    }
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const nextQty = item.quantity + delta;
        if (nextQty <= 0) return null;
        if (nextQty > item.stock) {
          showToast(`الرصيد المتوفر في المحل هو ${item.stock} فقط.`);
          return item;
        }
        return { ...item, quantity: nextQty };
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setSelectedSellerEmployee(null);
    setDiscountValue("");
    setReceivedCash("");
    setOrderNotes("");
  };

  // Calculations
  const cartSubtotal = useMemo(() => {
    return roundCurrency(cart.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0));
  }, [cart]);

  const cartTotalCost = useMemo(() => {
    return roundCurrency(cart.reduce((sum, item) => sum + (item.wholesalePrice * item.quantity), 0));
  }, [cart]);

  const calculatedDiscount = useMemo(() => {
    const val = parseFloat(discountValue) || 0;
    if (val <= 0 || cartSubtotal <= 0) return 0;
    if (discountType === "percent") {
      return roundCurrency((cartSubtotal * Math.min(100, val)) / 100);
    }
    return roundCurrency(Math.min(cartSubtotal, val));
  }, [cartSubtotal, discountValue, discountType]);

  // Wholesale barrier check
  const isDiscountViolatingWholesale = useMemo(() => {
    if (calculatedDiscount <= 0 || cartTotalCost <= 0) return false;
    const finalPrice = cartSubtotal - calculatedDiscount;
    return finalPrice <= cartTotalCost;
  }, [cartSubtotal, calculatedDiscount, cartTotalCost]);

  const cartFinalTotal = useMemo(() => {
    return roundCurrency(Math.max(0, cartSubtotal - calculatedDiscount));
  }, [cartSubtotal, calculatedDiscount]);

  const parsedReceivedCash = parseFloat(receivedCash) || 0;
  
  // When customer pays more than total -> change to return (المتبقي للعميل)
  const changeForCustomer = parsedReceivedCash > cartFinalTotal 
    ? roundCurrency(parsedReceivedCash - cartFinalTotal) 
    : 0;

  // When customer pays less than total -> remaining balance needed (المتبقي على العميل)
  const remainingDue = cartFinalTotal > parsedReceivedCash && (parsedReceivedCash > 0 || paymentMethod === "آجل")
    ? roundCurrency(cartFinalTotal - parsedReceivedCash) 
    : 0;

  // Suspended Invoices logic
  const handleHoldInvoice = () => {
    if (cart.length === 0) {
      showToast("لا توجد أصناف في السلة لتعليق الفاتورة!");
      return;
    }

    const heldItem = {
      id: `HOLD-${Date.now()}`,
      createdAt: new Date().toISOString(),
      cart,
      customer: selectedCustomer,
      sellerEmployee: selectedSellerEmployee,
      discountType,
      discountValue,
      paymentMethod,
      orderNotes,
      total: cartFinalTotal
    };

    const updated = [heldItem, ...heldInvoices];
    saveHeldInvoicesToStorage(updated);
    clearCart();
    showToast("تم تعليق الفاتورة بنجاح. يمكنك إتمام فاتورة أخرى الآن.");
  };

  const handleRestoreHeldInvoice = (heldItem) => {
    setCart(heldItem.cart || []);
    setSelectedCustomer(heldItem.customer || null);
    setSelectedSellerEmployee(heldItem.sellerEmployee || null);
    setDiscountType(heldItem.discountType || "fixed");
    setDiscountValue(heldItem.discountValue || "");
    setPaymentMethod(heldItem.paymentMethod || "نقدي");
    setOrderNotes(heldItem.orderNotes || "");
    setIsHeldInvoicesModalOpen(false);

    const filtered = heldInvoices.filter(h => h.id !== heldItem.id);
    saveHeldInvoicesToStorage(filtered);
    showToast("تمت استعادة الفاتورة المعلقة بنجاح.");
  };

  const handleDeleteHeldInvoice = (id, e) => {
    e.stopPropagation();
    const filtered = heldInvoices.filter(h => h.id !== id);
    saveHeldInvoicesToStorage(filtered);
    showToast("تم حذف الفاتورة المعلقة.");
  };

  // Submit Sale Invoice
  const handleCheckout = async () => {
    if (cart.length === 0) {
      showToast("سلة المشتريات فارغة!");
      return;
    }

    if (isDiscountViolatingWholesale) {
      showToast(`ممنوع البيع: الخصم يخفض الإجمالي لسعر جملة البضاعة (${cartTotalCost} ج.م) أو أقل منه.`);
      return;
    }

    if (paymentMethod === "آجل" && !selectedCustomer) {
      showToast("في حالة البيع الآجل، يجب اختيار عميل لتسجيل المتبقي عليه.");
      return;
    }

    setIsSubmitting(true);
    try {
      const salePayload = {
        items: cart,
        customer: selectedCustomer,
        sellerEmployee: selectedSellerEmployee,
        discount: calculatedDiscount,
        paymentMethod,
        paidAmount: parsedReceivedCash || (paymentMethod === "آجل" ? 0 : cartFinalTotal),
        cashier: user ? {
          uid: user.uid,
          name: user.displayName || user.email || "الكاشير",
          email: user.email
        } : null,
        notes: orderNotes
      };

      const result = await createSaleInvoice(salePayload);
      if (result.success) {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 }
        });
        setCompletedInvoice(result.invoice);
        setIsReceiptModalOpen(true);
        clearCart();
        showToast(`تم إصدار الفاتورة رقم (${result.invoiceNumber}) بنجاح!`);
      }
    } catch (err) {
      console.error("Checkout error:", err);
      showToast(err.message || "حدث خطأ أثناء حفظ الفاتورة.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Close Shift
  const handleConfirmCloseShift = async () => {
    setIsClosingShift(true);
    try {
      const cashierData = user ? {
        uid: user.uid,
        name: user.displayName || user.email || "كاشير المحل",
        email: user.email
      } : { name: "كاشير المحل" };

      const res = await closeShiftAndMoveToReports({
        cashier: cashierData,
        notes: shiftNotes
      });

      if (res.success) {
        setIsCloseShiftModalOpen(false);
        setShiftNotes("");
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.5 }
        });
        showToast(`تم تقفيل الوردية بنجاح بنتيجة (${res.invoicesCount} فاتورة بإجمالي ${formatNumber(res.totalSales)} ج.م) وأرشفتها في تقفيلة الأيام.`);
      }
    } catch (err) {
      console.error("Close shift error:", err);
      showToast(err.message || "حدث خطأ أثناء تقفيل الوردية.");
    } finally {
      setIsClosingShift(false);
    }
  };

  // Handle Return Item or Full Invoice
  const handleReturnItem = async (invoice, item) => {
    setItemToReturn({
      invoice,
      item
    });
    setReturnQuantity(1);
    setReturnReason("طلب العميل إرجاع الصنف");
  };

  const handleConfirmReturnItem = async () => {
    if (!itemToReturn) return;
    setIsReturning(true);
    try {
      const cashierData = user ? {
        uid: user.uid,
        name: user.displayName || user.email || "كاشير المحل"
      } : null;

      const res = await returnSaleItemOrInvoice({
        invoiceId: itemToReturn.invoice.id,
        invoiceNumber: itemToReturn.invoice.invoiceNumber,
        itemsToReturn: [{
          ...itemToReturn.item,
          quantity: returnQuantity
        }],
        returnReason: returnReason,
        cashier: cashierData
      });

      if (res.success) {
        showToast(`تم استرجاع الصنف وإعادته لرصيد المحل بنجاح (رقم المرتجع: ${res.returnNumber}).`);
        setItemToReturn(null);
        setSelectedInvoiceForDetails(null);
      }
    } catch (err) {
      console.error("Return item error:", err);
      showToast(err.message || "حدث خطأ أثناء إتمام المرتجع.");
    } finally {
      setIsReturning(false);
    }
  };

  const handleReturnFullInvoice = async (invoice) => {
    const isConfirmed = window.confirm(`هل أنت متأكد من رغبتك في إرجاع كامل الفاتورة (${invoice.invoiceNumber})؟\nسيتم استرجاع كافة الأصناف لرصيد المحل وحذف الفاتورة من مبيعات الوردية.`);
    if (!isConfirmed) return;

    setIsReturning(true);
    try {
      const cashierData = user ? {
        uid: user.uid,
        name: user.displayName || user.email || "كاشير المحل"
      } : null;

      const res = await returnSaleItemOrInvoice({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        itemsToReturn: invoice.items,
        returnReason: "مرتجع كامل الفاتورة",
        cashier: cashierData
      });

      if (res.success) {
        showToast(`تم إرجاع كامل الفاتورة بنجاح وحذفها من الوردية وإعادة كافة الأصناف لرصيد المحل.`);
        setSelectedInvoiceForDetails(null);
      }
    } catch (err) {
      console.error("Return full invoice error:", err);
      showToast(err.message || "حدث خطأ أثناء إرجاع الفاتورة.");
    } finally {
      setIsReturning(false);
    }
  };

  // Add new Customer quick handler
  const handleAddNewCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomerName.trim()) return;

    try {
      const res = await addCustomer({
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim(),
        balance: 0
      });
      if (res.success) {
        const newCust = { id: res.id, name: newCustomerName.trim(), phone: newCustomerPhone.trim() };
        setSelectedCustomer(newCust);
        setIsNewCustomerModalOpen(false);
        setNewCustomerName("");
        setNewCustomerPhone("");
        showToast(`تمت إضافة العميل "${newCust.name}" وتحديده بنجاح.`);
      }
    } catch (err) {
      showToast("فشلت إضافة العميل، يرجى التحقق من صحة البيانات.");
    }
  };

  // Filtered shift sales
  const filteredShiftSales = useMemo(() => {
    return currentShiftSales.filter(inv => {
      const query = invoiceSearchQuery.trim().toLowerCase();
      const matchesSearch = !query || 
        (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(query)) ||
        (inv.customer?.name && inv.customer.name.toLowerCase().includes(query)) ||
        (inv.customer?.phone && inv.customer.phone.includes(query));

      const matchesPayment = paymentFilter === "all" || inv.paymentMethod === paymentFilter;

      return matchesSearch && matchesPayment;
    });
  }, [currentShiftSales, invoiceSearchQuery, paymentFilter]);

  // Current shift totals
  const shiftStats = useMemo(() => {
    let salesTotal = 0;
    let profitTotal = 0;
    let cashTotal = 0;

    currentShiftSales.forEach(inv => {
      salesTotal += (inv.total || 0);
      profitTotal += (inv.totalProfit || 0);
      if (inv.paymentMethod === "نقدي") {
        cashTotal += (inv.paidAmount || inv.total || 0);
      }
    });

    return {
      count: currentShiftSales.length,
      sales: roundCurrency(salesTotal),
      profit: roundCurrency(profitTotal),
      cash: roundCurrency(cashTotal)
    };
  }, [currentShiftSales]);

  return (
    <div className="app-layout">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed-toast-notification">
          <Sparkles className="toast-icon" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar 
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      <div className="main-content">
        <Navbar 
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          title="نقطة البيع (الكاشير)"
        />

        <div className="page-body pos-page-wrapper">

          {/* =========================================================
              1. TOP BAR: Title, Live Shift Badge, and Close Shift Action
              ========================================================= */}
          <div className="pos-top-bar">
            <div className="pos-top-title-group">
              <div className="pos-top-icon-badge">
                <ShoppingCart size={22} />
              </div>
              <div className="pos-top-headings">
                <h1>
                  <span>نقطة البيع والكاشير</span>
                  <span className="pos-shift-live-pill">
                    <span className="pos-live-dot"></span>
                    <span>الوردية مفتوحة ({shiftStats.count} فاتورة)</span>
                  </span>
                </h1>
                <p>إصدار الفواتير الفورية، جرد مبيعات الوردية المفتوحة، وإدارة المرتجعات المباشرة</p>
              </div>
            </div>

            {/* Close Shift Big Action */}
            <button 
              type="button"
              onClick={() => setIsCloseShiftModalOpen(true)}
              className="btn-close-shift-action"
              title="تقفيل الوردية ونقل الفواتير لأرشيف تقفيلة الأيام (reports)"
            >
              <Lock size={18} />
              <span>تقفيل الوردية وأرشفة الحسابات 🔒</span>
            </button>
          </div>

          {/* =========================================================
              2. KPI METRIC BAR: 4 Sleek Horizontal Cards
              ========================================================= */}
          <div className="pos-metrics-row">
            <div className="pos-kpi-pill-card metric-sales">
              <div className="pos-kpi-text">
                <span className="pos-kpi-subtitle">إجمالي مبيعات الوردية</span>
                <div className="pos-kpi-big-num">
                  {formatNumber(shiftStats.sales)} <small>ج.م</small>
                </div>
              </div>
              <div className="pos-kpi-icon-square">
                <DollarSign size={22} />
              </div>
            </div>

            <div className="pos-kpi-pill-card metric-profit">
              <div className="pos-kpi-text">
                <span className="pos-kpi-subtitle">صافي أرباح الوردية</span>
                <div className="pos-kpi-big-num text-emerald-600">
                  +{formatNumber(shiftStats.profit)} <small>ج.م</small>
                </div>
              </div>
              <div className="pos-kpi-icon-square">
                <TrendingUp size={22} />
              </div>
            </div>

            <div className="pos-kpi-pill-card metric-cash">
              <div className="pos-kpi-text">
                <span className="pos-kpi-subtitle">النقدية بالدرج (الكاش)</span>
                <div className="pos-kpi-big-num text-purple-700">
                  {formatNumber(shiftStats.cash)} <small>ج.م</small>
                </div>
              </div>
              <div className="pos-kpi-icon-square">
                <Banknote size={22} />
              </div>
            </div>

            <div className="pos-kpi-pill-card metric-invoices">
              <div className="pos-kpi-text">
                <span className="pos-kpi-subtitle">عدد الفواتير الصادرة</span>
                <div className="pos-kpi-big-num text-amber-700">
                  {shiftStats.count} <small>فاتورة</small>
                </div>
              </div>
              <div className="pos-kpi-icon-square">
                <Receipt size={22} />
              </div>
            </div>
          </div>

          {/* =========================================================
              3. MAIN WORKSPACE GRID: Register (Right) + Shift Table (Left)
              ========================================================= */}
          <div className="pos-workspace-grid">

            {/* -------------------------------------------------------
                RIGHT COLUMN: Register, Scanner, and Shopping Cart
                ------------------------------------------------------- */}
            <div className="pos-register-container">
              
              {/* Barcode & Search Input */}
              <div className="pos-scanner-container">
                <label className="pos-scanner-label">
                  <Barcode size={17} color="var(--rose-600)" />
                  <span>إضافة منتج من المحل (امسح الباركود أو اكتب الاسم)</span>
                </label>
                <div className="pos-scanner-input-wrap">
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="امسح الباركود أو اكتب اسم الصنف..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setSearchDropdownOpen(true);
                    }}
                    onKeyDown={handleSearchKeyDown}
                    onFocus={() => {
                      if (searchTerm.trim()) setSearchDropdownOpen(true);
                    }}
                    className="pos-scanner-input-field"
                  />
                  <Search size={19} className="pos-scanner-leading-icon" />

                  {/* Autocomplete Menu */}
                  {searchDropdownOpen && matchingShopProducts.length > 0 && (
                    <div ref={dropdownRef} className="pos-search-dropdown-menu">
                      {matchingShopProducts.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => addToCart(p)}
                          className="pos-search-result-item"
                        >
                          <div>
                            <div className="pos-result-name">{p.name}</div>
                            <div className="pos-result-meta">
                              باركود: {p.barcode || "—"} | الرصيد: {p.quantity} قطعة
                            </div>
                          </div>
                          <div className="pos-result-price">
                            {formatNumber(p.sellingPrice)} ج.م
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Cart Header */}
              <div className="pos-cart-top-bar">
                <div className="pos-cart-title-text">
                  <ShoppingCart size={18} color="var(--rose-600)" />
                  <span>سلة البيع ({cart.reduce((a, c) => a + c.quantity, 0)} قطعة)</span>
                </div>

                <div className="pos-cart-actions-group">
                  {/* Held Invoices */}
                  <button 
                    type="button"
                    onClick={() => setIsHeldInvoicesModalOpen(true)}
                    className="btn-pos-held-invoices"
                    title="استعراض الفواتير المعلقة"
                    style={{ gap: "6px", padding: "0.35rem 0.75rem", fontSize: "0.75rem", fontWeight: "800" }}
                  >
                    <FolderClock size={16} />
                    <span>المعلقة</span>
                    {heldInvoices.length > 0 && (
                      <span className="pos-badge-held-counter">{heldInvoices.length}</span>
                    )}
                  </button>

                  {/* Hold Current Cart */}
                  {cart.length > 0 && (
                    <button
                      onClick={handleHoldInvoice}
                      className="btn-pos-hold-action"
                      title="تعليق الفاتورة الحالية لخدمة زبون آخر"
                    >
                      <PauseCircle size={15} />
                      <span>تعليق</span>
                    </button>
                  )}

                  {/* Clear Cart */}
                  {cart.length > 0 && (
                    <button 
                      onClick={clearCart} 
                      className="btn-pos-clear-action"
                      title="تفريغ السلة"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Cart Items List */}
              <div className="pos-cart-items-wrapper">
                {cart.length === 0 ? (
                  <div className="pos-cart-empty-placeholder">
                    <ShoppingCart size={32} color="var(--text-muted)" style={{ opacity: 0.35 }} />
                    <p>سلة البيع فارغة</p>
                    <span>امسح باركود المنتج لإضافته فوراً</span>
                  </div>
                ) : (
                  <div className="pos-cart-items-list">
                    {cart.map((item) => (
                      <div key={item.id} className="pos-cart-single-row">
                        <div className="pos-cart-item-details">
                          <div className="pos-item-title">{item.name}</div>
                          <div className="pos-item-subtext">
                            {formatNumber(item.sellingPrice)} ج.م × {item.quantity} = <strong>{formatNumber(item.sellingPrice * item.quantity)} ج.م</strong>
                          </div>
                        </div>

                        <div className="pos-qty-button-group">
                          <button 
                            onClick={() => updateQuantity(item.id, 1)}
                            className="btn-pos-qty"
                          >
                            <Plus size={13} />
                          </button>
                          <span className="pos-qty-display-number">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, -1)}
                            className="btn-pos-qty"
                          >
                            <Minus size={13} />
                          </button>
                          <button 
                            onClick={() => removeFromCart(item.id)}
                            className="btn-pos-delete-item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Customer Selector Row */}
              <div className="pos-control-row">
                <div className="pos-label-between">
                  <span className="pos-label-title">
                    <User size={14} color="var(--rose-600)" />
                    <span>العميل</span>
                  </span>
                  <button 
                    onClick={() => setIsNewCustomerModalOpen(true)}
                    className="btn-pos-quick-add-customer"
                  >
                    <UserPlus size={13} />
                    <span>+ عميل جديد</span>
                  </button>
                </div>
                <select
                  value={selectedCustomer?.id || ""}
                  onChange={(e) => {
                    const c = customers.find(item => item.id === e.target.value);
                    setSelectedCustomer(c || null);
                  }}
                  className="pos-select-box"
                >
                  <option value="">عميل نقدي (بدون حساب آجل)</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sales Employee Selector Row */}
              <div className="pos-control-row">
                <div className="pos-label-between">
                  <span className="pos-label-title">
                    <Users size={14} color="var(--rose-600)" />
                    <span>موظف المبيعات (عمولة 1%)</span>
                  </span>
                </div>
                <select
                  value={selectedSellerEmployee?.id || ""}
                  onChange={(e) => {
                    const emp = employees.find(item => item.id === e.target.value);
                    setSelectedSellerEmployee(emp || null);
                  }}
                  className="pos-select-box"
                >
                  <option value="">بدون تحديد موظف مبيعات</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} (كود: {emp.code}) - عمولة {((emp.commissionRate || 0.01) * 100).toFixed(0)}%
                    </option>
                  ))}
                </select>
              </div>

              {/* Discount Row with Wholesale Barrier */}
              <div className="pos-control-row">
                <div className="pos-label-between">
                  <span className="pos-label-title">
                    <span>خصم الفاتورة</span>
                  </span>
                  <div className="pos-discount-chips-wrap">
                    <button 
                      type="button"
                      onClick={() => setDiscountType("fixed")}
                      className={`pos-chip-toggle ${discountType === "fixed" ? "active" : ""}`}
                    >
                      ج.م
                    </button>
                    <button 
                      type="button"
                      onClick={() => setDiscountType("percent")}
                      className={`pos-chip-toggle ${discountType === "percent" ? "active" : ""}`}
                    >
                      %
                    </button>
                  </div>
                </div>
                <input 
                  type="number"
                  min="0"
                  placeholder="قيمة الخصم..."
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="pos-input-general"
                />

                {isDiscountViolatingWholesale && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-1.5 mt-1">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>ممنوع: الخصم يخفض الإجمالي لسعر جملة البضاعة ({cartTotalCost} ج.م) أو أقل منه.</span>
                  </div>
                )}
              </div>

              {/* Payment Methods */}
              <div className="pos-control-row">
                <span className="pos-label-title mb-1">طريقة الدفع:</span>
                <div className="pos-payment-selector-grid">
                  {["نقدي", "فيزا", "تحويل", "آجل"].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`btn-pos-method-choice ${paymentMethod === m ? "active" : ""}`}
                    >
                      {m === "نقدي" && <Banknote size={14} />}
                      {m === "فيزا" && <CreditCard size={14} />}
                      {m === "تحويل" && <Smartphone size={14} />}
                      {m === "آجل" && <Clock size={14} />}
                      <span>{m}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Received Cash Input */}
              <div className="pos-control-row">
                <div className="pos-label-between">
                  <span className="pos-label-title">المبلغ المستلم من العميل:</span>
                  {cartFinalTotal > 0 && (
                    <button
                      type="button"
                      onClick={() => setReceivedCash(cartFinalTotal.toString())}
                      className="btn-pos-quick-add-customer"
                    >
                      المبلغ بالكامل ({formatNumber(cartFinalTotal)} ج.م)
                    </button>
                  )}
                </div>
                <input 
                  type="number"
                  min="0"
                  step="any"
                  placeholder={`المطلوب سداده: ${formatNumber(cartFinalTotal)} ج.م`}
                  value={receivedCash}
                  onChange={(e) => setReceivedCash(e.target.value)}
                  className="pos-input-general font-mono font-bold text-base"
                />

                {/* Instant visual indicator for remaining / change right below input */}
                {cartFinalTotal > 0 && receivedCash !== "" && parsedReceivedCash > 0 && (
                  <div className={`pos-received-feedback ${changeForCustomer > 0 ? "change-mode" : remainingDue > 0 ? "debt-mode" : "exact-mode"}`}>
                    {changeForCustomer > 0 && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "800" }}>
                          <Coins size={16} />
                          <span>المتبقي للعميل (الباقي / الفكة المسترجعة):</span>
                        </span>
                        <span style={{ fontFamily: "var(--font-numbers)", fontWeight: "900", fontSize: "1.1rem" }}>
                          {formatNumber(changeForCustomer)} ج.م
                        </span>
                      </div>
                    )}

                    {remainingDue > 0 && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "800" }}>
                          <AlertCircle size={16} />
                          <span>المتبقي على العميل (المطلوب سداده):</span>
                        </span>
                        <span style={{ fontFamily: "var(--font-numbers)", fontWeight: "900", fontSize: "1.1rem" }}>
                          {formatNumber(remainingDue)} ج.م
                        </span>
                      </div>
                    )}

                    {parsedReceivedCash === cartFinalTotal && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "800" }}>
                          <CheckCircle2 size={16} />
                          <span>تم استلام المبلغ بالكامل بالضبط:</span>
                        </span>
                        <span style={{ fontFamily: "var(--font-numbers)", fontWeight: "800", fontSize: "0.85rem" }}>
                          المتبقي: 0 ج.م
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Net Bill Breakdown & Total */}
              <div className="pos-net-summary-panel">
                <div className="pos-calc-row">
                  <span>إجمالي سعر الأصناف:</span>
                  <span className="font-mono font-bold">{formatNumber(cartSubtotal)} ج.م</span>
                </div>

                {calculatedDiscount > 0 && (
                  <div className="pos-calc-row text-red-500">
                    <span>الخصم المطبق:</span>
                    <span className="font-mono font-bold">-{formatNumber(calculatedDiscount)} ج.م</span>
                  </div>
                )}

                <div className="pos-calc-row pos-row-grand-total">
                  <span className="font-bold text-sm text-[var(--text-primary)]">الصافي المطلوب:</span>
                  <span className="pos-grand-price-text">
                    {formatNumber(cartFinalTotal)} ج.م
                  </span>
                </div>

                {/* When customer gives more -> change / remainder to return */}
                {changeForCustomer > 0 && (
                  <div className="pos-calc-row pos-row-change">
                    <span className="flex items-center gap-1 font-bold">
                      <Coins size={14} />
                      <span>المتبقي للعميل (الباقي):</span>
                    </span>
                    <span className="font-mono font-black text-base">
                      {formatNumber(changeForCustomer)} ج.م
                    </span>
                  </div>
                )}

                {/* When customer gives less -> remainder still owed */}
                {remainingDue > 0 && (
                  <div className="pos-calc-row pos-row-debt">
                    <span className="flex items-center gap-1 font-bold">
                      <AlertCircle size={14} />
                      <span>{paymentMethod === "آجل" ? "المتبقي في حساب العميل (آجل):" : "المتبقي المطلوب سداده:"}</span>
                    </span>
                    <span className="font-mono font-black text-base">
                      {formatNumber(remainingDue)} ج.م
                    </span>
                  </div>
                )}
              </div>

              {/* Big Checkout Action Button */}
              <button
                onClick={handleCheckout}
                disabled={cart.length === 0 || isDiscountViolatingWholesale || isSubmitting}
                className="btn-pos-submit-sale"
              >
                {isSubmitting ? (
                  <span>جاري إصدار الفاتورة...</span>
                ) : (
                  <>
                    <CheckCircle2 size={19} />
                    <span>إتمام عملية البيع وطباعة الفاتورة ({formatNumber(cartFinalTotal)} ج.م)</span>
                  </>
                )}
              </button>

            </div>

            {/* -------------------------------------------------------
                LEFT COLUMN: Current Shift Invoices Data Table
                ------------------------------------------------------- */}
            <div className="pos-shift-table-panel">
              
              {/* Table Inner Header */}
              <div className="pos-shift-header-inner">
                <div className="flex items-center gap-2">
                  <h2 className="pos-shift-heading-text">
                    <Receipt size={20} color="var(--rose-600)" />
                    <span>فواتير الوردية الحالية</span>
                  </h2>
                  <span className="pos-shift-badge-counter">
                    {currentShiftSales.length} فاتورة مسجلة
                  </span>
                </div>
              </div>

              {/* Search & Filter Toolbar */}
              <div className="pos-table-filter-bar">
                <div className="pos-table-search-wrapper">
                  <Search size={17} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
                  <input
                    type="text"
                    placeholder="ابحث برقم الفاتورة أو اسم العميل..."
                    value={invoiceSearchQuery}
                    onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                    className="pos-table-search-input-field"
                  />
                  {invoiceSearchQuery && (
                    <button
                      onClick={() => setInvoiceSearchQuery("")}
                      style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>

                {/* Filter Tabs */}
                <div className="pos-filter-tabs-group">
                  {["all", "نقدي", "فيزا", "تحويل", "آجل"].map((m) => (
                    <button
                      key={m}
                      onClick={() => setPaymentFilter(m)}
                      className={`btn-pos-filter-tab ${paymentFilter === m ? "active" : ""}`}
                    >
                      {m === "all" ? "الكل" : m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Data Table Container with safe horizontal scrolling */}
              <div className="pos-table-scroll-wrap">
                {loading ? (
                  <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-muted)" }}>
                    <p>جاري تحميل فواتير الوردية...</p>
                  </div>
                ) : filteredShiftSales.length === 0 ? (
                  <div style={{ padding: "4rem 1.5rem", textAlign: "center", color: "var(--text-muted)" }}>
                    <Receipt size={48} color="var(--rose-400)" style={{ margin: "0 auto 12px auto", opacity: 0.35 }} />
                    <h3 style={{ fontSize: "1.1rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "6px" }}>
                      لا توجد فواتير مبيعات في هذه الوردية حالياً
                    </h3>
                    <p style={{ fontSize: "0.85rem", maxWidth: "420px", margin: "0 auto" }}>
                      {currentShiftSales.length === 0
                        ? "الوردية جديدة وفارغة. استخدم شريط الباركود على اليمين لإجراء عمليات البيع."
                        : "لا توجد فواتير تطابق نص البحث أو الفلتر المحدد."}
                    </p>
                  </div>
                ) : (
                  <table className="pos-invoices-data-table">
                    <thead>
                      <tr>
                        <th>رقم الفاتورة</th>
                        <th>الوقت</th>
                        <th>العميل</th>
                        <th>الأصناف</th>
                        <th>طريقة الدفع</th>
                        <th>الإجمالي</th>
                        <th>الربح</th>
                        <th>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredShiftSales.map((inv) => (
                        <tr 
                          key={inv.id}
                          onClick={() => setSelectedInvoiceForDetails(inv)}
                          className="pos-table-row-item"
                        >
                          <td className="font-mono font-bold" style={{ color: "var(--rose-600)" }}>
                            {inv.invoiceNumber}
                          </td>
                          <td style={{ fontSize: "0.775rem", color: "var(--text-secondary)" }}>
                            {new Date(inv.date || inv.createdAt).toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td>
                            <div className="font-bold text-xs text-[var(--text-primary)]">
                              {inv.customer?.name || "عميل نقدي"}
                            </div>
                            {inv.customer?.phone && (
                              <div className="font-mono text-[11px] text-[var(--text-muted)]">
                                {inv.customer.phone}
                              </div>
                            )}
                          </td>
                          <td>
                            <span className="pos-items-pill">
                              {inv.itemsCount || (inv.items || []).reduce((a, c) => a + (c.quantity || 1), 0)} قطعة
                            </span>
                          </td>
                          <td>
                            <span className={`pos-payment-tag tag-${inv.paymentMethod}`}>
                              {inv.paymentMethod || "نقدي"}
                            </span>
                          </td>
                          <td className="font-mono font-bold text-sm text-[var(--text-primary)]">
                            {formatNumber(inv.total)} ج.م
                          </td>
                          <td className="font-mono font-bold text-xs text-emerald-600">
                            +{formatNumber(inv.totalProfit)} ج.م
                          </td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }} onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => setSelectedInvoiceForDetails(inv)}
                                className="btn-pos-row-action btn-action-inspect"
                                title="عرض الأصناف وتفاصيل الفاتورة"
                              >
                                <Eye size={14} />
                                <span>الأصناف</span>
                              </button>
                              <button
                                onClick={() => handleReturnFullInvoice(inv)}
                                className="btn-pos-row-action btn-action-refund"
                                title="مرتجع كامل الفاتورة وإلغاؤها"
                              >
                                <RotateCcw size={14} />
                                <span>مرتجع</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

            </div>

          </div>
        </div>
      </div>

      {/* =========================================================
          MODAL 1: Invoice Items Details & Return
          ========================================================= */}
      {selectedInvoiceForDetails && (
        <div className="modal-overlay" onClick={() => setSelectedInvoiceForDetails(null)}>
          <div 
            className="modal-content invoice-details-modal" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "760px", padding: 0 }}
          >
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "12px",
                  background: "rgba(219, 39, 119, 0.1)",
                  color: "var(--rose-600)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <Receipt size={22} />
                </div>
                <div>
                  <h3 className="modal-title font-mono font-bold" style={{ fontSize: "1.1rem" }}>
                    فاتورة: {selectedInvoiceForDetails.invoiceNumber}
                  </h3>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    {new Date(selectedInvoiceForDetails.date || selectedInvoiceForDetails.createdAt).toLocaleString("ar-EG")}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedInvoiceForDetails(null)} 
                className="modal-close-btn"
                title="إغلاق"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: "1.25rem" }}>
              {/* Meta Grid */}
              <div className="invoice-meta-grid" style={{ marginBottom: "1.25rem" }}>
                <div className="meta-box">
                  <span className="meta-label">العميل</span>
                  <span className="meta-val">{selectedInvoiceForDetails.customer?.name || "عميل نقدي"}</span>
                </div>
                <div className="meta-box">
                  <span className="meta-label">الكاشير</span>
                  <span className="meta-val">{selectedInvoiceForDetails.cashier?.name || "كاشير المحل"}</span>
                </div>
                <div className="meta-box">
                  <span className="meta-label">طريقة الدفع</span>
                  <span className="meta-val">{selectedInvoiceForDetails.paymentMethod || "نقدي"}</span>
                </div>
                <div className="meta-box">
                  <span className="meta-label">إجمالي الفاتورة</span>
                  <span className="meta-val font-mono font-bold text-[var(--rose-600)]" style={{ fontSize: "1.05rem" }}>
                    {formatNumber(selectedInvoiceForDetails.total)} ج.م
                  </span>
                </div>
              </div>

              {/* Items Table Header */}
              <h4 style={{ fontSize: "0.875rem", fontWeight: "800", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px", color: "var(--text-primary)" }}>
                <ShoppingCart size={16} color="var(--rose-600)" />
                الأصناف المباعة في هذه الفاتورة ({(selectedInvoiceForDetails.items || []).length} صنف):
              </h4>

              {/* Items Table */}
              <div style={{ border: "1px solid var(--border-card)", borderRadius: "14px", overflow: "hidden", background: "#ffffff" }}>
                <table style={{ width: "100%", fontSize: "0.85rem", textAlign: "right", borderCollapse: "collapse" }}>
                  <thead style={{ background: "#fdf8fa", borderBottom: "1.5px solid var(--border-card)" }}>
                    <tr>
                      <th style={{ padding: "10px 12px", fontWeight: "800", color: "var(--text-secondary)" }}>الصنف</th>
                      <th style={{ padding: "10px", textAlign: "center", fontWeight: "800", color: "var(--text-secondary)" }}>الباركود</th>
                      <th style={{ padding: "10px", textAlign: "center", fontWeight: "800", color: "var(--text-secondary)" }}>الكمية</th>
                      <th style={{ padding: "10px", textAlign: "center", fontWeight: "800", color: "var(--text-secondary)" }}>السعر</th>
                      <th style={{ padding: "10px", textAlign: "center", fontWeight: "800", color: "var(--text-secondary)" }}>الإجمالي</th>
                      <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: "800", color: "var(--text-secondary)" }}>إجراء المرتجع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedInvoiceForDetails.items || []).map((itm, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #f8eff4" }}>
                        <td style={{ padding: "10px 12px", fontWeight: "700", color: "var(--text-primary)" }}>{itm.name}</td>
                        <td style={{ padding: "10px", textAlign: "center", fontFamily: "var(--font-numbers)", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {itm.barcode || "—"}
                        </td>
                        <td style={{ padding: "10px", textAlign: "center", fontWeight: "800", fontFamily: "var(--font-numbers)" }}>
                          {itm.quantity}
                        </td>
                        <td style={{ padding: "10px", textAlign: "center", fontFamily: "var(--font-numbers)" }}>
                          {formatNumber(itm.sellingPrice)} ج.م
                        </td>
                        <td style={{ padding: "10px", textAlign: "center", fontWeight: "900", fontFamily: "var(--font-numbers)", color: "var(--rose-600)" }}>
                          {formatNumber(itm.subtotal || itm.quantity * itm.sellingPrice)} ج.م
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "center" }}>
                          <button
                            type="button"
                            onClick={() => handleReturnItem(selectedInvoiceForDetails, itm)}
                            className="btn-return-single-item"
                          >
                            <RotateCcw size={13} />
                            <span>مرتجع صنف</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pinned Modal Footer */}
            <div className="modal-footer" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => handleReturnFullInvoice(selectedInvoiceForDetails)}
                className="btn-danger-return-full"
              >
                <RotateCcw size={15} />
                <span>مرتجع كامل الفاتورة وحذفها</span>
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setCompletedInvoice(selectedInvoiceForDetails);
                    setIsReceiptModalOpen(true);
                  }}
                  className="btn-print-invoice"
                >
                  <Printer size={15} />
                  <span>طباعة الفاتورة</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceForDetails(null)}
                  className="btn-close-modal"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 2: Return Single Item
          ========================================================= */}
      {itemToReturn && (
        <div 
          className="modal-overlay" 
          onClick={() => setItemToReturn(null)}
          style={{ zIndex: 100010 }}
        >
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "480px", padding: 0 }}
          >
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
                <div>
                  <h3 className="modal-title font-bold" style={{ fontSize: "1.05rem", color: "#92400e" }}>
                    تأكيد مرتجع صنف للمحل
                  </h3>
                  <p style={{ fontSize: "0.725rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    إعادة الصنف لرصيد بضاعة المحل ورد المبلغ للزبون
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setItemToReturn(null)} 
                className="modal-close-btn"
                title="إلغاء"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: "1.25rem" }}>
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "12px", padding: "12px", marginBottom: "1rem", color: "#92400e", fontSize: "0.85rem" }}>
                <div style={{ fontWeight: "800" }}>الصنف: {itemToReturn.item.name}</div>
                <div style={{ fontSize: "0.775rem", marginTop: "4px", color: "#78350f" }}>
                  الكمية المباعة أصلاً: <strong>{itemToReturn.item.quantity} قطعة</strong> بسعر ({formatNumber(itemToReturn.item.sellingPrice)} ج.م للقطعة)
                </div>
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "800", marginBottom: "6px", color: "var(--text-secondary)" }}>
                  الكمية المراد استرجاعها:
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <input 
                    type="number"
                    min="1"
                    max={itemToReturn.item.quantity}
                    value={returnQuantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 1;
                      setReturnQuantity(Math.min(itemToReturn.item.quantity, Math.max(1, val)));
                    }}
                    className="pos-input-general font-mono font-bold text-center text-lg"
                    style={{ width: "90px", padding: "8px" }}
                  />
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    من أصل {itemToReturn.item.quantity} قطعة
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: "1.25rem", background: "#ecfdf5", padding: "10px 14px", borderRadius: "10px", border: "1px solid #a7f3d0" }}>
                <span style={{ fontSize: "0.78rem", fontWeight: "800", color: "var(--emerald-700)" }}>
                  المبلغ المسترد للعميل:
                </span>
                <div style={{ fontFamily: "var(--font-numbers)", fontSize: "1.3rem", fontWeight: "900", color: "var(--emerald-600)" }}>
                  {formatNumber(returnQuantity * itemToReturn.item.sellingPrice)} ج.م
                </div>
              </div>

              <div style={{ marginBottom: "0.5rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "800", marginBottom: "6px", color: "var(--text-secondary)" }}>
                  سبب المرتجع:
                </label>
                <input 
                  type="text"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="مثلاً: الصنف به عيب، اختيار غير مناسب..."
                  className="pos-input-general"
                />
              </div>
            </div>

            {/* Pinned Modal Footer */}
            <div className="modal-footer">
              <button 
                type="button"
                onClick={() => setItemToReturn(null)} 
                className="btn-cancel"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmReturnItem}
                disabled={isReturning}
                className="btn-confirm-return"
              >
                {isReturning ? "جاري الإرجاع..." : "تأكيد المرتجع وإعادة الصنف للمحل"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 3: Close Shift Confirmation
          ========================================================= */}
      {isCloseShiftModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCloseShiftModalOpen(false)}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "560px", padding: 0 }}
          >
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #1e1322, #3c143e)",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: "0 4px 12px rgba(30, 19, 34, 0.25)"
                }}>
                  <Lock size={20} />
                </div>
                <div>
                  <h3 className="modal-title font-bold" style={{ fontSize: "1.1rem" }}>
                    تقفيل الوردية وأرشفة الحسابات
                  </h3>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    نقل سجل مبيعات الوردية إلى تقفيلة الأيام (reports) وتصفير الكاشير
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsCloseShiftModalOpen(false)} 
                className="modal-close-btn"
                title="إلغاء"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: "1.25rem" }}>
              <div className="shift-summary-box" style={{ marginBottom: "1rem" }}>
                <h4 style={{ fontSize: "0.875rem", fontWeight: "800", color: "var(--rose-700)", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <CalendarCheck size={16} />
                  ملخص الحسابات للوردية الحالية
                </h4>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
                  <div style={{ background: "#ffffff", padding: "10px", borderRadius: "10px", border: "1px solid var(--border-card)" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>عدد الفواتير:</span>
                    <div style={{ fontWeight: "900", fontFamily: "var(--font-numbers)", fontSize: "1.1rem" }}>{shiftStats.count} فاتورة</div>
                  </div>
                  <div style={{ background: "#ffffff", padding: "10px", borderRadius: "10px", border: "1px solid var(--border-card)" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>إجمالي المبيعات:</span>
                    <div style={{ fontWeight: "900", fontFamily: "var(--font-numbers)", fontSize: "1.1rem", color: "var(--rose-600)" }}>{formatNumber(shiftStats.sales)} ج.م</div>
                  </div>
                  <div style={{ background: "#ffffff", padding: "10px", borderRadius: "10px", border: "1px solid var(--border-card)" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>صافي الأرباح:</span>
                    <div style={{ fontWeight: "900", fontFamily: "var(--font-numbers)", fontSize: "1.1rem", color: "var(--emerald-600)" }}>+{formatNumber(shiftStats.profit)} ج.م</div>
                  </div>
                  <div style={{ background: "#ffffff", padding: "10px", borderRadius: "10px", border: "1px solid var(--border-card)" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>الكاش في الدرج:</span>
                    <div style={{ fontWeight: "900", fontFamily: "var(--font-numbers)", fontSize: "1.1rem", color: "#6b21a8" }}>{formatNumber(shiftStats.cash)} ج.م</div>
                  </div>
                </div>
              </div>

              {shiftStats.count === 0 ? (
                <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "12px", padding: "12px", marginBottom: "1rem", display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <AlertCircle size={18} color="#2563eb" style={{ flexShrink: 0, marginTop: "2px" }} />
                  <div style={{ fontSize: "0.8rem", color: "#1e40af", lineHeight: "1.5" }}>
                    <strong>الوردية فارغة حالياً (0 فاتورة):</strong> لا توجد مبيعات في هذه الوردية لأرشفتها. يمكنك البدء بإجراء عمليات البيع أولاً.
                  </div>
                </div>
              ) : (
                <div className="alert-shift-warning" style={{ marginBottom: "1rem" }}>
                  <AlertCircle size={18} color="#b45309" style={{ flexShrink: 0, marginTop: "2px" }} />
                  <div style={{ fontSize: "0.775rem", color: "#78350f", lineHeight: "1.4" }}>
                    <strong>تنبيه الإغلاق:</strong> سيتم ترحيل كافة فواتير ومبيعات هذه الوردية إلى سجل تقفيلة الأيام (reports)، وتصفير شاشة المبيعات للبدء بوردية جديدة.
                  </div>
                </div>
              )}

              <div style={{ marginBottom: "0.5rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "800", marginBottom: "6px", color: "var(--text-secondary)" }}>
                  ملاحظات التقفيل (اختياري):
                </label>
                <textarea
                  rows="2"
                  value={shiftNotes}
                  onChange={(e) => setShiftNotes(e.target.value)}
                  placeholder="مثلاً: تم تسليم الكاش للمدير بالكامل..."
                  className="pos-input-general"
                  style={{ resize: "none" }}
                  disabled={shiftStats.count === 0}
                />
              </div>
            </div>

            {/* Pinned Modal Footer */}
            <div className="modal-footer">
              <button 
                type="button"
                onClick={() => setIsCloseShiftModalOpen(false)} 
                className="btn-cancel"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmCloseShift}
                disabled={isClosingShift || shiftStats.count === 0}
                className="btn-confirm-close-shift"
                style={shiftStats.count === 0 ? { opacity: 0.5, cursor: "not-allowed" } : {}}
              >
                {isClosingShift ? "جاري التقفيل والأرشفة..." : "تأكيد تقفيل الوردية والأرشفة 🔒"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 4: Suspended Invoices
          ========================================================= */}
      {isHeldInvoicesModalOpen && (
        <div className="modal-overlay" onClick={() => setIsHeldInvoicesModalOpen(false)}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "560px", padding: 0, overflow: "hidden" }}
          >
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "10px",
                  background: "rgba(219, 39, 119, 0.1)",
                  color: "var(--rose-600)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <FolderClock size={20} />
                </div>
                <div>
                  <h3 className="modal-title font-bold" style={{ fontSize: "1.05rem" }}>
                    الفواتير المعلقة ({heldInvoices.length})
                  </h3>
                  <p style={{ fontSize: "0.725rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    اضغط على أي فاتورة لاستعادتها فوراً إلى سلة البيع
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsHeldInvoicesModalOpen(false)} 
                className="modal-close-btn"
                title="إغلاق"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: "1.25rem" }}>
              {heldInvoices.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--text-muted)" }}>
                  <PauseCircle size={44} style={{ margin: "0 auto 10px auto", opacity: 0.3 }} />
                  <p style={{ fontWeight: "700" }}>لا توجد فواتير معلقة حالياً</p>
                  <span style={{ fontSize: "0.75rem" }}>يمكنك تعليق أي سلة نشطة لخدمة زبون آخر مؤقتاً</span>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "60vh", overflowY: "auto" }}>
                  {heldInvoices.map((held) => (
                    <div
                      key={held.id}
                      onClick={() => handleRestoreHeldInvoice(held)}
                      className="held-invoice-card"
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ fontWeight: "800", fontSize: "0.875rem", color: "var(--text-primary)" }}>
                            {held.customer?.name || "عميل نقدي"}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "3px" }}>
                            {new Date(held.createdAt).toLocaleTimeString("ar-EG")} • {(held.cart || []).length} صنف ({(held.cart || []).reduce((a, c) => a + c.quantity, 0)} قطعة)
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <span style={{ fontFamily: "var(--font-numbers)", fontWeight: "900", color: "var(--rose-600)", fontSize: "1rem" }}>
                            {formatNumber(held.total)} ج.م
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteHeldInvoice(held.id, e)}
                            style={{ 
                              background: "#fef2f2", 
                              border: "1px solid #fecaca", 
                              color: "#ef4444", 
                              cursor: "pointer", 
                              padding: "6px",
                              borderRadius: "8px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}
                            title="حذف الفاتورة المعلقة"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 5: Add Customer
          ========================================================= */}
      {isNewCustomerModalOpen && (
        <div className="modal-overlay" onClick={() => setIsNewCustomerModalOpen(false)}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "440px", padding: 0 }}
          >
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "10px",
                  background: "rgba(219, 39, 119, 0.1)",
                  color: "var(--rose-600)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="modal-title font-bold" style={{ fontSize: "1.05rem" }}>
                    إضافة عميل جديد
                  </h3>
                  <p style={{ fontSize: "0.725rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    تسجيل بيانات العميل وربطه بالسلة الحالية
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsNewCustomerModalOpen(false)} 
                className="modal-close-btn"
                title="إغلاق"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddNewCustomer} style={{ display: "flex", flexDirection: "column", flex: "1 1 auto", overflow: "hidden" }}>
              <div className="modal-body" style={{ padding: "1.25rem" }}>
                <div style={{ marginBottom: "14px" }}>
                  <label style={{ display: "block", fontSize: "0.825rem", fontWeight: "800", marginBottom: "6px", color: "var(--text-secondary)" }}>
                    اسم العميل: <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    placeholder="مثلاً: سارة محمد..."
                    className="pos-input-general"
                    autoFocus
                  />
                </div>

                <div style={{ marginBottom: "10px" }}>
                  <label style={{ display: "block", fontSize: "0.825rem", fontWeight: "800", marginBottom: "6px", color: "var(--text-secondary)" }}>
                    رقم الهاتف:
                  </label>
                  <input
                    type="tel"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    placeholder="010XXXXXXXX"
                    className="pos-input-general font-mono"
                    dir="ltr"
                    style={{ textAlign: "right" }}
                  />
                </div>
              </div>

              {/* Pinned Modal Footer */}
              <div className="modal-footer">
                <button 
                  type="button" 
                  onClick={() => setIsNewCustomerModalOpen(false)} 
                  className="btn-cancel"
                >
                  إلغاء
                </button>
                <button type="submit" className="btn-primary" style={{ padding: "9px 20px" }}>
                  <UserPlus size={16} />
                  <span>حفظ وتحديد العميل</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 6: Receipt Print / Share
          ========================================================= */}
      {isReceiptModalOpen && completedInvoice && (
        <POSReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => {
            setIsReceiptModalOpen(false);
            setCompletedInvoice(null);
          }}
          invoice={completedInvoice}
          onNewSale={() => {
            setIsReceiptModalOpen(false);
            setCompletedInvoice(null);
          }}
        />
      )}
    </div>
  );
}
