"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import POSReceiptModal from "@/components/POSReceiptModal";
import POSHeldInvoicesModal from "@/components/pos/POSHeldInvoicesModal";
import POSNewCustomerModal from "@/components/pos/POSNewCustomerModal";
import POSCloseShiftModal from "@/components/pos/POSCloseShiftModal";
import POSReturnModal from "@/components/pos/POSReturnModal";
import POSInvoiceDetailsModal from "@/components/pos/POSInvoiceDetailsModal";
import POSShiftInvoices from "@/components/pos/POSShiftInvoices";
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
  Sparkles, 
  Receipt, 
  PauseCircle, 
  FolderClock, 
  Lock, 
  TrendingUp, 
  DollarSign, 
  Coins, 
  Users 
} from "lucide-react";
import styles from "./pos.module.css";

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
  const [cartInitialized, setCartInitialized] = useState(false);
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
  const [showShiftInvoices, setShowShiftInvoices] = useState(false);
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

  // Load active POS cart from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("nelly_active_pos_cart");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setCart(parsed);
        } else if (parsed && typeof parsed === "object") {
          if (Array.isArray(parsed.cart)) setCart(parsed.cart);
          if (parsed.selectedCustomer) setSelectedCustomer(parsed.selectedCustomer);
          if (parsed.selectedSellerEmployee) setSelectedSellerEmployee(parsed.selectedSellerEmployee);
          if (parsed.discountType) setDiscountType(parsed.discountType);
          if (parsed.discountValue !== undefined) setDiscountValue(parsed.discountValue);
          if (parsed.paymentMethod) setPaymentMethod(parsed.paymentMethod);
          if (parsed.receivedCash !== undefined) setReceivedCash(parsed.receivedCash);
          if (parsed.orderNotes !== undefined) setOrderNotes(parsed.orderNotes);
        }
      }
    } catch (e) {
      console.error("Error loading active cart:", e);
    } finally {
      setCartInitialized(true);
    }
  }, []);

  // Persist active POS cart to localStorage whenever it or related fields change
  useEffect(() => {
    if (!cartInitialized) return;

    try {
      if (cart.length === 0 && !selectedCustomer && !selectedSellerEmployee && !discountValue && !orderNotes && !receivedCash) {
        localStorage.removeItem("nelly_active_pos_cart");
      } else {
        const payload = {
          cart,
          selectedCustomer,
          selectedSellerEmployee,
          discountType,
          discountValue,
          paymentMethod,
          receivedCash,
          orderNotes
        };
        localStorage.setItem("nelly_active_pos_cart", JSON.stringify(payload));
      }
    } catch (e) {
      console.error("Error saving active cart:", e);
    }
  }, [cart, selectedCustomer, selectedSellerEmployee, discountType, discountValue, paymentMethod, receivedCash, orderNotes, cartInitialized]);

  // Sync stock of items in cart when live shopProducts update
  useEffect(() => {
    if (!cartInitialized || shopProducts.length === 0 || cart.length === 0) return;

    setCart(prevCart => {
      let changed = false;
      const updated = prevCart.map(item => {
        const live = shopProducts.find(p => p.id === (item.productId || item.id));
        if (live && live.quantity !== undefined && live.quantity !== item.stock) {
          changed = true;
          return { ...item, stock: Number(live.quantity ?? 0) };
        }
        return item;
      });
      return changed ? updated : prevCart;
    });
  }, [shopProducts, cartInitialized]);

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

  // Cart Management - Strictly blocks 0 quantity items
  const addToCart = (product) => {
    if (!product) return;
    const availableStock = Number(product.quantity ?? 0);
    if (isNaN(availableStock) || availableStock <= 0) {
      showToast(`عفواً، الصنف "${product.name || 'المحدد'}" غير متوفر (الكمية: 0) ولا يمكن إضافته للسلة.`);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= availableStock) {
          showToast(`الكمية المتاحة في المحل (${availableStock}) تم وضعها بالكامل في السلة.`);
          return prev;
        }
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1, stock: availableStock } : item
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
          stock: availableStock,
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
        if (Number(exactBarcode.quantity ?? 0) <= 0) {
          showToast(`عفواً، الصنف "${exactBarcode.name}" نفد رصيده من المحل (الكمية: 0).`);
          return;
        }
        addToCart(exactBarcode);
        return;
      }

      // Name or partial match
      if (matchingShopProducts.length > 0) {
        const availableItem = matchingShopProducts.find(p => Number(p.quantity ?? 0) > 0);
        if (!availableItem) {
          showToast(`عفواً، الصنف "${matchingShopProducts[0].name}" نفد رصيده من المحل (الكمية: 0).`);
          return;
        }
        addToCart(availableItem);
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
        if (Number(item.stock ?? 0) <= 0 || nextQty > item.stock) {
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
    try {
      localStorage.removeItem("nelly_active_pos_cart");
    } catch (e) {
      console.error("Error removing active cart from localStorage:", e);
    }
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
    // Exclude any items that currently have 0 stock in the shop
    const validCart = (heldItem.cart || []).filter(item => {
      const liveProduct = shopProducts.find(p => p.id === (item.productId || item.id));
      if (liveProduct && Number(liveProduct.quantity ?? 0) <= 0) {
        return false;
      }
      return true;
    });

    if (validCart.length < (heldItem.cart || []).length) {
      showToast("تم استبعاد بعض الأصناف من الفاتورة المعلقة لنفاد رصيدها من المحل حالياً.");
    }

    setCart(validCart);
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

            {/* Top Bar Actions: Show Invoices & Close Shift */}
            <div className={styles.topActionsWrap}>
              {/* Toggle Shift Invoices Button */}
              <button 
                type="button"
                onClick={() => setShowShiftInvoices(!showShiftInvoices)}
                className={`btn-pos-toggle-invoices ${styles.toggleInvoicesBtn} ${showShiftInvoices ? styles.toggleInvoicesBtnActive : styles.toggleInvoicesBtnInactive}`}
                title={showShiftInvoices ? "العودة لسلة البيع والكاشير" : "عرض فواتير الوردية الحالية"}
              >
                {showShiftInvoices ? (
                  <>
                    <ShoppingCart size={18} />
                    <span>🛒 العودة لسلة البيع والكاشير</span>
                  </>
                ) : (
                  <>
                    <Receipt size={18} />
                    <span>📋 عرض فواتير الوردية ({shiftStats.count})</span>
                  </>
                )}
              </button>

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
              3. MAIN WORKSPACE: Full Width Cart OR Full Width Shift Invoices
              ========================================================= */}
          {!showShiftInvoices ? (
            /* -------------------------------------------------------
                FULL-WIDTH SHOPPING CART & REGISTER
                ------------------------------------------------------- */
            <div className="pos-register-container">
              
              {/* Barcode & Search Input (Full Width Prominent Top Bar) */}
              <div className="pos-scanner-container">
                <label className={`pos-scanner-label ${styles.scannerLabel}`}>
                  <Barcode size={19} color="var(--rose-600)" />
                  <span>إضافة منتج من المحل (امسح الباركود أو اكتب اسم الصنف)</span>
                </label>
                <div className="pos-scanner-input-wrap">
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="امسح الباركود أو اكتب اسم الصنف للإضافة السريعة..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setSearchDropdownOpen(true);
                    }}
                    onKeyDown={handleSearchKeyDown}
                    onFocus={() => {
                      if (searchTerm.trim()) setSearchDropdownOpen(true);
                    }}
                    className={`pos-scanner-input-field ${styles.scannerInput}`}
                  />
                  <Search size={20} className="pos-scanner-leading-icon" />

                  {/* Autocomplete Menu */}
                  {searchDropdownOpen && matchingShopProducts.length > 0 && (
                    <div ref={dropdownRef} className="pos-search-dropdown-menu">
                      {matchingShopProducts.map((p) => {
                        const stockCount = Number(p.quantity ?? 0);
                        const isOut = isNaN(stockCount) || stockCount <= 0;
                        return (
                          <div
                            key={p.id}
                            onClick={() => {
                              if (isOut) {
                                showToast(`عفواً، الصنف "${p.name}" نفد رصيده من المحل (الكمية: 0).`);
                                return;
                              }
                              addToCart(p);
                            }}
                            className={`pos-search-result-item ${isOut ? styles.outOfStockItem : ""}`}
                          >
                            <div>
                              <div className={`pos-result-name ${isOut ? styles.outOfStockText : ""}`}>
                                {p.name} {isOut && <span className={styles.outOfStockBadge}>(نفد ❌)</span>}
                              </div>
                              <div className="pos-result-meta">
                                باركود: {p.barcode || "—"} | الرصيد: <strong className={isOut ? styles.outOfStockStock : ""}>{stockCount}</strong> قطعة
                              </div>
                            </div>
                            <div className={`pos-result-price ${isOut ? styles.outOfStockText : ""}`}>
                              {formatNumber(p.sellingPrice)} ج.م
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* 2-Column Full-Width Interior Grid on Large Screens */}
              <div className={styles.registerGrid}>
                {/* RIGHT COLUMN: Cart Items & Customer Info */}
                <div className={styles.cartColumn}>
                  {/* Cart Header */}
                  <div className="pos-cart-top-bar">
                    <div className={`pos-cart-title-text ${styles.cartTitleText}`}>
                      <ShoppingCart size={20} color="var(--rose-600)" />
                      <span>سلة البيع ({cart.reduce((a, c) => a + c.quantity, 0)} قطعة)</span>
                    </div>

                    <div className="pos-cart-actions-group">
                      {/* Held Invoices */}
                      <button 
                        type="button"
                        onClick={() => setIsHeldInvoicesModalOpen(true)}
                        className={`btn-pos-held-invoices ${styles.heldInvoicesBtn}`}
                        title="استعراض الفواتير المعلقة"
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
                  <div className={`pos-cart-items-wrapper ${styles.cartItemsWrapper}`}>
                    {cart.length === 0 ? (
                      <div className={`pos-cart-empty-placeholder ${styles.cartEmptyPlaceholder}`}>
                        <ShoppingCart size={38} color="var(--text-muted)" className={styles.cartEmptyIcon} />
                        <p className={styles.cartEmptyTitle}>سلة البيع فارغة</p>
                        <span>امسح باركود المنتج أو ابحث باسمه لإضافته فوراً</span>
                      </div>
                    ) : (
                      <div className="pos-cart-items-list">
                        {cart.map((item) => {
                          const liveStock = shopProducts.find(p => p.id === (item.productId || item.id))?.quantity ?? item.stock ?? 0;
                          const remainingStockAfterCart = Math.max(0, liveStock - item.quantity);

                          return (
                            <div key={item.id} className={`pos-cart-single-row ${styles.cartSingleRow}`}>
                              <div className="pos-cart-item-details">
                                <div className={styles.itemHeaderGroup}>
                                  <span className={`pos-item-title ${styles.itemTitle}`}>{item.name}</span>
                                  <span 
                                    className={liveStock <= 3 ? styles.stockPillLow : styles.stockPillNormal}
                                    title="إجمالي الكمية المتوفرة بالمحل"
                                  >
                                    📦 رصيد المحل الكلي: <strong className="num-font" dir="ltr">{liveStock}</strong> قطعة
                                  </span>
                                </div>
                                <div className={`pos-item-subtext ${styles.itemSubtext}`}>
                                  <span>
                                    {formatNumber(item.sellingPrice)} ج.م × {item.quantity} = <strong className={styles.itemPriceTotal}>{formatNumber(item.sellingPrice * item.quantity)} ج.م</strong>
                                  </span>
                                  <span className={styles.remainingShopStock}>
                                    (المتبقي بالمحل بعد السلة: <strong className="num-font" dir="ltr">{remainingStockAfterCart}</strong> قطعة)
                                  </span>
                                </div>
                              </div>

                              <div className="pos-qty-button-group">
                                <button 
                                  onClick={() => updateQuantity(item.id, 1)}
                                  className={`btn-pos-qty ${styles.qtyBtn}`}
                                >
                                  <Plus size={15} />
                                </button>
                                <span className={`pos-qty-display-number ${styles.qtyDisplay}`}>{item.quantity}</span>
                                <button 
                                  onClick={() => updateQuantity(item.id, -1)}
                                  className={`btn-pos-qty ${styles.qtyBtn}`}
                                >
                                  <Minus size={15} />
                                </button>
                                <button 
                                  onClick={() => removeFromCart(item.id)}
                                  className={`btn-pos-delete-item ${styles.deleteItemBtn}`}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Customer Selector Row */}
                  <div className="pos-control-row">
                    <div className="pos-label-between">
                      <span className="pos-label-title">
                        <User size={15} color="var(--rose-600)" />
                        <span>العميل</span>
                      </span>
                      <button 
                        onClick={() => setIsNewCustomerModalOpen(true)}
                        className="btn-pos-quick-add-customer"
                      >
                        <UserPlus size={14} />
                        <span>+ عميل جديد</span>
                      </button>
                    </div>
                    <select
                      value={selectedCustomer?.id || ""}
                      onChange={(e) => {
                        const c = customers.find(item => item.id === e.target.value);
                        setSelectedCustomer(c || null);
                      }}
                      className={`pos-select-box ${styles.selectInput}`}
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
                        <Users size={15} color="var(--rose-600)" />
                        <span>موظف المبيعات (عمولة 1%)</span>
                      </span>
                    </div>
                    <select
                      value={selectedSellerEmployee?.id || ""}
                      onChange={(e) => {
                        const emp = employees.find(item => item.id === e.target.value);
                        setSelectedSellerEmployee(emp || null);
                      }}
                      className={`pos-select-box ${styles.selectInput}`}
                    >
                      <option value="">بدون تحديد موظف مبيعات</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} (كود: {emp.code}) - عمولة {((emp.commissionRate || 0.01) * 100).toFixed(0)}%
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* LEFT COLUMN: Payment, Discount, Net Breakdown & Checkout */}
                <div className={styles.paymentColumn}>
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
                      className={`pos-input-general ${styles.discountInput}`}
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
                          className={`btn-pos-method-choice ${paymentMethod === m ? "active" : ""} ${styles.methodBtn}`}
                        >
                          {m === "نقدي" && <Banknote size={15} />}
                          {m === "فيزا" && <CreditCard size={15} />}
                          {m === "تحويل" && <Smartphone size={15} />}
                          {m === "آجل" && <Clock size={15} />}
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
                      className={`pos-input-general font-mono font-bold text-base ${styles.receivedInput}`}
                    />

                    {/* Instant visual indicator for remaining / change right below input */}
                    {cartFinalTotal > 0 && receivedCash !== "" && parsedReceivedCash > 0 && (
                      <div className={`pos-received-feedback ${changeForCustomer > 0 ? "change-mode" : remainingDue > 0 ? "debt-mode" : "exact-mode"}`}>
                        {changeForCustomer > 0 && (
                          <div className={styles.receivedFeedbackRow}>
                            <span className={styles.feedbackLabel}>
                              <Coins size={16} />
                              <span>المتبقي للعميل (الباقي / الفكة المسترجعة):</span>
                            </span>
                            <span className={styles.feedbackValue}>
                              {formatNumber(changeForCustomer)} ج.م
                            </span>
                          </div>
                        )}

                        {remainingDue > 0 && (
                          <div className={styles.receivedFeedbackRow}>
                            <span className={styles.feedbackLabel}>
                              <AlertCircle size={16} />
                              <span>المتبقي على العميل (المطلوب سداده):</span>
                            </span>
                            <span className={styles.feedbackValue}>
                              {formatNumber(remainingDue)} ج.م
                            </span>
                          </div>
                        )}

                        {parsedReceivedCash === cartFinalTotal && (
                          <div className={styles.receivedFeedbackRow}>
                            <span className={styles.feedbackLabel}>
                              <CheckCircle2 size={16} />
                              <span>تم استلام المبلغ بالكامل بالضبط:</span>
                            </span>
                            <span className={styles.feedbackExactValue}>
                              المتبقي: 0 ج.م
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Net Bill Breakdown & Total */}
                  <div className={`pos-net-summary-panel ${styles.netSummaryPanel}`}>
                    <div className="pos-calc-row">
                      <span>إجمالي سعر الأصناف:</span>
                      <span className={`font-mono font-bold ${styles.subtotalVal}`}>{formatNumber(cartSubtotal)} ج.م</span>
                    </div>

                    {calculatedDiscount > 0 && (
                      <div className="pos-calc-row text-red-500">
                        <span>الخصم المطبق:</span>
                        <span className={`font-mono font-bold ${styles.discountVal}`}>-{formatNumber(calculatedDiscount)} ج.م</span>
                      </div>
                    )}

                    <div className="pos-calc-row pos-row-grand-total">
                      <span className="font-bold text-sm text-[var(--text-primary)]">الصافي المطلوب:</span>
                      <span className={`pos-grand-price-text ${styles.grandTotalVal}`}>
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
                    className={`btn-pos-submit-sale ${styles.submitSaleBtn}`}
                  >
                    {isSubmitting ? (
                      <span>جاري إصدار الفاتورة...</span>
                    ) : (
                      <>
                        <CheckCircle2 size={22} />
                        <span>إتمام عملية البيع وطباعة الفاتورة ({formatNumber(cartFinalTotal)} ج.م)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <POSShiftInvoices
              show={showShiftInvoices}
              onClose={() => setShowShiftInvoices(false)}
              invoiceSearchQuery={invoiceSearchQuery}
              setInvoiceSearchQuery={setInvoiceSearchQuery}
              paymentFilter={paymentFilter}
              setPaymentFilter={setPaymentFilter}
              loading={loading}
              currentShiftSales={currentShiftSales}
              filteredShiftSales={filteredShiftSales}
              onInspectInvoice={(inv) => setSelectedInvoiceForDetails(inv)}
              onReturnFullInvoice={handleReturnFullInvoice}
            />
          )}
        </div>
      </div>

      {/* MODAL 1: Invoice Items Details & Return */}
      <POSInvoiceDetailsModal
        invoice={selectedInvoiceForDetails}
        onClose={() => setSelectedInvoiceForDetails(null)}
        onReturnItem={handleReturnItem}
        onReturnFullInvoice={handleReturnFullInvoice}
        onPrintInvoice={(inv) => {
          setCompletedInvoice(inv);
          setIsReceiptModalOpen(true);
        }}
      />

      {/* MODAL 2: Return Single Item */}
      <POSReturnModal
        itemToReturn={itemToReturn}
        onClose={() => setItemToReturn(null)}
        returnQuantity={returnQuantity}
        setReturnQuantity={setReturnQuantity}
        returnReason={returnReason}
        setReturnReason={setReturnReason}
        isReturning={isReturning}
        onConfirmReturn={handleConfirmReturnItem}
      />

      {/* MODAL 3: Close Shift Confirmation */}
      <POSCloseShiftModal
        isOpen={isCloseShiftModalOpen}
        onClose={() => setIsCloseShiftModalOpen(false)}
        shiftStats={shiftStats}
        shiftNotes={shiftNotes}
        setShiftNotes={setShiftNotes}
        isClosingShift={isClosingShift}
        onConfirmCloseShift={handleConfirmCloseShift}
      />

      {/* MODAL 4: Suspended Invoices */}
      <POSHeldInvoicesModal
        isOpen={isHeldInvoicesModalOpen}
        onClose={() => setIsHeldInvoicesModalOpen(false)}
        heldInvoices={heldInvoices}
        onRestore={handleRestoreHeldInvoice}
        onDelete={handleDeleteHeldInvoice}
      />

      {/* MODAL 5: Add Customer */}
      <POSNewCustomerModal
        isOpen={isNewCustomerModalOpen}
        onClose={() => setIsNewCustomerModalOpen(false)}
        newCustomerName={newCustomerName}
        setNewCustomerName={setNewCustomerName}
        newCustomerPhone={newCustomerPhone}
        setNewCustomerPhone={setNewCustomerPhone}
        onSubmit={handleAddNewCustomer}
      />

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
