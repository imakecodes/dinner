"use client";

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Header from './Header';
import Sidebar from './Sidebar';


export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Hide Header/Sidebar on auth pages
    // Using simple includes check. Can be robustified if needed.
    const isAuthPage = ['/login', '/register', '/recover', '/reset-password'].includes(pathname || '');

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
