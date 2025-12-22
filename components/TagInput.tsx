
import React, { useState, useRef, useEffect } from 'react';
import { storageService } from '../services/storageService';

interface Props {
  category: 'restrictions' | 'likes' | 'dislikes';
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
  label: string;
  accentColor: string;
}

const TagInput: React.FC<Props> = ({ category, tags, onChange, placeholder, label, accentColor }) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const allTags = storageService.getTags(category);
    if (inputValue) {
      const filtered = allTags.filter(t => 
        t.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(t)
      );
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  }, [inputValue, tags, category]);

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      const newTags = [...tags, trimmed];
      onChange(newTags);
      storageService.saveTag(category, trimmed);
    }
    setInputValue('');
    setShowSuggestions(false);
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(t => t !== tagToRemove));
  };

  return (
    <div className="space-y-2 relative">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <div className={`min-h-[56px] p-2 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap gap-2 transition-all focus-within:ring-2 ${accentColor}`}>
        {tags.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 animate-in zoom-in-95">
            {tag}
            <button onClick={() => removeTag(tag)} className="text-slate-400 hover:text-red-500">
              <i className="fas fa-times"></i>
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm font-medium px-2 py-1"
          placeholder={tags.length === 0 ? placeholder : ''}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTag(inputValue);
            }
          }}
          onFocus={() => setShowSuggestions(true)}
        />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-100 shadow-2xl rounded-xl p-1 animate-in fade-in slide-in-from-top-2">
          {suggestions.map(s => (
            <button
              key={s}
              onClick={() => addTag(s)}
              className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm font-bold text-slate-600 rounded-lg transition-colors"
            >
              <i className="fas fa-history mr-2 opacity-30"></i> {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TagInput;
