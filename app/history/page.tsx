"use client";

import React, { useEffect, useState } from 'react';
import HistorySection from '../../components/HistorySection';
import { useApp } from '../../components/Providers';
import { storageService } from '../../services/storageService';
import { RecipeRecord } from '../../types';

export default function HistoryPage() {
    const { lang } = useApp();
    const [history, setHistory] = useState<RecipeRecord[]>([]);

    useEffect(() => {
        storageService.getAllRecipes().then(setHistory);
    }, []);

    const refreshHistory = async () => {
        const data = await storageService.getAllRecipes();
        setHistory(data);
    };

    return (
        <div className="max-w-4xl mx-auto px-4 mt-8 space-y-8">
            <HistorySection
                history={history}
                onUpdate={refreshHistory}
                lang={lang}
            />
        </div>
    );
}
