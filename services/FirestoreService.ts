
import { doc, setDoc, getDoc, collection, getDocs, addDoc, query, where, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { User } from "firebase/auth";
import { Shipper, Order, Cluster, Coordinate } from "../types";

export const FirestoreService = {
    // --- User Profile ---
    saveUserProfile: async (user: User) => {
        try {
            const userRef = doc(db, "users", user.uid);
            await setDoc(userRef, {
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                lastLogin: new Date().toISOString()
            }, { merge: true });
        } catch (error) {
            console.error("Error saving user profile:", error);
        }
    },

    // --- API Key / Preferences ---
    saveApiKey: async (userId: string, apiKey: string) => {
        try {
            const userRef = doc(db, "users", userId);
            await setDoc(userRef, {
                preferences: { trackAsiaApiKey: apiKey }
            }, { merge: true });
        } catch (error) {
            console.error("Error saving API Key:", error);
        }
    },

    getApiKey: async (userId: string): Promise<string | null> => {
        try {
            const userRef = doc(db, "users", userId);
            const docSnap = await getDoc(userRef);
            if (docSnap.exists()) {
                return docSnap.data().preferences?.trackAsiaApiKey || null;
            }
        } catch (error) {
            console.error("Error getting API Key:", error);
        }
        return null;
    },

    // --- Shippers (Drivers) ---
    saveShippers: async (userId: string, shippers: Shipper[]) => {
        try {
            // Save as a single document/field for simplicity given small list size, 
            // or subcollection if large. For < 50 drivers, single doc 'shippers' is fine/faster.
            const shippersRef = doc(db, "users", userId, "data", "shippers");
            await setDoc(shippersRef, { list: shippers });
        } catch (error) {
            console.error("Error saving shippers:", error);
        }
    },

    getShippers: async (userId: string): Promise<Shipper[] | null> => {
        try {
            const shippersRef = doc(db, "users", userId, "data", "shippers");
            const docSnap = await getDoc(shippersRef);
            if (docSnap.exists()) {
                return docSnap.data().list as Shipper[];
            }
        } catch (error) {
            console.error("Error getting shippers:", error);
        }
        return null;
    },

    // --- Current Batch Integration (Orders, Clusters, Warehouse) ---
    saveCurrentBatch: async (userId: string, data: { orders: Order[], clusters: Cluster[], warehouse: Coordinate | null }) => {
        try {
            const batchRef = doc(db, "users", userId, "data", "current_batch");
            await setDoc(batchRef, {
                ...data,
                updatedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error("Error saving current batch:", error);
        }
    },

    getCurrentBatch: async (userId: string) => {
        try {
            const batchRef = doc(db, "users", userId, "data", "current_batch");
            const docSnap = await getDoc(batchRef);
            if (docSnap.exists()) {
                return docSnap.data();
            }
        } catch (error) {
            console.error("Error getting current batch:", error);
        }
        return null;
    },

    // --- History (Completed Batches) ---
    addToHistory: async (userId: string, batchData: { orders: Order[], clusters: Cluster[], timestamp: string }) => {
        try {
            const historyRef = collection(db, "users", userId, "history");
            await addDoc(historyRef, batchData);
        } catch (error) {
            console.error("Error adding to history:", error);
        }
    },

    getHistory: async (userId: string) => {
        try {
            const historyRef = collection(db, "users", userId, "history");
            const q = query(historyRef, orderBy("timestamp", "desc"));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error getting history:", error);
            return [];
        }
    }
};
