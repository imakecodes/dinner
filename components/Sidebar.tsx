
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (path: string) => void;
}

const Sidebar: React.FC<Props> = ({ isOpen, onClose, onNavigate }) => {
  const router = useRouter();
  const { t } = useTranslation();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleLinkClick = () => {
    // Only close if we are on mobile (where isOpen drives visibility)
    // Actually, onClose logic is handled by parent usually for overlay.
    // But here we want to ensure sidebar closes on mobile selection.
    if (window.innerWidth < 1280) { // xl breakpoint
      onClose();
    }
  };

  const NavItem = ({ href, icon, label }: { href: string; icon: string; label: string }) => (
    <Link
      href={href}
      onClick={onClose} // Always close on navigation (mobile drawer behavior). Desktop ignores it via CSS persistent state but logic might flicker state? 
      // Actually, on Desktop, 'isOpen' state only affects the mobile drawer class toggle 'translate-x-0'. 
      // But we added 'lg:translate-x-0' so it's always open on desktop regardless of 'isOpen'.
      // So calling onClose() changes isOpen to false, but CSS keeps it open on desktop. This is SAFE.
      className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 hover:text-rose-600 transition-all group"
    >
      <i className={`${icon} w-6 group-hover:scale-110 transition-transform`}></i>
      {label}
    </Link>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] transition-opacity duration-300 xl:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside className={`fixed top-0 left-0 bottom-0 w-80 bg-white shadow-2xl z-[70] transition-transform duration-500 transform xl:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 flex flex-col h-full">
          <div className="flex justify-between items-center mb-12">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                <i className="fas fa-utensils"></i>
              </div>
              <span className="font-black text-xl tracking-tighter">Dinner?</span>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 xl:hidden">
              <i className="fas fa-times"></i>
            </button>
          </div>

          <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-2">
            <NavItem href="/" icon="fas fa-home" label={t('nav.home')} />
            <NavItem href="/pantry" icon="fas fa-box-open" label={t('nav.pantry')} />
            <NavItem href="/recipes" icon="fas fa-book-open" label={t('nav.recipes')} />
            <NavItem href="/shopping-list" icon="fas fa-shopping-basket" label={t('nav.shopping')} />
            <NavItem href="/members" icon="fas fa-users" label={t('nav.members')} />
            <NavItem href="/kitchens" icon="fas fa-home" label={t('nav.kitchens')} />
            <NavItem href="/settings" icon="fas fa-cog" label={t('nav.settings')} />
          </nav>

          <div className="border-t border-slate-100 pt-4 mt-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-rose-600 font-bold hover:bg-rose-50 transition-all group"
            >
              <i className="fas fa-sign-out-alt w-6 group-hover:scale-110 transition-transform"></i>
              {t('nav.logout')}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
