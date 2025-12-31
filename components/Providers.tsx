"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { KitchenMember, MealType, Difficulty, PrepTimePreference, PantryItem, Language } from '../types';
import { storageService } from '../services/storageService';


interface AppContextType {
    members: KitchenMember[];
    setMembers: React.Dispatch<React.SetStateAction<KitchenMember[]>>;
    pantry: PantryItem[];
    setPantry: React.Dispatch<React.SetStateAction<PantryItem[]>>;
    activeDiners: string[];
    setActiveDiners: React.Dispatch<React.SetStateAction<string[]>>;
    mealType: MealType;
    setMealType: React.Dispatch<React.SetStateAction<MealType>>;
    difficulty: Difficulty;
    setDifficulty: React.Dispatch<React.SetStateAction<Difficulty>>;
    prepTime: PrepTimePreference;
    setPrepTime: React.Dispatch<React.SetStateAction<PrepTimePreference>>;
    language: Language;
    setLanguage: React.Dispatch<React.SetStateAction<Language>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    // Initial state (Empty - Load from DB)
    const [members, setMembers] = useState<KitchenMember[]>([]);

    const [pantry, setPantry] = useState<PantryItem[]>([]);
    const [activeDiners, setActiveDiners] = useState<string[]>([]);
    const [mealType, setMealType] = useState<MealType>('main');
    const [difficulty, setDifficulty] = useState<Difficulty>('intermediate');
    const [prepTime, setPrepTime] = useState<PrepTimePreference>('quick');

    const [language, setLanguage] = useState<Language>('en');

    // Detect browser language on mount
    useEffect(() => {
        if (typeof window !== 'undefined' && !localStorage.getItem('user_language_preference')) {
            const browserLang = navigator.language;
            if (browserLang.toLowerCase().startsWith('pt')) {
                setLanguage('pt-BR');
            }
        }
    }, []);

    // Load initial data from storageService if available (optional enhancement)
    useEffect(() => {
        // Skip fetching data on auth pages, but we can still check local storage or existing session later
        if (pathname === '/login' || pathname === '/register' || pathname === '/recover' || pathname === '/verify-email') {
            return;
        }

        async function loadData() {
            try {
                // Load User Preferences first (Language)
                const storedUser = await storageService.getCurrentUser();
                if (storedUser && storedUser.user && storedUser.user.language) {
                    setLanguage(storedUser.user.language as Language);
                }

                const storedPantry = await storageService.getPantry();
                if (storedPantry && storedPantry.length > 0) {
                    setPantry(storedPantry);
                }

                const storedMembers = await storageService.getKitchenMembers();
                if (storedMembers && storedMembers.length > 0) {
                    setMembers(storedMembers);
                }
            } catch (e: any) {
                // If unauthorized, just ignore (user likely session expired or not logged in yet)
                if (e.message.includes('Unauthorized') || e.message.includes('401')) {
                    // Redirect to login if potentially valid session but unauthorized (expired)
                    // Use window.location to ensure full refresh and clear state if needed, or router.push
                    router.push('/login');
                } else {
                    console.error("Failed to load initial data", e);
                }
            }
        }
        loadData();
    }, [pathname, router]);

    return (
        <AppContext.Provider value={{
            members, setMembers,
            pantry, setPantry,
            activeDiners, setActiveDiners,
            mealType, setMealType,
            difficulty, setDifficulty,
            prepTime, setPrepTime,
            language, setLanguage
        }}>

            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
}
