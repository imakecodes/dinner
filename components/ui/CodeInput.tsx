
import React, { useRef, useState, useEffect } from 'react';

interface CodeInputProps {
    length?: number;
    onChange: (code: string) => void;
    disabled?: boolean;
}

export const CodeInput: React.FC<CodeInputProps> = ({ length = 6, onChange, disabled }) => {
    const [values, setValues] = useState<string[]>(Array(length).fill(''));
    const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        // Find the first empty input to focus, or keep focus where user is?
        // Actually, let's trigger onChange mostly.
        onChange(values.join(''));
    }, [values, onChange]);

    const handleChange = (index: number, val: string) => {
        const newValues = [...values];
        // Take only the last char if multiple typed (though typical input gives one)
        const char = val.slice(-1).toUpperCase();
        newValues[index] = char;
        setValues(newValues);

        // Move to next if value is filled
        if (char && index < length - 1) {
            inputsRef.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace') {
            if (!values[index] && index > 0) {
                // Determine if we should delete previous
                inputsRef.current[index - 1]?.focus();
                // Optionally delete previous value immediately
                /*
                const newValues = [...values];
                newValues[index-1] = '';
                setValues(newValues);
                */
            } else if (values[index]) {
                const newValues = [...values];
                newValues[index] = '';
                setValues(newValues);
            }
        }
        else if (e.key === 'ArrowLeft' && index > 0) {
            inputsRef.current[index - 1]?.focus();
        }
        else if (e.key === 'ArrowRight' && index < length - 1) {
            inputsRef.current[index + 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasteData = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, length);

        if (pasteData) {
            const newValues = [...values];
            for (let i = 0; i < pasteData.length; i++) {
                newValues[i] = pasteData[i];
            }
            setValues(newValues);
            // Focus last filled
            inputsRef.current[Math.min(pasteData.length, length - 1)]?.focus();
        }
    };

    return (
        <div className="flex gap-2 justify-center">
            {values.map((val, idx) => (
                <input
                    key={idx}
                    ref={el => { inputsRef.current[idx] = el }}
                    type="text"
                    maxLength={1}
                    value={val}
                    disabled={disabled}
                    onChange={(e) => handleChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onPaste={handlePaste}
                    className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black text-slate-800 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-100 transition-all uppercase placeholder-slate-300"
                    placeholder="-"
                />
            ))}
        </div>
    );
};
