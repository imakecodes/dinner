
import React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/hooks/useTranslation';

import { storageService } from '../services/storageService';
import { useState, useEffect } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: any) => void;
}

const Sidebar: React.FC<Props> = ({ isOpen, onClose, onNavigate }) => {
  const router = useRouter();
  const { t } = useTranslation();
  const [user, setUser] = useState<any>(null);
  const [isHouseDropdownOpen, setIsHouseDropdownOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadUser();
    }
  }, [isOpen]);

  const loadUser = async () => {
    try {
      const u = await storageService.getCurrentUser();
      if (u && u.user) setUser(u.user);
    } catch (err) {
      console.error("Failed to load user info", err);
    }
  };

  const handleSwitchKitchen = async (kitchenId: string) => {
    try {
      await storageService.switchKitchen(kitchenId);
      window.location.reload();
    } catch (err) {
      console.error("Failed to switch kitchen", err);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

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

          <nav className="flex-1 space-y-2">
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

          <div className="mt-auto pt-8 border-t border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{t('nav.account')}</p>
            <div className="relative mb-4">
              {/* User Profile / House Info */}
              <div className="flex items-center gap-4 px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => setIsHouseDropdownOpen(!isHouseDropdownOpen)}
              >
                <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                  {user?.name?.[0] || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{user?.name} {user?.surname}</p>
                  <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
                  {user?.kitchenMemberships?.find((m: any) => m.kitchenId === user?.currentKitchenId)?.kitchen?.name && (
                    <p className="text-[10px] text-rose-500 font-bold mt-1">
                      <i className="fas fa-map-marker-alt mr-1"></i>
                      {user.kitchenMemberships.find((m: any) => m.kitchenId === user.currentKitchenId).kitchen.name}
                    </p>
                  )}
                </div>
                <i className={`fas fa-chevron-down text-slate-300 transition-transform ${isHouseDropdownOpen ? 'rotate-180' : ''}`}></i>
              </div>

              {/* Kitchen Switcher Dropdown */}
              {isHouseDropdownOpen && user?.kitchenMemberships && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200">
                  <div className="p-3 bg-slate-50 border-b border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('nav.switchKitchen')}</p>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {user.kitchenMemberships.map((m: any) => (
                      <button
                        key={m.id}
                        onClick={() => handleSwitchKitchen(m.kitchenId)}
                        className={`w-full text-left px-4 py-3 text-sm font-bold hover:bg-rose-50 transition-colors flex items-center justify-between ${m.kitchenId === user.currentKitchenId ? 'text-rose-600 bg-rose-50/50' : 'text-slate-600'}`}
                      >
                        <span>{m.kitchen.name}</span>
                        {m.kitchenId === user.currentKitchenId && <i className="fas fa-check"></i>}
                      </button>
                    ))}
                  </div>
                  <div className="p-2 border-t border-slate-100">
                    <button onClick={() => { setIsHouseDropdownOpen(false); onNavigate('/kitchens'); }} className="w-full py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg">
                      <i className="fas fa-plus mr-1"></i> {t('nav.newKitchen')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-rose-600 font-bold hover:bg-rose-50 transition-colors text-sm"
            >
              <i className="fas fa-sign-out-alt"></i>
              {t('nav.logout')}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
