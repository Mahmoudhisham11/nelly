"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { subscribeToUsers, updateUserRole, deleteUserDoc } from "@/lib/usersService";
import { formatNumber } from "@/lib/utils";
import { 
  Settings, 
  Users, 
  ShieldCheck, 
  UserCheck, 
  ShieldAlert, 
  Trash2, 
  Search, 
  Check, 
  ArrowLeft, 
  Lock, 
  AlertCircle,
  Crown,
  User,
  Sparkles
} from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAdmin, loading: authLoading } = useAuth();

  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("all");
  const [userToDelete, setUserToDelete] = useState(null);
  const [toastMessage, setToastMessage] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Authentication check
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Subscribe to users if admin
  useEffect(() => {
    if (!user || !isAdmin) return;

    const unsubscribe = subscribeToUsers((data) => {
      setUsersList(data);
      setLoadingUsers(false);
    });

    return () => unsubscribe();
  }, [user, isAdmin]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  // Toggle user role between 'admin' and 'user'
  const handleToggleRole = async (targetUser) => {
    if (targetUser.uid === user?.uid) {
      alert("لا يمكنك تغيير صلاحية حسابك الحالي بنفسك.");
      return;
    }

    const newRole = targetUser.role === "admin" ? "user" : "admin";
    const roleTitle = newRole === "admin" ? "مسؤول (Admin)" : "مستخدم عادي (User)";

    setUpdatingUserId(targetUser.uid);
    try {
      await updateUserRole(targetUser.uid, newRole);
      showToast(`تم تغيير صلاحية "${targetUser.displayName || targetUser.email}" إلى ${roleTitle} بنجاح.`);
    } catch (err) {
      alert("حدث خطأ أثناء تغيير الصلاحية.");
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Confirm delete user
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    if (userToDelete.uid === user?.uid) {
      alert("لا يمكنك حذف حسابك الحالي.");
      setUserToDelete(null);
      return;
    }

    try {
      await deleteUserDoc(userToDelete.uid);
      showToast(`تم حذف المستخدم "${userToDelete.displayName || userToDelete.email}" من النظام.`);
    } catch (err) {
      alert("حدث خطأ أثناء حذف المستخدم.");
    } finally {
      setUserToDelete(null);
    }
  };

  // Filter users
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      const name = (u.displayName || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const matchesQuery = !q || name.includes(q) || email.includes(q);

      const matchesRole = selectedRoleFilter === "all" || u.role === selectedRoleFilter;

      return matchesQuery && matchesRole;
    });
  }, [usersList, searchQuery, selectedRoleFilter]);

  const totalUsersCount = usersList.length;
  const adminCount = usersList.filter(u => u.role === "admin").length;
  const regularCount = usersList.filter(u => u.role !== "admin").length;

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--text-secondary)", fontWeight: "700" }}>جاري التحقق من الصلاحيات...</p>
      </div>
    );
  }

  // If user is logged in but NOT an Admin: Render Permission Denied Screen
  if (user && !isAdmin) {
    return (
      <div className="app-layout">
        <Sidebar 
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />
        <div className="main-content">
          <Navbar 
            onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          />
          <main className="page-wrapper" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "75vh" }}>
          <div className="glass-panel" style={{
            maxWidth: "520px",
            width: "100%",
            padding: "40px 30px",
            textAlign: "center",
            background: "#ffffff",
            borderRadius: "24px",
            border: "1.5px solid #fecdd3",
            boxShadow: "0 20px 60px rgba(225, 29, 72, 0.12)"
          }}>
            <div style={{
              width: "74px",
              height: "74px",
              borderRadius: "22px",
              background: "linear-gradient(135deg, #ffe4e6 0%, #fecdd3 100%)",
              color: "#e11d48",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "20px",
              boxShadow: "0 8px 24px rgba(225, 29, 72, 0.18)"
            }}>
              <ShieldAlert size={40} />
            </div>

            <h2 style={{ fontSize: "1.4rem", fontWeight: "900", color: "#1e1322", marginBottom: "10px" }}>
              ليس لديك صلاحية لدخول هذه الصفحة
            </h2>

            <p style={{ fontSize: "0.95rem", color: "#5a4663", lineHeight: "1.7", marginBottom: "24px", fontWeight: "600" }}>
              عذراً، صفحة إعدادات التطبيق وإدارة حسابات وصلاحيات المستخدمين مخصصة ومحمية حصرياً لـ <strong style={{ color: "#9d174d" }}>مسؤول المخزن (Admin)</strong>.
            </p>

            <div style={{
              background: "#faf5ff",
              border: "1px solid #e9d5ff",
              borderRadius: "12px",
              padding: "10px 16px",
              marginBottom: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "0.88rem"
            }}>
              <span style={{ color: "#4a3650", fontWeight: "700" }}>رتبة حسابك الحالية:</span>
              <span style={{
                background: "#ffffff",
                color: "#7e22ce",
                border: "1px solid #e9d5ff",
                padding: "3px 12px",
                borderRadius: "14px",
                fontWeight: "800"
              }}>
                👤 مستخدم عادي (User)
              </span>
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <Link href="/" className="btn-primary" style={{ padding: "10px 24px" }}>
                <ArrowLeft size={16} />
                العودة للوحة التحكم
              </Link>
            </div>
          </div>
        </main>
        </div>
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
                <Settings size={22} />
              </div>
              <h2 style={{ fontSize: "1.6rem", fontWeight: "900", color: "#1e1322" }}>إعدادات النظام وإدارة المستخدمين</h2>
            </div>
            <p style={{ color: "#5a4663", fontSize: "0.88rem", marginTop: "6px", fontWeight: "600" }}>
              التحكم في حسابات المستخدمين، تعديل الرتب والصلاحيات (Admin / User)، وإدارة الأذونات
            </p>
          </div>
        </div>

        {/* Stats Cards (Swiper on Mobile, Grid on Desktop) */}
        <section className="mobile-cards-swiper">
          <div className="mobile-swiper-card">
            <div className="glass-card" style={{ padding: "20px 22px", borderRight: "4px solid #db2777", height: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: "0.84rem", color: "var(--text-muted)", fontWeight: "700" }}>إجمالي المستخدمين المسجلين</div>
                  <div className="num-font" dir="ltr" style={{ fontSize: "1.8rem", fontWeight: "900", color: "#1e1322", marginTop: "4px" }}>
                    {formatNumber(totalUsersCount)}
                  </div>
                </div>
                <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "#fdf2f8", color: "#db2777", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Users size={22} />
                </div>
              </div>
            </div>
          </div>

          <div className="mobile-swiper-card">
            <div className="glass-card" style={{ padding: "20px 22px", borderRight: "4px solid #d97706", height: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: "0.84rem", color: "var(--text-muted)", fontWeight: "700" }}>مسؤولو المخزن (Admins)</div>
                  <div className="num-font" dir="ltr" style={{ fontSize: "1.8rem", fontWeight: "900", color: "#b45309", marginTop: "4px" }}>
                    {formatNumber(adminCount)}
                  </div>
                </div>
                <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "#fffbeb", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Crown size={22} />
                </div>
              </div>
            </div>
          </div>

          <div className="mobile-swiper-card">
            <div className="glass-card" style={{ padding: "20px 22px", borderRight: "4px solid #7e22ce", height: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: "0.84rem", color: "var(--text-muted)", fontWeight: "700" }}>المستخدمون العاديون (Users)</div>
                  <div className="num-font" dir="ltr" style={{ fontSize: "1.8rem", fontWeight: "900", color: "#7e22ce", marginTop: "4px" }}>
                    {formatNumber(regularCount)}
                  </div>
                </div>
                <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "#faf5ff", color: "#9333ea", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <User size={22} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mobile Swipe Hint */}
        <div className="swiper-mobile-hint">
          <span>👈 اسحب لمشاهدة باقي الإحصائيات 👉</span>
        </div>

        {/* Users Management Panel */}
        <section className="glass-panel" style={{ padding: "24px" }}>
          {/* Toolbar */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "14px",
            marginBottom: "20px"
          }}>
            <div style={{ position: "relative", minWidth: "280px", flex: 1, maxWidth: "420px" }}>
              <input 
                type="text"
                className="form-input"
                placeholder="بحث بالاسم أو البريد الإلكتروني..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingRight: "40px" }}
              />
              <Search size={18} color="#db2777" style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)" }} />
            </div>

            {/* Role Filter Buttons */}
            <div style={{ display: "flex", gap: "8px" }}>
              <button 
                onClick={() => setSelectedRoleFilter("all")}
                className={selectedRoleFilter === "all" ? "btn-primary" : "btn-secondary"}
                style={{ padding: "8px 14px", fontSize: "0.84rem" }}
              >
                الكل ({totalUsersCount})
              </button>
              <button 
                onClick={() => setSelectedRoleFilter("admin")}
                className={selectedRoleFilter === "admin" ? "btn-primary" : "btn-secondary"}
                style={{ padding: "8px 14px", fontSize: "0.84rem" }}
              >
                المسؤولون ({adminCount})
              </button>
              <button 
                onClick={() => setSelectedRoleFilter("user")}
                className={selectedRoleFilter === "user" ? "btn-primary" : "btn-secondary"}
                style={{ padding: "8px 14px", fontSize: "0.84rem" }}
              >
                المستخدمون ({regularCount})
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="table-container">
            {loadingUsers ? (
              <div style={{ textAlign: "center", padding: "40px" }}>
                <p style={{ color: "var(--text-muted)", fontWeight: "700" }}>جاري تحميل قائمة المستخدمين من Firestore...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px" }}>
                <p style={{ color: "var(--text-muted)", fontWeight: "700" }}>لا يوجد أي مستخدم مطابق لخيارات البحث</p>
              </div>
            ) : (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>اسم المستخدم</th>
                    <th>البريد الإلكتروني</th>
                    <th>الصلاحية الحالية (Role)</th>
                    <th>تاريخ التسجيل</th>
                    <th style={{ textAlign: "center" }}>تغيير الصلاحية</th>
                    <th style={{ textAlign: "center" }}>حذف الحساب</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => {
                    const isCurrentUser = u.uid === user?.uid;
                    const isTargetAdmin = u.role === "admin";
                    const isUpdating = updatingUserId === u.uid;

                    return (
                      <tr key={u.uid || u.id}>
                        {/* User info */}
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "50%",
                              background: isTargetAdmin ? "#fdf2f8" : "#f3e8ff",
                              color: isTargetAdmin ? "#db2777" : "#7e22ce",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: "900",
                              fontSize: "0.9rem",
                              border: `1.5px solid ${isTargetAdmin ? "#fbcfe8" : "#e9d5ff"}`
                            }}>
                              {u.displayName ? u.displayName[0].toUpperCase() : "U"}
                            </div>
                            <div>
                              <div style={{ fontWeight: "800", color: "#1e1322" }}>
                                {u.displayName || "مستخدم مخزن"}
                                {isCurrentUser && (
                                  <span style={{ fontSize: "0.72rem", background: "#fdf2f8", color: "#db2777", padding: "2px 6px", borderRadius: "6px", marginRight: "6px", fontWeight: "700" }}>
                                    أنت (الحساب الحالي)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td>
                          <span className="num-font" dir="ltr" style={{ color: "#4a3650", fontWeight: "600", fontSize: "0.9rem" }}>
                            {u.email || "—"}
                          </span>
                        </td>

                        {/* Role Badge */}
                        <td>
                          {isTargetAdmin ? (
                            <span className="badge" style={{ background: "#fffbeb", color: "#b45309", border: "1px solid #fde68a" }}>
                              👑 مسؤول (Admin)
                            </span>
                          ) : (
                            <span className="badge" style={{ background: "#faf5ff", color: "#7e22ce", border: "1px solid #e9d5ff" }}>
                              👤 مستخدم (User)
                            </span>
                          )}
                        </td>

                        {/* Date */}
                        <td>
                          <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontWeight: "600" }}>
                            {u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString("ar-EG") : "مسجل حديثاً"}
                          </span>
                        </td>

                        {/* Toggle Role Action */}
                        <td style={{ textAlign: "center" }}>
                          <button
                            onClick={() => handleToggleRole(u)}
                            disabled={isCurrentUser || isUpdating}
                            className="btn-secondary"
                            style={{
                              padding: "6px 12px",
                              fontSize: "0.8rem",
                              fontWeight: "700",
                              opacity: isCurrentUser ? 0.5 : 1,
                              cursor: isCurrentUser ? "not-allowed" : "pointer"
                            }}
                            title={isCurrentUser ? "لا يمكنك تغيير رتبة حسابك الحالي" : (isTargetAdmin ? "تحويل إلى مستخدم عادي" : "ترقية إلى مسؤول")}
                          >
                            {isUpdating ? "جاري الحفظ..." : (isTargetAdmin ? "تحويل لـ User 👤" : "ترقية لـ Admin 👑")}
                          </button>
                        </td>

                        {/* Delete User Action */}
                        <td style={{ textAlign: "center" }}>
                          <button
                            onClick={() => setUserToDelete(u)}
                            disabled={isCurrentUser}
                            className="btn-danger"
                            style={{
                              padding: "6px 10px",
                              fontSize: "0.8rem",
                              opacity: isCurrentUser ? 0.5 : 1,
                              cursor: isCurrentUser ? "not-allowed" : "pointer"
                            }}
                            title={isCurrentUser ? "لا يمكنك حذف حسابك الحالي" : "حذف المستخدم"}
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="modal-overlay" onClick={() => setUserToDelete(null)}>
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
              تأكيد حذف حساب المستخدم
            </h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "20px", fontWeight: "600", lineHeight: "1.6" }}>
              هل أنت متأكد من حذف الحساب <strong style={{ color: "#1e1322" }}>"{userToDelete.displayName || userToDelete.email}"</strong> من النظام؟
            </p>

            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button 
                onClick={() => setUserToDelete(null)}
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
                نعم، احذف الحساب
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
