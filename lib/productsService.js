import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp
} from "firebase/firestore";
import { db } from "./firebase";
import { roundCurrency } from "./utils";

const COLLECTION_NAME = "nelly_products";

// Subscribe to real-time products collection directly from Firestore
export function subscribeToProducts(onData, onError) {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
    return onSnapshot(
      q,
      (snapshot) => {
        const items = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const wholesalePrice = roundCurrency(Number(data.wholesalePrice) || 0);
          const sellingPrice = roundCurrency(Number(data.sellingPrice) || (wholesalePrice > 0 ? wholesalePrice * 1.25 : 0));
          items.push({
            id: docSnap.id,
            ...data,
            barcode: data.barcode || data.code || "",
            wholesalePrice: wholesalePrice,
            sellingPrice: sellingPrice,
            quantity: Math.max(0, parseInt(data.quantity, 10) || 0)
          });
        });
        onData(items);
      },
      (error) => {
        console.error("Firestore subscription error:", error);
        onData([]);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.error("subscribeToProducts setup error:", err);
    onData([]);
    return () => { };
  }
}

// Add a new real product to Firestore with uniqueness check
export async function addProduct(product) {
  const barcodeValue = product.barcode ? product.barcode.trim() : `622${Math.floor(100000 + Math.random() * 900000)}`;

  // Verify barcode uniqueness
  const barcodeQuery = query(collection(db, COLLECTION_NAME), where("barcode", "==", barcodeValue));
  const snap = await getDocs(barcodeQuery);
  if (!snap.empty) {
    throw new Error(`الباركود "${barcodeValue}" مسجل بالفعل لصنف آخر بالمخزن.`);
  }

  const wholesalePrice = Math.max(0, roundCurrency(parseFloat(product.wholesalePrice) || 0));
  const defaultSelling = wholesalePrice > 0 ? roundCurrency(wholesalePrice * 1.25) : 0;
  const sellingPrice = product.sellingPrice !== undefined && product.sellingPrice !== ""
    ? Math.max(0, roundCurrency(parseFloat(product.sellingPrice) || 0))
    : defaultSelling;

  const newProduct = {
    barcode: barcodeValue,
    name: product.name ? product.name.trim() : "صنف ميكاب",
    category: product.category || "أخرى",
    quantity: Math.max(0, parseInt(product.quantity, 10) || 0),
    wholesalePrice: wholesalePrice,
    sellingPrice: sellingPrice,
    minThreshold: Math.max(0, parseInt(product.minThreshold, 10) || 5),
    brand: product.brand ? product.brand.trim() : "Nelly",
    description: product.description ? product.description.trim() : "",
    createdAt: serverTimestamp(),
    updatedAt: new Date().toISOString()
  };

  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), newProduct);
    return { success: true, id: docRef.id };
  } catch (err) {
    console.error("Firestore addDoc error:", err);
    throw err;
  }
}

// Update existing product in Firestore with barcode collision prevention
export async function updateProduct(id, updates) {
  if (updates.barcode) {
    const trimmedBarcode = updates.barcode.trim();
    const barcodeQuery = query(collection(db, COLLECTION_NAME), where("barcode", "==", trimmedBarcode));
    const snap = await getDocs(barcodeQuery);
    const hasCollision = snap.docs.some(docSnap => docSnap.id !== id);
    if (hasCollision) {
      throw new Error(`الباركود "${trimmedBarcode}" مسجل بالفعل لصنف آخر بالمخزن.`);
    }
  }

  const sanitized = {
    ...updates,
    barcode: updates.barcode ? updates.barcode.trim() : undefined,
    name: updates.name ? updates.name.trim() : undefined,
    category: updates.category || undefined,
    brand: updates.brand ? updates.brand.trim() : undefined,
    description: updates.description !== undefined ? updates.description.trim() : undefined,
    quantity: updates.quantity !== undefined ? Math.max(0, parseInt(updates.quantity, 10) || 0) : undefined,
    wholesalePrice: updates.wholesalePrice !== undefined ? Math.max(0, roundCurrency(parseFloat(updates.wholesalePrice) || 0)) : undefined,
    sellingPrice: updates.sellingPrice !== undefined ? Math.max(0, roundCurrency(parseFloat(updates.sellingPrice) || 0)) : undefined,
    minThreshold: updates.minThreshold !== undefined ? Math.max(0, parseInt(updates.minThreshold, 10) || 5) : undefined,
    updatedAt: new Date().toISOString()
  };

  delete sanitized.code;

  Object.keys(sanitized).forEach(k => sanitized[k] === undefined && delete sanitized[k]);

  try {
    const productRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(productRef, sanitized);
    return { success: true };
  } catch (err) {
    console.error("Firestore updateDoc error:", err);
    throw err;
  }
}

// Delete product from Firestore
export async function deleteProduct(id) {
  try {
    const productRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(productRef);
    return { success: true };
  } catch (err) {
    console.error("Firestore deleteProduct error:", err);
    throw err;
  }
}

