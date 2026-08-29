"use client";

import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("Nelly PWA ServiceWorker registered with scope:", registration.scope);
          })
          .catch((error) => {
            console.warn("ServiceWorker registration failed:", error);
          });
      });
    }
  }, []);

  return null;
}
