"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { HouseholdMember, MealType, Difficulty, PrepTimePreference } from '../types';
import { storageService } from '../services/storageService';
import { Language } from '../locales/translations';

interface AppContextType {
    lang: Language;
    setLang: (lang: Language) => void;
    household: HouseholdMember[];
    setHousehold: React.Dispatch<React.SetStateAction<HouseholdMember[]>>;
    pantry: string[];
    setPantry: React.Dispatch<React.SetStateAction<string[]>>;
    activeDiners: string[];
    setActiveDiners: React.Dispatch<React.SetStateAction<string[]>>;
    mealType: MealType;
    setMealType: React.Dispatch<React.SetStateAction<MealType>>;
    difficulty: Difficulty;
    setDifficulty: React.Dispatch<React.SetStateAction<Difficulty>>;
    prepTime: PrepTimePreference;
    setPrepTime: React.Dispatch<React.SetStateAction<PrepTimePreference>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
    const [lang, setLang] = useState<Language>('en');

    // Initial hardcoded data as per original app/page.tsx
    const [household, setHousehold] = useState<HouseholdMember[]>([
        { id: 'pai', name: 'Carlos', restrictions: ['Diabetes Type 2'], likes: ['Beef', 'BBQ'], dislikes: ['Cooked vegetables'] },
        { id: 'filha', name: 'Bia', restrictions: ['Vegetarian', 'Peanut Allergy'], likes: ['Pasta', 'Mushrooms'], dislikes: ['Cilantro'] }
    ]);

    const [pantry, setPantry] = useState<string[]>(['Traditional Pasta', 'Tomato Sauce', 'Sugar', 'Zucchini', 'Eggs', 'Parmesan Cheese', 'Roasted Peanuts']);
    const [activeDiners, setActiveDiners] = useState<string[]>(['pai', 'filha']);
    const [mealType, setMealType] = useState<MealType>('main');
    const [difficulty, setDifficulty] = useState<Difficulty>('intermediate');
    const [prepTime, setPrepTime] = useState<PrepTimePreference>('quick');

    // Load initial data from storageService if available (optional enhancement)
    useEffect(() => {
        async function loadData() {
            try {
                const storedPantry = await storageService.getPantry();
                if (storedPantry && storedPantry.length > 0) {
                    setPantry(storedPantry);
                }

                const storedHousehold = await storageService.getHousehold();
                if (storedHousehold && storedHousehold.length > 0) {
                    setHousehold(storedHousehold);
                }
            } catch (e) {
                console.error("Failed to load initial data", e);
            }
        }
        loadData();
    }, []);

    return (
        <AppContext.Provider value={{
            lang, setLang,
            household, setHousehold,
            pantry, setPantry,
            activeDiners, setActiveDiners,
            mealType, setMealType,
            difficulty, setDifficulty,
            prepTime, setPrepTime
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
