import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useApp } from './Providers';
import { storageService } from '@/services/storageService';
import { Language } from '@/types';

interface Props {
  onMenuClick?: () => void;
  onHomeClick?: () => void;
}

const Header: React.FC<Props> = ({ onMenuClick, onHomeClick }) => {
  const { lang } = useTranslation();
  const { setLanguage } = useApp();

  return (
    <header className="bg-white text-slate-900 shadow-sm p-5 sticky top-0 z-50 border-b border-slate-100 backdrop-blur-md bg-white/80">
      <div className="max-w-4xl mx-auto flex justify-between items-center">
        {/* Brand Section */}
        <div className="flex items-center gap-4">
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition-all border border-slate-100"
            >
              <i className="fas fa-bars"></i>
            </button>
          )}
          <div
            onClick={onHomeClick}
            className={`flex items-center gap-2 ${onHomeClick ? 'cursor-pointer' : ''} group`}
          >
            <div className="bg-rose-600 p-2 rounded-lg group-hover:scale-110 transition-transform shadow-lg shadow-rose-100">
              <i className="fas fa-utensils text-white"></i>
            </div>
            <h1 className="text-2xl font-black tracking-tighter text-slate-900">Dinner?</h1>
          </div>
        </div>

        {/* Right Section: Language Selector */}
        <div className="flex items-center">
          <select
            value={lang}
            onChange={(e) => {
              const newLang = e.target.value as Language;
              setLanguage(newLang);
              storageService.getCurrentUser().then(user => {
                if (user && user.user) {
                  const { name, surname, measurementSystem } = user.user;
                  storageService.updateProfile({ name, surname, measurementSystem, language: newLang });
                }
              }).catch(err => console.error("Failed to persist language change", err));
            }}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-rose-500 hover:border-slate-300 transition-colors cursor-pointer"
          >
            <option value="en">🇺🇸 EN</option>
            <option value="pt-BR">🇧🇷 PT</option>
          </select>
        </div>
      </div>
    </header>
  );
};

export default Header;