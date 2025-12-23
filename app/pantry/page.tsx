"use client";

import React from 'react';
import PantrySection from '../../components/PantrySection';
import { useApp } from '../../components/Providers';

export default function PantryPage() {
    const { pantry, setPantry, lang } = useApp();

    return (
        <div className="max-w-4xl mx-auto px-4 mt-8 space-y-8">
            <PantrySection
                pantry={pantry}
                setPantry={setPantry}
                lang={lang}
            />
        </div>
    );
}
