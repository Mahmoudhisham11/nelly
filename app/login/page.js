"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { 
  Sparkles, 
  Lock, 
  Mail, 
  User, 
  AlertCircle,
  CheckCircle2,
  LogIn,
  UserPlus
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { 
    user, 
    loginWithGoogle, 
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
      if (password.length < 6) {
        setErrorMsg("كلمة المرور يجب ألا تقل عن 6 أحرف.");
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
        setTimeout(() => router.push("/"), 800);
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

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    setErrorMsg("");
    try {
      const res = await loginWithGoogle();
      if (res && res.success) {
        router.push("/");
      } else if (res && !res.success) {
        if (res.error?.includes("auth/popup-closed-by-user")) {
          setErrorMsg("تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية.");
        } else {
          setErrorMsg(res.error || "حدث خطأ أثناء تسجيل الدخول بحساب Google.");
        }
      }
    } catch (e) {
      setErrorMsg("تعذر تسجيل الدخول، يرجى المحاولة مرة أخرى.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      position: "relative",
      overflow: "hidden",
      backgroundColor: "var(--bg-main)"
    }}>
      {/* Ambient background glows */}
      <div style={{
        position: "absolute",
        top: "6%",
        left: "10%",
        width: "420px",
        height: "420px",
        background: "radial-gradient(circle, rgba(244, 114, 182, 0.2) 0%, transparent 70%)",
        filter: "blur(60px)",
        pointerEvents: "none"
      }} />
      <div style={{
        position: "absolute",
        bottom: "6%",
        right: "10%",
        width: "450px",
        height: "450px",
        background: "radial-gradient(circle, rgba(192, 132, 252, 0.16) 0%, transparent 70%)",
        filter: "blur(70px)",
        pointerEvents: "none"
      }} />

      <div className="glass-panel" style={{
        width: "100%",
        maxWidth: "480px",
        padding: "36px 32px",
        position: "relative",
        zIndex: 10,
        backgroundColor: "#ffffff",
        boxShadow: "0 25px 60px rgba(219, 39, 119, 0.12), 0 4px 16px rgba(0, 0, 0, 0.04)",
        border: "1.5px solid #fbcfe8",
        borderRadius: "24px"
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{
            width: "65px",
            height: "65px",
            borderRadius: "20px",
            background: "linear-gradient(135deg, #ec4899 0%, #db2777 60%, #be185d 100%)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 25px rgba(219, 39, 119, 0.35)",
            color: "#ffffff",
            fontSize: "2rem",
            fontWeight: "900",
            marginBottom: "12px"
          }}>
            N
          </div>
          <h1 style={{ fontSize: "1.65rem", fontWeight: "900", marginBottom: "4px", color: "#1e1322" }}>
            مخزن <span className="gradient-text-rose">Nelly</span> للميكاب
          </h1>
          <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", fontWeight: "600" }}>
            نظام إدارة وجرد المخزون وتحديد الصلاحيات
          </p>
        </div>

        {/* Tab Selector: Sign In vs Register */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "6px",
          background: "#fdf2f8",
          padding: "5px",
          borderRadius: "14px",
          marginBottom: "20px",
          border: "1px solid #fce7f3"
        }}>
          <button
            type="button"
            onClick={() => { setActiveTab("signin"); setErrorMsg(""); setSuccessMsg(""); }}
            style={{
              padding: "10px",
              borderRadius: "10px",
              border: "none",
              background: activeTab === "signin" ? "#ffffff" : "transparent",
              color: activeTab === "signin" ? "#db2777" : "#5a4663",
              fontWeight: "800",
              fontSize: "0.92rem",
              cursor: "pointer",
              boxShadow: activeTab === "signin" ? "0 2px 8px rgba(219, 39, 119, 0.12)" : "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transition: "all 0.2s ease"
            }}
          >
            <LogIn size={16} />
            تسجيل الدخول
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab("register"); setErrorMsg(""); setSuccessMsg(""); }}
            style={{
              padding: "10px",
              borderRadius: "10px",
              border: "none",
              background: activeTab === "register" ? "#ffffff" : "transparent",
              color: activeTab === "register" ? "#db2777" : "#5a4663",
              fontWeight: "800",
              fontSize: "0.92rem",
              cursor: "pointer",
              boxShadow: activeTab === "register" ? "0 2px 8px rgba(219, 39, 119, 0.12)" : "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transition: "all 0.2s ease"
            }}
          >
            <UserPlus size={16} />
            إنشاء حساب جديد
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "12px",
            padding: "11px 14px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "flex-start",
            gap: "8px",
            color: "#b91c1c",
            fontSize: "0.85rem",
            fontWeight: "600"
          }}>
            <AlertCircle size={17} style={{ flexShrink: 0, marginTop: "2px" }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div style={{
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            borderRadius: "12px",
            padding: "11px 14px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "flex-start",
            gap: "8px",
            color: "#047857",
            fontSize: "0.85rem",
            fontWeight: "600"
          }}>
            <CheckCircle2 size={17} style={{ flexShrink: 0, marginTop: "2px" }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} style={{ marginBottom: "18px" }}>
          {activeTab === "register" && (
            <div className="form-group">
              <label className="form-label">الاسم الكامل <span style={{ color: "#db2777" }}>*</span></label>
              <div style={{ position: "relative" }}>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="مثال: أحمد محمد"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ paddingRight: "40px" }}
                  required
                />
                <User size={18} color="#db2777" style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)" }} />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">البريد الإلكتروني <span style={{ color: "#db2777" }}>*</span></label>
            <div style={{ position: "relative" }}>
              <input 
                type="email"
                className="form-input num-font"
                dir="ltr"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingRight: "40px", textAlign: "right" }}
                required
              />
              <Mail size={18} color="#db2777" style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)" }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">كلمة المرور <span style={{ color: "#db2777" }}>*</span></label>
            <div style={{ position: "relative" }}>
              <input 
                type="password"
                className="form-input num-font"
                dir="ltr"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingRight: "40px", textAlign: "right" }}
                required
              />
              <Lock size={18} color="#db2777" style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)" }} />
            </div>
          </div>

          {activeTab === "register" && (
            <div className="form-group">
              <label className="form-label">تأكيد كلمة المرور <span style={{ color: "#db2777" }}>*</span></label>
              <div style={{ position: "relative" }}>
                <input 
                  type="password"
                  className="form-input num-font"
                  dir="ltr"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ paddingRight: "40px", textAlign: "right" }}
                  required
                />
                <Lock size={18} color="#db2777" style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)" }} />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary"
            style={{ width: "100%", padding: "12px", fontSize: "1rem" }}
          >
            {isSubmitting ? "جاري المعالجة..." : (activeTab === "register" ? "إنشاء الحساب والتسجيل" : "تسجيل الدخول")}
          </button>
        </form>

        {/* Divider */}
        <div style={{
          display: "flex",
          alignItems: "center",
          margin: "18px 0",
          color: "var(--text-muted)",
          fontSize: "0.8rem",
          fontWeight: "600"
        }}>
          <div style={{ flex: 1, height: "1px", background: "#f0e1ec" }} />
          <span style={{ padding: "0 10px" }}>أو الدخول السريع عبر</span>
          <div style={{ flex: 1, height: "1px", background: "#f0e1ec" }} />
        </div>

        {/* Google Sign In Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={isSubmitting}
          type="button"
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            padding: "12px 18px",
            background: "#ffffff",
            color: "#1e1322",
            borderRadius: "12px",
            border: "1.5px solid #e5e7eb",
            fontSize: "0.95rem",
            fontWeight: "700",
            cursor: isSubmitting ? "not-allowed" : "pointer",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
            transition: "all 0.2s ease"
          }}
          onMouseEnter={(e) => {
            if (!isSubmitting) {
              e.currentTarget.style.borderColor = "#db2777";
              e.currentTarget.style.background = "#fdf9fc";
            }
          }}
          onMouseLeave={(e) => {
            if (!isSubmitting) {
              e.currentTarget.style.borderColor = "#e5e7eb";
              e.currentTarget.style.background = "#ffffff";
            }
          }}
        >
          {/* Google Icon */}
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>تسجيل الدخول باستخدام Google</span>
        </button>

        {/* Footer info */}
        <div style={{
          marginTop: "24px",
          textAlign: "center",
          fontSize: "0.78rem",
          color: "var(--text-muted)",
          fontWeight: "600"
        }}>
          جميع الحقوق محفوظة © متجر ومخزن Nelly للميكاب
        </div>
      </div>
    </div>
  );
}
