import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp 
} from "firebase/firestore";
import { db } from "./firebase";

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
          items.push({ 
            id: docSnap.id, 
            ...data,
            barcode: data.barcode || data.code || ""
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
    return () => {};
  }
}

// Add a new real product to Firestore
export async function addProduct(product) {
  const barcodeValue = product.barcode ? product.barcode.trim() : `622${Math.floor(100000 + Math.random() * 900000)}`;

  const newProduct = {
    barcode: barcodeValue,
    name: product.name ? product.name.trim() : "صنف ميكاب",
    category: product.category || "أخرى",
    quantity: Math.max(0, parseInt(product.quantity, 10) || 0),
    wholesalePrice: Math.max(0, parseFloat(product.wholesalePrice) || 0),
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

// Update existing product in Firestore
export async function updateProduct(id, updates) {
  const sanitized = {
    ...updates,
    barcode: updates.barcode ? updates.barcode.trim() : undefined,
    quantity: updates.quantity !== undefined ? Math.max(0, parseInt(updates.quantity, 10) || 0) : undefined,
    wholesalePrice: updates.wholesalePrice !== undefined ? Math.max(0, parseFloat(updates.wholesalePrice) || 0) : undefined,
    updatedAt: new Date().toISOString()
  };

  delete sanitized.code;
  delete sanitized.sellingPrice;

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
    console.error("Firestore deleteDoc error:", err);
    throw err;
  }
}
