
import React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/hooks/useTranslation';

import { storageService } from '../services/storageService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: any) => void;
}

const Sidebar: React.FC<Props> = ({ isOpen, onClose, onNavigate }) => {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside className={`fixed top-0 left-0 bottom-0 w-80 bg-white shadow-2xl z-[70] transition-transform duration-500 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 flex flex-col h-full">
          <div className="flex justify-between items-center mb-12">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                <i className="fas fa-utensils"></i>
              </div>
              <span className="font-black text-xl tracking-tighter">Dinner?</span>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600">
              <i className="fas fa-times"></i>
            </button>
          </div>

          <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-2">
            <button
              onClick={() => onNavigate('/')}
              className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 hover:text-rose-600 transition-all group"
            >
              <i className="fas fa-home w-6 group-hover:scale-110 transition-transform"></i>
              {t('nav.home')}
            </button>

            <button
              onClick={() => onNavigate('/pantry')}
              className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 hover:text-rose-600 transition-all group"
            >
              <i className="fas fa-box-open w-6 group-hover:scale-110 transition-transform"></i>
              {t('nav.pantry')}
            </button>
            <button
              onClick={() => onNavigate('/recipes')}
              className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 hover:text-rose-600 transition-all group"
            >
              <i className="fas fa-book-open w-6 group-hover:scale-110 transition-transform"></i>
              {t('nav.recipes')} ({t('nav.history')})
            </button>
            <button
              onClick={() => onNavigate('/shopping-list')}
              className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 hover:text-rose-600 transition-all group"
            >
              <i className="fas fa-shopping-basket w-6 group-hover:scale-110 transition-transform"></i>
              {t('nav.shopping')}
            </button>
            <button
              onClick={() => onNavigate('/members')}
              className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 hover:text-rose-600 transition-all group"
            >
              <i className="fas fa-users w-6 group-hover:scale-110 transition-transform"></i>
              {t('nav.members')}
            </button>
            <button
              onClick={() => onNavigate('/kitchens')}
              className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 hover:text-rose-600 transition-all group"
            >
              <i className="fas fa-home w-6 group-hover:scale-110 transition-transform"></i>
              {t('nav.kitchens')}
            </button>
            <button
              onClick={() => onNavigate('/settings')}
              className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 hover:text-rose-600 transition-all group"
            >
              <i className="fas fa-cog w-6 group-hover:scale-110 transition-transform"></i>
              {t('nav.settings')}
            </button>
          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
