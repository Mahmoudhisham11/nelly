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
        <form onSubmit={handleSubmit}>
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
            style={{ width: "100%", padding: "12px", fontSize: "1rem", marginTop: "10px" }}
          >
            {isSubmitting ? "جاري المعالجة..." : (activeTab === "register" ? "إنشاء الحساب والتسجيل" : "تسجيل الدخول")}
          </button>
        </form>

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
