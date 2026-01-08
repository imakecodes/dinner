import React, { useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
    value: string;
    onChange: (value: string) => void;
    measurementSystem?: string; // 'METRIC' | 'IMPERIAL'
    className?: string;
    placeholder?: string;
}

// Unit Categories for logic
const UNIVERSAL_UNITS = ['un', 'tbsp', 'tsp', 'cup', 'pinch', 'can', 'package'];
const METRIC_UNITS = ['kg', 'g', 'l', 'ml'];
const IMPERIAL_UNITS = ['lb', 'oz', 'fl_oz', 'gal', 'pt'];

const CustomUnitSelect: React.FC<Props> = ({ value, onChange, measurementSystem = 'METRIC', className, placeholder }) => {
    const { t } = useTranslation();

    const displayedUnits = useMemo(() => {
        let units = [...UNIVERSAL_UNITS];

        if (measurementSystem === 'IMPERIAL') {
            units = [...units, ...IMPERIAL_UNITS];
        } else {
            // Default to METRIC
            units = [...units, ...METRIC_UNITS];
        }

        // Always include the current value if it exists, even if it's from the "wrong" system
        // This allows Imperial users to see 'kg' if a 'kg' item was shared with them or already exists
        if (value && !units.includes(value)) {
            units.push(value);
        }

        return units.sort((a, b) => t(`units.${a}`).localeCompare(t(`units.${b}`)));
    }, [measurementSystem, value, t]);

    return (
        <div className={`relative ${className}`}>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full h-full appearance-none bg-white border border-slate-200 text-slate-700 py-3 pl-4 pr-8 rounded-2xl leading-tight focus:outline-none focus:bg-white focus:border-amber-500 text-sm font-medium transition-all cursor-pointer"
            >
                {placeholder && <option value="" disabled>{placeholder}</option>}
                {displayedUnits.map((u) => (
                    <option key={u} value={u}>
                        {t(`units.${u}`) || u}
                    </option>
                ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
            </div>
        </div>
    );
};

export default CustomUnitSelect;
