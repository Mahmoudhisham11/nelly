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
  serverTimestamp 
} from "firebase/firestore";
import { db } from "./firebase";
import { roundCurrency } from "./utils";

const SHOP_COLLECTION = "nelly_shop_products";
const WAREHOUSE_COLLECTION = "nelly_products";
const TRANSFERS_COLLECTION = "nelly_transfers";

// Subscribe to real-time shop products collection
export function subscribeToShopProducts(onData, onError) {
  try {
    const q = query(collection(db, SHOP_COLLECTION), orderBy("createdAt", "desc"));
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
        console.error("Firestore shop subscription error:", error);
        onData([]);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.error("subscribeToShopProducts setup error:", err);
    onData([]);
    return () => {};
  }
}

// Subscribe to transfers history
export function subscribeToTransfers(onData, onError) {
  try {
    const q = query(collection(db, TRANSFERS_COLLECTION), orderBy("createdAt", "desc"));
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
        console.error("subscribeToTransfers error:", error);
        onData([]);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.error("subscribeToTransfers setup error:", err);
    onData([]);
    return () => {};
  }
}

// Add a product directly to the shop
export async function addShopProduct(product) {
  const barcodeValue = product.barcode ? product.barcode.trim() : `622${Math.floor(100000 + Math.random() * 900000)}`;

  // Uniqueness check in shop
  const barcodeQuery = query(collection(db, SHOP_COLLECTION), where("barcode", "==", barcodeValue));
  const snap = await getDocs(barcodeQuery);
  if (!snap.empty) {
    throw new Error(`الباركود "${barcodeValue}" مسجل بالفعل لصنف آخر بالمحل.`);
  }

  const wholesalePrice = Math.max(0, roundCurrency(parseFloat(product.wholesalePrice) || 0));
  const defaultSelling = wholesalePrice > 0 ? roundCurrency(wholesalePrice * 1.25) : 0;
  const sellingPrice = product.sellingPrice !== undefined && product.sellingPrice !== "" 
    ? Math.max(0, roundCurrency(parseFloat(product.sellingPrice) || 0))
    : defaultSelling;

  const newShopProduct = {
    barcode: barcodeValue,
    name: product.name ? product.name.trim() : "صنف ميكاب بالمحل",
    category: product.category || "أخرى",
    quantity: Math.max(0, parseInt(product.quantity, 10) || 0),
    wholesalePrice: wholesalePrice,
    sellingPrice: sellingPrice,
    minThreshold: Math.max(0, parseInt(product.minThreshold, 10) || 3),
    brand: product.brand ? product.brand.trim() : "Nelly",
    description: product.description ? product.description.trim() : "",
    createdAt: serverTimestamp(),
    updatedAt: new Date().toISOString()
  };

  try {
    const docRef = await addDoc(collection(db, SHOP_COLLECTION), newShopProduct);
    return { success: true, id: docRef.id };
  } catch (err) {
    console.error("Firestore addShopProduct error:", err);
    throw err;
  }
}

// Update existing shop product
export async function updateShopProduct(id, updates) {
  if (updates.barcode) {
    const trimmedBarcode = updates.barcode.trim();
    const barcodeQuery = query(collection(db, SHOP_COLLECTION), where("barcode", "==", trimmedBarcode));
    const snap = await getDocs(barcodeQuery);
    const hasCollision = snap.docs.some(docSnap => docSnap.id !== id);
    if (hasCollision) {
      throw new Error(`الباركود "${trimmedBarcode}" مسجل بالفعل لصنف آخر بالمحل.`);
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
    minThreshold: updates.minThreshold !== undefined ? Math.max(0, parseInt(updates.minThreshold, 10) || 3) : undefined,
    updatedAt: new Date().toISOString()
  };

  Object.keys(sanitized).forEach(k => sanitized[k] === undefined && delete sanitized[k]);

  try {
    const productRef = doc(db, SHOP_COLLECTION, id);
    await updateDoc(productRef, sanitized);
    return { success: true };
  } catch (err) {
    console.error("Firestore updateShopProduct error:", err);
    throw err;
  }
}

// Delete shop product
export async function deleteShopProduct(id) {
  try {
    const productRef = doc(db, SHOP_COLLECTION, id);
    await deleteDoc(productRef);
    return { success: true };
  } catch (err) {
    console.error("Firestore deleteShopProduct error:", err);
    throw err;
  }
}

// =========================================================================
// SMART TRANSFER: Transfer from Warehouse to Shop (المخزن ➡️ المحل)
// =========================================================================
export async function transferFromWarehouseToShop(warehouseProduct, qtyToTransfer, user = null) {
  const qty = parseInt(qtyToTransfer, 10);
  if (isNaN(qty) || qty <= 0) {
    throw new Error("يرجى إدخال كمية تحويل صحيحة أكبر من صفر.");
  }

  const availableWarehouseQty = Math.max(0, parseInt(warehouseProduct.quantity, 10) || 0);
  if (qty > availableWarehouseQty) {
    throw new Error(`الكمية المطلوبة (${qty}) تتجاوز الكمية المتوفرة بالمخزن (${availableWarehouseQty}).`);
  }

  try {
    // 1. Fetch fresh stock from Firestore to prevent any concurrency or client-side bypass
    const warehouseRef = doc(db, WAREHOUSE_COLLECTION, warehouseProduct.id);


    const freshWarehouseSnap = await getDoc(warehouseRef);
    if (!freshWarehouseSnap.exists()) {
      throw new Error("هذا الصنف لم يعد موجوداً في المخزن.");
    }
    
    const freshWhStock = Math.max(0, parseInt(freshWarehouseSnap.data().quantity, 10) || 0);
    if (qty > freshWhStock) {
      throw new Error(`ممنوع نهائياً: الكمية المطلوبة (${qty}) أكبر من الرصيد المتوفر حالياً في المخزن (${freshWhStock} قطعة).`);
    }

    const newWarehouseQty = freshWhStock - qty;
    await updateDoc(warehouseRef, {
      quantity: newWarehouseQty,
      updatedAt: new Date().toISOString()
    });


    // 2. Check if product already exists in Shop (nelly_shop_products) by barcode
    let shopItemName = warehouseProduct.name || "صنف ميكاب";
    const barcodeVal = (warehouseProduct.barcode || "").trim();

    let existingShopDoc = null;
    if (barcodeVal) {
      const q = query(collection(db, SHOP_COLLECTION), where("barcode", "==", barcodeVal));
      const snap = await getDocs(q);
      if (!snap.empty) {
        existingShopDoc = snap.docs[0];
      }
    }

    if (existingShopDoc) {
      // Product exists in Shop: Increment quantity only!
      const currentShopQty = Math.max(0, parseInt(existingShopDoc.data().quantity, 10) || 0);
      const newShopQty = currentShopQty + qty;

      await updateDoc(doc(db, SHOP_COLLECTION, existingShopDoc.id), {
        quantity: newShopQty,
        wholesalePrice: warehouseProduct.wholesalePrice !== undefined ? warehouseProduct.wholesalePrice : existingShopDoc.data().wholesalePrice,
        sellingPrice: warehouseProduct.sellingPrice !== undefined ? warehouseProduct.sellingPrice : existingShopDoc.data().sellingPrice,
        updatedAt: new Date().toISOString()
      });
    } else {
      // Product does NOT exist in Shop: Create new document with transferred quantity
      const newShopItem = {
        barcode: barcodeVal || `622${Math.floor(100000 + Math.random() * 900000)}`,
        name: warehouseProduct.name || "صنف ميكاب",
        category: warehouseProduct.category || "أخرى",
        quantity: qty,
        wholesalePrice: Math.max(0, roundCurrency(parseFloat(warehouseProduct.wholesalePrice) || 0)),
        sellingPrice: Math.max(0, roundCurrency(parseFloat(warehouseProduct.sellingPrice) || (Number(warehouseProduct.wholesalePrice) * 1.25) || 0)),
        minThreshold: Math.max(0, parseInt(warehouseProduct.minThreshold, 10) || 3),
        brand: warehouseProduct.brand ? warehouseProduct.brand.trim() : "Nelly",
        description: warehouseProduct.description ? warehouseProduct.description.trim() : "",
        warehouseProductId: warehouseProduct.id,
        createdAt: serverTimestamp(),
        updatedAt: new Date().toISOString()
      };
      await addDoc(collection(db, SHOP_COLLECTION), newShopItem);
    }

    // 3. Log Transfer in nelly_transfers
    const transferRecord = {
      from: "المخزن",
      to: "المحل",
      direction: "warehouse_to_shop",
      productName: shopItemName,
      barcode: barcodeVal,
      quantity: qty,
      user: user ? (user.displayName || user.email || "المسؤول") : "المسؤول",
      date: new Date().toISOString(),
      createdAt: serverTimestamp()
    };
    await addDoc(collection(db, TRANSFERS_COLLECTION), transferRecord);

    return { success: true, newWarehouseQty };
  } catch (err) {
    console.error("transferFromWarehouseToShop error:", err);
    throw err;
  }
}

// =========================================================================
// REVERSE TRANSFER: Transfer from Shop to Warehouse (المحل ➡️ المخزن)
// =========================================================================
export async function transferFromShopToWarehouse(shopProduct, qtyToTransfer, user = null) {
  const qty = parseInt(qtyToTransfer, 10);
  if (isNaN(qty) || qty <= 0) {
    throw new Error("يرجى إدخال كمية تحويل صحيحة أكبر من صفر.");
  }

  const availableShopQty = Math.max(0, parseInt(shopProduct.quantity, 10) || 0);
  if (qty > availableShopQty) {
    throw new Error(`الكمية المطلوبة (${qty}) تتجاوز الكمية المتوفرة بالمحل (${availableShopQty}).`);
  }

  try {
    // 1. Decrement from Shop (nelly_shop_products)
    const newShopQty = availableShopQty - qty;
    const shopRef = doc(db, SHOP_COLLECTION, shopProduct.id);
    await updateDoc(shopRef, {
      quantity: newShopQty,
      updatedAt: new Date().toISOString()
    });

    // 2. Increment in Warehouse (nelly_products)
    const barcodeVal = (shopProduct.barcode || "").trim();
    let existingWarehouseDoc = null;
    if (barcodeVal) {
      const q = query(collection(db, WAREHOUSE_COLLECTION), where("barcode", "==", barcodeVal));
      const snap = await getDocs(q);
      if (!snap.empty) {
        existingWarehouseDoc = snap.docs[0];
      }
    }

    if (existingWarehouseDoc) {
      const currentWhQty = Math.max(0, parseInt(existingWarehouseDoc.data().quantity, 10) || 0);
      await updateDoc(doc(db, WAREHOUSE_COLLECTION, existingWarehouseDoc.id), {
        quantity: currentWhQty + qty,
        updatedAt: new Date().toISOString()
      });
    } else {
      const newWhItem = {
        barcode: barcodeVal || `622${Math.floor(100000 + Math.random() * 900000)}`,
        name: shopProduct.name,
        category: shopProduct.category || "أخرى",
        quantity: qty,
        wholesalePrice: shopProduct.wholesalePrice || 0,
        sellingPrice: shopProduct.sellingPrice || 0,
        minThreshold: 5,
        brand: shopProduct.brand || "Nelly",
        description: shopProduct.description || "",
        createdAt: serverTimestamp(),
        updatedAt: new Date().toISOString()
      };
      await addDoc(collection(db, WAREHOUSE_COLLECTION), newWhItem);
    }

    // 3. Log Transfer
    const transferRecord = {
      from: "المحل",
      to: "المخزن",
      direction: "shop_to_warehouse",
      productName: shopProduct.name,
      barcode: barcodeVal,
      quantity: qty,
      user: user ? (user.displayName || user.email || "المسؤول") : "المسؤول",
      date: new Date().toISOString(),
      createdAt: serverTimestamp()
    };
    await addDoc(collection(db, TRANSFERS_COLLECTION), transferRecord);

    return { success: true, newShopQty };
  } catch (err) {
    console.error("transferFromShopToWarehouse error:", err);
    throw err;
  }
}
