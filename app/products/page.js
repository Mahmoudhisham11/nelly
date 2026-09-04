"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import ProductModal, { CATEGORIES } from "@/components/ProductModal";
import BarcodeModal from "@/components/BarcodeModal";
import PrintInventoryModal from "@/components/PrintInventoryModal";
import PermissionDeniedModal from "@/components/PermissionDeniedModal";
import TransferModal from "@/components/TransferModal";
import CustomSelect from "@/components/CustomSelect";
import { 
  subscribeToProducts, 
  addProduct, 
  updateProduct, 
  deleteProduct 
} from "@/lib/productsService";
import { transferFromWarehouseToShop } from "@/lib/shopService";
import { formatNumber } from "@/lib/utils";
import { 
  Plus, 
  Search, 
  Download, 
  Trash2, 
  Edit3, 
  Barcode, 
  Boxes, 
  PackagePlus,
  RotateCcw,
  Lock,
  Printer,
  Layers,
  DollarSign,
  ArrowLeftRight,
  Store
} from "lucide-react";

export default function ProductsPage() {
  const router = useRouter();
  const { user, isAdmin, loading: authLoading } = useAuth();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [barcodeProduct, setBarcodeProduct] = useState(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [productToTransfer, setProductToTransfer] = useState(null);
  const [permissionDeniedAction, setPermissionDeniedAction] = useState(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };


  // Authentication check
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Firestore real-time listener
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToProducts((data) => {
      setProducts(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  // Options for custom dropdowns
  const categoryOptions = useMemo(() => [
    { value: "all", label: "جميع الأقسام" },
    ...CATEGORIES.map(c => ({ value: c, label: c }))
  ], []);

  const statusOptions = [
    { value: "all", label: "كل الحالات" },
    { value: "in-stock", label: "متوفر بالمخزن" },
    { value: "low-stock", label: "مخزون منخفض" },
    { value: "out-of-stock", label: "منتهي من المخزن" }
  ];

  const sortOptions = [
    { value: "newest", label: "الترتيب: الأحدث أولاً" },
    { value: "name", label: "الترتيب: اسم الصنف (أ-ي)" },
    { value: "barcode", label: "الترتيب: الباركود" },
    { value: "qty-desc", label: "الكمية: من الأعلى للأقل" },
    { value: "qty-asc", label: "الكمية: من الأقل للأعلى" },
    ...(isAdmin ? [
      { value: "price-desc", label: "سعر الجملة: الأعلى أولاً" },
      { value: "price-asc", label: "سعر الجملة: الأقل أولاً" }
    ] : [])
  ];

  // Filtered and Sorted Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const barcodeStr = (p.barcode || p.code || "").toLowerCase();
      const nameStr = (p.name || "").toLowerCase();
      const brandStr = (p.brand || "").toLowerCase();

      const matchesSearch = 
        !q || 
        barcodeStr.includes(q) ||
        nameStr.includes(q) ||
        brandStr.includes(q);

      const matchesCat = selectedCategory === "all" || p.category === selectedCategory;

      const qty = Number(p.quantity) || 0;
      const minThresh = Number(p.minThreshold) || 5;
      let matchesStatus = true;
      if (selectedStatus === "in-stock") matchesStatus = qty > minThresh;
      if (selectedStatus === "low-stock") matchesStatus = qty > 0 && qty <= minThresh;
      if (selectedStatus === "out-of-stock") matchesStatus = qty === 0;

      return matchesSearch && matchesCat && matchesStatus;
    }).sort((a, b) => {
      if (sortBy === "name") return (a.name || "").localeCompare(b.name || "", "ar");
      if (sortBy === "barcode") return (a.barcode || a.code || "").localeCompare(b.barcode || b.code || "");
      if (sortBy === "qty-desc") return (b.quantity || 0) - (a.quantity || 0);
      if (sortBy === "qty-asc") return (a.quantity || 0) - (b.quantity || 0);
      if (sortBy === "price-desc") return (b.wholesalePrice || 0) - (a.wholesalePrice || 0);
      if (sortBy === "price-asc") return (a.wholesalePrice || 0) - (b.wholesalePrice || 0);
      return 0;
    });
  }, [products, searchQuery, selectedCategory, selectedStatus, sortBy]);

  // Calculate filtered totals
  const totalFilteredCount = filteredProducts.length;
  const totalFilteredQty = filteredProducts.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
  const totalFilteredWholesale = filteredProducts.reduce(
    (sum, p) => sum + (Number(p.quantity) || 0) * (Number(p.wholesalePrice) || 0),
    0
  );

  // Protected Actions
  const handleOpenAddModal = () => {
    if (!isAdmin) {
      setPermissionDeniedAction("إضافة صنف جديد للمخزن");
      return;
    }
    setEditingProduct(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (product) => {
    if (!isAdmin) {
      setPermissionDeniedAction("تعديل بيانات وكمية الصنف");
      return;
    }
    setEditingProduct(product);
    setIsAddModalOpen(true);
  };

  const handleOpenDeleteModal = (product) => {
    if (!isAdmin) {
      setPermissionDeniedAction("حذف الصنف من المخزن");
      return;
    }
    setProductToDelete(product);
  };

  const handleSaveProduct = async (productData, id) => {
    if (!isAdmin) return;
    if (id) {
      await updateProduct(id, productData);
    } else {
      await addProduct(productData);
    }
  };

  const handleConfirmTransfer = async (product, quantity) => {
    try {
      await transferFromWarehouseToShop(product, quantity, user);
      showToast(`تم تحويل ${quantity} قطعة من "${product.name}" إلى المحل بنجاح 🏪`);
    } catch (err) {
      alert(err.message || "حدث خطأ أثناء تحويل البضاعة.");
    }
  };

  const confirmDelete = async () => {

    if (!isAdmin || !productToDelete) return;
    await deleteProduct(productToDelete.id);
    setProductToDelete(null);
  };

  // Export to CSV
  const exportToCSV = () => {
    if (filteredProducts.length === 0) return;
    const headers = isAdmin 
      ? ["الباركود", "اسم الصنف", "القسم", "الكمية بالمخزن", "سعر الجملة (ج.م)", "إجمالي قيمة الجملة (ج.م)"]
      : ["الباركود", "اسم الصنف", "القسم", "الكمية بالمخزن", "حالة المخزون"];

    const rows = filteredProducts.map((p, idx) => {
      const barcodeVal = p.barcode || p.code || `622100100${idx + 1}`;
      if (isAdmin) {
        return [
          `"${barcodeVal}"`,
          `"${p.name || ''}"`,
          `"${p.category || ''}"`,
          p.quantity || 0,
          p.wholesalePrice || 0,
          (Number(p.quantity) || 0) * (Number(p.wholesalePrice) || 0)
        ];
      } else {
        const qty = Number(p.quantity) || 0;
        const status = qty === 0 ? "نفد" : qty <= (p.minThreshold || 5) ? "منخفض" : "متوفر";
        return [
          `"${barcodeVal}"`,
          `"${p.name || ''}"`,
          `"${p.category || ''}"`,
          qty,
          `"${status}"`
        ];
      }
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `تقرير_مخزن_نيللي_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (authLoading || (!user && loading)) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--text-secondary)", fontWeight: "700" }}>جاري تحميل سجل بضاعة المخزن...</p>
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
          onOpenAddModal={handleOpenAddModal}
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
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h2 style={{ fontSize: "1.6rem", fontWeight: "900", color: "#1e1322" }}>المخزن</h2>
              <span className="badge badge-code" style={{ fontSize: "0.85rem" }}>
                <span className="num-font" dir="ltr">{formatNumber(products.length)}</span> صنف مسجل
              </span>
            </div>
            <p style={{ color: "#5a4663", fontSize: "0.88rem", marginTop: "4px", fontWeight: "600" }}>
              إدارة وجرد بضاعة المخزن الرئيسي، وتعديل الأصناف، والتحويل إلى المحل
            </p>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <button 
              onClick={() => setIsPrintModalOpen(true)} 
              className="btn-secondary" 
              title="معاينة وطباعة كشف جرد المخزن"
              style={{ background: "#ffffff" }}
            >
              <Printer size={16} color="#db2777" />
              طباعة كشف الجرد
            </button>
            <button onClick={exportToCSV} className="btn-secondary" title="تصدير إلى ملف إكسل CSV" style={{ background: "#ffffff" }}>
              <Download size={16} color="#059669" />
              تصدير CSV
            </button>
            <button 
              onClick={handleOpenAddModal} 
              className="btn-primary"
            >
              <PackagePlus size={18} />
              إضافة صنف جديد
            </button>
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="glass-panel" style={{ padding: "18px 20px", marginBottom: "24px", background: "#ffffff", border: "1.5px solid #ebdbe6" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "12px",
            alignItems: "center"
          }}>
            {/* Search Input for Barcode or Name */}
            <div style={{ position: "relative" }}>
              <input 
                type="text"
                className="form-input"
                placeholder="ابحث بباركود الصنف (Barcode)، اسم الصنف، أو الماركة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingRight: "40px", fontWeight: "600" }}
              />
              <Search 
                size={18} 
                color="#db2777" 
                style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} 
              />
            </div>

            {/* Custom Category Filter */}
            <div>
              <CustomSelect 
                options={categoryOptions}
                value={selectedCategory}
                onChange={(cat) => setSelectedCategory(cat)}
              />
            </div>

            {/* Custom Stock Status Filter */}
            <div>
              <CustomSelect 
                options={statusOptions}
                value={selectedStatus}
                onChange={(stat) => setSelectedStatus(stat)}
              />
            </div>

            {/* Custom Sort Filter */}
            <div>
              <CustomSelect 
                options={sortOptions}
                value={sortBy}
                onChange={(sb) => setSortBy(sb)}
              />
            </div>

            {/* Reset Filters */}
            {(searchQuery || selectedCategory !== "all" || selectedStatus !== "all" || sortBy !== "newest") && (
              <button 
                onClick={resetFilters} 
                className="btn-secondary"
                title="إعادة ضبط الفلاتر"
                style={{ padding: "11px" }}
              >
                <RotateCcw size={16} />
              </button>
            )}
          </div>

          {/* 3 Rich Stat Cards for Summary Data */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "14px",
            marginTop: "18px",
            paddingTop: "16px",
            borderTop: "1px solid #fce7f3"
          }}>
            {/* Card 1: معروض */}
            <div style={{
              background: "linear-gradient(135deg, #ffffff 0%, #fdf2f8 100%)",
              border: "1.5px solid #fbcfe8",
              borderRadius: "14px",
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <div>
                <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: "700" }}>الأصناف المعروضة</span>
                <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginTop: "2px" }}>
                  <span className="num-font" dir="ltr" style={{ fontSize: "1.5rem", fontWeight: "900", color: "#1e1322" }}>
                    {formatNumber(totalFilteredCount)}
                  </span>
                  <span style={{ fontSize: "0.8rem", color: "#5a4663", fontWeight: "700" }}>صنف</span>
                </div>
              </div>
              <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "#fce7f3", color: "#db2777", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Boxes size={20} />
              </div>
            </div>

            {/* Card 2: إجمالي القطع */}
            <div style={{
              background: "linear-gradient(135deg, #ffffff 0%, #fff7ed 100%)",
              border: "1.5px solid #fed7aa",
              borderRadius: "14px",
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <div>
                <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: "700" }}>إجمالي عدد القطع بالمخزن</span>
                <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginTop: "2px" }}>
                  <span className="num-font" dir="ltr" style={{ fontSize: "1.5rem", fontWeight: "900", color: "#c2410c" }}>
                    {formatNumber(totalFilteredQty)}
                  </span>
                  <span style={{ fontSize: "0.8rem", color: "#c2410c", fontWeight: "700" }}>قطعة</span>
                </div>
              </div>
              <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "#ffedd5", color: "#ea580c", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Layers size={20} />
              </div>
            </div>

            {/* Card 3: القيمة بسعر الجملة */}
            <div style={{
              background: "linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)",
              border: "1.5px solid #e9d5ff",
              borderRadius: "14px",
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <div>
                <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: "700" }}>القيمة بسعر الجملة</span>
                {isAdmin ? (
                  <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginTop: "2px" }}>
                    <span className="num-font" dir="ltr" style={{ fontSize: "1.5rem", fontWeight: "900", color: "#7e22ce" }}>
                      {formatNumber(totalFilteredWholesale)}
                    </span>
                    <span style={{ fontSize: "0.8rem", color: "#7e22ce", fontWeight: "700" }}>ج.م</span>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#6b7280", marginTop: "4px", fontSize: "0.82rem", fontWeight: "700" }}>
                    <Lock size={13} /> خاص بالمسؤول
                  </div>
                )}
              </div>
              <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "#f3e8ff", color: "#9333ea", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <DollarSign size={20} />
              </div>
            </div>
          </div>
        </div>


        {/* Screen Products Table */}
        <div className="table-container">
          {filteredProducts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <Boxes size={48} color="#db2777" style={{ margin: "0 auto 12px", opacity: 0.8 }} />
              <h3 style={{ fontSize: "1.2rem", marginBottom: "6px", color: "#1e1322", fontWeight: "800" }}>لم يتم العثور على أي صنف</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: "18px", fontWeight: "600" }}>
                {searchQuery ? `لا يوجد صنف يطابق الباركود أو الاسم "${searchQuery}"` : "قم بتسجيل صنف جديد بالمخزن"}
              </p>
              <button 
                onClick={handleOpenAddModal}
                className="btn-primary"
              >
                <Plus size={16} />
                إضافة صنف جديد
              </button>
            </div>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: "160px", whiteSpace: "nowrap" }}>الباركود</th>
                  <th style={{ whiteSpace: "nowrap" }}>اسم الصنف والماركة</th>
                  <th style={{ whiteSpace: "nowrap" }}>القسم</th>
                  <th style={{ textAlign: "center", whiteSpace: "nowrap" }}>الكمية بالمخزن</th>
                  <th style={{ whiteSpace: "nowrap" }}>سعر الجملة</th>
                  <th style={{ whiteSpace: "nowrap" }}>إجمالي قيمة الصنف</th>
                  <th style={{ whiteSpace: "nowrap" }}>حالة المخزون</th>
                  <th style={{ textAlign: "center", whiteSpace: "nowrap" }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p, idx) => {
                  const qty = Number(p.quantity) || 0;
                  const wholesale = Number(p.wholesalePrice) || 0;
                  const totalVal = qty * wholesale;
                  const minThresh = Number(p.minThreshold) || 5;
                  const isLow = qty <= minThresh && qty > 0;
                  const isOut = qty === 0;
                  const barcodeVal = p.barcode || p.code || `622100100${idx + 1}`;

                  return (
                    <tr key={p.id}>
                      {/* Product Barcode - Prominent and High-Contrast */}
                      <td>
                        <span 
                          className="num-font" 
                          dir="ltr"
                          style={{
                            fontFamily: "monospace",
                            fontSize: "0.95rem",
                            fontWeight: "900",
                            color: "#831843",
                            background: "#fce7f3",
                            padding: "5px 12px",
                            borderRadius: "8px",
                            border: "1.5px solid #f472b6",
                            display: "inline-block",
                            letterSpacing: "0.5px"
                          }}
                        >
                          {barcodeVal}
                        </span>
                      </td>

                      {/* Product Name & Brand */}
                      <td>
                        <div style={{ fontWeight: "800", color: "#1e1322", whiteSpace: "nowrap" }}>
                          {p.name}
                        </div>
                        {p.brand && (
                          <div style={{ fontSize: "0.75rem", color: "#db2777", fontWeight: "700", marginTop: "2px" }}>
                            {p.brand}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td>
                        <span className="badge badge-category">
                          {p.category || "عام"}
                        </span>
                      </td>

                      {/* Quantity Display Only (NO +/- buttons) */}
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                          <span 
                            className="num-font" 
                            dir="ltr"
                            style={{ 
                              fontSize: "1.2rem", 
                              fontWeight: "900", 
                              color: isOut ? "#dc2626" : isLow ? "#9d174d" : "#1e1322" 
                            }}
                          >
                            {formatNumber(qty)}
                          </span>
                          <span style={{ fontSize: "0.82rem", color: "#5a4663", fontWeight: "700" }}>قطعة</span>
                        </div>
                      </td>

                      {/* Wholesale Price (Protected for Admin Only) */}
                      <td>
                        {isAdmin ? (
                          <strong style={{ color: "#9d174d", fontSize: "1.02rem" }}>
                            <span className="num-font" dir="ltr">{formatNumber(wholesale)}</span> ج.م
                          </strong>
                        ) : (
                          <span style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "0.78rem",
                            color: "#6b7280",
                            background: "#f3f4f6",
                            padding: "4px 8px",
                            borderRadius: "6px",
                            border: "1px solid #e5e7eb",
                            fontWeight: "700"
                          }}>
                            <Lock size={12} />
                            خاص بالمسؤول
                          </span>
                        )}
                      </td>



                      {/* Total Value (Protected for Admin Only) */}
                      <td>
                        {isAdmin ? (
                          <strong style={{ color: "#047857", fontSize: "1.02rem" }}>
                            <span className="num-font" dir="ltr">{formatNumber(totalVal)}</span> ج.م
                          </strong>
                        ) : (
                          <span style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "0.78rem",
                            color: "#6b7280",
                            background: "#f3f4f6",
                            padding: "4px 8px",
                            borderRadius: "6px",
                            border: "1px solid #e5e7eb",
                            fontWeight: "700"
                          }}>
                            <Lock size={12} />
                            خاص بالمسؤول
                          </span>
                        )}
                      </td>

                      {/* Stock Status Badge */}
                      <td>
                        {isOut ? (
                          <span className="badge badge-out-of-stock">نفد تماماً</span>
                        ) : isLow ? (
                          <span className="badge badge-low-stock">مخزون قليل (<span className="num-font" dir="ltr">{formatNumber(qty)}</span>)</span>
                        ) : (
                          <span className="badge badge-in-stock">متوفر (<span className="num-font" dir="ltr">{formatNumber(qty)}</span>)</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", flexWrap: "nowrap" }}>
                          <button 
                            onClick={() => setProductToTransfer(p)}
                            className="btn-secondary"
                            style={{ padding: "6px 10px", fontSize: "0.8rem", color: "#15803d", borderColor: "#86efac", background: "#f0fdf4" }}
                            title="تحويل كمية من الصنف إلى المحل"
                          >
                            <Store size={15} color="#16a34a" />
                            تحويل للمحل
                          </button>
                          <button 
                            onClick={() => setBarcodeProduct(p)}
                            className="btn-secondary"
                            style={{ padding: "6px 10px", fontSize: "0.8rem" }}
                            title="طباعة باركود"
                          >
                            <Barcode size={15} color="#db2777" />
                            باركود
                          </button>
                          <button 
                            onClick={() => handleOpenEditModal(p)}
                            className="btn-primary"
                            style={{ padding: "6px 12px", fontSize: "0.82rem" }}
                            title="تعديل بيانات وكمية الصنف"
                          >
                            <Edit3 size={15} />
                            تعديل
                          </button>
                          <button 
                            onClick={() => handleOpenDeleteModal(p)}
                            className="btn-danger"
                            style={{ padding: "6px 8px" }}
                            title="حذف الصنف"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Toast Alert */}
      {toastMessage && (
        <div style={{
          position: "fixed",
          bottom: "24px",
          left: "24px",
          background: "#111827",
          color: "#ffffff",
          padding: "12px 20px",
          borderRadius: "14px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "0.92rem",
          fontWeight: "700"
        }}>
          <Store size={18} color="#4ade80" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Transfer Modal */}
      <TransferModal 
        isOpen={!!productToTransfer}
        onClose={() => setProductToTransfer(null)}
        product={productToTransfer}
        onConfirmTransfer={handleConfirmTransfer}
        direction="warehouse_to_shop"
      />

      {/* Modals */}
      <ProductModal 
        isOpen={isAddModalOpen}
        onClose={() => { setIsAddModalOpen(false); setEditingProduct(null); }}
        onSave={handleSaveProduct}
        productToEdit={editingProduct}
        hideSellingPrice={true}
      />


      <BarcodeModal 
        isOpen={!!barcodeProduct}
        onClose={() => setBarcodeProduct(null)}
        product={barcodeProduct}
      />

      {/* Permission Denied Popup */}
      <PermissionDeniedModal 
        isOpen={!!permissionDeniedAction}
        onClose={() => setPermissionDeniedAction(null)}
        actionName={permissionDeniedAction}
      />

      {/* Delete Confirmation Modal (Admin only) */}
      {productToDelete && (
        <div className="modal-overlay" onClick={() => setProductToDelete(null)}>
          <div 
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "440px", padding: "26px", textAlign: "center", background: "#ffffff" }}
          >
            <div style={{
              width: "50px",
              height: "50px",
              borderRadius: "50%",
              background: "#fee2e2",
              color: "#dc2626",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px"
            }}>
              <Trash2 size={26} />
            </div>

            <h3 style={{ fontSize: "1.2rem", marginBottom: "8px", color: "#1e1322", fontWeight: "800" }}>تأكيد حذف الصنف من المخزن</h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "20px", fontWeight: "600" }}>
              هل أنت متأكد من حذف الصنف <strong style={{ color: "#1e1322" }}>"{productToDelete.name}"</strong> (باركود: {productToDelete.barcode})؟ لن تتمكن من التراجع عن هذا الإجراء.
            </p>

            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button 
                onClick={() => setProductToDelete(null)}
                className="btn-secondary"
                style={{ padding: "10px 20px" }}
              >
                إلغاء
              </button>
              <button 
                onClick={confirmDelete}
                className="btn-danger"
                style={{ padding: "10px 20px", background: "#dc2626", color: "#fff", border: "none" }}
              >
                نعم، احذف الصنف
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Print Inventory Modal */}
      <PrintInventoryModal 
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        products={filteredProducts}
      />
      </div>
    </div>
  );
}


