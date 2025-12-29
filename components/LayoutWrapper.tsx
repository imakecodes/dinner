"use client";

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Header from './Header';
import Sidebar from './Sidebar';
import { ViewState } from '../types';
import { useApp } from './Providers';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { setMembers } = useApp(); // Updated to use setMembers if needed, though not used here yet. Actually I'll just remove it if unused.
    // Actually, I'll just remove it:
    // const { setMembers } = useApp(); 

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Hide Header/Sidebar on auth pages
    // Using simple includes check. Can be robustified if needed.
    const isAuthPage = ['/login', '/register', '/recover'].includes(pathname || '');

    const handleNavigate = (view: ViewState) => {
        setIsSidebarOpen(false);
        switch (view) {
            case 'home':
                router.push('/');
                break;
            case 'members':
                router.push('/members');
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
            {!isAuthPage && (
                <Header
                    onMenuClick={() => setIsSidebarOpen(true)}
                    onHomeClick={() => router.push('/')}
                />
            )}

            {!isAuthPage && (
                <Sidebar
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                    onNavigate={(path) => {
                        router.push(path);
                        setIsSidebarOpen(false);
                    }}
                />
            )}

            <div className="pt-4">
                {children}
            </div>
        </>
    );
}
