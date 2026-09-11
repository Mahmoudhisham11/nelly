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
  serverTimestamp,
  writeBatch,
  arrayUnion
} from "firebase/firestore";
import { db } from "./firebase";
import { roundCurrency, getLocalDateString } from "./utils";

const SHOP_PURCHASES_COLLECTION = "nelly_shop_purchases";
const SHOP_PRODUCTS_COLLECTION = "nelly_shop_products";
const SUPPLIERS_COLLECTION = "nelly_suppliers";
const SHOP_RETURNS_COLLECTION = "nelly_shop_purchase_returns";

// Generate unique invoice number: SP-YYMM-XXX
function generateShopInvoiceNumber() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const rand = Math.floor(100 + Math.random() * 900);
  return `SP-${yy}${mm}-${rand}`;
}

// Generate unique return number: SPR-YYMM-XXX
function generateShopReturnNumber() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const rand = Math.floor(100 + Math.random() * 900);
  return `SPR-${yy}${mm}-${rand}`;
}

// Subscribe to real-time Shop Purchase Invoices
export function subscribeToShopPurchases(onData, onError) {
  try {
    const q = query(collection(db, SHOP_PURCHASES_COLLECTION), orderBy("createdAt", "desc"));
    return onSnapshot(
      q,
      (snapshot) => {
        const list = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            ...data,
            totalCost: roundCurrency(Number(data.totalCost) || 0),
            paidAmount: roundCurrency(Number(data.paidAmount) || 0),
            remainingDue: roundCurrency(Number(data.remainingDue) || 0),
            itemsCount: Number(data.itemsCount) || 0
          });
        });
        onData(list);
      },
      (error) => {
        console.error("subscribeToShopPurchases error:", error);
        onData([]);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.error("subscribeToShopPurchases setup error:", err);
    onData([]);
    return () => {};
  }
}

// Subscribe to real-time Shop Purchase Returns
export function subscribeToShopPurchaseReturns(onData, onError) {
  try {
    const q = query(collection(db, SHOP_RETURNS_COLLECTION), orderBy("createdAt", "desc"));
    return onSnapshot(
      q,
      (snapshot) => {
        const list = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        onData(list);
      },
      (error) => {
        console.error("subscribeToShopPurchaseReturns error:", error);
        onData([]);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.error("subscribeToShopPurchaseReturns setup error:", err);
    onData([]);
    return () => {};
  }
}

// Create a new Shop Purchase Invoice (Atomic Multi-Item Creation & Supplier Ledger Link)
export async function createShopPurchaseInvoice({
  supplier,
  items,
  paymentMethod = "آجل",
  paidAmount = 0,
  notes = "",
  user = null
}) {
  if (!items || items.length === 0) {
    throw new Error("يرجى إضافة صنف واحد على الأقل في الفاتورة.");
  }

  if (!supplier || !supplier.id) {
    throw new Error("يرجى اختيار المورد المسؤول عن هذه الفاتورة.");
  }

  // 1. Validate & process items
  let totalCost = 0;
  let totalItemsCount = 0;
  const processedItems = [];

  for (const it of items) {
    const qty = Math.max(1, parseInt(it.quantity, 10) || 1);
    const wholesalePrice = Math.max(0, roundCurrency(parseFloat(it.wholesalePrice) || 0));
    const defaultSelling = wholesalePrice > 0 ? roundCurrency(wholesalePrice * 1.25) : 0;
    const sellingPrice = it.sellingPrice !== undefined && it.sellingPrice !== ""
      ? Math.max(0, roundCurrency(parseFloat(it.sellingPrice) || 0))
      : defaultSelling;

    const subtotal = roundCurrency(qty * wholesalePrice);
    totalCost += subtotal;
    totalItemsCount += qty;

    const barcodeVal = (it.barcode || "").trim() || `622${Math.floor(100000 + Math.random() * 900000)}`;

    processedItems.push({
      productId: it.productId || it.id || null,
      barcode: barcodeVal,
      name: it.name ? it.name.trim() : "صنف ميكاب",
      category: it.category || "أخرى",
      brand: it.brand ? it.brand.trim() : "Nelly",
      description: it.description ? it.description.trim() : "",
      quantity: qty,
      returnedQuantity: 0,
      wholesalePrice: wholesalePrice,
      sellingPrice: sellingPrice,
      subtotalCost: subtotal,
      minThreshold: Math.max(0, parseInt(it.minThreshold, 10) || 3)
    });
  }

  totalCost = roundCurrency(totalCost);
  const parsedPaid = roundCurrency(Math.max(0, parseFloat(paidAmount) || 0));
  const effectivePaid = paymentMethod === "آجل" ? 0 : (paymentMethod === "نقدي" ? (parsedPaid > 0 ? parsedPaid : totalCost) : parsedPaid);
  const remainingDue = roundCurrency(Math.max(0, totalCost - effectivePaid));

  const invoiceNumber = generateShopInvoiceNumber();
  const nowIso = new Date().toISOString();

  try {
    // 2. Prepare atomic write batch
    const batch = writeBatch(db);

    // Update / Create products in nelly_shop_products
    for (const item of processedItems) {
      let existingDoc = null;

      // Check by productId
      if (item.productId) {
        const pRef = doc(db, SHOP_PRODUCTS_COLLECTION, item.productId);
        const pSnap = await getDoc(pRef);
        if (pSnap.exists()) {
          existingDoc = { id: pSnap.id, ref: pRef, data: pSnap.data() };
        }
      }

      // Check by barcode if not found by id
      if (!existingDoc && item.barcode) {
        const bq = query(collection(db, SHOP_PRODUCTS_COLLECTION), where("barcode", "==", item.barcode));
        const bSnap = await getDocs(bq);
        if (!bSnap.empty) {
          const docSnap = bSnap.docs[0];
          existingDoc = { id: docSnap.id, ref: docSnap.ref, data: docSnap.data() };
        }
      }

      if (existingDoc) {
        const currentQty = Math.max(0, parseInt(existingDoc.data.quantity, 10) || 0);
        const newQty = currentQty + item.quantity;
        item.productId = existingDoc.id;

        batch.update(existingDoc.ref, {
          quantity: newQty,
          wholesalePrice: item.wholesalePrice,
          sellingPrice: item.sellingPrice,
          name: item.name || existingDoc.data.name,
          category: item.category || existingDoc.data.category,
          brand: item.brand || existingDoc.data.brand,
          updatedAt: nowIso
        });
      } else {
        const newProdRef = doc(collection(db, SHOP_PRODUCTS_COLLECTION));
        item.productId = newProdRef.id;

        batch.set(newProdRef, {
          barcode: item.barcode,
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          wholesalePrice: item.wholesalePrice,
          sellingPrice: item.sellingPrice,
          minThreshold: item.minThreshold,
          brand: item.brand,
          description: item.description,
          createdAt: serverTimestamp(),
          updatedAt: nowIso
        });
      }
    }

    // 3. Save invoice into nelly_shop_purchases
    const invoiceDocRef = doc(collection(db, SHOP_PURCHASES_COLLECTION));
    const invoiceData = {
      invoiceNumber: invoiceNumber,
      supplier: {
        id: supplier.id,
        name: supplier.name || "مورد",
        phone: supplier.phone || ""
      },
      items: processedItems,
      itemsCount: totalItemsCount,
      totalCost: totalCost,
      paidAmount: effectivePaid,
      remainingDue: remainingDue,
      paymentMethod: paymentMethod,
      status: "مكتملة",
      notes: notes ? notes.trim() : "",
      date: nowIso,
      createdBy: user ? {
        uid: user.uid || null,
        name: user.displayName || user.email || "المسؤول",
        email: user.email || ""
      } : null,
      createdAt: serverTimestamp(),
      updatedAt: nowIso
    };
    batch.set(invoiceDocRef, invoiceData);

    // 4. Update supplier balance & transaction ledger
    const supplierRef = doc(db, SUPPLIERS_COLLECTION, supplier.id);
    const supplierSnap = await getDoc(supplierRef);
    if (supplierSnap.exists()) {
      const sData = supplierSnap.data();
      const prevBal = roundCurrency(Number(sData.balance) || 0);
      const newBal = roundCurrency(prevBal + remainingDue);

      const supplierTx = {
        id: `tx_sp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        date: nowIso,
        type: remainingDue > 0 ? "فاتورة واردات محل (آجل)" : "فاتورة واردات محل (مسددة)",
        invoiceNumber: invoiceNumber,
        amount: totalCost,
        paidAmount: effectivePaid,
        remainingDue: remainingDue,
        previousBalance: prevBal,
        newBalance: newBal,
        notes: `فاتورة واردات محل رقم #${invoiceNumber}${remainingDue > 0 ? ` (المستحق: ${remainingDue} ج.م من إجمالي ${totalCost} ج.م)` : ` (مسددة بالكامل: ${totalCost} ج.م)`}`,
        method: paymentMethod
      };

      batch.update(supplierRef, {
        balance: newBal,
        transactions: arrayUnion(supplierTx),
        updatedAt: nowIso
      });
    }

    // Commit all operations atomically
    await batch.commit();

    return {
      success: true,
      id: invoiceDocRef.id,
      invoiceNumber: invoiceNumber,
      totalCost: totalCost,
      remainingDue: remainingDue
    };
  } catch (err) {
    console.error("createShopPurchaseInvoice error:", err);
    throw err;
  }
}

// Return items or full invoice from Shop Purchase to Supplier
export async function returnShopPurchaseItems({
  invoiceId,
  itemsToReturn, // [ { productId, barcode, name, quantity, wholesalePrice } ]
  returnReason = "مرتجع بضاعة للمورد",
  user = null,
  deleteIfZero = false
}) {
  if (!invoiceId) throw new Error("معرّف الفاتورة مطلوب.");
  if (!itemsToReturn || itemsToReturn.length === 0) {
    throw new Error("يرجى تحديد صنف واحد على الأقل للإرجاع.");
  }

  try {
    const invoiceRef = doc(db, SHOP_PURCHASES_COLLECTION, invoiceId);
    const invoiceSnap = await getDoc(invoiceRef);
    if (!invoiceSnap.exists()) {
      throw new Error("فاتورة الواردات غير موجودة في النظام.");
    }

    const invoiceData = invoiceSnap.data();
    const originalItems = invoiceData.items || [];
    const returnNumber = generateShopReturnNumber();
    const nowIso = new Date().toISOString();

    const batch = writeBatch(db);
    let totalRefundCost = 0;
    const processedReturnItems = [];

    // 1. Process items to return and update Shop products stock
    for (const retItem of itemsToReturn) {
      const returnQty = Math.max(1, parseInt(retItem.quantity, 10) || 1);
      const wholesale = roundCurrency(parseFloat(retItem.wholesalePrice) || 0);
      const refundLineCost = roundCurrency(returnQty * wholesale);
      totalRefundCost += refundLineCost;

      processedReturnItems.push({
        productId: retItem.productId || null,
        barcode: retItem.barcode || "",
        name: retItem.name,
        quantity: returnQty,
        wholesalePrice: wholesale,
        refundCost: refundLineCost
      });

      // Find product in nelly_shop_products
      let prodRef = null;
      let prodSnap = null;

      if (retItem.productId) {
        prodRef = doc(db, SHOP_PRODUCTS_COLLECTION, retItem.productId);
        prodSnap = await getDoc(prodRef);
      }

      if ((!prodSnap || !prodSnap.exists()) && retItem.barcode) {
        const bq = query(collection(db, SHOP_PRODUCTS_COLLECTION), where("barcode", "==", retItem.barcode.trim()));
        const bSnap = await getDocs(bq);
        if (!bSnap.empty) {
          prodRef = bSnap.docs[0].ref;
          prodSnap = bSnap.docs[0];
        }
      }

      if (prodSnap && prodSnap.exists()) {
        const curQty = Math.max(0, parseInt(prodSnap.data().quantity, 10) || 0);
        const newQty = Math.max(0, curQty - returnQty);

        if (newQty === 0 && deleteIfZero) {
          batch.delete(prodRef);
        } else {
          batch.update(prodRef, {
            quantity: newQty,
            updatedAt: nowIso
          });
        }
      }
    }

    totalRefundCost = roundCurrency(totalRefundCost);

    // 2. Update items and status in nelly_shop_purchases
    let totalRemainingQty = 0;
    const updatedInvoiceItems = originalItems.map(orig => {
      const ret = itemsToReturn.find(r => 
        (r.productId && r.productId === orig.productId) || 
        (r.barcode && r.barcode === orig.barcode) || 
        r.name === orig.name
      );

      if (ret) {
        const retQty = Math.max(1, parseInt(ret.quantity, 10) || 1);
        const prevRet = Number(orig.returnedQuantity) || 0;
        const newRet = prevRet + retQty;
        const remaining = Math.max(0, orig.quantity - newRet);
        totalRemainingQty += remaining;

        return {
          ...orig,
          returnedQuantity: newRet,
          subtotalCost: roundCurrency(remaining * orig.wholesalePrice)
        };
      }

      const remaining = Math.max(0, orig.quantity - (Number(orig.returnedQuantity) || 0));
      totalRemainingQty += remaining;
      return orig;
    });

    const isFullyReturned = totalRemainingQty === 0;

    batch.update(invoiceRef, {
      items: updatedInvoiceItems,
      status: isFullyReturned ? "مرتجعة بالكامل" : "مرتجعة جزئياً",
      updatedAt: nowIso
    });

    // 3. Log return in nelly_shop_purchase_returns
    const returnDocRef = doc(collection(db, SHOP_RETURNS_COLLECTION));
    const returnRecord = {
      returnNumber: returnNumber,
      invoiceId: invoiceId,
      invoiceNumber: invoiceData.invoiceNumber,
      supplier: invoiceData.supplier || null,
      returnedItems: processedReturnItems,
      refundedCost: totalRefundCost,
      returnReason: returnReason.trim() || "مرتجع بضاعة للمورد",
      user: user ? {
        uid: user.uid || null,
        name: user.displayName || user.email || "المسؤول"
      } : null,
      date: nowIso,
      createdAt: serverTimestamp()
    };
    batch.set(returnDocRef, returnRecord);

    // 4. Deduct refunded cost from Supplier balance
    if (invoiceData.supplier?.id && totalRefundCost > 0) {
      const supplierRef = doc(db, SUPPLIERS_COLLECTION, invoiceData.supplier.id);
      const supplierSnap = await getDoc(supplierRef);
      if (supplierSnap.exists()) {
        const sData = supplierSnap.data();
        const prevBal = roundCurrency(Number(sData.balance) || 0);
        const newBal = roundCurrency(prevBal - totalRefundCost);

        const supplierTx = {
          id: `tx_spr_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          date: nowIso,
          type: "مرتجع مشتريات محل للمورد",
          invoiceNumber: invoiceData.invoiceNumber,
          returnNumber: returnNumber,
          amount: totalRefundCost,
          previousBalance: prevBal,
          newBalance: newBal,
          notes: `مرتجع مشتريات محل #${returnNumber} من الفاتورة #${invoiceData.invoiceNumber} (تم خصم ${totalRefundCost} ج.م من حساب المورد)`,
          method: "مرتجع"
        };

        batch.update(supplierRef, {
          balance: newBal,
          transactions: arrayUnion(supplierTx),
          updatedAt: nowIso
        });
      }
    }

    // Commit all operations atomically
    await batch.commit();

    return {
      success: true,
      returnNumber: returnNumber,
      refundedCost: totalRefundCost,
      isFullyReturned
    };
  } catch (err) {
    console.error("returnShopPurchaseItems error:", err);
    throw err;
  }
}
