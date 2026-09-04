"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { 
  subscribeToCustomers, 
  addCustomer, 
  updateCustomer, 
  recordCustomerPayment, 
  deleteCustomer 
} from "@/lib/customersService";
import { formatNumber, roundCurrency } from "@/lib/utils";
import confetti from "canvas-confetti";
import { 
  Users, 
  UserPlus, 
  Search, 
  CreditCard, 
  Phone, 
  MapPin, 
  DollarSign, 
  FileText, 
  Edit3, 
  Trash2, 
  Plus, 
  X, 
  Save, 
  Sparkles, 
  Receipt,
  ArrowDownLeft,
  CheckCircle2
} from "lucide-react";

export default function CustomersPage() {
  const router = useRouter();
  const { user, isAdmin, loading: authLoading } = useAuth();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");

  // Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [customerForPayment, setCustomerForPayment] = useState(null);
  const [customerForStatement, setCustomerForStatement] = useState(null);
  const [customerToDelete, setCustomerToDelete] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    type: "قطاعي",
    balance: "0",
    notes: ""
  });

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("نقدي");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToCustomers((data) => {
      setCustomers(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setFormData({
      name: "",
      phone: "",
      address: "",
      type: "قطاعي",
      balance: "0",
      notes: ""
    });
    setIsAddEditModalOpen(true);
  };

  const handleOpenEditModal = (cust) => {
    setEditingCustomer(cust);
    setFormData({
      name: cust.name || "",
      phone: cust.phone || "",
      address: cust.address || "",
      type: cust.type || "قطاعي",
      balance: cust.balance || "0",
      notes: cust.notes || ""
    });
    setIsAddEditModalOpen(true);
  };

  // Save Customer Add / Edit
  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, {
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          address: formData.address.trim(),
          type: formData.type,
          notes: formData.notes.trim()
        });
        showToast("تم تحديث بيانات العميل بنجاح.");
      } else {
        await addCustomer({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          address: formData.address.trim(),
          type: formData.type,
          balance: parseFloat(formData.balance) || 0,
          notes: formData.notes.trim()
        });
        showToast("تمت إضافة العميل الجديد بنجاح.");
        try {
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        } catch (e) {}
      }
      setIsAddEditModalOpen(false);
    } catch (err) {
      alert(err.message || "حدث خطأ أثناء حفظ بيانات العميل.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Payment Settlement
  const handleSavePayment = async (e) => {
    e.preventDefault();
    if (!customerForPayment) return;

    const amt = parseFloat(paymentAmount);
    if (!amt || amt <= 0) {
      alert("يرجى إدخال مبلغ سداد صحيح أكبر من صفر.");
      return;
    }

    setIsSubmitting(true);
    try {
      await recordCustomerPayment(
        customerForPayment.id,
        customerForPayment.balance,
        amt,
        paymentNotes,
        paymentMethod
      );
      showToast(`تم تسجيل سداد مبلغ ${formatNumber(amt)} ج.م للعميل "${customerForPayment.name}".`);
      setCustomerForPayment(null);
      setPaymentAmount("");
      setPaymentNotes("");
    } catch (err) {
      alert(err.message || "حدث خطأ أثناء تسجيل الدفعة.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete customer
  const handleConfirmDelete = async () => {
    if (!customerToDelete) return;
    try {
      await deleteCustomer(customerToDelete.id);
      showToast("تم حذف العميل من النظام.");
      setCustomerToDelete(null);
    } catch (err) {
      alert("حدث خطأ أثناء حذف العميل.");
    }
  };

  // Filters
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const name = (c.name || "").toLowerCase();
      const phone = (c.phone || "").toLowerCase();
      const matchesSearch = !q || name.includes(q) || phone.includes(q);

      let matchesType = true;
      if (filterType === "debt") {
        matchesType = (c.balance || 0) > 0;
      } else if (filterType !== "all") {
        matchesType = c.type === filterType;
      }

      return matchesSearch && matchesType;
    });
  }, [customers, searchQuery, filterType]);

  const totalDebt = useMemo(() => {
    return customers.reduce((acc, curr) => acc + (curr.balance > 0 ? curr.balance : 0), 0);
  }, [customers]);

  const totalPurchases = useMemo(() => {
    return customers.reduce((acc, curr) => acc + (curr.totalPurchases || 0), 0);
  }, [customers]);

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <Sidebar 
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

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
              <Sparkles size={18} color="#f472b6" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Header */}
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
                  <Users size={22} />
                </div>
                <h2 style={{ fontSize: "1.6rem", fontWeight: "900", color: "#1e1322" }}>دليل العملاء والحسابات الآجلة</h2>
              </div>
              <p style={{ color: "#5a4663", fontSize: "0.88rem", marginTop: "4px", fontWeight: "600" }}>
                سجل بيانات العملاء، إدارة المديونيات الآجلة، كشوف الحسابات، وتسجيل سدادات الدفعات
              </p>
            </div>

            <button onClick={handleOpenAddModal} className="btn-primary" style={{ padding: "10px 20px" }}>
              <UserPlus size={18} />
              إضافة عميل جديد
            </button>
          </div>

          {/* Stats KPI Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
            <div className="glass-card" style={{ padding: "20px", borderRight: "4px solid #db2777" }}>
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: "700" }}>إجمالي العملاء المسجلين</div>
              <div className="num-font" dir="ltr" style={{ fontSize: "1.8rem", fontWeight: "900", color: "#1e1322", marginTop: "4px" }}>
                {formatNumber(customers.length)}
              </div>
            </div>

            <div className="glass-card" style={{ padding: "20px", borderRight: "4px solid #dc2626" }}>
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: "700" }}>إجمالي ديون العملاء (مستحقات للمتجر)</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginTop: "4px" }}>
                <span className="num-font" dir="ltr" style={{ fontSize: "1.8rem", fontWeight: "900", color: "#dc2626" }}>
                  {formatNumber(totalDebt)}
                </span>
                <span style={{ fontSize: "0.85rem", color: "#dc2626", fontWeight: "800" }}>ج.م</span>
              </div>
            </div>

            <div className="glass-card" style={{ padding: "20px", borderRight: "4px solid #059669" }}>
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: "700" }}>إجمالي مبيعات العملاء</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginTop: "4px" }}>
                <span className="num-font" dir="ltr" style={{ fontSize: "1.8rem", fontWeight: "900", color: "#059669" }}>
                  {formatNumber(totalPurchases)}
                </span>
                <span style={{ fontSize: "0.85rem", color: "#059669", fontWeight: "800" }}>ج.م</span>
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="glass-panel" style={{ padding: "18px 20px", marginBottom: "20px" }}>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ position: "relative", minWidth: "260px", flex: 1 }}>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="بحث باسم العميل أو رقم الهاتف..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingRight: "38px" }}
                />
                <Search size={18} color="#db2777" style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)" }} />
              </div>

              {/* Filter Type Buttons */}
              <div style={{ display: "flex", gap: "6px" }}>
                {[
                  { id: "all", label: "جميع العملاء" },
                  { id: "debt", label: "عليهم مديونيات ⏳" },
                  { id: "VIP", label: "عملاء VIP 👑" },
                  { id: "جملة", label: "عملاء جملة" }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setFilterType(t.id)}
                    className={filterType === t.id ? "btn-primary" : "btn-secondary"}
                    style={{ padding: "8px 12px", fontSize: "0.82rem" }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Customers Table */}
          <div className="glass-panel" style={{ padding: "20px" }}>
            <div className="table-container">
              {loading ? (
                <div style={{ textAlign: "center", padding: "50px" }}>
                  <p style={{ color: "var(--text-muted)", fontWeight: "700" }}>جاري تحميل دليل العملاء...</p>
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div style={{ textAlign: "center", padding: "50px" }}>
                  <Users size={42} color="#db2777" style={{ margin: "0 auto 10px", opacity: 0.4 }} />
                  <h3 style={{ fontSize: "1.1rem", fontWeight: "800", color: "#1e1322" }}>لم يتم العثور على أي عميل</h3>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "4px" }}>قم بإضافة عميل جديد</p>
                </div>
              ) : (
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>اسم العميل</th>
                      <th>رقم الهاتف</th>
                      <th>العنوان</th>
                      <th>التصنيف</th>
                      <th>رصيد الحساب (المديونية)</th>
                      <th style={{ textAlign: "center" }}>سداد دفعة</th>
                      <th style={{ textAlign: "center" }}>كشف الحساب</th>
                      <th style={{ textAlign: "center" }}>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((cust) => {
                      const balance = Number(cust.balance) || 0;
                      const hasDebt = balance > 0;

                      return (
                        <tr key={cust.id}>
                          {/* Name */}
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <div style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "10px",
                                background: "#fdf2f8",
                                color: "#db2777",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: "900",
                                fontSize: "0.95rem",
                                border: "1px solid #fbcfe8"
                              }}>
                                {cust.name ? cust.name[0].toUpperCase() : "C"}
                              </div>
                              <div style={{ fontWeight: "800", color: "#1e1322", fontSize: "0.92rem" }}>
                                {cust.name}
                              </div>
                            </div>
                          </td>

                          {/* Phone */}
                          <td>
                            {cust.phone ? (
                              <span className="num-font" dir="ltr" style={{ color: "#4a3650", fontWeight: "600" }}>
                                {cust.phone}
                              </span>
                            ) : (
                              <span style={{ color: "#9ca3af" }}>—</span>
                            )}
                          </td>

                          {/* Address */}
                          <td>
                            <span style={{ color: "#5a4663", fontSize: "0.85rem" }}>
                              {cust.address || "—"}
                            </span>
                          </td>

                          {/* Type */}
                          <td>
                            <span className="badge" style={{
                              background: cust.type === "VIP" ? "#fffbeb" : "#faf5ff",
                              color: cust.type === "VIP" ? "#b45309" : "#7e22ce",
                              border: `1px solid ${cust.type === "VIP" ? "#fde68a" : "#e9d5ff"}`
                            }}>
                              {cust.type || "قطاعي"}
                            </span>
                          </td>

                          {/* Balance / Debt */}
                          <td>
                            {hasDebt ? (
                              <div style={{ color: "#dc2626", fontWeight: "900", fontSize: "0.95rem" }}>
                                <span className="num-font" dir="ltr">{formatNumber(balance)}</span> ج.م
                                <span style={{ fontSize: "0.72rem", display: "block", color: "#dc2626", fontWeight: "700" }}>مستحق على العميل</span>
                              </div>
                            ) : balance < 0 ? (
                              <div style={{ color: "#059669", fontWeight: "800", fontSize: "0.95rem" }}>
                                <span className="num-font" dir="ltr">{formatNumber(Math.abs(balance))}</span> ج.م
                                <span style={{ fontSize: "0.72rem", display: "block", color: "#059669" }}>رصيد دائن</span>
                              </div>
                            ) : (
                              <span style={{ color: "#059669", fontWeight: "700", fontSize: "0.85rem" }}>
                                ✓ الحساب خالص
                              </span>
                            )}
                          </td>

                          {/* Payment Action */}
                          <td style={{ textAlign: "center" }}>
                            <button
                              onClick={() => {
                                setCustomerForPayment(cust);
                                setPaymentAmount(hasDebt ? balance.toString() : "");
                              }}
                              className="btn-primary"
                              style={{ padding: "6px 12px", fontSize: "0.78rem" }}
                            >
                              <CreditCard size={14} />
                              سداد دفعة
                            </button>
                          </td>

                          {/* Statement Action */}
                          <td style={{ textAlign: "center" }}>
                            <button
                              onClick={() => setCustomerForStatement(cust)}
                              className="btn-secondary"
                              style={{ padding: "6px 12px", fontSize: "0.78rem" }}
                            >
                              <FileText size={14} />
                              كشف الحساب
                            </button>
                          </td>

                          {/* Edit & Delete */}
                          <td style={{ textAlign: "center" }}>
                            <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                              <button
                                onClick={() => handleOpenEditModal(cust)}
                                className="btn-secondary"
                                style={{ padding: "6px 8px" }}
                                title="تعديل العميل"
                              >
                                <Edit3 size={14} />
                              </button>

                              <button
                                onClick={() => setCustomerToDelete(cust)}
                                className="btn-danger"
                                style={{ padding: "6px 8px" }}
                                title="حذف العميل"
                              >
                                <Trash2 size={14} />
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
          </div>
        </main>
      </div>

      {/* Add / Edit Customer Modal */}
      {isAddEditModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddEditModalOpen(false)}>
          <div 
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "460px", padding: "26px", background: "#ffffff" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px", borderBottom: "1px solid #fce7f3", paddingBottom: "12px" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#1e1322" }}>
                {editingCustomer ? "تعديل بيانات العميل" : "إضافة عميل جديد"}
              </h3>
              <button onClick={() => setIsAddEditModalOpen(false)} style={{ background: "transparent", border: "none", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer}>
              <div className="form-group">
                <label className="form-label">اسم العميل <span style={{ color: "#db2777" }}>*</span></label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="مثال: منار خالد"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">رقم الهاتف / الواتساب</label>
                <input 
                  type="text"
                  dir="ltr"
                  className="form-input num-font"
                  placeholder="010..."
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">العنوان / المنطقة</label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="مثال: مدينة نصر - القاهرة"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="form-group">
                  <label className="form-label">تصنيف العميل</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="form-input"
                  >
                    <option value="قطاعي">قطاعي (عادي)</option>
                    <option value="VIP">عميل مميز (VIP)</option>
                    <option value="جملة">تاجر جملة</option>
                  </select>
                </div>

                {!editingCustomer && (
                  <div className="form-group">
                    <label className="form-label">رصيد مديونية سابق</label>
                    <input 
                      type="number"
                      step="0.5"
                      dir="ltr"
                      className="form-input num-font"
                      placeholder="0.00"
                      value={formData.balance}
                      onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                    />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">ملاحظات إضافية</label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="ملاحظات تفضيلية أو أوقات التسليم..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px" }}>
                <button type="button" onClick={() => setIsAddEditModalOpen(false)} className="btn-secondary">إلغاء</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary">
                  <Save size={16} />
                  {isSubmitting ? "جاري الحفظ..." : "حفظ العميل"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Payment Modal */}
      {customerForPayment && (
        <div className="modal-overlay" onClick={() => setCustomerForPayment(null)}>
          <div 
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "440px", padding: "26px", background: "#ffffff" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", borderBottom: "1px solid #fce7f3", paddingBottom: "12px" }}>
              <div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: "800", color: "#1e1322" }}>تسجيل سداد دفعة حساب</h3>
                <span style={{ fontSize: "0.8rem", color: "#db2777", fontWeight: "700" }}>العميل: {customerForPayment.name}</span>
              </div>
              <button onClick={() => setCustomerForPayment(null)} style={{ background: "transparent", border: "none", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{
              background: "#fdf2f8",
              border: "1px solid #fbcfe8",
              borderRadius: "12px",
              padding: "12px",
              marginBottom: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#5a4663" }}>المديونية الحالية:</span>
              <strong style={{ fontSize: "1.15rem", color: "#dc2626" }}>
                <span className="num-font" dir="ltr">{formatNumber(customerForPayment.balance)}</span> ج.م
              </strong>
            </div>

            <form onSubmit={handleSavePayment}>
              <div className="form-group">
                <label className="form-label">المبلغ المسدد (ج.م) <span style={{ color: "#db2777" }}>*</span></label>
                <input 
                  type="number"
                  step="0.5"
                  min="0.5"
                  dir="ltr"
                  className="form-input num-font"
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  style={{ fontSize: "1.1rem", fontWeight: "700" }}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">طريقة السداد</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="form-input"
                >
                  <option value="نقدي">نقدي (كاش)</option>
                  <option value="فودافون كاش / إنستاباي">فودافون كاش / إنستاباي</option>
                  <option value="فيزا / بطاقة">فيزا / بطاقة بنكية</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">ملاحظات السداد</label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="سداد دفعة حساب..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px" }}>
                <button type="button" onClick={() => setCustomerForPayment(null)} className="btn-secondary">إلغاء</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary">
                  <CheckCircle2 size={16} />
                  {isSubmitting ? "جاري الحفظ..." : "تأكيد السداد"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Statement Modal */}
      {customerForStatement && (
        <div className="modal-overlay" onClick={() => setCustomerForStatement(null)}>
          <div 
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "560px", padding: "26px", background: "#ffffff" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", borderBottom: "1px solid #fce7f3", paddingBottom: "12px" }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#1e1322" }}>كشف حساب العميل</h3>
                <span style={{ fontSize: "0.85rem", color: "#db2777", fontWeight: "700" }}>{customerForStatement.name}</span>
              </div>
              <button onClick={() => setCustomerForStatement(null)} style={{ background: "transparent", border: "none", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px", background: "#f8fafc", padding: "10px 14px", borderRadius: "10px" }}>
              <div>
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block" }}>الرصيد الحالي:</span>
                <strong style={{ fontSize: "1.1rem", color: customerForStatement.balance > 0 ? "#dc2626" : "#059669" }}>
                  <span className="num-font" dir="ltr">{formatNumber(customerForStatement.balance)}</span> ج.م
                </strong>
              </div>
              <div>
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block" }}>إجمالي المشتريات:</span>
                <strong style={{ fontSize: "1.1rem", color: "#1e1322" }}>
                  <span className="num-font" dir="ltr">{formatNumber(customerForStatement.totalPurchases || 0)}</span> ج.م
                </strong>
              </div>
            </div>

            {/* Transactions History */}
            <div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "10px" }}>
              {(!customerForStatement.transactions || customerForStatement.transactions.length === 0) ? (
                <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px", fontSize: "0.85rem" }}>
                  لا توجد حركات مالية مسجلة بعد لهذا العميل
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {customerForStatement.transactions.map((tx, idx) => (
                    <div key={idx} style={{
                      padding: "8px 10px",
                      background: tx.type?.includes("سداد") ? "#f0fdf4" : "#fdf2f8",
                      border: `1px solid ${tx.type?.includes("سداد") ? "#bbf7d0" : "#fbcfe8"}`,
                      borderRadius: "8px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: "0.82rem"
                    }}>
                      <div>
                        <div style={{ fontWeight: "800", color: "#1e1322" }}>{tx.type || "حركة مالية"}</div>
                        <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>{tx.notes || ""}</div>
                        <span style={{ fontSize: "0.68rem", color: "#9ca3af" }}>
                          {tx.date ? new Date(tx.date).toLocaleDateString("ar-EG") : ""}
                        </span>
                      </div>
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontWeight: "900", color: tx.type?.includes("سداد") ? "#059669" : "#dc2626", fontSize: "0.95rem" }}>
                          <span className="num-font" dir="ltr">{formatNumber(tx.amount)}</span> ج.م
                        </div>
                        <span style={{ fontSize: "0.72rem", color: "#6b7280" }}>الرصيد: {formatNumber(tx.newBalance)} ج.م</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {customerToDelete && (
        <div className="modal-overlay" onClick={() => setCustomerToDelete(null)}>
          <div 
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "420px", padding: "26px", textAlign: "center", background: "#ffffff" }}
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
              <Trash2 size={24} />
            </div>

            <h3 style={{ fontSize: "1.15rem", fontWeight: "800", color: "#1e1322", marginBottom: "8px" }}>
              تأكيد حذف حساب العميل
            </h3>
            <p style={{ fontSize: "0.88rem", color: "#5a4663", marginBottom: "20px" }}>
              هل أنت متأكد من حذف العميل <strong>"{customerToDelete.name}"</strong> نهائياً من النظام؟
            </p>

            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button onClick={() => setCustomerToDelete(null)} className="btn-secondary" style={{ padding: "8px 18px" }}>إلغاء</button>
              <button onClick={handleConfirmDelete} className="btn-danger" style={{ padding: "8px 18px" }}>نعم، احذف العميل</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
