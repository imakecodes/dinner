
import React from 'react';
import { ViewState } from '../types';
import { Language, translations } from '../locales/translations';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: ViewState) => void;
  lang: Language;
}

const Sidebar: React.FC<Props> = ({ isOpen, onClose, onNavigate, lang }) => {
  const t = translations[lang];

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Drawer */}
      <aside className={`fixed top-0 left-0 bottom-0 w-80 bg-white shadow-2xl z-[70] transition-transform duration-500 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 flex flex-col h-full">
          <div className="flex justify-between items-center mb-12">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                <i className="fas fa-utensils"></i>
              </div>
              <span className="font-black text-xl tracking-tighter">Dinner?</span>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600">
              <i className="fas fa-times"></i>
            </button>
          </div>

          <nav className="flex-1 space-y-2">
            <button 
              onClick={() => onNavigate('home')}
              className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 hover:text-indigo-600 transition-all group"
            >
              <i className="fas fa-home w-6 group-hover:scale-110 transition-transform"></i>
              Home
            </button>
            <button 
              onClick={() => onNavigate('household')}
              className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 hover:text-indigo-600 transition-all group"
            >
              <i className="fas fa-users w-6 group-hover:scale-110 transition-transform"></i>
              {t.household_title}
            </button>
            <button 
              onClick={() => onNavigate('pantry')}
              className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 hover:text-indigo-600 transition-all group"
            >
              <i className="fas fa-box-open w-6 group-hover:scale-110 transition-transform"></i>
              {t.pantry_title}
            </button>
            <button 
              onClick={() => onNavigate('history')}
              className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 hover:text-indigo-600 transition-all group"
            >
              <i className="fas fa-history w-6 group-hover:scale-110 transition-transform"></i>
              {t.history_title}
            </button>
          </nav>

          <div className="mt-auto pt-8 border-t border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Account</p>
            <div className="flex items-center gap-4 px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">JD</div>
              <div>
                <p className="text-sm font-bold text-slate-900">John Doe</p>
                <p className="text-[10px] text-slate-500">Premium Chef</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
