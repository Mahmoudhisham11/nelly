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
  ShieldAlert, 
  Trash2, 
  Search, 
  ArrowLeft, 
  Crown,
  User,
  Sparkles,
  Eye,
  EyeOff
} from "lucide-react";
import styles from "./settings.module.css";

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
  const [revealedPasswords, setRevealedPasswords] = useState({});

  const togglePasswordReveal = (userId) => {
    setRevealedPasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

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
      <div className={styles.authLoadingWrapper}>
        <p className={styles.authLoadingText}>جاري التحقق من الصلاحيات...</p>
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
          <main className={`page-wrapper ${styles.permissionDeniedWrapper}`}>
            <div className={`glass-panel ${styles.permissionDeniedCard}`}>
              <div className={styles.permissionDeniedIcon}>
                <ShieldAlert size={40} />
              </div>

              <h2 className={styles.permissionDeniedTitle}>
                ليس لديك صلاحية لدخول هذه الصفحة
              </h2>

              <p className={styles.permissionDeniedDesc}>
                عذراً، صفحة إعدادات التطبيق وإدارة حسابات وصلاحيات المستخدمين مخصصة ومحمية حصرياً لـ <strong className={styles.permissionDeniedHighlight}>مسؤول المخزن (Admin)</strong>.
              </p>

              <div className={styles.permissionDeniedRoleBox}>
                <span className={styles.roleBoxLabel}>رتبة حسابك الحالية:</span>
                <span className={styles.roleBoxBadge}>
                  👤 مستخدم عادي (User)
                </span>
              </div>

              <div className={styles.permissionDeniedActions}>
                <Link href="/" className={`btn-primary ${styles.returnHomeBtn}`}>
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
            <div className={styles.toastWrapper}>
              <Sparkles size={18} color="#f472b6" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Page Header */}
          <div className={styles.headerRow}>
            <div>
              <div className={styles.headerTitleWrapper}>
                <div className={styles.headerIconBox}>
                  <Settings size={22} />
                </div>
                <h2 className={styles.headerTitle}>إعدادات النظام وإدارة المستخدمين</h2>
              </div>
              <p className={styles.headerSubtitle}>
                التحكم في حسابات المستخدمين، تعديل الرتب والصلاحيات (Admin / User)، وإدارة الأذونات
              </p>
            </div>
          </div>

          {/* Stats Cards (Swiper on Mobile, Grid on Desktop) */}
          <section className="mobile-cards-swiper">
            <div className="mobile-swiper-card">
              <div className={`glass-card ${styles.statCardUsers}`}>
                <div className={styles.statInner}>
                  <div>
                    <div className={styles.statLabel}>إجمالي المستخدمين المسجلين</div>
                    <div className={`num-font ${styles.statValue}`} dir="ltr">
                      {formatNumber(totalUsersCount)}
                    </div>
                  </div>
                  <div className={styles.iconUsers}>
                    <Users size={22} />
                  </div>
                </div>
              </div>
            </div>

            <div className="mobile-swiper-card">
              <div className={`glass-card ${styles.statCardAdmins}`}>
                <div className={styles.statInner}>
                  <div>
                    <div className={styles.statLabel}>مسؤولو المخزن (Admins)</div>
                    <div className={`num-font ${styles.statValueAdmins}`} dir="ltr">
                      {formatNumber(adminCount)}
                    </div>
                  </div>
                  <div className={styles.iconAdmins}>
                    <Crown size={22} />
                  </div>
                </div>
              </div>
            </div>

            <div className="mobile-swiper-card">
              <div className={`glass-card ${styles.statCardRegular}`}>
                <div className={styles.statInner}>
                  <div>
                    <div className={styles.statLabel}>المستخدمون العاديون (Users)</div>
                    <div className={`num-font ${styles.statValueRegular}`} dir="ltr">
                      {formatNumber(regularCount)}
                    </div>
                  </div>
                  <div className={styles.iconRegular}>
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
          <section className={`glass-panel ${styles.panel}`}>
            {/* Toolbar */}
            <div className={styles.toolbar}>
              <div className={styles.searchWrapper}>
                <input 
                  type="text"
                  className={`form-input ${styles.searchInput}`}
                  placeholder="بحث بالاسم أو البريد الإلكتروني..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search size={18} color="#db2777" className={styles.searchIcon} />
              </div>

              {/* Role Filter Buttons */}
              <div className={styles.filterGroup}>
                <button 
                  onClick={() => setSelectedRoleFilter("all")}
                  className={`${selectedRoleFilter === "all" ? "btn-primary" : "btn-secondary"} ${styles.filterBtn}`}
                >
                  الكل ({totalUsersCount})
                </button>
                <button 
                  onClick={() => setSelectedRoleFilter("admin")}
                  className={`${selectedRoleFilter === "admin" ? "btn-primary" : "btn-secondary"} ${styles.filterBtn}`}
                >
                  المسؤولون ({adminCount})
                </button>
                <button 
                  onClick={() => setSelectedRoleFilter("user")}
                  className={`${selectedRoleFilter === "user" ? "btn-primary" : "btn-secondary"} ${styles.filterBtn}`}
                >
                  المستخدمون ({regularCount})
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div className="table-container">
              {loadingUsers ? (
                <div className={styles.loadingOrEmptyBox}>
                  <p className={styles.loadingOrEmptyText}>جاري تحميل قائمة المستخدمين من Firestore...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className={styles.loadingOrEmptyBox}>
                  <p className={styles.loadingOrEmptyText}>لا يوجد أي مستخدم مطابق لخيارات البحث</p>
                </div>
              ) : (
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>اسم المستخدم</th>
                      <th>البريد الإلكتروني</th>
                      <th>كلمة المرور</th>
                      <th>الصلاحية الحالية (Role)</th>
                      <th>تاريخ التسجيل</th>
                      <th className={styles.centerTh}>تغيير الصلاحية</th>
                      <th className={styles.centerTh}>حذف الحساب</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => {
                      const isCurrentUser = u.uid === user?.uid;
                      const isTargetAdmin = u.role === "admin";
                      const isUpdating = updatingUserId === u.uid;
                      const isPassRevealed = !!revealedPasswords[u.uid || u.id];

                      return (
                        <tr key={u.uid || u.id}>
                          {/* User info */}
                          <td>
                            <div className={styles.userAvatarWrapper}>
                              <div className={isTargetAdmin ? styles.userAvatarAdmin : styles.userAvatarRegular}>
                                {u.displayName ? u.displayName[0].toUpperCase() : "U"}
                              </div>
                              <div>
                                <div className={styles.userNameText}>
                                  {u.displayName || "مستخدم مخزن"}
                                  {isCurrentUser && (
                                    <span className={styles.currentUserBadge}>
                                      أنت (الحساب الحالي)
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Email */}
                          <td>
                            <span className={`num-font ${styles.emailText}`} dir="ltr">
                              {u.email || "—"}
                            </span>
                          </td>

                          {/* Password */}
                          <td>
                            <div className={styles.passwordRow}>
                              <span 
                                className={`num-font ${isPassRevealed ? styles.passwordFieldRevealed : styles.passwordFieldHidden}`} 
                                dir="ltr"
                              >
                                {isPassRevealed ? (u.password || "—") : "••••••••"}
                              </span>
                              {u.password && (
                                <button
                                  type="button"
                                  onClick={() => togglePasswordReveal(u.uid || u.id)}
                                  className={styles.passwordToggleBtn}
                                  title={isPassRevealed ? "إخفاء كلمة المرور" : "عرض كلمة المرور"}
                                >
                                  {isPassRevealed ? <EyeOff size={15} color="#db2777" /> : <Eye size={15} />}
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Role Badge */}
                          <td>
                            {isTargetAdmin ? (
                              <span className={`badge ${styles.badgeAdmin}`}>
                                👑 مسؤول (Admin)
                              </span>
                            ) : (
                              <span className={`badge ${styles.badgeUser}`}>
                                👤 مستخدم (User)
                              </span>
                            )}
                          </td>

                          {/* Date */}
                          <td>
                            <span className={styles.dateText}>
                              {u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString("ar-EG") : "مسجل حديثاً"}
                            </span>
                          </td>

                          {/* Toggle Role Action */}
                          <td className={styles.centerTd}>
                            <button
                              onClick={() => handleToggleRole(u)}
                              disabled={isCurrentUser || isUpdating}
                              className={`btn-secondary ${styles.roleActionBtn} ${isCurrentUser ? styles.btnDisabled : styles.btnEnabled}`}
                              title={isCurrentUser ? "لا يمكنك تغيير رتبة حسابك الحالي" : (isTargetAdmin ? "تحويل إلى مستخدم عادي" : "ترقية إلى مسؤول")}
                            >
                              {isUpdating ? "جاري الحفظ..." : (isTargetAdmin ? "تحويل لـ User 👤" : "ترقية لـ Admin 👑")}
                            </button>
                          </td>

                          {/* Delete User Action */}
                          <td className={styles.centerTd}>
                            <button
                              onClick={() => setUserToDelete(u)}
                              disabled={isCurrentUser}
                              className={`btn-danger ${styles.deleteActionBtn} ${isCurrentUser ? styles.btnDisabled : styles.btnEnabled}`}
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
              className={`modal-content ${styles.modalCard}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.deleteModalIcon}>
                <Trash2 size={26} />
              </div>

              <h3 className={styles.deleteModalTitle}>
                تأكيد حذف حساب المستخدم
              </h3>
              <p className={styles.deleteModalDesc}>
                هل أنت متأكد من حذف الحساب <strong className={styles.deleteModalUserHighlight}>"{userToDelete.displayName || userToDelete.email}"</strong> من النظام؟
              </p>

              <div className={styles.deleteModalActions}>
                <button 
                  onClick={() => setUserToDelete(null)}
                  className={`btn-secondary ${styles.cancelModalBtn}`}
                >
                  إلغاء
                </button>
                <button 
                  onClick={handleConfirmDelete}
                  className={`btn-danger ${styles.confirmDeleteModalBtn}`}
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
