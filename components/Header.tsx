import React from 'react';
import { Language, translations } from '../locales/translations';

interface Props {
  lang: Language;
  setLang: (lang: Language) => void;
  // Made optional to support usage in pages without sidebars or view switching
  onMenuClick?: () => void;
  onHomeClick?: () => void;
}

const Header: React.FC<Props> = ({ lang, setLang, onMenuClick, onHomeClick }) => {
  const t = translations[lang];

  return (
    <header className="bg-white text-slate-900 shadow-sm p-5 sticky top-0 z-50 border-b border-slate-100 backdrop-blur-md bg-white/80">
      <div className="max-w-4xl mx-auto flex justify-between items-center">
        {/* Brand Section */}
        <div className="flex items-center gap-4">
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
            <div className="bg-indigo-600 p-2 rounded-lg group-hover:scale-110 transition-transform shadow-lg shadow-indigo-100">
              <i className="fas fa-utensils text-white"></i>
            </div>
            <h1 className="text-2xl font-black tracking-tighter text-slate-900">{t.app_name}</h1>
          </div>
        </div>

        {/* Language Controls */}
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button 
              onClick={() => setLang('en')}
              className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${lang === 'en' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              EN
            </button>
            <button 
              onClick={() => setLang('pt')}
              className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${lang === 'pt' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              PT
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;