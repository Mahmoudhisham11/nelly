import { roundCurrency, formatNumber } from "./utils";

/**
 * Builds a structured, rich snapshot of the entire store's business data:
 * - Warehouse & Shop Inventory (stock levels, out of stock, low stock, capital value)
 * - Sales, Top Bestsellers & Historical Shifts
 * - Monthly Expenses & Average Daily Costs
 * - Net Profitability & Daily Run-rate
 * - Customer & Supplier Balances
 */
export function buildStoreContextSnapshot({
  warehouseProducts = [],
  shopProducts = [],
  salesInvoices = [],
  shiftReports = [],
  expenseItems = [],
  monthlyExpensesMap = {},
  allMonthlyExpenses = [],
  customers = [],
  suppliers = []
}) {
  // 1. Warehouse Inventory Analysis
  const totalWarehouseCount = warehouseProducts.length;
  const totalWarehouseQty = warehouseProducts.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
  const totalWarehouseWholesaleValue = warehouseProducts.reduce(
    (sum, p) => sum + (Number(p.quantity) || 0) * (Number(p.wholesalePrice) || 0),
    0
  );

  const warehouseOutOfStock = warehouseProducts.filter(p => (Number(p.quantity) || 0) === 0);
  const warehouseLowStock = warehouseProducts.filter(
    p => (Number(p.quantity) || 0) > 0 && (Number(p.quantity) || 0) <= (Number(p.minThreshold) || 5)
  );

  // 2. Shop Inventory Analysis
  const totalShopCount = shopProducts.length;
  const totalShopQty = shopProducts.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
  const shopOutOfStock = shopProducts.filter(p => (Number(p.quantity) || 0) === 0);
  const shopLowStock = shopProducts.filter(
    p => (Number(p.quantity) || 0) > 0 && (Number(p.quantity) || 0) <= (Number(p.minThreshold) || 3)
  );

  // 3. Sales & Bestsellers Analysis
  // Aggregate items across all shift reports + current shift invoices
  const allInvoices = [
    ...salesInvoices,
    ...shiftReports.flatMap(r => r.invoices || [])
  ];

  const productSalesMap = {};
  let totalRevenueAllTime = 0;
  let totalProfitAllTime = 0;

  allInvoices.forEach(inv => {
    totalRevenueAllTime += (Number(inv.total) || 0);
    totalProfitAllTime += (Number(inv.totalProfit) || 0);

    (inv.items || []).forEach(it => {
      const key = it.productId || it.barcode || it.name;
      if (!productSalesMap[key]) {
        productSalesMap[key] = {
          name: it.name,
          barcode: it.barcode || "—",
          sellingPrice: it.sellingPrice || 0,
          wholesalePrice: it.wholesalePrice || 0,
          totalQtySold: 0,
          totalRevenue: 0,
          totalProfit: 0,
          orderCount: 0
        };
      }
      const qty = Number(it.quantity) || 1;
      const sub = Number(it.subtotal) || (qty * (it.sellingPrice || 0));
      const profit = (it.profit !== undefined) ? Number(it.profit) : (qty * ((it.sellingPrice || 0) - (it.wholesalePrice || 0)));

      productSalesMap[key].totalQtySold += qty;
      productSalesMap[key].totalRevenue += sub;
      productSalesMap[key].totalProfit += profit;
      productSalesMap[key].orderCount += 1;
    });
  });

  const bestsellers = Object.values(productSalesMap)
    .sort((a, b) => b.totalQtySold - a.totalQtySold)
    .slice(0, 15);

  const topProfitableProducts = Object.values(productSalesMap)
    .sort((a, b) => b.totalProfit - a.totalProfit)
    .slice(0, 10);

  // 4. Daily Run-rate & Average Daily Revenue
  // Calculate average daily sales based on closed shifts / distinct dates
  const shiftDates = shiftReports.map(r => new Date(r.closedAt || r.date).toISOString().split("T")[0]);
  const uniqueDaysCount = Math.max(1, new Set(shiftDates).size);

  const totalShiftSales = shiftReports.reduce((sum, r) => sum + (Number(r.totalSales) || 0), 0);
  const totalShiftProfit = shiftReports.reduce((sum, r) => sum + (Number(r.totalProfit) || 0), 0);

  const averageDailySales = roundCurrency(totalShiftSales / uniqueDaysCount);
  const averageDailyGrossProfit = roundCurrency(totalShiftProfit / uniqueDaysCount);

  // 5. Expenses Analysis (Current Month & All Time)
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  
  let currentMonthExpensesTotal = 0;
  const currentMonthExpensesBreakdown = [];

  // Helper map by itemId for current month
  const currentMonthMap = { ...monthlyExpensesMap };
  if (allMonthlyExpenses && allMonthlyExpenses.length > 0) {
    allMonthlyExpenses
      .filter(rec => rec.month === currentMonthKey)
      .forEach(rec => {
        if (rec.itemId) {
          currentMonthMap[rec.itemId] = rec;
        }
      });
  }

  // Iterate over master expense line items
  expenseItems.forEach(item => {
    const record = currentMonthMap[item.id] || (allMonthlyExpenses.find(r => r.itemId === item.id && r.month === currentMonthKey));
    const amount = Number(record?.amount ?? record?.totalAmount ?? 0);
    const txCount = record?.transactions?.length || 0;
    
    if (amount > 0) {
      currentMonthExpensesTotal += amount;
      currentMonthExpensesBreakdown.push({
        name: item.name,
        amount: roundCurrency(amount),
        notes: item.notes || "",
        status: txCount > 0 ? `تم صرف ${txCount} دفعة` : "مسجل",
        transactions: (record.transactions || []).map(t => ({
          date: t.date || "",
          amount: Number(t.amount) || 0,
          method: t.method || "نقدي",
          notes: t.notes || ""
        }))
      });
    } else {
      // Also list active expense items even if 0 spent this month
      currentMonthExpensesBreakdown.push({
        name: item.name,
        amount: 0,
        notes: item.notes || "",
        status: "لم يتم الصرف هذا الشهر",
        transactions: []
      });
    }
  });

  // Calculate all-time recorded expenses across all months
  let allTimeExpensesTotal = 0;
  const monthlyTotalsSummary = {};
  if (allMonthlyExpenses && allMonthlyExpenses.length > 0) {
    allMonthlyExpenses.forEach(rec => {
      const amt = Number(rec.amount) || 0;
      allTimeExpensesTotal += amt;
      const m = rec.month || currentMonthKey;
      if (!monthlyTotalsSummary[m]) monthlyTotalsSummary[m] = { month: m, total: 0, items: [] };
      monthlyTotalsSummary[m].total += amt;
      monthlyTotalsSummary[m].items.push({
        itemName: rec.itemName || "بند مصروف",
        amount: amt
      });
    });
  } else {
    allTimeExpensesTotal = currentMonthExpensesTotal;
  }

  const activeSpentBreakdown = currentMonthExpensesBreakdown.filter(e => e.amount > 0);
  const estimatedDailyExpense = roundCurrency(currentMonthExpensesTotal / 30);
  const estimatedNetDailyProfit = roundCurrency(averageDailyGrossProfit - estimatedDailyExpense);

  // 6. Customers Debt & Supplier Balance
  const totalCustomerDebt = customers.reduce((sum, c) => sum + (Number(c.currentBalance) || 0), 0);
  const totalSupplierBalance = suppliers.reduce((sum, s) => sum + (Number(s.currentBalance) || 0), 0);

  return {
    meta: {
      generatedAt: new Date().toLocaleString("ar-EG"),
      storeName: "محلات ومخازن نيللي لمستحضرات التجميل (Nelly Cosmetics)",
      operatingCurrency: "جنيه مصري (EGP)"
    },
    warehouse: {
      totalProductsCount: totalWarehouseCount,
      totalQuantity: totalWarehouseQty,
      totalWholesaleValuation: roundCurrency(totalWarehouseWholesaleValue),
      outOfStockCount: warehouseOutOfStock.length,
      outOfStockItems: warehouseOutOfStock.slice(0, 15).map(p => ({ name: p.name, barcode: p.barcode, category: p.category })),
      lowStockCount: warehouseLowStock.length,
      lowStockItems: warehouseLowStock.slice(0, 20).map(p => ({
        name: p.name,
        barcode: p.barcode,
        currentQty: p.quantity,
        minThreshold: p.minThreshold || 5,
        sellingPrice: p.sellingPrice,
        wholesalePrice: p.wholesalePrice
      }))
    },
    shop: {
      totalProductsCount: totalShopCount,
      totalQuantity: totalShopQty,
      outOfStockCount: shopOutOfStock.length,
      lowStockCount: shopLowStock.length,
      lowStockItems: shopLowStock.slice(0, 15).map(p => ({ name: p.name, currentQty: p.quantity, minThreshold: p.minThreshold || 3 }))
    },
    salesAndPerformance: {
      totalInvoicesRecorded: allInvoices.length,
      totalRevenueRecorded: roundCurrency(totalRevenueAllTime),
      totalProfitRecorded: roundCurrency(totalProfitAllTime),
      shiftsCount: shiftReports.length,
      averageDailyRevenue: averageDailySales,
      averageDailyGrossProfit: averageDailyGrossProfit,
      bestsellers: bestsellers.map(b => ({
        name: b.name,
        barcode: b.barcode,
        soldUnits: b.totalQtySold,
        totalRevenue: roundCurrency(b.totalRevenue),
        profitPerUnit: roundCurrency(b.sellingPrice - b.wholesalePrice),
        totalProfit: roundCurrency(b.totalProfit)
      })),
      topProfitableProducts: topProfitableProducts.map(b => ({
        name: b.name,
        soldUnits: b.totalQtySold,
        profitMarginEGP: roundCurrency(b.sellingPrice - b.wholesalePrice),
        totalProfit: roundCurrency(b.totalProfit)
      }))
    },
    expenses: {
      currentMonth: currentMonthKey,
      totalMonthExpenses: roundCurrency(currentMonthExpensesTotal),
      allTimeRecordedExpensesTotal: roundCurrency(allTimeExpensesTotal),
      estimatedDailyExpense: estimatedDailyExpense,
      spentItemsCount: activeSpentBreakdown.length,
      allLineItemsCount: expenseItems.length,
      activeBreakdown: activeSpentBreakdown,
      allLineItems: currentMonthExpensesBreakdown,
      monthlyHistory: Object.values(monthlyTotalsSummary)
    },
    profitabilitySummary: {
      averageDailyGrossProfit: averageDailyGrossProfit,
      averageDailyExpenses: estimatedDailyExpense,
      netDailyProfit: estimatedNetDailyProfit,
      projectedMonthlyNetProfit: roundCurrency(estimatedNetDailyProfit * 30),
      totalCustomerReceivables: roundCurrency(totalCustomerDebt),
      totalSupplierPayables: roundCurrency(totalSupplierBalance)
    }
  };
}

/**
 * Builds the comprehensive System Instructions Prompt for OpenRouter AI Advisor
 */
export function buildSystemPrompt(storeContext) {
  const ctxJson = JSON.stringify(storeContext, null, 2);

  return `أنت "مستشار نيللي الذكي للأعمال (Nelly AI Advisor)"، المساعد والمدير المالي والتجاري الذكي المخصص لمتجر ومخازن "نيللي لمستحضرات التجميل (Nelly Cosmetics)".

مهمتك:
1. تقديم استشارات مالية وإدارية دقيقة، استراتيجيات بيع، نصائح لإدارة المخزون، وتحليلات أرباح بناءً على البيانات الحقيقية للمتجر.
2. عند سؤالك عن المصاريف أو المصروفات المسجلة في السيستم:
   - راجع قسم \`expenses\` في البيانات المرفقة واذكر إجمالي المصروفات للشهر الحالي بالجنيه بدقة.
   - اعرض جدولاً منسقاً وواضحاً يحتوي على جميع بنود المصروفات المسجلة (اسم البند، المبلغ المصروف بالجنيه، عدد الدفعات/الملاحظات).
   - لا تقل أبداً أنه لا توجد مصاريف إذا كانت مبالغ البنود متوفرة في قسم \`expenses.activeBreakdown\` أو \`expenses.allLineItems\`.
3. عند سؤالك عن النواقص أو البضائع التي قاربت على النفاد، اذكر أسماء الأصناف بدقة مع كمياتها الحالية وأرقام الباركود واقترح الكميات المناسبة لإعادة الطلب.
4. عند سؤالك عن المنتجات الأكثر مبيعاً وضغطاً (Bestsellers)، حدد أسماء الأصناف وعدد القطع المباعة منها وهامش ربحها ووجه صاحب المحل لتكرارها وشراء كميات أكبر منها.
5. عند سؤالك عن الأهداف المالية (مثال: "عايز اجمع 50 ألف جنية" أو أي مبلغ آخر):
   - قم بإجراء عملية حسابية دقيقة مبنية على "صافي الربح اليومي المتاح (Net Daily Profit)" ومتوسط المبيعات والمصاريف.
   - احسب الوقت المتوقع بالمدة (أيام / أسابيع / شهور) لتحقيق الهدف: (المبلغ المستهدف ÷ صافي الربح اليومي).
   - اعرض خطة تنفيذية واقعية من عدة محاور:
     أ) مبيعات الأصناف عالية الربحية (كم قطعة يحتاج بيعها لتحقيق الهدف).
     ب) تقليل المصاريف التشغيلية لتسريع تحقيق الهدف.
     ج) استرداد ديون العملاء الآجلة لتوفير سيولة كاش فورية.
     د) تنشيط مبيعات المحل وعمل عروض ترويجية (Bundles).
6. كن احترافياً، مشجعاً، واضحاً، واستخدم تنسيق Markdown المنظم مع جداول وأرقام بارزة بالجنيه المصري (EGP).

بيانات المتجر الحالية المحدثة لحظياً (Real-Time Store Data):
\`\`\`json
${ctxJson}
\`\`\`

تحدث باللغة العربية بأسلوب راقٍ ومهني واعتمد دائماً على الأرقام الدقيقة الواردة في البيانات أعلاه.`;
}

/**
 * Sends chat completion request to the backend route or OpenRouter
 */
export async function sendChatMessage({ messages, storeContext, customApiKey = "" }) {
  const response = await fetch("/api/ai/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messages,
      storeContext,
      apiKey: customApiKey
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `فشل الاتصال بمزود الذكاء الاصطناعي (رمز الخطأ: ${response.status})`);
  }

  const data = await response.json();
  return data;
}
