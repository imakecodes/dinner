'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface UnifiedTagInputProps {
    /** Current tags array */
    tags: string[];
    /** Callback when tags change */
    onChange?: (tags: string[]) => void;
    /** Alternative callback (for compatibility) */
    setTags?: (tags: string[]) => void;
    /** Placeholder text */
    placeholder: string;
    /** Category for fetching suggestions (optional) */
    category?: 'restriction' | 'like' | 'dislike' | string;
    /** Predefined suggestions (optional) */
    suggestions?: string[];
    /** Icon to display (optional) */
    icon?: string;
    /** CSS class for chip colors (optional) */
    chipColorClass?: string;
    /** Maximum tag length (default: 50) */
    maxTagLength?: number;
    /** Debounce time for fetching suggestions (default: 300ms) */
    debounceTime?: number;
    /** Whether to fetch suggestions from API (default: true if category provided) */
    fetchSuggestions?: boolean;
}

export const TagInput: React.FC<UnifiedTagInputProps> = ({
    tags,
    onChange,
    setTags,
    placeholder,
    category,
    suggestions: propSuggestions = [],
    icon = 'fa-tag',
    chipColorClass = 'poe-accent-party-soft',
    maxTagLength = 50,
    debounceTime = 300,
    fetchSuggestions = !!category,
}) => {
    const [input, setInput] = useState('');
    const [localSuggestions, setLocalSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Determine the actual callback to use
    const handleTagsChange = useCallback((newTags: string[]) => {
        if (onChange) {
            onChange(newTags);
        } else if (setTags) {
            setTags(newTags);
        }
    }, [onChange, setTags]);

    // Fetch suggestions from API if needed
    useEffect(() => {
        if (!fetchSuggestions || !category || input.trim().length < 2) {
            setLocalSuggestions([]);
            return;
        }

        const timeoutId = setTimeout(async () => {
            try {
                const res = await fetch(`/api/tags?category=${category}&q=${encodeURIComponent(input)}`);
                if (res.ok) {
                    const data = await res.json();
                    // Filter out tags already selected
                    const filtered = data.filter((s: string) => !tags.includes(s));
                    setLocalSuggestions(filtered);
                }
            } catch (e) {
                console.error("Failed to fetch suggestions", e);
                setLocalSuggestions([]);
            }
        }, debounceTime);

        return () => clearTimeout(timeoutId);
    }, [input, category, tags, fetchSuggestions, debounceTime]);

    // Use prop suggestions or fetched suggestions
    const suggestions = fetchSuggestions ? localSuggestions : propSuggestions;

    // Filter suggestions based on input
    const filteredSuggestions = suggestions
        .filter(s => !tags.includes(s) && s.toLowerCase().includes(input.toLowerCase()))
        .slice(0, 5); // Limit to top 5

    // Click outside to close suggestions
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
                setIsFocused(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            addTag(input);
        } else if (e.key === 'Backspace' && !input && tags.length > 0) {
            removeTag(tags.length - 1);
        }
    };

    const addTag = (val: string) => {
        const trimmed = val.trim();
        if (trimmed.length > maxTagLength) return;
        if (trimmed && !tags.includes(trimmed)) {
            handleTagsChange([...tags, trimmed]);
            setInput('');
            setShowSuggestions(false);
            setLocalSuggestions([]);
        }
    };

    const removeTag = (index: number) => {
        handleTagsChange(tags.filter((_, i) => i !== index));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        // Mobile support: detect comma or semicolon
        if (val.endsWith(',') || val.endsWith(';')) {
            addTag(val.slice(0, -1));
        } else {
            setInput(val);
            setShowSuggestions(true);
        }
    };

    const handleFocus = () => {
        setIsFocused(true);
        setShowSuggestions(true);
    };

    const handleBlur = () => {
        // Delayed blur to allow clicking suggestions
        setTimeout(() => {
            setIsFocused(false);
            if (input.trim()) {
                addTag(input);
            }
        }, 200);
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <div
                className={`flex flex-wrap gap-2 poe-input border rounded-xl px-3 py-3 transition-all cursor-text ${isFocused ? 'border-poe-focus ring-2 ring-poe-focus' : 'border-poe-borderStrong'}`}
                onClick={() => inputRef.current?.focus()}
            >
                {/* Icon */}
                {icon && (
                    <div className="flex items-center justify-center w-6 h-6 text-poe-text2">
                        <i className={`fas ${icon}`}></i>
                    </div>
                )}

                {/* Tags */}
                {tags.map((tag, i) => (
                    <span key={i} className={`text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1 ${chipColorClass}`}>
                        {tag}
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeTag(i); }}
                            className="hover:text-black/50 transition-colors w-4 h-4 flex items-center justify-center rounded-full"
                            aria-label={`Remove ${tag}`}
                        >
                            <i className="fas fa-times text-[10px]"></i>
                        </button>
                    </span>
                ))}

                {/* Input */}
                <input
                    ref={inputRef}
                    type="text"
                    className="flex-1 bg-transparent outline-none text-poe-text1 font-medium placeholder:text-poe-text2 min-w-[120px]"
                    placeholder={tags.length === 0 ? placeholder : ''}
                    value={input}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    maxLength={maxTagLength}
                />
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && input.length > 0 && filteredSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 poe-surface border border-poe-borderStrong rounded-xl shadow-lg max-h-48 overflow-auto">
                    {filteredSuggestions.map((s, i) => (
                        <button
                            key={i}
                            onMouseDown={(e) => {
                                e.preventDefault(); // Prevent blur
                                addTag(s);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-poe-surface2 text-sm font-medium text-poe-text1 flex items-center gap-2 transition-colors poe-focus-ring"
                        >
                            <i className="fas fa-plus text-xs text-poe-text2"></i>
                            {s}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};