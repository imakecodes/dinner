"use client";


import PantrySection from '../../components/PantrySection';
import { useApp } from '../../components/Providers';

export default function PantryPage() {
    const { pantry, setPantry } = useApp();

    return (
        <div className="max-w-4xl mx-auto px-4 mt-4 space-y-4">
            <PantrySection
                pantry={pantry}
                setPantry={setPantry}
            />
        </div>
    );
}
