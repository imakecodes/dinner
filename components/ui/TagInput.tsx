import React, { useState, useRef, useEffect } from 'react';

interface TagInputProps {
    tags: string[];
    setTags: (tags: string[]) => void;
    suggestions: string[];
    placeholder: string;
    icon: string;
    chipColorClass: string; // e.g., "bg-rose-100 text-rose-700"
}

export const TagInput: React.FC<TagInputProps> = ({ tags, setTags, suggestions, placeholder, icon, chipColorClass }) => {
    const [input, setInput] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Filter suggestions: items that are in 'suggestions' BUT NOT in 'tags' AND match 'input'
    const filteredSuggestions = suggestions
        .filter(s => !tags.includes(s) && s.toLowerCase().includes(input.toLowerCase()))
        .slice(0, 5); // Limit to top 5

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(input);
        } else if (e.key === 'Backspace' && input === '' && tags.length > 0) {
            removeTag(tags.length - 1);
        }
    };

    const addTag = (val: string) => {
        const trimmed = val.trim();
        if (trimmed.length > 50) return; // Silent fail or could add alert
        if (trimmed && !tags.includes(trimmed)) {
            setTags([...tags, trimmed]);
            setInput('');
            setShowSuggestions(false);
        }
    };

    const removeTag = (index: number) => {
        setTags(tags.filter((_, i) => i !== index));
    };

    // Click outside to close suggestions
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    return (
        <div className="relative" ref={wrapperRef}>
            <div
                className="flex flex-wrap gap-2 bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-3 focus-within:border-slate-300 focus-within:ring-4 focus-within:ring-slate-50 transition-all cursor-text"
                onClick={() => inputRef.current?.focus()}
            >
                {/* Icon */}
                <div className="flex items-center justify-center w-6 h-6 text-slate-400">
                    <i className={`fas ${icon}`}></i>
                </div>

                {/* Chips */}
                {tags.map((tag, i) => (
                    <span key={i} className={`text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1 ${chipColorClass}`}>
                        {tag}
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeTag(i); }}
                            className="hover:text-black/50 transition-colors w-4 h-4 flex items-center justify-center rounded-full"
                        >
                            <i className="fas fa-times text-[10px]"></i>
                        </button>
                    </span>
                ))}

                {/* Input */}
                <input
                    ref={inputRef}
                    type="text"
                    className="flex-1 bg-transparent outline-none text-slate-900 font-medium placeholder:text-slate-400 min-w-[120px]"
                    placeholder={tags.length === 0 ? placeholder : ''}
                    value={input}
                    onChange={(e) => {
                        setInput(e.target.value);
                        setShowSuggestions(true);
                    }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setShowSuggestions(true)}
                    maxLength={50}
                />
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && input.length > 0 && filteredSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-lg max-h-48 overflow-auto">
                    {filteredSuggestions.map((s, i) => (
                        <div
                            key={i}
                            className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm font-medium text-slate-700 flex items-center gap-2"
                            onClick={() => addTag(s)}
                        >
                            <i className="fas fa-plus text-xs text-slate-300"></i>
                            {s}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
