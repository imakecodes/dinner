"use client";

import React from 'react';
import HouseholdSection from '../../components/HouseholdSection';
import { useApp } from '../../components/Providers';

export default function HouseholdPage() {
    const { household, setHousehold, activeDiners, setActiveDiners, lang } = useApp();

    return (
        <div className="max-w-4xl mx-auto px-4 mt-8 space-y-8">
            <HouseholdSection
                household={household}
                setHousehold={setHousehold}
                activeDiners={activeDiners}
                setActiveDiners={setActiveDiners}
                lang={lang}
            />
        </div>
    );
}
