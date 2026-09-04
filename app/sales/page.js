"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SalesPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/pos");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--bg-main)]">
      <div className="text-center p-6 bg-white rounded-2xl border shadow-sm">
        <div className="spinner-border animate-spin mx-auto mb-3"></div>
        <p className="text-sm font-bold text-[var(--text-primary)]">
          تم نقل فواتير المبيعات إلى نقطة البيع وتقفيلة الأيام... جاري التحويل
        </p>
      </div>
    </div>
  );
}
