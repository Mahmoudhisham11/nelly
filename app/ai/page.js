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
import styles from "./ai.module.css";

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
    <div className={styles.pageWrapper}>
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
      <div className={styles.chatViewport}>
        {/* Top Responsive Chat Header */}
        <div className={styles.chatHeader}>
          {/* Left Title & Mobile Menu */}
          <div className={styles.headerLeft}>
            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className={`lg:hidden ${styles.mobileMenuBtn}`}
              aria-label="Open sidebar menu"
            >
              <Menu size={18} color="#1e1322" />
            </button>

            <div className={styles.headerIconBox}>
              <Sparkles size={18} />
            </div>

            <div className={styles.headerTitleWrapper}>
              <h1 className={styles.headerTitle}>
                مستشار نيللي AI
              </h1>
              <p className={`hidden sm:block ${styles.headerSubtitle}`}>
                متصل لحظياً بالمخزن والمحل والأرباح
              </p>
            </div>
          </div>

          {/* Right Controls & Status */}
          <div className={styles.headerRight}>
            <div className={styles.statusPill}>
              <span className={styles.statusDot}></span>
              <span className={`num-font ${styles.statusCount}`}>{totalProducts}</span>
              <span className="hidden sm:inline">صنف</span>
            </div>

            <button
              type="button"
              onClick={() => setMessages([])}
              className={styles.newChatBtn}
              title="محادثة جديدة"
            >
              <RotateCcw size={12} />
              <span className="hidden sm:inline">جديدة</span>
            </button>
          </div>
        </div>

        {/* Chat Feed */}
        <div className={styles.chatFeed}>
          <div className={styles.chatFeedInner}>
            {messages.map((msg, idx) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={idx}
                  className={`${styles.messageRow} ${isUser ? styles.messageRowUser : styles.messageRowAssistant}`}
                >
                  {/* Avatar */}
                  <div className={isUser ? styles.userAvatar : styles.assistantAvatar}>
                    {isUser ? <User size={16} /> : <Bot size={17} />}
                  </div>

                  {/* Message Bubble Container */}
                  <div className={`${styles.bubbleContainer} ${isUser ? styles.bubbleContainerUser : styles.bubbleContainerAssistant}`}>
                    {isUser ? (
                      <div className={styles.userBubble}>
                        {msg.content}
                      </div>
                    ) : (
                      <div className={styles.assistantBubble}>
                        <AiMarkdownRenderer content={msg.content} />

                        {/* Message Actions */}
                        <div className={styles.messageActions}>
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(msg.content, idx)}
                            className={`${styles.copyActionBtn} ${copiedIndex === idx ? styles.copyActionSuccess : styles.copyActionDefault}`}
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
              <div className={styles.generatingRow}>
                <div className={styles.assistantAvatar}>
                  <Bot size={17} />
                </div>
                <div className={styles.generatingBox}>
                  <div className={`animate-spin ${styles.spinner}`}></div>
                  <span>مستشار نيللي يقوم بتحليل الأرقام وصياغة الإجابة...</span>
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>
        </div>

        {/* Bottom Responsive Input Area */}
        <div className={styles.inputArea}>
          <div className={styles.inputAreaInner}>
            {/* Quick Suggestions Chips */}
            <div className={styles.suggestionsScroll}>
              {quickSuggestions.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(item.query)}
                  disabled={isGenerating || isRecording}
                  className={styles.suggestionChip}
                >
                  <Zap size={11} color="#ec4899" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            {/* Voice Active Recording Banner */}
            {isRecording && (
              <div className={styles.recordingBanner}>
                <div className={styles.recordingStatus}>
                  <div className={styles.recordingPulse} />
                  <span className={styles.recordingLabel}>
                    جاري التسجيل...
                  </span>
                  <span className={`num-font ${styles.recordingTime}`}>
                    {formatTime(recordingSeconds)}
                  </span>
                </div>

                <div className={styles.recordingActions}>
                  {/* Cancel Recording */}
                  <button
                    type="button"
                    onClick={cancelVoiceRecording}
                    title="إلغاء التسجيل"
                    className={styles.cancelRecordBtn}
                  >
                    <Trash2 size={13} />
                    <span>إلغاء</span>
                  </button>

                  {/* Stop and Auto Send */}
                  <button
                    type="button"
                    onClick={() => stopVoiceRecording(true)}
                    title="إيقاف وإرسال فوراً"
                    className={styles.stopRecordBtn}
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
              className={styles.inputForm}
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
                className={styles.promptTextarea}
              />

              {/* Voice Record / Stop Button */}
              <button
                type="button"
                onClick={isRecording ? () => stopVoiceRecording(true) : startVoiceRecording}
                disabled={isGenerating}
                title={isRecording ? "إيقاف التسجيل والإرسال فوراً" : "تسجيل ريكورد صوتي"}
                className={`${styles.voiceBtn} ${isRecording ? styles.voiceBtnActive : styles.voiceBtnInactive}`}
              >
                {isRecording ? <Square size={15} fill="#e11d48" /> : <Mic size={17} />}
              </button>

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputPrompt.trim() || isGenerating}
                className={`${styles.sendBtn} ${(!inputPrompt.trim() || isGenerating) ? styles.sendBtnDisabled : styles.sendBtnActive}`}
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
