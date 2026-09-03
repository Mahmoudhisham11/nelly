import { 
  collection, 
  doc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy 
} from "firebase/firestore";
import { db } from "./firebase";

const COLLECTION_NAME = "nelly_users";

// Subscribe to real-time users collection from Firestore (nelly_users)
export function subscribeToUsers(onData, onError) {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
    return onSnapshot(
      q,
      (snapshot) => {
        const usersList = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          usersList.push({
            id: docSnap.id,
            uid: docSnap.id,
            ...data
          });
        });
        onData(usersList);
      },
      (error) => {
        console.error("Firestore users subscription error:", error);
        onData([]);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.error("subscribeToUsers setup error:", err);
    onData([]);
    return () => {};
  }
}

// Update a user's role in Firestore (e.g. 'admin' or 'user')
export async function updateUserRole(userId, newRole) {
  try {
    const userRef = doc(db, COLLECTION_NAME, userId);
    await updateDoc(userRef, {
      role: newRole,
      updatedAt: new Date().toISOString()
    });
    return { success: true };
  } catch (err) {
    console.error("updateUserRole error:", err);
    throw err;
  }
}

// Delete user document from Firestore
export async function deleteUserDoc(userId) {
  try {
    const userRef = doc(db, COLLECTION_NAME, userId);
    await deleteDoc(userRef);
    return { success: true };
  } catch (err) {
    console.error("deleteUserDoc error:", err);
    throw err;
  }
}

