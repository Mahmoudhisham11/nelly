"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import StatCard from "@/components/StatCard";
import SupplierModal from "@/components/SupplierModal";
import PaymentModal from "@/components/PaymentModal";
import SupplierHistoryModal from "@/components/SupplierHistoryModal";
import PermissionDeniedModal from "@/components/PermissionDeniedModal";
import { 
  subscribeToSuppliers, 
  addSupplier, 
  updateSupplier, 
  deleteSupplier, 
  makeSupplierPayment,
  deleteSupplierTransaction 
} from "@/lib/suppliersService";
import { formatNumber } from "@/lib/utils";
import CustomSelect from "@/components/CustomSelect";
import { 
  Truck, 
  Plus, 
  Search, 
  Phone, 
  DollarSign, 
  CreditCard, 
  History, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw,
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight,
  Lock,
  Filter
} from "lucide-react";

export default function SuppliersPage() {
  const router = useRouter();
  const { user, isAdmin, loading: authLoading } = useAuth();

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all"); // "all", "payable", "receivable", "zero"
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [paymentSupplier, setPaymentSupplier] = useState(null);
  const [historySupplier, setHistorySupplier] = useState(null);
  const [supplierToDelete, setSupplierToDelete] = useState(null);
  const [permissionDeniedAction, setPermissionDeniedAction] = useState(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Firestore real-time listener
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToSuppliers((data) => {
      setSuppliers(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  // Filtered suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const name = (s.name || "").toLowerCase();
      const phone = (s.phone || "").toLowerCase();
      const matchesSearch = !q || name.includes(q) || phone.includes(q);

      const bal = Number(s.balance) || 0;
      let matchesStatus = true;
      if (selectedStatusFilter === "payable") matchesStatus = bal > 0;
      if (selectedStatusFilter === "receivable") matchesStatus = bal < 0;
      if (selectedStatusFilter === "zero") matchesStatus = bal === 0;

      return matchesSearch && matchesStatus;
    });
  }, [suppliers, searchQuery, selectedStatusFilter]);

  // KPIs
  const totalSuppliersCount = suppliers.length;
  const totalPayable = suppliers.filter(s => s.balance > 0).reduce((sum, s) => sum + (Number(s.balance) || 0), 0);
  const totalReceivable = suppliers.filter(s => s.balance < 0).reduce((sum, s) => sum + Math.abs(Number(s.balance) || 0), 0);
  const netBalance = totalPayable - totalReceivable;

  // Actions
  const handleOpenAdd = () => {
    if (!isAdmin) {
      setPermissionDeniedAction("إضافة مورد جديد");
      return;
    }
    setEditingSupplier(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (sup) => {
    if (!isAdmin) {
      setPermissionDeniedAction("تعديل بيانات المورد");
      return;
    }
    setEditingSupplier(sup);
    setIsAddModalOpen(true);
  };

  const handleOpenPayment = (sup) => {
    if (!isAdmin) {
      setPermissionDeniedAction("سداد وتسوية حساب المورد");
      return;
    }
    setPaymentSupplier(sup);
  };

  const handleOpenDelete = (sup) => {
    if (!isAdmin) {
      setPermissionDeniedAction("حذف المورد من النظام");
      return;
    }
    setSupplierToDelete(sup);
  };

  const handleSaveSupplier = async (supplierData, id) => {
    if (id) {
      await updateSupplier(id, supplierData);
      showToast("تم تحديث بيانات المورد بنجاح.");
    } else {
      await addSupplier(supplierData);
      showToast("تمت إضافة المورد الجديد بنجاح.");
    }
  };

  const handleMakePayment = async (supplierId, currentBal, payAmount, notes, method) => {
    await makeSupplierPayment(supplierId, currentBal, payAmount, notes, method);
    showToast(`تم تسجيل عملية السداد بمبلغ ${formatNumber(payAmount)} ج.م وتحديث الحساب.`);
  };

  const handleDeleteTransaction = async (supplierId, txId) => {
    await deleteSupplierTransaction(supplierId, txId);
    showToast("تم حذف الحركة المالية وتعديل رصيد المورد بنجاح.");
    if (historySupplier && historySupplier.id === supplierId) {
      setHistorySupplier(prev => ({
        ...prev,
        transactions: (prev.transactions || []).filter(t => t.id !== txId)
      }));
    }
  };

  const handleConfirmDelete = async () => {
    if (!supplierToDelete) return;
    await deleteSupplier(supplierToDelete.id);
    showToast(`تم حذف المورد "${supplierToDelete.name}" بنجاح.`);
    setSupplierToDelete(null);
  };

  if (authLoading || (!user && loading)) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--text-secondary)", fontWeight: "700" }}>جاري تحميل حسابات الموردين...</p>
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

      {/* Main Content Area */}
      <div className="main-content">
        <Navbar 
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
                  background: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  boxShadow: "0 4px 14px rgba(219, 39, 119, 0.25)"
                }}>
                  <Truck size={22} />
                </div>
                <h2 style={{ fontSize: "1.6rem", fontWeight: "900", color: "#1e1322" }}>
                  إدارة الموردين والحسابات المالية
                </h2>
              </div>
              <p style={{ color: "#5a4663", fontSize: "0.88rem", marginTop: "6px", fontWeight: "600" }}>
                متابعة أرصدة الموردين، تسجيل المدفوعات والسداد الفوري، وكشوفات الحسابات
              </p>
            </div>

            <button
              onClick={handleOpenAdd}
              className="btn-primary"
              style={{ padding: "10px 20px", fontSize: "0.95rem" }}
            >
              <Plus size={18} />
              إضافة مورد جديد
            </button>
          </div>

          {/* KPI Cards (Swiper on Mobile, Grid on Desktop) */}
          <section className="mobile-cards-swiper">
            <div className="mobile-swiper-card">
              <StatCard 
                title="إجمالي عدد الموردين"
                value={totalSuppliersCount}
                suffix="مورد"
                subtitle="الموردين والشركات المسجلة"
                icon={Truck}
                theme="rose"
                trendText="نشط بالنظام"
              />
            </div>

            <div className="mobile-swiper-card">
              <StatCard 
                title="مستحقات الموردين (له فلوس)"
                value={isAdmin ? totalPayable : "🔒"}
                suffix={isAdmin ? "ج.م" : "خاص بالمسؤول"}
                subtitle="مبالغ مطلوب سدادها للموردين"
                icon={ArrowDownLeft}
                theme="ruby"
                trendText="مستحق للسداد"
              />
            </div>

            <div className="mobile-swiper-card">
              <StatCard 
                title="مستحقات على الموردين (عليه)"
                value={isAdmin ? totalReceivable : "🔒"}
                suffix={isAdmin ? "ج.م" : "خاص بالمسؤول"}
                subtitle="مبالغ مستحقة للمخزن عند الموردين"
                icon={ArrowUpRight}
                theme="purple"
                trendText="مستحق التحصيل"
              />
            </div>

            <div className="mobile-swiper-card">
              <StatCard 
                title="صافي الحسابات المعلقة"
                value={isAdmin ? Math.abs(netBalance) : "🔒"}
                suffix={isAdmin ? (netBalance >= 0 ? "ج.م (له)" : "ج.م (عليه)") : "Admin Only"}
                subtitle="الرصيد الصافي الإجمالي"
                icon={DollarSign}
                theme="gold"
                trendText="الصافي"
              />
            </div>
          </section>

          {/* Mobile Swipe Hint */}
          <div className="swiper-mobile-hint">
            <span>👈 اسحب لمشاهدة باقي إحصائيات الموردين 👉</span>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="glass-panel" style={{ padding: "18px 20px", marginBottom: "24px", background: "#ffffff", border: "1.5px solid #ebdbe6" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "14px"
            }}>
              {/* Search Bar */}
              <div style={{ position: "relative", flex: 1, minWidth: "260px", maxWidth: "420px" }}>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="ابحث باسم المورد أو رقم الهاتف..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingRight: "40px", fontWeight: "600" }}
                />
                <Search size={18} color="#db2777" style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)" }} />
              </div>

              {/* CustomSelect Status Filter */}
              <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ minWidth: "220px" }}>
                  <CustomSelect
                    options={[
                      { value: "all", label: `جميع الموردين (${totalSuppliersCount})` },
                      { value: "payable", label: `له مستحقات (${suppliers.filter(s => s.balance > 0).length})` },
                      { value: "receivable", label: `عليه مبالغ (${suppliers.filter(s => s.balance < 0).length})` },
                      { value: "zero", label: `حسابه خالص (${suppliers.filter(s => s.balance === 0).length})` }
                    ]}
                    value={selectedStatusFilter}
                    onChange={(val) => setSelectedStatusFilter(val)}
                    icon={Filter}
                  />
                </div>

                {(searchQuery || selectedStatusFilter !== "all") && (
                  <button 
                    onClick={() => { setSearchQuery(""); setSelectedStatusFilter("all"); }}
                    className="btn-secondary"
                    title="إعادة ضبط الفلترة"
                    style={{ padding: "10px 14px" }}
                  >
                    <RotateCcw size={15} />
                    إعادة ضبط
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Suppliers Table */}
          <div className="table-container">
            {filteredSuppliers.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <Truck size={48} color="#db2777" style={{ margin: "0 auto 12px", opacity: 0.8 }} />
                <h3 style={{ fontSize: "1.2rem", marginBottom: "6px", color: "#1e1322", fontWeight: "800" }}>
                  {searchQuery ? `لا يوجد مورد يطابق "${searchQuery}"` : "لم يتم تسجيل أي موردين بعد"}
                </h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: "18px", fontWeight: "600" }}>
                  ابدأ بإضافة بيانات الموردين لتسجيل حساباتهم وفواتيرهم
                </p>
                <button onClick={handleOpenAdd} className="btn-primary">
                  <Plus size={16} />
                  إضافة مورد جديد
                </button>
              </div>
            ) : (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>اسم المورد / الشركة</th>
                    <th>رقم الهاتف</th>
                    <th>الرصيد المالي الحالي</th>
                    <th>حالة الحساب</th>
                    <th>ملاحظات</th>
                    <th style={{ textAlign: "center" }}>سداد دفعة</th>
                    <th style={{ textAlign: "center" }}>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.map((sup) => {
                    const bal = Number(sup.balance) || 0;
                    const isPayable = bal > 0;
                    const isReceivable = bal < 0;
                    const isZero = bal === 0;

                    return (
                      <tr key={sup.id}>
                        {/* Name */}
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "10px",
                              background: isPayable ? "#fdf2f8" : isReceivable ? "#faf5ff" : "#ecfdf5",
                              color: isPayable ? "#db2777" : isReceivable ? "#9333ea" : "#059669",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: "900",
                              fontSize: "0.9rem"
                            }}>
                              <Truck size={18} />
                            </div>
                            <span style={{ fontWeight: "800", color: "#1e1322", fontSize: "0.95rem" }}>
                              {sup.name}
                            </span>
                          </div>
                        </td>

                        {/* Phone */}
                        <td>
                          {sup.phone ? (
                            <a 
                              href={`tel:${sup.phone}`} 
                              style={{ 
                                display: "inline-flex", 
                                alignItems: "center", 
                                gap: "6px", 
                                color: "#db2777", 
                                textDecoration: "none", 
                                fontWeight: "700" 
                              }}
                            >
                              <Phone size={14} />
                              <span className="num-font" dir="ltr">{sup.phone}</span>
                            </a>
                          ) : (
                            <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>—</span>
                          )}
                        </td>

                        {/* Balance */}
                        <td>
                          {isAdmin ? (
                            <div style={{
                              fontSize: "1.05rem",
                              fontWeight: "900",
                              color: isPayable ? "#be185d" : isReceivable ? "#7e22ce" : "#047857"
                            }}>
                              <span className="num-font" dir="ltr">{formatNumber(Math.abs(bal))}</span> ج.م
                            </div>
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

                        {/* Status badge */}
                        <td>
                          {isPayable ? (
                            <span className="badge" style={{ background: "#fdf2f8", color: "#be185d", border: "1px solid #fbcfe8" }}>
                              له مستحقات (+)
                            </span>
                          ) : isReceivable ? (
                            <span className="badge" style={{ background: "#faf5ff", color: "#7e22ce", border: "1px solid #e9d5ff" }}>
                              عليه مبالغ (-)
                            </span>
                          ) : (
                            <span className="badge badge-in-stock">
                              حسابه خالص (0)
                            </span>
                          )}
                        </td>

                        {/* Notes */}
                        <td>
                          <span style={{ fontSize: "0.84rem", color: "#5a4663", fontWeight: "600" }}>
                            {sup.notes || "—"}
                          </span>
                        </td>

                        {/* Quick Payment Button */}
                        <td style={{ textAlign: "center" }}>
                          <button
                            onClick={() => handleOpenPayment(sup)}
                            className="btn-primary"
                            style={{
                              padding: "6px 14px",
                              fontSize: "0.82rem",
                              background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                              boxShadow: "0 2px 8px rgba(5, 150, 105, 0.2)"
                            }}
                          >
                            <CreditCard size={14} />
                            سداد دفعة
                          </button>
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: "center" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <button
                              onClick={() => setHistorySupplier(sup)}
                              className="btn-secondary"
                              style={{ padding: "6px 10px", fontSize: "0.8rem" }}
                              title="عرض كشف حساب وسجل المدفوعات"
                            >
                              <History size={15} color="#9333ea" />
                              كشف حساب
                            </button>

                            <button
                              onClick={() => handleOpenEdit(sup)}
                              className="btn-secondary"
                              style={{ padding: "6px 10px", fontSize: "0.8rem" }}
                              title="تعديل بيانات المورد"
                            >
                              <Edit3 size={15} color="#db2777" />
                              تعديل
                            </button>

                            <button
                              onClick={() => handleOpenDelete(sup)}
                              className="btn-danger"
                              style={{ padding: "6px 8px" }}
                              title="حذف المورد"
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

      {/* Modals */}
      <SupplierModal 
        isOpen={isAddModalOpen}
        onClose={() => { setIsAddModalOpen(false); setEditingSupplier(null); }}
        onSave={handleSaveSupplier}
        supplierToEdit={editingSupplier}
      />

      <PaymentModal 
        isOpen={!!paymentSupplier}
        onClose={() => setPaymentSupplier(null)}
        supplier={paymentSupplier}
        onMakePayment={handleMakePayment}
      />

      <SupplierHistoryModal 
        isOpen={!!historySupplier}
        onClose={() => setHistorySupplier(null)}
        supplier={historySupplier}
        onDeleteTransaction={handleDeleteTransaction}
      />

      <PermissionDeniedModal 
        isOpen={!!permissionDeniedAction}
        onClose={() => setPermissionDeniedAction(null)}
        actionName={permissionDeniedAction}
      />

      {/* Delete Supplier Confirmation Modal */}
      {supplierToDelete && (
        <div className="modal-overlay" onClick={() => setSupplierToDelete(null)}>
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

            <h3 style={{ fontSize: "1.2rem", marginBottom: "8px", color: "#1e1322", fontWeight: "800" }}>
              تأكيد حذف المورد
            </h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "20px", fontWeight: "600", lineHeight: "1.6" }}>
              هل أنت متأكد من حذف المورد <strong style={{ color: "#1e1322" }}>"{supplierToDelete.name}"</strong> من النظام؟
            </p>

            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button 
                onClick={() => setSupplierToDelete(null)}
                className="btn-secondary"
                style={{ padding: "10px 20px" }}
              >
                إلغاء
              </button>
              <button 
                onClick={handleConfirmDelete}
                className="btn-danger"
                style={{ padding: "10px 20px", background: "#dc2626", color: "#fff", border: "none" }}
              >
                نعم، احذف المورد
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
