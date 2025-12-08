
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from '../firebase';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    error: string | null;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within an AuthProvider");
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        console.log("Auth Provider Mounted");
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            console.log("Auth State Changed:", currentUser);
            setUser(currentUser);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const loginWithGoogle = async () => {
        setError(null);
        console.log("Attempting Google Login...");
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            console.log("Google Login Success:", result);
        } catch (err: any) {
            console.error("Login failed (full error):", err);
            console.error("Error Code:", err.code);
            console.error("Error Message:", err.message);
            setError(`[${err.code}] ${err.message}`);
            alert(`Login Error: ${err.message}`); // Force visibility
        }
    };

    const logout = async () => {
        await signOut(auth);
    };

    return (
        <AuthContext.Provider value={{ user, loading, error, loginWithGoogle, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
