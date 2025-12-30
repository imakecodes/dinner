import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useApp } from './Providers';
import { storageService } from '@/services/storageService';

interface Props {
  onMenuClick?: () => void;
  onHomeClick?: () => void;
}

const Header: React.FC<Props> = ({ onMenuClick, onHomeClick }) => {
  const { lang } = useTranslation(); // Though not using text here, might be good for alt text
  const { setLanguage } = useApp();

  const toggleLanguage = async () => {
    const newLang = lang === 'en' ? 'pt-BR' : 'en';
    setLanguage(newLang);
    try {
      // Persist if user is logged in (optimistic update happens via setLanguage)
      // We can just rely on the Settings page for persistent profile update, 
      // but updating here is nice UX.
      const user = await storageService.getCurrentUser();
      if (user && user.user) {
        const { name, surname, measurementSystem } = user.user;
        await storageService.updateProfile({ name, surname, measurementSystem, language: newLang });
      }
    } catch (err) {
      console.error("Failed to persist language toggle", err);
    }
  };

  return (
    <header className="bg-white text-slate-900 shadow-sm p-5 sticky top-0 z-50 border-b border-slate-100 backdrop-blur-md bg-white/80">

      <div className="max-w-4xl mx-auto flex justify-between items-center">
        {/* Brand Section */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleLanguage}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold border border-slate-100 transition-all uppercase text-xs"
          >
            {lang === 'en' ? 'EN' : 'PT'}
          </button>
          {/* Only render menu button if onMenuClick is provided to avoid broken UI in one-pager layouts */}
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
      </div>
    </header>
  );
};

export default Header;