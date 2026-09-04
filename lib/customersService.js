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

const COLLECTION_NAME = "nelly_customers";

// Subscribe to real-time customers collection
export function subscribeToCustomers(onData, onError) {
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
            totalPurchases: roundCurrency(Number(data.totalPurchases) || 0),
            transactions: data.transactions || []
          });
        });
        onData(items);
      },
      (error) => {
        console.error("Firestore customers subscription error:", error);
        onData([]);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.error("subscribeToCustomers setup error:", err);
    onData([]);
    return () => {};
  }
}

// Add a new customer
export async function addCustomer(customerData) {
  const initialBalance = roundCurrency(parseFloat(customerData.balance) || 0);
  
  const initialTransactions = [];
  if (initialBalance !== 0) {
    initialTransactions.push({
      id: `ctx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      date: new Date().toISOString(),
      type: "رصيد افتتاحي",
      amount: Math.abs(initialBalance),
      previousBalance: 0,
      newBalance: initialBalance,
      notes: initialBalance > 0 ? "رصيد مديونية سابقة مستحقة على العميل" : "رصيد دفع مسبق للعميل",
      method: "رصيد افتتاحي"
    });
  }

  const newCustomer = {
    name: customerData.name ? customerData.name.trim() : "عميل جديد",
    phone: customerData.phone ? customerData.phone.trim() : "",
    address: customerData.address ? customerData.address.trim() : "",
    type: customerData.type || "قطاعي", // قطاعي / جملة / VIP
    balance: initialBalance, // Positive = debt owed by customer (مديونية)
    totalPurchases: 0,
    notes: customerData.notes ? customerData.notes.trim() : "",
    transactions: initialTransactions,
    createdAt: serverTimestamp(),
    updatedAt: new Date().toISOString()
  };

  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), newCustomer);
    return { success: true, id: docRef.id };
  } catch (err) {
    console.error("Firestore addCustomer error:", err);
    throw err;
  }
}

// Update customer details
export async function updateCustomer(id, updates) {
  try {
    const customerRef = doc(db, COLLECTION_NAME, id);
    const sanitized = {
      name: updates.name ? updates.name.trim() : undefined,
      phone: updates.phone !== undefined ? updates.phone.trim() : undefined,
      address: updates.address !== undefined ? updates.address.trim() : undefined,
      type: updates.type || undefined,
      notes: updates.notes !== undefined ? updates.notes.trim() : undefined,
      updatedAt: new Date().toISOString()
    };

    Object.keys(sanitized).forEach(k => sanitized[k] === undefined && delete sanitized[k]);

    await updateDoc(customerRef, sanitized);
    return { success: true };
  } catch (err) {
    console.error("Firestore updateCustomer error:", err);
    throw err;
  }
}

// Record a debt settlement payment from a customer
export async function recordCustomerPayment(
  customerId, 
  currentBalance, 
  paymentAmount, 
  paymentNotes = "", 
  paymentMethod = "نقدي"
) {
  const amount = Math.abs(parseFloat(paymentAmount) || 0);
  if (amount <= 0) {
    throw new Error("المبلغ يجب أن يكون أكبر من صفر");
  }

  const prevBal = roundCurrency(parseFloat(currentBalance) || 0);
  const newBalance = roundCurrency(prevBal - amount); // Payment reduces debt

  const newTx = {
    id: `ctx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    date: new Date().toISOString(),
    type: "سداد دفعة حساب",
    amount: amount,
    previousBalance: prevBal,
    newBalance: newBalance,
    notes: paymentNotes.trim() || "سداد دفعة حساب نقدية من العميل",
    method: paymentMethod || "نقدي"
  };

  try {
    const customerRef = doc(db, COLLECTION_NAME, customerId);
    await updateDoc(customerRef, {
      balance: newBalance,
      transactions: arrayUnion(newTx),
      updatedAt: new Date().toISOString()
    });
    return { success: true, newBalance };
  } catch (err) {
    console.error("Firestore recordCustomerPayment error:", err);
    throw err;
  }
}

// Add an invoice transaction to customer ledger
export async function addInvoiceToCustomerLedger(customerId, invoiceNumber, creditAmount) {
  try {
    const customerRef = doc(db, COLLECTION_NAME, customerId);
    const snap = await getDoc(customerRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const prevBal = roundCurrency(Number(data.balance) || 0);
    const prevPurchases = roundCurrency(Number(data.totalPurchases) || 0);
    const credit = roundCurrency(Number(creditAmount) || 0);
    const newBal = roundCurrency(prevBal + credit);

    const tx = {
      id: `ctx_inv_${Date.now()}`,
      date: new Date().toISOString(),
      type: "فاتورة مبيعات آجل",
      invoiceNumber: invoiceNumber,
      amount: credit,
      previousBalance: prevBal,
      newBalance: newBal,
      notes: `فاتورة مبيعات رقم ${invoiceNumber}`,
      method: "آجل"
    };

    await updateDoc(customerRef, {
      balance: newBal,
      totalPurchases: roundCurrency(prevPurchases + credit),
      transactions: arrayUnion(tx),
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error("addInvoiceToCustomerLedger error:", err);
  }
}

// Delete customer
export async function deleteCustomer(id) {
  try {
    const customerRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(customerRef);
    return { success: true };
  } catch (err) {
    console.error("Firestore deleteCustomer error:", err);
    throw err;
  }
}
