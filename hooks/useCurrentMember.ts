
import { useState, useEffect } from 'react';
import { storageService } from '@/services/storageService';
import { KitchenMember } from '@/types';

export function useCurrentMember() {
    const [member, setMember] = useState<KitchenMember | null>(null);
    const [loading, setLoading] = useState(true);
    const [isGuest, setIsGuest] = useState(false);

    useEffect(() => {
        let mounted = true;

        async function load() {
            try {
                const [userProfile, members] = await Promise.all([
                    storageService.getCurrentUser(),
                    storageService.getKitchenMembers()
                ]);

                if (!mounted) return;

                if (userProfile?.user?.id && members) {
                    const current = members.find((m: KitchenMember) => m.userId === userProfile.user.id);
                    setMember(current || null);
                    setIsGuest(current?.isGuest || false);
                }
            } catch (error) {
                console.error("Failed to load current member", error);
            } finally {
                if (mounted) setLoading(false);
            }
        }

        load();

        return () => { mounted = false; };
    }, []);

    return { member, isGuest, loading };
}
