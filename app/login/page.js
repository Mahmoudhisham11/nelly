"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { 
  Lock, 
  Mail, 
  User, 
  AlertCircle,
  CheckCircle2,
  LogIn,
  UserPlus
} from "lucide-react";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();
  const { 
    user, 
    loginWithEmail, 
    registerWithEmail, 
    loading 
  } = useAuth();

  const [activeTab, setActiveTab] = useState("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && !loading) {
      router.push("/");
    }
  }, [user, loading, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!email.trim() || !password.trim()) {
      setErrorMsg("يرجى ملء جميع الحقول المطلوبة.");
      return;
    }

    if (activeTab === "register") {
      if (!name.trim()) {
        setErrorMsg("يرجى كتابة اسمك الكامل.");
        return;
      }
      if (password.length < 4) {
        setErrorMsg("كلمة المرور يجب ألا تقل عن 4 أحرف.");
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg("كلمات المرور غير متطابقة.");
        return;
      }

      setIsSubmitting(true);
      const res = await registerWithEmail(name, email, password);
      setIsSubmitting(false);

      if (res && res.success) {
        setSuccessMsg("تم إنشاء حسابك بنجاح! جاري تحويلك للمخزن...");
        setTimeout(() => router.push("/"), 700);
      } else {
        setErrorMsg(res?.error || "حدث خطأ أثناء إنشاء الحساب.");
      }
    } else {
      setIsSubmitting(true);
      const res = await loginWithEmail(email, password);
      setIsSubmitting(false);

      if (res && res.success) {
        router.push("/");
      } else {
        setErrorMsg(res?.error || "البريد الإلكتروني أو كلمة المرور غير صحيحة.");
      }
    }
  };

  return (
    <div className={styles.loginPageWrapper}>
      {/* Ambient background glows */}
      <div className={styles.ambientGlowTop} />
      <div className={styles.ambientGlowBottom} />

      <div className={`glass-panel ${styles.loginCard}`}>
        {/* Brand Header */}
        <div className={styles.brandHeader}>
          <div className={styles.brandLogoBox}>
            N
          </div>
          <h1 className={styles.brandTitle}>
            مخزن <span className="gradient-text-rose">Nelly</span> للميكاب
          </h1>
          <p className={styles.brandSubtitle}>
            نظام إدارة وجرد المخزون وتحديد الصلاحيات
          </p>
        </div>

        {/* Tab Selector: Sign In vs Register */}
        <div className={styles.tabSelector}>
          <button
            type="button"
            onClick={() => { setActiveTab("signin"); setErrorMsg(""); setSuccessMsg(""); }}
            className={`${styles.tabButton} ${activeTab === "signin" ? styles.tabActive : styles.tabInactive}`}
          >
            <LogIn size={16} />
            تسجيل الدخول
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab("register"); setErrorMsg(""); setSuccessMsg(""); }}
            className={`${styles.tabButton} ${activeTab === "register" ? styles.tabActive : styles.tabInactive}`}
          >
            <UserPlus size={16} />
            إنشاء حساب جديد
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className={styles.alertError}>
            <AlertCircle size={17} className={styles.alertIcon} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className={styles.alertSuccess}>
            <CheckCircle2 size={17} className={styles.alertIcon} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit}>
          {activeTab === "register" && (
            <div className="form-group">
              <label className="form-label">الاسم الكامل <span className={styles.requiredAsterisk}>*</span></label>
              <div className={styles.inputWrapper}>
                <input 
                  type="text"
                  className={`form-input ${styles.inputWithIcon}`}
                  placeholder="مثال: أحمد محمد"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <User size={18} className={styles.inputIcon} />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">البريد الإلكتروني <span className={styles.requiredAsterisk}>*</span></label>
            <div className={styles.inputWrapper}>
              <input 
                type="email"
                className={`form-input num-font ${styles.inputWithIconRtl}`}
                dir="ltr"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Mail size={18} className={styles.inputIcon} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">كلمة المرور <span className={styles.requiredAsterisk}>*</span></label>
            <div className={styles.inputWrapper}>
              <input 
                type="password"
                className={`form-input num-font ${styles.inputWithIconRtl}`}
                dir="ltr"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Lock size={18} className={styles.inputIcon} />
            </div>
          </div>

          {activeTab === "register" && (
            <div className="form-group">
              <label className="form-label">تأكيد كلمة المرور <span className={styles.requiredAsterisk}>*</span></label>
              <div className={styles.inputWrapper}>
                <input 
                  type="password"
                  className={`form-input num-font ${styles.inputWithIconRtl}`}
                  dir="ltr"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <Lock size={18} className={styles.inputIcon} />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={`btn-primary ${styles.submitBtn}`}
          >
            {isSubmitting ? "جاري المعالجة..." : (activeTab === "register" ? "إنشاء الحساب والتسجيل" : "تسجيل الدخول")}
          </button>
        </form>

        {/* Footer info */}
        <div className={styles.footerCopyright}>
          جميع الحقوق محفوظة © متجر ومخزن Nelly للميكاب
        </div>
      </div>
    </div>
  );
}
