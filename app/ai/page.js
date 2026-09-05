"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import AiMarkdownRenderer from "@/components/AiMarkdownRenderer";
import { subscribeToProducts } from "@/lib/productsService";
import { subscribeToShopProducts } from "@/lib/shopService";
import { subscribeToSales, subscribeToReports } from "@/lib/salesService";
import { subscribeToExpenseItems, subscribeToMonthlyExpenses, subscribeToAllMonthlyExpenses } from "@/lib/expensesService";
import { subscribeToCustomers } from "@/lib/customersService";
import { subscribeToSuppliers } from "@/lib/suppliersService";
import { 
  buildStoreContextSnapshot, 
  sendChatMessage 
} from "@/lib/aiService";
import { 
  Sparkles, 
  Bot, 
  Send, 
  User, 
  RotateCcw, 
  Copy, 
  Check, 
  Zap, 
  Menu, 
  Mic, 
  Square, 
  Trash2 
} from "lucide-react";

export default function AIAssistantPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Real-time store state
  const [warehouseProducts, setWarehouseProducts] = useState([]);
  const [shopProducts, setShopProducts] = useState([]);
  const [salesInvoices, setSalesInvoices] = useState([]);
  const [shiftReports, setShiftReports] = useState([]);
  const [expenseItems, setExpenseItems] = useState([]);
  const [monthlyExpensesMap, setMonthlyExpensesMap] = useState({});
  const [allMonthlyExpenses, setAllMonthlyExpenses] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // Chat states
  const [messages, setMessages] = useState([]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Voice Recording & Speech Recognition States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recognitionRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const liveTranscriptRef = useRef("");

  const chatBottomRef = useRef(null);
  const textareaRef = useRef(null);

  // Auth protection
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Subscriptions
  useEffect(() => {
    if (!user) return;
    const u1 = subscribeToProducts(setWarehouseProducts);
    const u2 = subscribeToShopProducts(setShopProducts);
    const u3 = subscribeToSales(setSalesInvoices);
    const u4 = subscribeToReports(setShiftReports);
    const curMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    const u5 = subscribeToExpenseItems(setExpenseItems);
    const u6 = subscribeToMonthlyExpenses(curMonthKey, setMonthlyExpensesMap);
    const u6b = subscribeToAllMonthlyExpenses(setAllMonthlyExpenses);
    const u7 = subscribeToCustomers(setCustomers);
    const u8 = subscribeToSuppliers(setSuppliers);

    return () => {
      u1(); u2(); u3(); u4(); u5(); u6(); u6b(); u7(); u8();
    };
  }, [user]);

  // Initial greeting message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content: `مرحباً بك! أنا **مستشار نيللي للأعمال والذكاء الاصطناعي (Nelly AI Advisor)** 🌸✨

أنا متصل لحظياً بكافة أرقام وبيانات المتجر:
- 📦 **المخزن والمحل:** متابعة النواقص والأصناف الموشكة على النفاد.
- 🔥 **المبيعات والطلب:** حصر أكثر المنتجات مبيعاً وتكرار الشراء.
- 💵 **المصروفات والأرباح:** تحليل صافي ربحك اليومي والشهري ومتابعة جميع بنود المصاريف المسجلة.
- 🎯 **الخطط المالية:** يمكنك أن تطلب مني أي هدف مالي (مثال: *"عايز اجمع 50 ألف جنية"*) وسأقوم بوضع خطة مبيعات تفصيلية بالأيام والمنتجات الأكثر ربحاً.
- 🎙️ **التسجيل الصوتي:** اضغط على الميكروفون وتحدث بصوتك، وبمجرد إيقاف التسجيل ستُرسل رسالتك فوراً للـ AI!`
        }
      ]);
    }
  }, [messages.length]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  // Store context snapshot
  const storeContext = useMemo(() => {
    return buildStoreContextSnapshot({
      warehouseProducts,
      shopProducts,
      salesInvoices,
      shiftReports,
      expenseItems,
      monthlyExpensesMap,
      allMonthlyExpenses,
      customers,
      suppliers
    });
  }, [
    warehouseProducts,
    shopProducts,
    salesInvoices,
    shiftReports,
    expenseItems,
    monthlyExpensesMap,
    allMonthlyExpenses,
    customers,
    suppliers
  ]);

  // Auto scroll
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating, isRecording]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputPrompt]);

  // Cleanup voice timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  // Send message handler
  const handleSendMessage = async (textToSend = "") => {
    const query = (textToSend || inputPrompt || liveTranscriptRef.current).trim();
    if (!query || isGenerating) return;

    liveTranscriptRef.current = "";

    const newMessages = [
      ...messages,
      { role: "user", content: query }
    ];

    setMessages(newMessages);
    setInputPrompt("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setIsGenerating(true);

    try {
      const result = await sendChatMessage({
        messages: newMessages,
        storeContext: storeContext
      });

      if (result && result.content) {
        setMessages([
          ...newMessages,
          { role: "assistant", content: result.content }
        ]);
      }
    } catch (err) {
      console.error("Chat error:", err);
      const errMsg = err.message || "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي.";
      setMessages([
        ...newMessages,
        { 
          role: "assistant", 
          content: `⚠️ **تنبيه:** ${errMsg}` 
        }
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Voice Recording / Speech-to-Text handler
  const startVoiceRecording = () => {
    const SpeechRecognition = typeof window !== "undefined" 
      ? (window.SpeechRecognition || window.webkitSpeechRecognition) 
      : null;

    if (!SpeechRecognition) {
      showToast("المتصفح لا يدعم التسجيل الصوتي المباشر، يرجى استخدام متصفح حديث مثل Google Chrome.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "ar-EG";
      recognition.continuous = true;
      recognition.interimResults = true;

      liveTranscriptRef.current = "";

      recognition.onstart = () => {
        setIsRecording(true);
        setRecordingSeconds(0);
        timerIntervalRef.current = setInterval(() => {
          setRecordingSeconds(prev => prev + 1);
        }, 1000);
      };

      recognition.onresult = (event) => {
        let transcript = "";
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript + " ";
        }
        const cleaned = transcript.trim();
        liveTranscriptRef.current = cleaned;
        setInputPrompt(cleaned);
      };

      recognition.onerror = (event) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          showToast("يرجى إعطاء صلاحية الميكروفون للمتصفح لتسجيل الصوت.");
        }
        stopVoiceRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      showToast("تعذر بدء تسجيل الصوت.");
      setIsRecording(false);
    }
  };

  // When stopping recording, immediately send message by default
  const stopVoiceRecording = (andSend = true) => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    setIsRecording(false);

    const messageToSend = liveTranscriptRef.current || inputPrompt;

    if (andSend && messageToSend.trim()) {
      setTimeout(() => {
        handleSendMessage(messageToSend);
      }, 100);
    }
  };

  const cancelVoiceRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    setIsRecording(false);
    liveTranscriptRef.current = "";
    setInputPrompt("");
    showToast("تم إلغاء التسجيل الصوتي.");
  };

  // Copy message handler
  const handleCopyMessage = (content, idx) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(content);
      setCopiedIndex(idx);
      setTimeout(() => setCopiedIndex(null), 2000);
      showToast("تم نسخ الإجابة.");
    }
  };

  // Quick suggestions
  const quickSuggestions = [
    { label: "🎯 خطة جمع 50,000 ج.م", query: "عايز خطة مالية واضحة ومفصلة لجمع 50 ألف جنية من أرباح المتجر بناءً على متوسط مصاريفي وأرباحي اليومية والمنتجات الأكثر ربحاً." },
    { label: "⚠️ نواقص المخزن والمحل", query: "ما هي الأصناف التي أوشكت على النفاد بالمخزن والمحل وتحتاج لإعادة طلب فوري؟" },
    { label: "🔥 المنتجات الأكثر مبيعاً", query: "ما هي أكثر المنتجات مبيعاً وضغطاً في المحل والتي يجب تكرارها وشراء كميات إضافية منها؟" },
    { label: "📊 تحليل الأرباح والمصاريف", query: "احسب لي متوسط مبيعاتي ومصروفاتي وصافي ربحي اليومي الفعلي." },
    { label: "💡 أفكار لزيادة المبيعات", query: "اقترح عروضاً وباقات مميزة لزيادة مبيعات اليوم وتنشيط البضائع الراكدة." }
  ];

  const totalProducts = (warehouseProducts?.length || 0) + (shopProducts?.length || 0);

  // Format recording time (mm:ss)
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div style={{
      display: "flex",
      width: "100vw",
      height: "100vh",
      height: "100dvh",
      overflow: "hidden",
      background: "#fbf8fa",
      direction: "rtl"
    }}>
      {toastMessage && (
        <div className="fixed-toast-notification">
          <Sparkles className="toast-icon" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar 
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Full-Height Responsive Chat Viewport */}
      <div style={{
        flex: "1",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        height: "100dvh",
        minWidth: "0",
        background: "#ffffff",
        position: "relative"
      }}>
        {/* Top Responsive Chat Header */}
        <div style={{
          height: "60px",
          borderBottom: "1px solid #ebdbe6",
          padding: "0 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#ffffff",
          flexShrink: "0",
          zIndex: "10"
        }}>
          {/* Left Title & Mobile Menu */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: "0" }}>
            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden"
              aria-label="Open sidebar menu"
              style={{
                background: "#faf5f8",
                border: "1px solid #ebdbe6",
                borderRadius: "10px",
                padding: "7px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: "0"
              }}
            >
              <Menu size={18} color="#1e1322" />
            </button>

            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #ec4899 0%, #9333ea 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: "0",
              boxShadow: "0 2px 8px rgba(236, 72, 153, 0.25)"
            }}>
              <Sparkles size={18} />
            </div>

            <div style={{ minWidth: "0", overflow: "hidden" }}>
              <h1 style={{
                fontSize: "1rem",
                fontWeight: "800",
                color: "#1e1322",
                margin: "0",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
              }}>
                مستشار نيللي AI
              </h1>
              <p className="hidden sm:block" style={{ fontSize: "0.74rem", color: "#715b7b", fontWeight: "600", margin: "0", whiteSpace: "nowrap" }}>
                متصل لحظياً بالمخزن والمحل والأرباح
              </p>
            </div>
          </div>

          {/* Right Controls & Status */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: "0" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              background: "#fdf8fb",
              border: "1px solid #ebdbe6",
              padding: "4px 8px",
              borderRadius: "9999px",
              fontSize: "0.72rem",
              fontWeight: "700",
              color: "#1e1322"
            }}>
              <span style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#10b981",
                display: "inline-block"
              }}></span>
              <span className="num-font" style={{ color: "#db2777" }}>{totalProducts}</span>
              <span className="hidden sm:inline">صنف</span>
            </div>

            <button
              type="button"
              onClick={() => setMessages([])}
              style={{
                background: "#faf5f8",
                border: "1px solid #ebdbe6",
                borderRadius: "10px",
                padding: "6px 10px",
                fontSize: "0.75rem",
                fontWeight: "700",
                color: "#1e1322",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                transition: "all 0.15s ease"
              }}
              title="محادثة جديدة"
            >
              <RotateCcw size={12} />
              <span className="hidden sm:inline">جديدة</span>
            </button>
          </div>
        </div>

        {/* Chat Feed */}
        <div style={{
          flex: "1",
          overflowY: "auto",
          padding: "16px 12px 16px 12px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          background: "#faf8fa"
        }}>
          <div style={{
            maxWidth: "860px",
            width: "100%",
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: "16px"
          }}>
            {messages.map((msg, idx) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    gap: "8px",
                    flexDirection: isUser ? "row-reverse" : "row",
                    alignItems: "flex-start",
                    width: "100%"
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "10px",
                    background: isUser ? "#1e1322" : "linear-gradient(135deg, #ec4899 0%, #9333ea 100%)",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: "0",
                    boxShadow: isUser ? "0 2px 6px rgba(30,19,34,0.15)" : "0 2px 8px rgba(236,72,153,0.25)"
                  }}>
                    {isUser ? <User size={16} /> : <Bot size={17} />}
                  </div>

                  {/* Message Bubble Container */}
                  <div style={{
                    maxWidth: "88%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isUser ? "flex-end" : "flex-start",
                    minWidth: "0"
                  }}>
                    {isUser ? (
                      <div style={{
                        background: "#1e1322",
                        color: "#ffffff",
                        padding: "10px 14px",
                        borderRadius: "16px 4px 16px 16px",
                        fontSize: "0.9rem",
                        lineHeight: "1.55",
                        fontWeight: "600",
                        boxShadow: "0 2px 8px rgba(30,19,34,0.1)",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word"
                      }}>
                        {msg.content}
                      </div>
                    ) : (
                      <div style={{
                        background: "#ffffff",
                        border: "1px solid #ebdbe6",
                        borderRadius: "4px 16px 16px 16px",
                        padding: "14px 16px",
                        color: "#1e1322",
                        boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
                        width: "100%",
                        overflowX: "auto"
                      }}>
                        <AiMarkdownRenderer content={msg.content} />

                        {/* Message Actions */}
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          marginTop: "10px",
                          paddingTop: "8px",
                          borderTop: "1px solid #f2e8ef"
                        }}>
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(msg.content, idx)}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: copiedIndex === idx ? "#059669" : "#715b7b",
                              fontSize: "0.72rem",
                              fontWeight: "700",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "2px 6px",
                              borderRadius: "6px"
                            }}
                          >
                            {copiedIndex === idx ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                            <span>{copiedIndex === idx ? "تم النسخ" : "نسخ الإجابة"}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Generating Loading State */}
            {isGenerating && (
              <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                <div style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #ec4899 0%, #9333ea 100%)",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: "0"
                }}>
                  <Bot size={17} />
                </div>
                <div style={{
                  background: "#ffffff",
                  border: "1px solid #ebdbe6",
                  borderRadius: "4px 16px 16px 16px",
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "#7e22ce",
                  fontWeight: "700",
                  fontSize: "0.84rem",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
                }}>
                  <div className="animate-spin" style={{
                    width: "14px",
                    height: "14px",
                    borderRadius: "50%",
                    border: "2px solid #9333ea",
                    borderTopColor: "transparent"
                  }}></div>
                  <span>مستشار نيللي يقوم بتحليل الأرقام وصياغة الإجابة...</span>
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>
        </div>

        {/* Bottom Responsive Input Area */}
        <div style={{
          background: "#ffffff",
          borderTop: "1px solid #ebdbe6",
          padding: "10px 12px 12px 12px",
          flexShrink: "0"
        }}>
          <div style={{ maxWidth: "860px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "8px" }}>
            {/* Quick Suggestions Chips */}
            <div style={{
              display: "flex",
              gap: "6px",
              overflowX: "auto",
              paddingBottom: "2px",
              scrollbarWidth: "none",
              WebkitOverflowScrolling: "touch"
            }}>
              {quickSuggestions.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(item.query)}
                  disabled={isGenerating || isRecording}
                  style={{
                    background: "#fdf8fb",
                    border: "1px solid #ebdbe6",
                    borderRadius: "9999px",
                    padding: "5px 12px",
                    fontSize: "0.74rem",
                    fontWeight: "700",
                    color: "#1e1322",
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    flexShrink: "0",
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#db2777";
                    e.currentTarget.style.background = "#ffffff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#ebdbe6";
                    e.currentTarget.style.background = "#fdf8fb";
                  }}
                >
                  <Zap size={11} color="#ec4899" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            {/* Voice Active Recording Banner */}
            {isRecording && (
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "linear-gradient(135deg, #fff1f2 0%, #fdf2f8 100%)",
                border: "1.5px solid #fecdd3",
                borderRadius: "14px",
                padding: "8px 12px",
                flexWrap: "wrap",
                gap: "8px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#e11d48",
                    boxShadow: "0 0 0 4px rgba(225, 29, 72, 0.2)"
                  }} />
                  <span style={{ fontWeight: "800", color: "#9f1239", fontSize: "0.82rem" }}>
                    جاري التسجيل...
                  </span>
                  <span className="num-font" style={{ fontWeight: "800", color: "#e11d48", background: "#ffffff", padding: "1px 6px", borderRadius: "5px", fontSize: "0.78rem" }}>
                    {formatTime(recordingSeconds)}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {/* Cancel Recording */}
                  <button
                    type="button"
                    onClick={cancelVoiceRecording}
                    title="إلغاء التسجيل"
                    style={{
                      background: "#ffffff",
                      border: "1px solid #fecdd3",
                      borderRadius: "8px",
                      padding: "5px 8px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                      fontSize: "0.74rem",
                      fontWeight: "700",
                      color: "#e11d48"
                    }}
                  >
                    <Trash2 size={13} />
                    <span>إلغاء</span>
                  </button>

                  {/* Stop and Auto Send */}
                  <button
                    type="button"
                    onClick={() => stopVoiceRecording(true)}
                    title="إيقاف وإرسال فوراً"
                    style={{
                      background: "linear-gradient(135deg, #ec4899 0%, #9333ea 100%)",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "5px 12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "0.76rem",
                      fontWeight: "800",
                      boxShadow: "0 2px 6px rgba(236,72,153,0.3)"
                    }}
                  >
                    <Square size={12} fill="#ffffff" />
                    <span>إيقاف وإرسال</span>
                  </button>
                </div>
              </div>
            )}

            {/* Input Form Box */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: "6px",
                background: "#faf5f8",
                border: "1.5px solid #ebdbe6",
                borderRadius: "14px",
                padding: "6px 8px 6px 12px",
                transition: "border-color 0.2s ease"
              }}
            >
              {/* Text Area */}
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isGenerating}
                placeholder={isRecording ? "جاري تحويل صوتك لنص..." : "اكتب استفسارك، أو سجل صوتك بالميكروفون..."}
                style={{
                  flex: "1",
                  border: "none",
                  background: "transparent",
                  outline: "none",
                  resize: "none",
                  fontFamily: "inherit",
                  fontSize: "0.9rem",
                  fontWeight: "600",
                  color: "#1e1322",
                  lineHeight: "1.45",
                  maxHeight: "110px",
                  minHeight: "22px",
                  padding: "5px 0"
                }}
              />

              {/* Voice Record / Stop Button */}
              <button
                type="button"
                onClick={isRecording ? () => stopVoiceRecording(true) : startVoiceRecording}
                disabled={isGenerating}
                title={isRecording ? "إيقاف التسجيل والإرسال فوراً" : "تسجيل ريكورد صوتي"}
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: isRecording ? "#ffe4e6" : "#ffffff",
                  color: isRecording ? "#e11d48" : "#715b7b",
                  border: isRecording ? "1.5px solid #fda4af" : "1px solid #ebdbe6",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: "0",
                  transition: "all 0.15s ease",
                  boxShadow: isRecording ? "0 0 8px rgba(225, 29, 72, 0.25)" : "none"
                }}
              >
                {isRecording ? <Square size={15} fill="#e11d48" /> : <Mic size={17} />}
              </button>

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputPrompt.trim() || isGenerating}
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: (!inputPrompt.trim() || isGenerating)
                    ? "#e2d6df"
                    : "linear-gradient(135deg, #ec4899 0%, #9333ea 100%)",
                  color: "#ffffff",
                  border: "none",
                  cursor: (!inputPrompt.trim() || isGenerating) ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: "0",
                  boxShadow: (!inputPrompt.trim() || isGenerating)
                    ? "none"
                    : "0 2px 10px rgba(236,72,153,0.3)",
                  transition: "all 0.15s ease"
                }}
                title="إرسال (Enter)"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
