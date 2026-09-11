import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp 
} from "firebase/firestore";
import { db } from "./firebase";
import { roundCurrency } from "./utils";

const TREASURY_COLLECTION = "nelly_treasury_transactions";

// Subscribe to manual treasury transactions (deposits, withdrawals, transfers)
export function subscribeToTreasuryTransactions(onData, onError) {
  try {
    const q = query(collection(db, TREASURY_COLLECTION), orderBy("date", "desc"));
    return onSnapshot(
      q,
      (snapshot) => {
        const txs = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          txs.push({
            id: docSnap.id,
            ...data,
            amount: roundCurrency(Number(data.amount) || 0)
          });
        });
        onData(txs);
      },
      (error) => {
        console.error("Firestore treasury subscription error:", error);
        onData([]);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.error("subscribeToTreasuryTransactions setup error:", err);
    onData([]);
    return () => {};
  }
}

// Record a new manual treasury transaction
// Types: "إيداع" (Deposit / Inflow), "سحب" (Withdrawal / Outflow), "تحويل" (Transfer between vaults)
// Methods: "نقدي", "فيزا", "محفظة إلكترونية"
export async function recordTreasuryTransaction(txData) {
  const {
    type = "إيداع", // "إيداع" | "سحب" | "تحويل"
    amount = 0,
    fromMethod = "نقدي",
    toMethod = null,
    category = "عام", // "إيداع رأس مال", "مسحوبات شخصية", "تسوية نقدية", "تحويل بنكي", etc.
    notes = "",
    date = null,
    createdBy = null
  } = txData;

  const parsedAmount = roundCurrency(parseFloat(amount) || 0);
  if (parsedAmount <= 0) {
    throw new Error("المبلغ يجب أن يكون أكبر من صفر");
  }

  const txDate = date || new Date().toISOString();

  const docPayload = {
    type,
    amount: parsedAmount,
    fromMethod,
    toMethod: type === "تحويل" ? toMethod : null,
    category: category.trim() || "حركة خزنة",
    notes: notes.trim(),
    date: txDate,
    createdBy: createdBy ? {
      uid: createdBy.uid || null,
      name: createdBy.displayName || createdBy.name || createdBy.email || "المسؤول",
      email: createdBy.email || ""
    } : null,
    createdAt: serverTimestamp(),
    updatedAt: new Date().toISOString()
  };

  try {
    const docRef = await addDoc(collection(db, TREASURY_COLLECTION), docPayload);
    return {
      success: true,
      id: docRef.id,
      transaction: { id: docRef.id, ...docPayload }
    };
  } catch (err) {
    console.error("recordTreasuryTransaction error:", err);
    throw err;
  }
}

// Delete a manual treasury transaction
export async function deleteTreasuryTransaction(id) {
  if (!id) throw new Error("معرف الحركة مطلوب لحذفها");
  try {
    const docRef = doc(db, TREASURY_COLLECTION, id);
    await deleteDoc(docRef);
    return { success: true };
  } catch (err) {
    console.error("deleteTreasuryTransaction error:", err);
    throw err;
  }
}
