import { 
  collection, 
  addDoc, 
  setDoc,
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
  arrayUnion
} from "firebase/firestore";
import { db } from "./firebase";
import { roundCurrency } from "./utils";

const ITEMS_COLLECTION = "nelly_expense_items";
const MONTHLY_COLLECTION = "nelly_monthly_expenses";

// ==========================================
// 1. Master Expense Line Items
// ==========================================

// Subscribe to all master expense items
export function subscribeToExpenseItems(onData, onError) {
  try {
    const q = query(collection(db, ITEMS_COLLECTION), orderBy("createdAt", "asc"));
    return onSnapshot(
      q,
      (snapshot) => {
        const items = [];
        snapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() });
        });
        onData(items);
      },
      (error) => {
        console.error("subscribeToExpenseItems error:", error);
        onData([]);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.error("subscribeToExpenseItems setup error:", err);
    onData([]);
    return () => {};
  }
}

// Add a new master expense item
export async function addExpenseItem(name, notes = "") {
  const trimmed = name ? name.trim() : "";
  if (!trimmed) throw new Error("اسم البند مطلوب");

  try {
    const docRef = await addDoc(collection(db, ITEMS_COLLECTION), {
      name: trimmed,
      notes: notes ? notes.trim() : "",
      createdAt: serverTimestamp()
    });
    return { success: true, id: docRef.id, name: trimmed };
  } catch (err) {
    console.error("addExpenseItem error:", err);
    throw err;
  }
}

// Update master expense item
export async function updateExpenseItem(id, updates) {
  const sanitized = {
    name: updates.name ? updates.name.trim() : undefined,
    notes: updates.notes !== undefined ? updates.notes.trim() : undefined,
    updatedAt: new Date().toISOString()
  };

  Object.keys(sanitized).forEach(k => sanitized[k] === undefined && delete sanitized[k]);

  try {
    const itemRef = doc(db, ITEMS_COLLECTION, id);
    await updateDoc(itemRef, sanitized);
    return { success: true };
  } catch (err) {
    console.error("updateExpenseItem error:", err);
    throw err;
  }
}

// Delete master expense item and cleanly cascade-delete its monthly expense records
export async function deleteExpenseItem(id) {
  try {
    // 1. Delete master item
    const itemRef = doc(db, ITEMS_COLLECTION, id);
    await deleteDoc(itemRef);

    // 2. Cascade delete all monthly records associated with this item to prevent orphaned records & dashboard mismatches
    const monthlyQuery = query(collection(db, MONTHLY_COLLECTION), where("itemId", "==", id));
    const snap = await getDocs(monthlyQuery);
    const deletePromises = [];
    snap.forEach((d) => {
      deletePromises.push(deleteDoc(doc(db, MONTHLY_COLLECTION, d.id)));
    });
    await Promise.all(deletePromises);

    return { success: true };
  } catch (err) {
    console.error("deleteExpenseItem error:", err);
    throw err;
  }
}

// ==========================================
// 2. Monthly Expenses Ledger
// ==========================================

// Subscribe to all monthly expense records across all months
export function subscribeToAllMonthlyExpenses(onData, onError) {
  try {
    const q = query(collection(db, MONTHLY_COLLECTION));
    return onSnapshot(
      q,
      (snapshot) => {
        const list = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            ...data,
            amount: roundCurrency(Number(data.amount) || 0),
            transactions: data.transactions || []
          });
        });
        onData(list);
      },
      (error) => {
        console.error("subscribeToAllMonthlyExpenses error:", error);
        onData([]);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.error("subscribeToAllMonthlyExpenses setup error:", err);
    onData([]);
    return () => {};
  }
}

// Subscribe to a specific month's expense values (e.g. month = "2026-08")
export function subscribeToMonthlyExpenses(month, onData, onError) {
  try {
    const q = query(
      collection(db, MONTHLY_COLLECTION), 
      where("month", "==", month)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const map = {};
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          map[data.itemId] = {
            id: docSnap.id,
            ...data,
            amount: roundCurrency(Number(data.amount) || 0),
            transactions: data.transactions || []
          };
        });
        onData(map);
      },
      (error) => {
        console.error("subscribeToMonthlyExpenses error:", error);
        onData({});
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.error("subscribeToMonthlyExpenses setup error:", err);
    onData({});
    return () => {};
  }
}

// Add/increase amount to a specific expense item in a specific month
export async function addAmountToExpenseItem(month, itemId, itemName, addAmount, notes = "", method = "نقدي", customDate = null) {
  const inc = roundCurrency(parseFloat(addAmount) || 0);
  if (inc <= 0) throw new Error("المبلغ يجب أن يكون أكبر من صفر");

  const docId = `${month}_${itemId}`;
  const docRef = doc(db, MONTHLY_COLLECTION, docId);

  // Validate or default date ensuring it falls within the month
  let txDate = customDate;
  if (!txDate) {
    const todayStr = new Date().toISOString().split("T")[0];
    txDate = todayStr.startsWith(month) ? todayStr : `${month}-01`;
  }

  const newTx = {
    id: `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    amount: inc,
    date: txDate,
    notes: notes.trim() || "إضافة مصروف",
    method: method || "نقدي",
    createdAt: new Date().toISOString()
  };

  try {
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data();
      const currentAmount = roundCurrency(Number(data.amount) || 0);
      const newAmount = roundCurrency(currentAmount + inc);

      await updateDoc(docRef, {
        amount: newAmount,
        itemName: itemName,
        transactions: arrayUnion(newTx),
        updatedAt: new Date().toISOString()
      });
      return { success: true, newAmount };
    } else {
      // First spend on this item for this month
      await setDoc(docRef, {
        month: month,
        itemId: itemId,
        itemName: itemName,
        amount: inc,
        transactions: [newTx],
        createdAt: serverTimestamp(),
        updatedAt: new Date().toISOString()
      });
      return { success: true, newAmount: inc };
    }
  } catch (err) {
    console.error("addAmountToExpenseItem error:", err);
    throw err;
  }
}

// Delete a single transaction from a monthly expense record
export async function deleteMonthlyTransaction(month, itemId, transactionId) {
  const docId = `${month}_${itemId}`;
  const docRef = doc(db, MONTHLY_COLLECTION, docId);

  try {
    const snap = await getDoc(docRef);
    if (!snap.exists()) return { success: false };

    const data = snap.data();
    const currentTxs = data.transactions || [];
    const txToDelete = currentTxs.find(t => t.id === transactionId);

    if (!txToDelete) return { success: false };

    const updatedTxs = currentTxs.filter(t => t.id !== transactionId);
    const newAmount = Math.max(0, roundCurrency((Number(data.amount) || 0) - Number(txToDelete.amount || 0)));

    await updateDoc(docRef, {
      amount: newAmount,
      transactions: updatedTxs,
      updatedAt: new Date().toISOString()
    });

    return { success: true, newAmount };
  } catch (err) {
    console.error("deleteMonthlyTransaction error:", err);
    throw err;
  }
}
