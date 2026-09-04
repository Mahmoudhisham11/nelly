"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import ProductModal, { CATEGORIES } from "@/components/ProductModal";
import BarcodeModal from "@/components/BarcodeModal";
import PrintInventoryModal from "@/components/PrintInventoryModal";
import TransferModal from "@/components/TransferModal";
import PermissionDeniedModal from "@/components/PermissionDeniedModal";
import CustomSelect from "@/components/CustomSelect";
import { 
  subscribeToShopProducts, 
  addShopProduct, 
  updateShopProduct, 
  deleteShopProduct,
  transferFromShopToWarehouse
} from "@/lib/shopService";
import { formatNumber, roundCurrency } from "@/lib/utils";
import { 
  Store, 
  Plus, 
  Search, 
  Download, 
  Printer,
  Trash2, 
  Edit3, 
  Barcode, 
  Boxes, 
  Layers, 
  DollarSign, 
  RotateCcw, 
  Lock, 
  ArrowLeftRight, 
  ShoppingBag,
  Sparkles,
  TrendingUp,
  PackageCheck
} from "lucide-react";

export default function ShopPage() {
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
  const [productToReturn, setProductToReturn] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);
  const [permissionDeniedAction, setPermissionDeniedAction] = useState(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToShopProducts((data) => {
      setProducts(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  // Categories list for select
  const categoryOptions = useMemo(() => {
    return [
      { id: "all", label: "جميع الأقسام" },
      ...CATEGORIES.map(c => ({ id: c, label: c }))
    ];
  }, []);

  const statusOptions = [
    { id: "all", label: "كل الحالات" },
    { id: "in_stock", label: "متوفر بالمحل" },
    { id: "low_stock", label: "مخزون قليل ⚠️" },
    { id: "out_of_stock", label: "نفد من المحل ❌" }
  ];

  const sortOptions = [
    { id: "newest", label: "الترتيب: الأحدث أولاً" },
    { id: "oldest", label: "الترتيب: الأقدم أولاً" },
    { id: "qty_high", label: "الكمية: من الأعلى للأقل" },
    { id: "qty_low", label: "الكمية: من الأقل للأعلى" },
    { id: "price_high", label: "سعر البيع: من الأعلى للأقل" },
    { id: "price_low", label: "سعر البيع: من الأقل للأعلى" }
  ];

  // Filtering & Sorting
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const q = searchQuery.toLowerCase().trim();
        const barcodeMatch = (p.barcode || "").toLowerCase().includes(q);
        const nameMatch = (p.name || "").toLowerCase().includes(q);
        const brandMatch = (p.brand || "").toLowerCase().includes(q);
        const matchesSearch = !q || barcodeMatch || nameMatch || brandMatch;

        const matchesCat = selectedCategory === "all" || p.category === selectedCategory;

        const qty = Number(p.quantity) || 0;
        const minThresh = Number(p.minThreshold) || 3;
        let matchesStatus = true;
        if (selectedStatus === "in_stock") matchesStatus = qty > minThresh;
        else if (selectedStatus === "low_stock") matchesStatus = qty <= minThresh && qty > 0;
        else if (selectedStatus === "out_of_stock") matchesStatus = qty === 0;

        return matchesSearch && matchesCat && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "newest") return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
        if (sortBy === "oldest") return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
        if (sortBy === "qty_high") return (b.quantity || 0) - (a.quantity || 0);
        if (sortBy === "qty_low") return (a.quantity || 0) - (b.quantity || 0);
        if (sortBy === "price_high") return (b.sellingPrice || 0) - (a.sellingPrice || 0);
        if (sortBy === "price_low") return (a.sellingPrice || 0) - (b.sellingPrice || 0);
        return 0;
      });
  }, [products, searchQuery, selectedCategory, selectedStatus, sortBy]);

  // Totals
  const totalFilteredCount = filteredProducts.length;
  const totalFilteredQty = filteredProducts.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
  const totalRetailVal = roundCurrency(
    filteredProducts.reduce((acc, curr) => acc + ((Number(curr.quantity) || 0) * (Number(curr.sellingPrice) || 0)), 0)
  );
  const totalWholesaleVal = roundCurrency(
    filteredProducts.reduce((acc, curr) => acc + ((Number(curr.quantity) || 0) * (Number(curr.wholesalePrice) || 0)), 0)
  );

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedStatus("all");
    setSortBy("newest");
  };

  // Actions
  const handleOpenAddModal = () => {
    if (!isAdmin) {
      setPermissionDeniedAction("إضافة صنف جديد للمحل");
      return;
    }
    setEditingProduct(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (product) => {
    if (!isAdmin) {
      setPermissionDeniedAction("تعديل بيانات الصنف بالمحل");
      return;
    }
    setEditingProduct(product);
    setIsAddModalOpen(true);
  };

  const handleSaveProduct = async (productData, id) => {
    if (id) {
      await updateShopProduct(id, productData);
      showToast("تم تحديث بيانات الصنف بالمحل بنجاح.");
    } else {
      await addShopProduct(productData);
      showToast("تمت إضافة الصنف إلى بضاعة المحل بنجاح.");
    }
  };

  const handleConfirmReturnToWarehouse = async (product, quantity) => {
    try {
      await transferFromShopToWarehouse(product, quantity, user);
      showToast(`تم إرجاع ${quantity} قطعة من "${product.name}" إلى المخزن بنجاح 📦`);
    } catch (err) {
      alert(err.message || "حدث خطأ أثناء إرجاع البضاعة للمخزن.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    try {
      await deleteShopProduct(productToDelete.id);
      showToast("تم حذف الصنف من المحل.");
      setProductToDelete(null);
    } catch (err) {
      alert("حدث خطأ أثناء الحذف.");
    }
  };

  // Export CSV
  const exportToCSV = () => {
    if (filteredProducts.length === 0) return;
    const headers = ["الباركود", "اسم الصنف", "القسم", "الكمية بالمحل", "سعر البيع (قطاعي)", "سعر الجملة"];
    const rows = filteredProducts.map((p) => [
      `"${p.barcode || ''}"`,
      `"${p.name || ''}"`,
      `"${p.category || ''}"`,
      p.quantity || 0,
      p.sellingPrice || 0,
      p.wholesalePrice || 0
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `بضاعة_محل_نيللي_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
          {/* Toast Notification */}
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
              <Store size={18} color="#f472b6" />
              <span>{toastMessage}</span>
            </div>
          )}

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
                  <Store size={22} />
                </div>
                <h2 style={{ fontSize: "1.6rem", fontWeight: "900", color: "#1e1322" }}>المحل</h2>
                <span className="badge badge-code" style={{ fontSize: "0.85rem" }}>
                  <span className="num-font" dir="ltr">{formatNumber(products.length)}</span> صنف معروض
                </span>
              </div>
              <p style={{ color: "#5a4663", fontSize: "0.88rem", marginTop: "4px", fontWeight: "600" }}>
                جرد ومتابعة بضاعة المعرض والمحل التجاري، واستقبال البضاعة المحولة من المخزن
              </p>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <button 
                onClick={() => setIsPrintModalOpen(true)} 
                className="btn-secondary" 
                title="معاينة وطباعة كشف جرد بضاعة المحل" 
                style={{ background: "#ffffff" }}
              >
                <Printer size={16} color="#db2777" />
                طباعة كشف المحل
              </button>
              <button onClick={exportToCSV} className="btn-secondary" title="تصدير إلى ملف إكسل CSV" style={{ background: "#ffffff" }}>
                <Download size={16} color="#059669" />
                تصدير CSV
              </button>
              <button onClick={handleOpenAddModal} className="btn-primary">
                <Plus size={18} />
                إضافة صنف للمحل
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
                  placeholder="ابحث بالباركود، اسم الصنف، أو الماركة بالمحل..."
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

              {/* Category Filter */}
              <div>
                <CustomSelect 
                  options={categoryOptions}
                  value={selectedCategory}
                  onChange={(cat) => setSelectedCategory(cat)}
                />
              </div>

              {/* Stock Status Filter */}
              <div>
                <CustomSelect 
                  options={statusOptions}
                  value={selectedStatus}
                  onChange={(stat) => setSelectedStatus(stat)}
                />
              </div>

              {/* Sort Filter */}
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

            {/* 3 Rich Stat Cards for Shop Summary Data */}
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
                  <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: "700" }}>أصناف المحل المعروضة</span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginTop: "2px" }}>
                    <span className="num-font" dir="ltr" style={{ fontSize: "1.5rem", fontWeight: "900", color: "#1e1322" }}>
                      {formatNumber(totalFilteredCount)}
                    </span>
                    <span style={{ fontSize: "0.8rem", color: "#5a4663", fontWeight: "700" }}>صنف</span>
                  </div>
                </div>
                <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "#fce7f3", color: "#db2777", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Store size={20} />
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
                  <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: "700" }}>إجمالي قطع المحل</span>
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

              {/* Card 3: إجمالي القيمة بسعر البيع (قطاعي) */}
              <div style={{
                background: "linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)",
                border: "1.5px solid #bbf7d0",
                borderRadius: "14px",
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}>
                <div>
                  <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: "700" }}>إجمالي القيمة (سعر البيع)</span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginTop: "2px" }}>
                    <span className="num-font" dir="ltr" style={{ fontSize: "1.5rem", fontWeight: "900", color: "#15803d" }}>
                      {formatNumber(totalRetailVal)}
                    </span>
                    <span style={{ fontSize: "0.8rem", color: "#15803d", fontWeight: "700" }}>ج.م</span>
                  </div>
                </div>
                <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "#dcfce7", color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <DollarSign size={20} />
                </div>
              </div>
            </div>
          </div>

          {/* Shop Products Table */}
          <div className="table-container">
            {filteredProducts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <Store size={48} color="#db2777" style={{ margin: "0 auto 12px", opacity: 0.8 }} />
                <h3 style={{ fontSize: "1.2rem", marginBottom: "6px", color: "#1e1322", fontWeight: "800" }}>لا توجد بضاعة مسجلة بالمحل حالياً</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: "18px", fontWeight: "600" }}>
                  يمكنك تحويل بضاعة من المخزن إلى المحل أو إضافة صنف جديد هنا مباشرة
                </p>
                <button onClick={handleOpenAddModal} className="btn-primary">
                  <Plus size={16} />
                  إضافة صنف جديد بالمحل
                </button>
              </div>
            ) : (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th style={{ width: "160px", whiteSpace: "nowrap" }}>الباركود</th>
                    <th style={{ whiteSpace: "nowrap" }}>اسم الصنف والماركة</th>
                    <th style={{ whiteSpace: "nowrap" }}>القسم</th>
                    <th style={{ textAlign: "center", whiteSpace: "nowrap" }}>الكمية بالمحل</th>
                    <th style={{ whiteSpace: "nowrap" }}>سعر البيع (قطاعي)</th>
                    <th style={{ whiteSpace: "nowrap" }}>سعر التكلفة</th>
                    <th style={{ whiteSpace: "nowrap" }}>حالة التوفر</th>
                    <th style={{ textAlign: "center", whiteSpace: "nowrap" }}>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => {
                    const qty = Number(p.quantity) || 0;
                    const wholesale = Number(p.wholesalePrice) || 0;
                    const retailPrice = Number(p.sellingPrice) || 0;
                    const minThresh = Number(p.minThreshold) || 3;
                    const isLow = qty <= minThresh && qty > 0;
                    const isOut = qty === 0;

                    return (
                      <tr key={p.id}>
                        {/* Barcode */}
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
                              display: "inline-block"
                            }}
                          >
                            {p.barcode || "—"}
                          </span>
                        </td>

                        {/* Name & Brand */}
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
                          <span className="badge" style={{ background: "#fdf2f8", color: "#be185d", border: "1px solid #fbcfe8" }}>
                            {p.category || "أخرى"}
                          </span>
                        </td>

                        {/* Quantity in Shop */}
                        <td style={{ textAlign: "center" }}>
                          <span className="num-font" dir="ltr" style={{
                            fontSize: "1.15rem",
                            fontWeight: "900",
                            color: isOut ? "#dc2626" : isLow ? "#ea580c" : "#047857"
                          }}>
                            {formatNumber(qty)}
                          </span>
                        </td>

                        {/* Selling Price */}
                        <td>
                          <strong style={{ color: "#15803d", fontSize: "1.02rem" }}>
                            <span className="num-font" dir="ltr">{formatNumber(retailPrice)}</span> ج.م
                          </strong>
                        </td>

                        {/* Wholesale Price */}
                        <td>
                          {isAdmin ? (
                            <span style={{ color: "#4b5563", fontWeight: "700" }}>
                              <span className="num-font" dir="ltr">{formatNumber(wholesale)}</span> ج.م
                            </span>
                          ) : (
                            <span style={{ color: "#9ca3af", fontSize: "0.78rem" }}>🔒 خاص بالمسؤول</span>
                          )}
                        </td>

                        {/* Stock Status */}
                        <td>
                          {isOut ? (
                            <span className="badge badge-out-of-stock">نفد من المحل</span>
                          ) : isLow ? (
                            <span className="badge badge-low-stock">مخزون قليل</span>
                          ) : (
                            <span className="badge badge-in-stock">متوفر بالمحل</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: "center" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", flexWrap: "nowrap" }}>
                            {/* Return to Warehouse button */}
                            <button 
                              onClick={() => setProductToReturn(p)}
                              className="btn-secondary"
                              style={{ padding: "6px 10px", fontSize: "0.8rem", color: "#7e22ce", borderColor: "#d8b4fe", background: "#faf5ff" }}
                              title="إرجاع كمية من الصنف إلى المخزن"
                            >
                              <Boxes size={14} color="#9333ea" />
                              إرجاع للمخزن
                            </button>

                            {/* Barcode Print */}
                            <button 
                              onClick={() => setBarcodeProduct(p)}
                              className="btn-secondary"
                              style={{ padding: "6px 10px", fontSize: "0.8rem" }}
                              title="طباعة باركود"
                            >
                              <Barcode size={15} color="#db2777" />
                            </button>

                            {/* Edit */}
                            <button 
                              onClick={() => handleOpenEditModal(p)}
                              className="btn-primary"
                              style={{ padding: "6px 10px", fontSize: "0.82rem" }}
                              title="تعديل بيانات الصنف بالمحل"
                            >
                              <Edit3 size={15} />
                            </button>

                            {/* Delete */}
                            <button 
                              onClick={() => setProductToDelete(p)}
                              className="btn-danger"
                              style={{ padding: "6px 8px" }}
                              title="حذف الصنف من المحل"
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
      </div>

      {/* Return to Warehouse Transfer Modal */}
      <TransferModal 
        isOpen={!!productToReturn}
        onClose={() => setProductToReturn(null)}
        product={productToReturn}
        onConfirmTransfer={handleConfirmReturnToWarehouse}
        direction="shop_to_warehouse"
      />

      {/* Product Modal for Shop */}
      <ProductModal 
        isOpen={isAddModalOpen}
        onClose={() => { setIsAddModalOpen(false); setEditingProduct(null); }}
        onSave={handleSaveProduct}
        productToEdit={editingProduct}
        isShop={true}
      />

      {/* Print Inventory Modal for Shop */}
      <PrintInventoryModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        products={products}
        title="كشف جرد بضاعة المحل"
        locationName="محل نيللي لمستحضرات التجميل"
      />

      {/* Barcode Print Modal */}
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

      {/* Delete Confirmation Modal */}
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

            <h3 style={{ fontSize: "1.2rem", marginBottom: "8px", color: "#1e1322", fontWeight: "800" }}>تأكيد حذف الصنف من المحل</h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "20px", fontWeight: "600" }}>
              هل أنت متأكد من حذف الصنف <strong style={{ color: "#1e1322" }}>"{productToDelete.name}"</strong> من سجل بضاعة المحل؟
            </p>

            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button onClick={() => setProductToDelete(null)} className="btn-secondary" style={{ padding: "10px 20px" }}>إلغاء</button>
              <button onClick={handleConfirmDelete} className="btn-danger" style={{ padding: "10px 20px", background: "#dc2626", color: "#fff", border: "none" }}>نعم، احذف الصنف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
