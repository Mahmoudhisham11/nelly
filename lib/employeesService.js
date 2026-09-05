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
  serverTimestamp 
} from "firebase/firestore";
import { db } from "./firebase";
import { roundCurrency } from "./utils";

const EMPLOYEES_COLLECTION = "nelly_employees";
const ATTENDANCE_COLLECTION = "nelly_employee_attendance";
const TRANSACTIONS_COLLECTION = "nelly_employee_transactions";

// ==========================================
// 1. Employees Master Directory
// ==========================================

// Subscribe to real-time employees list
export function subscribeToEmployees(onData, onError) {
  try {
    const q = query(collection(db, EMPLOYEES_COLLECTION), orderBy("createdAt", "desc"));
    return onSnapshot(
      q,
      (snapshot) => {
        const list = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            ...data,
            baseSalary: roundCurrency(Number(data.baseSalary) || 0),
            commissionRate: data.commissionRate !== undefined ? Number(data.commissionRate) : 0.01,
            status: data.status || "active"
          });
        });
        onData(list);
      },
      (error) => {
        console.error("subscribeToEmployees error:", error);
        onData([]);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.error("subscribeToEmployees setup error:", err);
    onData([]);
    return () => {};
  }
}

// Add a new employee with unique code verification
export async function addEmployee(employeeData) {
  const code = (employeeData.code ? String(employeeData.code).trim() : "").toUpperCase();
  const name = employeeData.name ? employeeData.name.trim() : "";

  if (!name) throw new Error("اسم الموظف مطلوب.");
  if (!code) throw new Error("كود الموظف مطلوب للتعرف عليه وتسجيل البصمة.");

  // Check unique code
  const codeQuery = query(collection(db, EMPLOYEES_COLLECTION), where("code", "==", code));
  const snap = await getDocs(codeQuery);
  if (!snap.empty) {
    throw new Error(`كود الموظف "${code}" مستخدم بالفعل لموظف آخر.`);
  }

  const newEmployee = {
    name: name,
    code: code,
    phone: employeeData.phone ? employeeData.phone.trim() : "",
    role: employeeData.role ? employeeData.role.trim() : "بائع",
    baseSalary: Math.max(0, roundCurrency(parseFloat(employeeData.baseSalary) || 0)),
    commissionRate: employeeData.commissionRate !== undefined ? Math.max(0, parseFloat(employeeData.commissionRate) || 0) : 0.01,
    status: employeeData.status || "active",
    notes: employeeData.notes ? employeeData.notes.trim() : "",
    hireDate: employeeData.hireDate || new Date().toISOString().split("T")[0],
    createdAt: serverTimestamp(),
    updatedAt: new Date().toISOString()
  };

  try {
    const docRef = await addDoc(collection(db, EMPLOYEES_COLLECTION), newEmployee);
    return { success: true, id: docRef.id };
  } catch (err) {
    console.error("addEmployee error:", err);
    throw err;
  }
}

// Update existing employee
export async function updateEmployee(id, updates) {
  if (updates.code) {
    const code = String(updates.code).trim().toUpperCase();
    const codeQuery = query(collection(db, EMPLOYEES_COLLECTION), where("code", "==", code));
    const snap = await getDocs(codeQuery);
    const hasCollision = snap.docs.some(docSnap => docSnap.id !== id);
    if (hasCollision) {
      throw new Error(`كود الموظف "${code}" مستخدم بالفعل لموظف آخر.`);
    }
  }

  const sanitized = {
    ...updates,
    code: updates.code ? String(updates.code).trim().toUpperCase() : undefined,
    name: updates.name ? updates.name.trim() : undefined,
    phone: updates.phone !== undefined ? updates.phone.trim() : undefined,
    role: updates.role ? updates.role.trim() : undefined,
    baseSalary: updates.baseSalary !== undefined ? Math.max(0, roundCurrency(parseFloat(updates.baseSalary) || 0)) : undefined,
    commissionRate: updates.commissionRate !== undefined ? Math.max(0, parseFloat(updates.commissionRate) || 0) : undefined,
    status: updates.status || undefined,
    notes: updates.notes !== undefined ? updates.notes.trim() : undefined,
    updatedAt: new Date().toISOString()
  };

  Object.keys(sanitized).forEach(k => sanitized[k] === undefined && delete sanitized[k]);

  try {
    const docRef = doc(db, EMPLOYEES_COLLECTION, id);
    await updateDoc(docRef, sanitized);
    return { success: true };
  } catch (err) {
    console.error("updateEmployee error:", err);
    throw err;
  }
}

// Delete employee
export async function deleteEmployee(id) {
  try {
    await deleteDoc(doc(db, EMPLOYEES_COLLECTION, id));
    return { success: true };
  } catch (err) {
    console.error("deleteEmployee error:", err);
    throw err;
  }
}

// ==========================================
// 2. Quick Punch & Attendance System
// ==========================================

// Subscribe to attendance records
export function subscribeToAttendance(onData, onError) {
  try {
    const q = query(collection(db, ATTENDANCE_COLLECTION), orderBy("checkIn", "desc"));
    return onSnapshot(
      q,
      (snapshot) => {
        const records = [];
        snapshot.forEach((docSnap) => {
          records.push({ id: docSnap.id, ...docSnap.data() });
        });
        onData(records);
      },
      (error) => {
        console.error("subscribeToAttendance error:", error);
        onData([]);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.error("subscribeToAttendance setup error:", err);
    onData([]);
    return () => {};
  }
}

// Subscribe to today's active & completed attendance
export function subscribeToTodayAttendance(onData, onError) {
  try {
    const todayStr = new Date().toISOString().split("T")[0];
    const q = query(
      collection(db, ATTENDANCE_COLLECTION),
      where("date", "==", todayStr)
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const records = [];
        snapshot.forEach((docSnap) => {
          records.push({ id: docSnap.id, ...docSnap.data() });
        });
        // Sort client side to avoid requiring composite indexes
        records.sort((a, b) => new Date(b.checkIn || 0) - new Date(a.checkIn || 0));
        onData(records);
      },
      (error) => {
        console.error("subscribeToTodayAttendance error:", error);
        onData([]);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.error("subscribeToTodayAttendance setup error:", err);
    onData([]);
    return () => {};
  }
}

// Quick Punch In / Out by typing or barcode-scanning Employee Code
export async function punchEmployeeAttendance(inputCode, notes = "") {
  const code = String(inputCode || "").trim().toUpperCase();
  if (!code) throw new Error("يرجى إدخال أو مسح كود الموظف.");

  // 1. Find the employee by code
  const empQuery = query(collection(db, EMPLOYEES_COLLECTION), where("code", "==", code));
  const empSnap = await getDocs(empQuery);
  if (empSnap.empty) {
    throw new Error(`كود الموظف "${code}" غير مسجل في النظام.`);
  }

  const empDoc = empSnap.docs[0];
  const employee = { id: empDoc.id, ...empDoc.data() };

  if (employee.status === "inactive") {
    throw new Error(`الموظف "${employee.name}" حسابه معطل حالياً.`);
  }

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const nowIso = now.toISOString();

  // 2. Check if this employee has an active in_progress session today
  const activeQuery = query(
    collection(db, ATTENDANCE_COLLECTION),
    where("employeeId", "==", employee.id)
  );
  const activeSnap = await getDocs(activeQuery);
  const activeDocs = activeSnap.docs.filter((d) => d.data().status === "in_progress");

  if (activeDocs.length > 0) {
    // Punch OUT (تسجيل انصراف)
    const activeDoc = activeDocs[0];
    const activeData = activeDoc.data();
    const checkInTime = new Date(activeData.checkIn);
    const diffMs = now.getTime() - checkInTime.getTime();
    const durationMinutes = Math.max(1, Math.round(diffMs / (1000 * 60)));
    const durationHours = (durationMinutes / 60).toFixed(2);

    await updateDoc(doc(db, ATTENDANCE_COLLECTION, activeDoc.id), {
      checkOut: nowIso,
      durationMinutes: durationMinutes,
      status: "completed",
      notes: notes ? `${activeData.notes || ""} | ${notes}` : activeData.notes || "",
      updatedAt: nowIso
    });

    return {
      action: "check_out",
      employee: employee,
      checkIn: activeData.checkIn,
      checkOut: nowIso,
      durationMinutes: durationMinutes,
      durationHours: durationHours,
      message: `تم تسجيل انصراف الموظف "${employee.name}" بنجاح. مدة الوردية: ${Math.floor(durationMinutes / 60)} ساعة و ${durationMinutes % 60} دقيقة.`
    };
  } else {
    // Punch IN (تسجيل حضور)
    const newAttendanceDoc = {
      employeeId: employee.id,
      employeeCode: employee.code,
      employeeName: employee.name,
      date: todayStr,
      checkIn: nowIso,
      checkOut: null,
      durationMinutes: 0,
      status: "in_progress",
      notes: notes.trim() || "تسجيل حضور إلكتروني",
      createdAt: serverTimestamp(),
      updatedAt: nowIso
    };

    const docRef = await addDoc(collection(db, ATTENDANCE_COLLECTION), newAttendanceDoc);

    return {
      action: "check_in",
      id: docRef.id,
      employee: employee,
      checkIn: nowIso,
      message: `تم تسجيل حضور الموظف "${employee.name}" بنجاح في تمام الساعة ${now.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}.`
    };
  }
}

// Manual Checkout or edit attendance session
export async function manualCompleteAttendance(id, checkOutTime, notes = "") {
  try {
    const docRef = doc(db, ATTENDANCE_COLLECTION, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("السجل غير موجود.");

    const data = snap.data();
    const inTime = new Date(data.checkIn);
    const outTime = new Date(checkOutTime);
    const diffMs = Math.max(0, outTime.getTime() - inTime.getTime());
    const durationMinutes = Math.round(diffMs / (1000 * 60));

    await updateDoc(docRef, {
      checkOut: outTime.toISOString(),
      durationMinutes: durationMinutes,
      status: "completed",
      notes: notes ? `${data.notes || ""} | ${notes}` : data.notes || "",
      updatedAt: new Date().toISOString()
    });

    return { success: true };
  } catch (err) {
    console.error("manualCompleteAttendance error:", err);
    throw err;
  }
}

// Delete attendance record
export async function deleteAttendanceRecord(id) {
  try {
    await deleteDoc(doc(db, ATTENDANCE_COLLECTION, id));
    return { success: true };
  } catch (err) {
    console.error("deleteAttendanceRecord error:", err);
    throw err;
  }
}

// ==========================================
// 3. Employee Financial Ledger (Bonuses, Penalties, Advances, Commissions)
// ==========================================

// Subscribe to all employee transactions
export function subscribeToEmployeeTransactions(onData, onError) {
  try {
    const q = query(collection(db, TRANSACTIONS_COLLECTION), orderBy("date", "desc"));
    return onSnapshot(
      q,
      (snapshot) => {
        const list = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            ...data,
            amount: roundCurrency(Number(data.amount) || 0)
          });
        });
        onData(list);
      },
      (error) => {
        console.error("subscribeToEmployeeTransactions error:", error);
        onData([]);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.error("subscribeToEmployeeTransactions setup error:", err);
    onData([]);
    return () => {};
  }
}

// Add financial transaction for employee (bonus, penalty, advance, commission, payout)
export async function addEmployeeTransaction({
  employeeId,
  employeeName,
  type, // "bonus" | "penalty" | "advance" | "commission" | "salary_payout"
  amount,
  date = null,
  month = null,
  invoiceNumber = null,
  notes = "",
  createdByUser = null
}) {
  const amt = roundCurrency(parseFloat(amount) || 0);
  if (amt <= 0) throw new Error("المبلغ يجب أن يكون أكبر من صفر.");
  if (!employeeId) throw new Error("يرجى اختيار الموظف.");

  const txDate = date || new Date().toISOString();
  const txMonth = month || `${new Date(txDate).getFullYear()}-${String(new Date(txDate).getMonth() + 1).padStart(2, "0")}`;

  const newTx = {
    employeeId: employeeId,
    employeeName: employeeName || "موظف",
    type: type, // bonus (علاوة), penalty (جزاء), advance (سلفة/مسحوبات), commission (عمولة), salary_payout (صرف راتب)
    amount: amt,
    date: txDate,
    month: txMonth,
    invoiceNumber: invoiceNumber || null,
    notes: notes ? notes.trim() : "",
    createdByUser: createdByUser ? {
      uid: createdByUser.uid || null,
      name: createdByUser.displayName || createdByUser.email || "المشرف"
    } : null,
    createdAt: serverTimestamp()
  };

  try {
    const docRef = await addDoc(collection(db, TRANSACTIONS_COLLECTION), newTx);
    return { success: true, id: docRef.id };
  } catch (err) {
    console.error("addEmployeeTransaction error:", err);
    throw err;
  }
}

// Delete financial transaction
export async function deleteEmployeeTransaction(id) {
  try {
    await deleteDoc(doc(db, TRANSACTIONS_COLLECTION, id));
    return { success: true };
  } catch (err) {
    console.error("deleteEmployeeTransaction error:", err);
    throw err;
  }
}

// Record 1% Sales Commission for an Employee from POS invoice
export async function recordSaleCommission(employee, invoiceNumber, saleTotal, commissionRate = 0.01) {
  if (!employee || !employee.id) return null;

  const total = roundCurrency(parseFloat(saleTotal) || 0);
  if (total <= 0) return null;

  const rate = employee.commissionRate !== undefined ? Number(employee.commissionRate) : commissionRate;
  const commissionAmount = roundCurrency(total * rate);

  if (commissionAmount <= 0) return null;

  try {
    return await addEmployeeTransaction({
      employeeId: employee.id,
      employeeName: employee.name || "موظف مبيعات",
      type: "commission",
      amount: commissionAmount,
      invoiceNumber: invoiceNumber,
      notes: `عمولة مبيعات بنسبة ${(rate * 100).toFixed(1)}% من الفاتورة #${invoiceNumber}`
    });
  } catch (err) {
    console.error("recordSaleCommission error:", err);
    return null;
  }
}
