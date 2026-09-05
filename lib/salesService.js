import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc,
  getDocs,
  onSnapshot, 
  query, 
  where,
  orderBy, 
  limit,
  serverTimestamp,
  writeBatch
} from "firebase/firestore";
import { db } from "./firebase";
import { roundCurrency } from "./utils";
import { addInvoiceToCustomerLedger } from "./customersService";
import { recordSaleCommission } from "./employeesService";

const SALES_COLLECTION = "nelly_sales";
const SHOP_COLLECTION = "nelly_shop_products";
const WAREHOUSE_COLLECTION = "nelly_products";
const REPORTS_COLLECTION = "nelly_reports";
const RETURNS_COLLECTION = "nelly_returns";

// Subscribe to real-time sales invoices (Current Shift)
export function subscribeToSales(onData, onError) {
  try {
    const q = query(collection(db, SALES_COLLECTION), orderBy("createdAt", "desc"));
    return onSnapshot(
      q,
      (snapshot) => {
        const invoices = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          invoices.push({ 
            id: docSnap.id, 
            ...data,
            subtotal: roundCurrency(Number(data.subtotal) || 0),
            discount: roundCurrency(Number(data.discount) || 0),
            total: roundCurrency(Number(data.total) || 0),
            paidAmount: roundCurrency(Number(data.paidAmount) || 0),
            totalCost: roundCurrency(Number(data.totalCost) || 0),
            totalProfit: roundCurrency(Number(data.totalProfit) || 0),
            items: data.items || []
          });
        });
        onData(invoices);
      },
      (error) => {
        console.error("Firestore sales subscription error:", error);
        onData([]);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.error("subscribeToSales setup error:", err);
    onData([]);
    return () => {};
  }
}

// Subscribe to Shift Reports ("تقفيلة الأيام")
export function subscribeToReports(onData, onError) {
  try {
    const q = query(collection(db, REPORTS_COLLECTION), orderBy("closedAt", "desc"));
    return onSnapshot(
      q,
      (snapshot) => {
        const reports = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          reports.push({ 
            id: docSnap.id, 
            ...data,
            totalSales: roundCurrency(Number(data.totalSales) || 0),
            totalCost: roundCurrency(Number(data.totalCost) || 0),
            totalProfit: roundCurrency(Number(data.totalProfit) || 0),
            totalPaid: roundCurrency(Number(data.totalPaid) || 0),
            totalDiscount: roundCurrency(Number(data.totalDiscount) || 0),
            invoicesCount: Number(data.invoicesCount) || 0,
            invoices: data.invoices || []
          });
        });
        onData(reports);
      },
      (error) => {
        console.error("Firestore reports subscription error:", error);
        onData([]);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.error("subscribeToReports setup error:", err);
    onData([]);
    return () => {};
  }
}

// Subscribe to Returns History ("سجل المرتجعات")
export function subscribeToReturns(onData, onError) {
  try {
    const q = query(collection(db, RETURNS_COLLECTION), orderBy("date", "desc"));
    return onSnapshot(
      q,
      (snapshot) => {
        const returnsList = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          returnsList.push({ 
            id: docSnap.id, 
            ...data,
            refundedAmount: roundCurrency(Number(data.refundedAmount) || 0),
            returnedItems: data.returnedItems || []
          });
        });
        onData(returnsList);
      },
      (error) => {
        console.error("Firestore returns subscription error:", error);
        onData([]);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.error("subscribeToReturns setup error:", err);
    onData([]);
    return () => {};
  }
}

// Generate unique invoice number
export function generateInvoiceNumber() {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `INV-${datePart}-${randomPart}`;
}

// Generate unique return number
export function generateReturnNumber() {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `RET-${datePart}-${randomPart}`;
}

// Generate unique report / shift number
export function generateReportNumber() {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const timePart = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const randomPart = Math.floor(100 + Math.random() * 900);
  return `REP-${datePart}-${timePart}-${randomPart}`;
}

// Create and process a sales invoice with automatic stock reduction from SHOP products
export async function createSaleInvoice(saleData) {
  const { 
    items = [], 
    customer = null, 
    discount = 0, 
    paymentMethod = "نقدي", 
    paidAmount = 0, 
    cashier = null, 
    sellerEmployee = null,
    notes = "" 
  } = saleData;

  if (!items || items.length === 0) {
    throw new Error("سلة المشتريات فارغة، يرجى إضافة صنف واحد على الأقل.");
  }

  // 1. Calculate items subtotal, cost, and profit
  let subtotal = 0;
  let totalCost = 0;
  const processedItems = [];

  for (const item of items) {
    const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
    const retail = roundCurrency(parseFloat(item.sellingPrice) || 0);
    const cost = roundCurrency(parseFloat(item.wholesalePrice) || 0);
    const lineSubtotal = roundCurrency(qty * retail);
    const lineCost = roundCurrency(qty * cost);
    const lineProfit = roundCurrency(lineSubtotal - lineCost);

    subtotal += lineSubtotal;
    totalCost += lineCost;

    processedItems.push({
      productId: item.id || item.productId,
      barcode: item.barcode || "",
      name: item.name || "صنف ميكاب",
      category: item.category || "عام",
      quantity: qty,
      wholesalePrice: cost,
      sellingPrice: retail,
      subtotal: lineSubtotal,
      profit: lineProfit
    });
  }

  subtotal = roundCurrency(subtotal);
  totalCost = roundCurrency(totalCost);
  const discountVal = roundCurrency(Math.max(0, parseFloat(discount) || 0));

  // Enforce rule: Selling price after discount cannot reach or drop below wholesale cost
  if (totalCost > 0 && discountVal > 0 && (subtotal - discountVal) <= totalCost) {
    throw new Error(`ممنوع تطبيق هذا الخصم: لا يمكن أن يصل سعر البيع لسعر جملة البضاعة (${totalCost} ج.م) أو أقل منه.`);
  }

  const finalTotal = roundCurrency(Math.max(0, subtotal - discountVal));
  const totalProfit = roundCurrency(finalTotal - totalCost);

  const rawPaid = parseFloat(paidAmount);
  const effectivePaid = paymentMethod === "آجل" 
    ? (isNaN(rawPaid) ? 0 : roundCurrency(Math.max(0, rawPaid)))
    : (isNaN(rawPaid) ? finalTotal : roundCurrency(rawPaid));
  
  const changeDue = effectivePaid > finalTotal ? roundCurrency(effectivePaid - finalTotal) : 0;
  const remainingDue = finalTotal > effectivePaid ? roundCurrency(finalTotal - effectivePaid) : 0;

  const invoiceNumber = generateInvoiceNumber();

  // 2. Validate real-time inventory and decrement strictly from SHOP products
  const batch = writeBatch(db);

  for (const item of processedItems) {
    if (item.productId) {
      // Check shop collection 'nelly_shop_products'
      let prodRef = doc(db, SHOP_COLLECTION, item.productId);
      let prodSnap = await getDoc(prodRef);

      // Secondary fallback to warehouse if item was moved or not found by ID
      if (!prodSnap.exists()) {
        prodRef = doc(db, WAREHOUSE_COLLECTION, item.productId);
        prodSnap = await getDoc(prodRef);
      }

      if (!prodSnap.exists()) {
        throw new Error(`الصنف "${item.name}" لم يعد موجوداً في النظام.`);
      }

      const currentQty = Math.max(0, parseInt(prodSnap.data().quantity, 10) || 0);
      if (item.quantity > currentQty) {
        throw new Error(
          `لا يمكن إتمام البيع: الكمية المطلوبة (${item.quantity}) من الصنف "${item.name}" تتجاوز الرصيد المتوفر بالمحل (${currentQty} قطعة).`
        );
      }

      const newQty = currentQty - item.quantity;
      batch.update(prodRef, {
        quantity: newQty,
        updatedAt: new Date().toISOString()
      });
    }
  }

  // Commit inventory update batch
  await batch.commit();

  // 3. Save Invoice document into active shift collection (nelly_sales)
  const employeeCommission = sellerEmployee 
    ? roundCurrency(finalTotal * (sellerEmployee.commissionRate !== undefined ? Number(sellerEmployee.commissionRate) : 0.01))
    : 0;

  const invoiceDoc = {
    invoiceNumber: invoiceNumber,
    date: new Date().toISOString(),
    items: processedItems,
    itemsCount: processedItems.reduce((acc, curr) => acc + curr.quantity, 0),
    subtotal: subtotal,
    discount: discountVal,
    total: finalTotal,
    paidAmount: effectivePaid,
    changeDue: changeDue,
    remainingDue: remainingDue,
    paymentMethod: paymentMethod,
    customer: customer ? {
      id: customer.id || null,
      name: customer.name || "عميل نقدي",
      phone: customer.phone || ""
    } : null,
    cashier: cashier ? {
      uid: cashier.uid || cashier.id || null,
      name: cashier.displayName || cashier.name || "كاشير المحل"
    } : null,
    sellerEmployee: sellerEmployee ? {
      id: sellerEmployee.id,
      name: sellerEmployee.name || "بائع المحل",
      code: sellerEmployee.code || "",
      commission: employeeCommission
    } : null,
    totalCost: totalCost,
    totalProfit: totalProfit,
    status: "مكتملة",
    notes: notes ? notes.trim() : "",
    createdAt: serverTimestamp(),
    updatedAt: new Date().toISOString()
  };

  try {
    const docRef = await addDoc(collection(db, SALES_COLLECTION), invoiceDoc);

    // 4. If there is remaining credit due on a known customer, register in customer ledger
    if (customer && customer.id && remainingDue > 0) {
      await addInvoiceToCustomerLedger(customer.id, invoiceNumber, remainingDue);
    }

    // 5. If a seller employee was selected, automatically record their 1% commission
    if (sellerEmployee && sellerEmployee.id && finalTotal > 0) {
      await recordSaleCommission(
        sellerEmployee, 
        invoiceNumber, 
        finalTotal, 
        sellerEmployee.commissionRate !== undefined ? Number(sellerEmployee.commissionRate) : 0.01
      );
    }

    return { 
      success: true, 
      id: docRef.id, 
      invoiceNumber: invoiceNumber,
      invoice: { id: docRef.id, ...invoiceDoc }
    };
  } catch (err) {
    console.error("Firestore addDoc error in createSaleInvoice:", err);
    throw err;
  }
}

// Close shift and move all current shift invoices to nelly_reports, then clear nelly_sales
export async function closeShiftAndMoveToReports({ cashier, notes = "" } = {}) {
  try {
    // 1. Fetch all invoices from current shift
    const salesSnap = await getDocs(collection(db, SALES_COLLECTION));
    if (salesSnap.empty) {
      throw new Error("لا توجد فواتير مبيعات مسجلة في الوردية الحالية لتقفيلها.");
    }

    const invoices = [];
    let totalSales = 0;
    let totalCost = 0;
    let totalProfit = 0;
    let totalDiscount = 0;
    let totalPaid = 0;
    let totalItemsSold = 0;
    const paymentBreakdown = {
      "نقدي": 0,
      "فيزا": 0,
      "تحويل": 0,
      "آجل": 0
    };

    salesSnap.forEach((docSnap) => {
      const data = docSnap.data();
      const invTotal = roundCurrency(Number(data.total) || 0);
      const invCost = roundCurrency(Number(data.totalCost) || 0);
      const invProfit = roundCurrency(Number(data.totalProfit) || 0);
      const invDiscount = roundCurrency(Number(data.discount) || 0);
      const invPaid = roundCurrency(Number(data.paidAmount) || 0);
      const method = data.paymentMethod || "نقدي";

      totalSales += invTotal;
      totalCost += invCost;
      totalProfit += invProfit;
      totalDiscount += invDiscount;
      totalPaid += invPaid;

      if (paymentBreakdown[method] !== undefined) {
        paymentBreakdown[method] += invTotal;
      } else {
        paymentBreakdown[method] = invTotal;
      }

      const invItems = data.items || [];
      const lineItemsCount = invItems.reduce((acc, curr) => acc + (Number(curr.quantity) || 1), 0);
      totalItemsSold += lineItemsCount;

      invoices.push({
        id: docSnap.id,
        ...data,
        items: invItems,
        total: invTotal,
        totalCost: invCost,
        totalProfit: invProfit,
        discount: invDiscount,
        paidAmount: invPaid
      });
    });

    const reportNumber = generateReportNumber();
    const nowIso = new Date().toISOString();

    const reportDoc = {
      reportNumber: reportNumber,
      closedAt: nowIso,
      date: nowIso,
      closedBy: cashier ? {
        uid: cashier.uid || cashier.id || null,
        name: cashier.displayName || cashier.name || "كاشير المحل",
        email: cashier.email || ""
      } : { name: "كاشير المحل" },
      notes: notes ? notes.trim() : "",
      invoicesCount: invoices.length,
      totalItemsSold: totalItemsSold,
      totalSales: roundCurrency(totalSales),
      totalCost: roundCurrency(totalCost),
      totalProfit: roundCurrency(totalProfit),
      totalDiscount: roundCurrency(totalDiscount),
      totalPaid: roundCurrency(totalPaid),
      paymentBreakdown: Object.fromEntries(
        Object.entries(paymentBreakdown).map(([k, v]) => [k, roundCurrency(v)])
      ),
      invoices: invoices,
      createdAt: serverTimestamp()
    };

    // 2. Add report to nelly_reports
    const reportRef = await addDoc(collection(db, REPORTS_COLLECTION), reportDoc);

    // 3. Batch delete all current shift invoices from nelly_sales
    const batchList = [];
    let currentBatch = writeBatch(db);
    let count = 0;

    for (const docSnap of salesSnap.docs) {
      currentBatch.delete(docSnap.ref);
      count++;
      if (count % 400 === 0) {
        batchList.push(currentBatch.commit());
        currentBatch = writeBatch(db);
      }
    }
    if (count % 400 !== 0) {
      batchList.push(currentBatch.commit());
    }

    await Promise.all(batchList);

    return {
      success: true,
      reportId: reportRef.id,
      reportNumber: reportNumber,
      invoicesCount: invoices.length,
      totalSales: roundCurrency(totalSales),
      totalProfit: roundCurrency(totalProfit)
    };
  } catch (err) {
    console.error("closeShiftAndMoveToReports error:", err);
    throw err;
  }
}

// Return single/multiple items or full invoice
// Automatically increases stock in shop products (nelly_shop_products)
// If invoice is fully returned, removes it completely from nelly_sales
export async function returnSaleItemOrInvoice({
  invoiceId,
  invoiceNumber,
  itemsToReturn = [],
  returnReason = "طلب العميل إرجاع البضاعة",
  cashier = null
}) {
  if (!itemsToReturn || itemsToReturn.length === 0) {
    throw new Error("يرجى تحديد صنف واحد على الأقل للمرتجع.");
  }

  try {
    // 1. Locate original invoice in active sales or reports
    let invoiceDoc = null;
    let invoiceRef = null;
    let isFromActiveSales = false;

    if (invoiceId) {
      invoiceRef = doc(db, SALES_COLLECTION, invoiceId);
      const snap = await getDoc(invoiceRef);
      if (snap.exists()) {
        invoiceDoc = { id: snap.id, ...snap.data() };
        isFromActiveSales = true;
      }
    }

    if (!invoiceDoc && invoiceNumber) {
      const q = query(collection(db, SALES_COLLECTION), where("invoiceNumber", "==", invoiceNumber.trim()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        invoiceDoc = { id: docSnap.id, ...docSnap.data() };
        invoiceRef = docSnap.ref;
        isFromActiveSales = true;
      }
    }

    // If not in active sales, check reports collection
    let foundInReport = null;
    if (!invoiceDoc && invoiceNumber) {
      const reportsSnap = await getDocs(collection(db, REPORTS_COLLECTION));
      for (const repSnap of reportsSnap.docs) {
        const repData = repSnap.data();
        const found = (repData.invoices || []).find(inv => inv.invoiceNumber === invoiceNumber.trim());
        if (found) {
          invoiceDoc = found;
          foundInReport = repSnap;
          break;
        }
      }
    }

    if (!invoiceDoc) {
      throw new Error(`الفاتورة رقم "${invoiceNumber || invoiceId}" غير موجودة في النظام.`);
    }

    // 2. Increase stock in shop products (nelly_shop_products)
    const stockBatch = writeBatch(db);
    let totalRefundAmount = 0;

    for (const retItem of itemsToReturn) {
      const returnQty = Math.max(1, parseInt(retItem.quantity, 10) || 1);
      const retailPrice = roundCurrency(parseFloat(retItem.sellingPrice) || 0);
      totalRefundAmount += roundCurrency(returnQty * retailPrice);

      let shopProdRef = null;
      let shopProdSnap = null;

      if (retItem.productId) {
        shopProdRef = doc(db, SHOP_COLLECTION, retItem.productId);
        shopProdSnap = await getDoc(shopProdRef);
      }

      // If not found by productId, search shop by barcode
      if ((!shopProdSnap || !shopProdSnap.exists()) && retItem.barcode) {
        const barcodeQ = query(collection(db, SHOP_COLLECTION), where("barcode", "==", retItem.barcode.trim()));
        const bSnap = await getDocs(barcodeQ);
        if (!bSnap.empty) {
          shopProdRef = bSnap.docs[0].ref;
          shopProdSnap = bSnap.docs[0];
        }
      }

      // If still not found in shop, check warehouse
      if (!shopProdSnap || !shopProdSnap.exists()) {
        if (retItem.productId) {
          const whRef = doc(db, WAREHOUSE_COLLECTION, retItem.productId);
          const whSnap = await getDoc(whRef);
          if (whSnap.exists()) {
            shopProdRef = whRef;
            shopProdSnap = whSnap;
          }
        }
      }

      if (shopProdSnap && shopProdSnap.exists()) {
        const currentQty = Math.max(0, parseInt(shopProdSnap.data().quantity, 10) || 0);
        stockBatch.update(shopProdRef, {
          quantity: currentQty + returnQty,
          updatedAt: new Date().toISOString()
        });
      } else {
        // If product doc was deleted, recreate it in shop with returned quantity
        const newShopRef = doc(collection(db, SHOP_COLLECTION));
        stockBatch.set(newShopRef, {
          name: retItem.name || "صنف مرتجع",
          barcode: retItem.barcode || "",
          category: retItem.category || "عام",
          wholesalePrice: roundCurrency(parseFloat(retItem.wholesalePrice) || 0),
          sellingPrice: retailPrice,
          quantity: returnQty,
          createdAt: serverTimestamp(),
          updatedAt: new Date().toISOString()
        });
      }
    }

    await stockBatch.commit();

    // 3. Log return in nelly_returns
    const returnNumber = generateReturnNumber();
    const nowIso = new Date().toISOString();

    const returnRecord = {
      returnNumber: returnNumber,
      invoiceNumber: invoiceDoc.invoiceNumber || invoiceNumber,
      invoiceId: invoiceDoc.id || null,
      customer: invoiceDoc.customer || null,
      returnedItems: itemsToReturn.map(i => ({
        productId: i.productId || i.id || "",
        barcode: i.barcode || "",
        name: i.name,
        quantity: Math.max(1, parseInt(i.quantity, 10) || 1),
        sellingPrice: roundCurrency(parseFloat(i.sellingPrice) || 0),
        wholesalePrice: roundCurrency(parseFloat(i.wholesalePrice) || 0),
        subtotal: roundCurrency((parseInt(i.quantity, 10) || 1) * (parseFloat(i.sellingPrice) || 0))
      })),
      refundedAmount: roundCurrency(totalRefundAmount),
      returnReason: returnReason.trim(),
      cashier: cashier ? {
        uid: cashier.uid || cashier.id || null,
        name: cashier.displayName || cashier.name || "كاشير المحل"
      } : (invoiceDoc.cashier || null),
      date: nowIso,
      createdAt: serverTimestamp()
    };

    await addDoc(collection(db, RETURNS_COLLECTION), returnRecord);

    // 4. Update or Delete from active sales (nelly_sales)
    if (isFromActiveSales && invoiceRef) {
      const originalItems = invoiceDoc.items || [];
      
      // Calculate remaining items
      const updatedItems = [];
      for (const orig of originalItems) {
        const ret = itemsToReturn.find(r => 
          (r.productId && r.productId === orig.productId) || 
          (r.barcode && r.barcode === orig.barcode) || 
          r.name === orig.name
        );

        if (ret) {
          const retQty = Math.max(1, parseInt(ret.quantity, 10) || 1);
          const remainingQty = orig.quantity - retQty;
          if (remainingQty > 0) {
            const retail = roundCurrency(parseFloat(orig.sellingPrice) || 0);
            const cost = roundCurrency(parseFloat(orig.wholesalePrice) || 0);
            updatedItems.push({
              ...orig,
              quantity: remainingQty,
              subtotal: roundCurrency(remainingQty * retail),
              profit: roundCurrency(remainingQty * (retail - cost))
            });
          }
        } else {
          updatedItems.push(orig);
        }
      }

      // If all items are returned, DELETE invoice from nelly_sales completely!
      if (updatedItems.length === 0) {
        await deleteDoc(invoiceRef);
      } else {
        // Recalculate invoice totals
        let newSubtotal = 0;
        let newCost = 0;
        for (const itm of updatedItems) {
          newSubtotal += itm.subtotal;
          newCost += roundCurrency(itm.quantity * itm.wholesalePrice);
        }
        newSubtotal = roundCurrency(newSubtotal);
        newCost = roundCurrency(newCost);
        const discountVal = roundCurrency(Number(invoiceDoc.discount) || 0);
        const newTotal = roundCurrency(Math.max(0, newSubtotal - discountVal));
        const newProfit = roundCurrency(newTotal - newCost);

        await updateDoc(invoiceRef, {
          items: updatedItems,
          itemsCount: updatedItems.reduce((acc, curr) => acc + curr.quantity, 0),
          subtotal: newSubtotal,
          totalCost: newCost,
          total: newTotal,
          totalProfit: newProfit,
          updatedAt: new Date().toISOString()
        });
      }
    }

    return {
      success: true,
      returnNumber: returnNumber,
      refundedAmount: roundCurrency(totalRefundAmount)
    };
  } catch (err) {
    console.error("returnSaleItemOrInvoice error:", err);
    throw err;
  }
}

// Find invoice by number across active shift and closed reports
export async function findInvoiceByNumber(invoiceNum) {
  if (!invoiceNum) return null;
  const cleanNum = invoiceNum.trim().toUpperCase();

  try {
    // 1. Check active sales first
    const salesSnap = await getDocs(collection(db, SALES_COLLECTION));
    for (const docSnap of salesSnap.docs) {
      const data = docSnap.data();
      if ((data.invoiceNumber || "").trim().toUpperCase() === cleanNum) {
        return {
          source: "active_shift",
          sourceLabel: "الوردية الحالية",
          invoice: { id: docSnap.id, ...data }
        };
      }
    }

    // 2. Check closed reports
    const reportsSnap = await getDocs(collection(db, REPORTS_COLLECTION));
    for (const repSnap of reportsSnap.docs) {
      const repData = repSnap.data();
      const found = (repData.invoices || []).find(
        inv => (inv.invoiceNumber || "").trim().toUpperCase() === cleanNum
      );
      if (found) {
        return {
          source: "closed_report",
          sourceLabel: `تقرير وردية مقفلة (${repData.reportNumber || ""})`,
          reportId: repSnap.id,
          reportNumber: repData.reportNumber,
          closedAt: repData.closedAt,
          invoice: found
        };
      }
    }

    return null;
  } catch (err) {
    console.error("findInvoiceByNumber error:", err);
    return null;
  }
}

// Delete a closed shift report
export async function deleteReport(reportId) {
  try {
    const reportRef = doc(db, REPORTS_COLLECTION, reportId);
    await deleteDoc(reportRef);
    return { success: true };
  } catch (err) {
    console.error("deleteReport error:", err);
    throw err;
  }
}

// Legacy refund function preserved for backwards compatibility
export async function refundSaleInvoice(invoiceId, reason = "طلب العميل") {
  return returnSaleItemOrInvoice({
    invoiceId,
    returnReason: reason
  });
}
