import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc,
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  arrayUnion
} from "firebase/firestore";
import { db } from "./firebase";
import { roundCurrency } from "./utils";

const COLLECTION_NAME = "nelly_suppliers";

// Subscribe to real-time suppliers collection
export function subscribeToSuppliers(onData, onError) {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
    return onSnapshot(
      q,
      (snapshot) => {
        const items = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          items.push({ 
            id: docSnap.id, 
            ...data,
            balance: roundCurrency(Number(data.balance) || 0),
            transactions: data.transactions || []
          });
        });
        onData(items);
      },
      (error) => {
        console.error("Firestore suppliers subscription error:", error);
        onData([]);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.error("subscribeToSuppliers setup error:", err);
    onData([]);
    return () => {};
  }
}

// Add a new supplier
export async function addSupplier(supplierData) {
  const initialBalance = roundCurrency(parseFloat(supplierData.balance) || 0);
  
  const initialTransactions = [];
  if (initialBalance !== 0) {
    initialTransactions.push({
      id: `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      date: new Date().toISOString(),
      type: "رصيد افتتاحي",
      amount: Math.abs(initialBalance),
      previousBalance: 0,
      newBalance: initialBalance,
      notes: initialBalance > 0 ? "تسجيل رصيد افتتاحي (مستحق للمورد)" : "تسجيل رصيد افتتاحي (مستحق على المورد)",
      method: "رصيد افتتاحي"
    });
  }

  const newSupplier = {
    name: supplierData.name ? supplierData.name.trim() : "مورد جديد",
    phone: supplierData.phone ? supplierData.phone.trim() : "",
    balance: initialBalance,
    notes: supplierData.notes ? supplierData.notes.trim() : "",
    transactions: initialTransactions,
    createdAt: serverTimestamp(),
    updatedAt: new Date().toISOString()
  };

  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), newSupplier);
    return { success: true, id: docRef.id };
  } catch (err) {
    console.error("Firestore addSupplier error:", err);
    throw err;
  }
}

// Update supplier details & handle balance changes seamlessly
export async function updateSupplier(id, updates) {
  try {
    const supplierRef = doc(db, COLLECTION_NAME, id);
    const snap = await getDoc(supplierRef);
    
    if (!snap.exists()) {
      throw new Error("المورد غير موجود");
    }

    const currentData = snap.data();
    const currentBal = roundCurrency(Number(currentData.balance) || 0);

    const sanitized = {
      name: updates.name ? updates.name.trim() : undefined,
      phone: updates.phone !== undefined ? updates.phone.trim() : undefined,
      notes: updates.notes !== undefined ? updates.notes.trim() : undefined,
      updatedAt: new Date().toISOString()
    };

    // If new balance is specified and different from current balance, log an adjustment transaction
    if (updates.balance !== undefined) {
      const newBal = roundCurrency(parseFloat(updates.balance) || 0);
      if (newBal !== currentBal) {
        const diff = roundCurrency(newBal - currentBal);
        const adjustmentTx = {
          id: `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          date: new Date().toISOString(),
          type: "تعديل رصيد يدوي",
          amount: Math.abs(diff),
          previousBalance: currentBal,
          newBalance: newBal,
          notes: updates.adjustmentNotes?.trim() || `تعديل يدوي للرصيد من ${currentBal} إلى ${newBal} ج.م`,
          method: "تعديل يدوي"
        };
        sanitized.balance = newBal;
        sanitized.transactions = arrayUnion(adjustmentTx);
      }
    }

    Object.keys(sanitized).forEach(k => sanitized[k] === undefined && delete sanitized[k]);

    await updateDoc(supplierRef, sanitized);
    return { success: true };
  } catch (err) {
    console.error("Firestore updateSupplier error:", err);
    throw err;
  }
}

// Record a payment / settlement transaction (strictly positive amounts, clear operation types)
export async function makeSupplierPayment(
  supplierId, 
  currentBalance, 
  paymentAmount, 
  paymentNotes = "", 
  paymentMethod = "نقدي",
  transactionType = "payment" // "payment" (سداد دفعة) or "charge" (إضافة مستحقات / بضاعة)
) {
  const amount = Math.abs(parseFloat(paymentAmount) || 0);
  if (amount <= 0) {
    throw new Error("المبلغ يجب أن يكون أكبر من صفر");
  }

  const prevBal = roundCurrency(parseFloat(currentBalance) || 0);
  
  let newBalance = prevBal;
  let txType = "سداد دفعة";
  let defaultNote = "سداد دفعة حساب للمورد";

  if (transactionType === "charge") {
    newBalance = roundCurrency(prevBal + amount);
    txType = "إضافة مستحقات / فاتورة بضاعة";
    defaultNote = "إضافة مستحقات / فاتورة بضاعة جديدة";
  } else {
    // Payment reduces debt to supplier
    newBalance = roundCurrency(prevBal - amount);
    txType = "سداد دفعة";
    defaultNote = "سداد دفعة حساب للمورد";
  }

  const newTx = {
    id: `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    date: new Date().toISOString(),
    type: txType,
    amount: amount,
    previousBalance: prevBal,
    newBalance: newBalance,
    notes: paymentNotes.trim() || defaultNote,
    method: paymentMethod || "نقدي"
  };

  try {
    const supplierRef = doc(db, COLLECTION_NAME, supplierId);
    await updateDoc(supplierRef, {
      balance: newBalance,
      transactions: arrayUnion(newTx),
      updatedAt: new Date().toISOString()
    });
    return { success: true, newBalance };
  } catch (err) {
    console.error("Firestore makeSupplierPayment error:", err);
    throw err;
  }
}

// Delete a transaction from supplier statement and recalculate balance accurately
export async function deleteSupplierTransaction(supplierId, transactionId) {
  try {
    const supplierRef = doc(db, COLLECTION_NAME, supplierId);
    const snap = await getDoc(supplierRef);

    if (!snap.exists()) {
      throw new Error("المورد غير موجود");
    }

    const data = snap.data();
    const currentTransactions = data.transactions || [];
    const txToDelete = currentTransactions.find(t => t.id === transactionId);

    if (!txToDelete) {
      throw new Error("الحركة المالية غير موجودة");
    }

    // Filter out the deleted transaction
    const updatedTransactions = currentTransactions.filter(t => t.id !== transactionId);

    // Reverse balance adjustment accurately based on transaction type
    let currentBal = roundCurrency(Number(data.balance) || 0);
    const txAmount = Math.abs(Number(txToDelete.amount) || 0);
    let adjustedBalance = currentBal;

    if (txToDelete.type === "رصيد افتتاحي") {
      // If initial balance was positive, subtracting it removes the initial debt
      const rawInitAmount = Number(txToDelete.newBalance) || txAmount;
      adjustedBalance = roundCurrency(currentBal - rawInitAmount);
    } else if (txToDelete.type === "سداد دفعة") {
      // Payment previously subtracted from balance, so we add it back
      adjustedBalance = roundCurrency(currentBal + txAmount);
    } else if (txToDelete.type === "إضافة مستحقات / فاتورة بضاعة" || txToDelete.type === "تعديل رصيد / إضافة مستحقات") {
      // Charge previously added to balance, so we subtract it
      adjustedBalance = roundCurrency(currentBal - txAmount);
    } else if (txToDelete.type === "تعديل رصيد يدوي") {
      const prev = Number(txToDelete.previousBalance) || 0;
      const next = Number(txToDelete.newBalance) || 0;
      adjustedBalance = roundCurrency(currentBal - (next - prev));
    } else {
      // Fallback: assume payment
      adjustedBalance = roundCurrency(currentBal + txAmount);
    }

    await updateDoc(supplierRef, {
      balance: adjustedBalance,
      transactions: updatedTransactions,
      updatedAt: new Date().toISOString()
    });

    return { success: true, newBalance: adjustedBalance };
  } catch (err) {
    console.error("deleteSupplierTransaction error:", err);
    throw err;
  }
}

// Delete supplier
export async function deleteSupplier(id) {
  try {
    const supplierRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(supplierRef);
    return { success: true };
  } catch (err) {
    console.error("Firestore deleteSupplier error:", err);
    throw err;
  }
}
