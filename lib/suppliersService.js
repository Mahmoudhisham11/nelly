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
            balance: Number(data.balance) || 0,
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
  const initialBalance = parseFloat(supplierData.balance) || 0;
  
  const initialTransactions = [];
  if (initialBalance !== 0) {
    initialTransactions.push({
      id: `tx_${Date.now()}`,
      date: new Date().toISOString(),
      type: "رصيد افتتاحي",
      amount: initialBalance,
      previousBalance: 0,
      newBalance: initialBalance,
      notes: "تسجيل رصيد افتتاحي عند إضافة المورد",
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

// Update supplier details
export async function updateSupplier(id, updates) {
  const sanitized = {
    name: updates.name ? updates.name.trim() : undefined,
    phone: updates.phone !== undefined ? updates.phone.trim() : undefined,
    notes: updates.notes !== undefined ? updates.notes.trim() : undefined,
    updatedAt: new Date().toISOString()
  };

  Object.keys(sanitized).forEach(k => sanitized[k] === undefined && delete sanitized[k]);

  try {
    const supplierRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(supplierRef, sanitized);
    return { success: true };
  } catch (err) {
    console.error("Firestore updateSupplier error:", err);
    throw err;
  }
}

// Record a payment / settlement transaction (Allows any value, positive or negative)
export async function makeSupplierPayment(supplierId, currentBalance, paymentAmount, paymentNotes = "", paymentMethod = "نقدي") {
  const amount = parseFloat(paymentAmount) || 0;
  const prevBal = parseFloat(currentBalance) || 0;
  // Subtracting paid amount from supplier balance (Positive payment reduces debt to supplier)
  const newBalance = prevBal - amount;

  const newTx = {
    id: `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    date: new Date().toISOString(),
    type: amount >= 0 ? "سداد دفعة" : "تعديل رصيد / إضافة مستحقات",
    amount: amount,
    previousBalance: prevBal,
    newBalance: newBalance,
    notes: paymentNotes.trim() || (amount >= 0 ? "سداد دفعة حساب للمورد" : "تسوية حساب"),
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

// Delete a transaction from supplier statement and recalculate balance
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

    // Reverse balance adjustment
    let currentBal = Number(data.balance) || 0;
    let adjustedBalance = currentBal;

    if (txToDelete.type === "رصيد افتتاحي") {
      adjustedBalance = currentBal - Number(txToDelete.amount || 0);
    } else {
      // Payment: previously subtracted from balance, so we add it back
      adjustedBalance = currentBal + Number(txToDelete.amount || 0);
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
