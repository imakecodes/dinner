"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from './Header';
import Sidebar from './Sidebar';
import { ViewState } from '../types';
import { useApp } from './Providers';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { lang, setLang } = useApp();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleNavigate = (view: ViewState) => {
        setIsSidebarOpen(false);
        switch (view) {
            case 'home':
                router.push('/');
                break;
            case 'household':
                router.push('/household');
                break;
            case 'pantry':
                router.push('/pantry');
                break;
            case 'history':
                router.push('/history');
                break;
        }
    };

    return (
        <>
            <Header
                lang={lang}
                setLang={setLang}
                onMenuClick={() => setIsSidebarOpen(true)}
                onHomeClick={() => router.push('/')}
            />

            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                onNavigate={handleNavigate}
                lang={lang}
            />

            <div className="pt-4">
                {children}
            </div>
        </>
    );
}
