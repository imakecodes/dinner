"use client";

import { useState, useEffect, useRef } from 'react';
import { useApp } from '@/components/Providers';
import { useCurrentMember } from '@/hooks/useCurrentMember';
import { BuildArchetype, BuildCostTier, BuildRecord, BuildSessionContext } from '@/types';
import { storageService } from '@/services/storageService';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/hooks/useTranslation';

import { LoadingOverlay } from '@/components/LoadingOverlay';

export default function CraftBuildPage() {
    const router = useRouter();
    const { t } = useTranslation();
    const {
        members,
        pantry,
        activeDiners, setActiveDiners,
        costTier, setCostTier,
        prepTime,
        language
    } = useApp();

    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [observation, setObservation] = useState('');
    const [buildArchetype, setBuildArchetype] = useState<BuildArchetype>('league_starter');
    const initializedRef = useRef(false);

    // Enforce role access: Mercenaries cannot craft builds
    const { isGuest, loading: memberLoading } = useCurrentMember();

    useEffect(() => {
        if (!memberLoading && isGuest) {
            router.push('/');
        }
    }, [isGuest, memberLoading, router]);

    useEffect(() => {
        // Default to Admin if no one is selected (and members are loaded)
        // We use a ref to ensure this only happens once per page load (Auto-selection)
        if (members.length > 0 && !initializedRef.current) {
            // Only auto-select if nothing is currently selected
            if (activeDiners.length === 0) {
                // Try to find ADMIN first, otherwise fallback to first member or stay empty
                const admin = members.find(m => m.role === 'ADMIN');
                if (admin) {
                    setActiveDiners([admin.id]);
                } else if (members.length > 0) {
                    // Fallback: If no Admin found (e.g. data issue), select the first member
                    setActiveDiners([members[0].id]);
                }
            }
            initializedRef.current = true;
        }
    }, [members, activeDiners, setActiveDiners]);

    const handleCraftBuild = async () => {
        if (activeDiners.length === 0) {
            setError(t('generate.selectDinersError'));
            return;
        }
        setIsGenerating(true);
        setError(null);

        try {
            const selectedMembers = members.filter((member) => activeDiners.includes(member.id));

            const context: BuildSessionContext = {
                party_member_ids: activeDiners,
                stash_gear_gems: pantry.filter(i => i.inStock).map(i => i.name),
                requested_archetype: buildArchetype,
                cost_tier_preference: costTier,
                setup_time_preference: prepTime,
                build_notes: observation
            };

            const response = await fetch('/api/build', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ members: selectedMembers, context, language: language || 'en' }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                const apiErrorCode = typeof errorData?.code === 'string' ? errorData.code : null;
                const apiErrorMessage = apiErrorCode === 'gemini.quota_exceeded'
                    ? t('generate.generateError')
                    : (typeof errorData?.error === 'string' ? errorData.error : null);

                const apiError = new Error(apiErrorMessage || t('generate.generateError'));
                (apiError as any).status = response.status;
                (apiError as any).code = apiErrorCode;
                (apiError as any).retryAfterSeconds = errorData?.retryAfterSeconds;

                throw apiError;
            }

            const result = await response.json();

            const newRecord: BuildRecord = {
                ...result,
                id: Date.now().toString(),
                isFavorite: false,
                createdAt: Date.now(),
                language: language || 'en'
            };

            const savedRecipe = await storageService.saveBuild(newRecord);

            // Redirect to the new build
            router.push(`/builds/${savedRecipe.id}`);

        } catch (err: any) {
            setError(err?.message || t('generate.generateError'));
            console.error(err);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="min-h-screen pb-20">
            <header className="poe-surface border-b border-poe-borderStrong">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
                    <Link href="/" className="text-poe-text2 hover:text-poe-gold transition-colors poe-focus-ring rounded-lg p-1">
                        <i className="fas fa-arrow-left text-xl"></i>
                    </Link>
                    <h1 className="text-2xl font-black poe-title tracking-tight flex items-center gap-3">
                        <i className="fas fa-wand-magic-sparkles text-poe-sectionBuilds"></i>
                        {t('generate.title')}
                    </h1>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 mt-6 space-y-6">

                {/* Who (Simplified Select) */}
                <div className="poe-card poe-section-marker poe-section-party p-6 rounded-3xl border border-poe-borderStrong shadow-sm">
                    <label className="block text-xs font-black text-poe-text2 uppercase tracking-widest mb-4">{t('generate.whoIsEating')}</label>
                    <div className="flex flex-wrap gap-2">
                        {members.map(m => (
                            <button
                                key={m.id}
                                onClick={() => setActiveDiners(prev => prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id])}
                                className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all poe-focus-ring ${
                                    activeDiners.includes(m.id)
                                        ? 'poe-accent-party-soft'
                                        : 'poe-input border-poe-border text-poe-text2 hover:border-poe-sectionParty'
                                }`}
                            >
                                {m.name}
                            </button>
                        ))}
                        {members.length === 0 && <Link href="/party" className="text-sm text-poe-sectionParty font-bold underline">{t('generate.addMembersFirst')}</Link>}
                    </div>
                </div>

                {/* Archetype & Cost Tier */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="poe-card poe-section-marker poe-section-builds p-6 rounded-3xl border border-poe-borderStrong shadow-sm">
                        <label className="block text-xs font-black text-poe-text2 uppercase tracking-widest mb-4">{t('generate.mealType')}</label>
                        <div className="flex gap-2 flex-wrap">
                            {['league_starter', 'mapper', 'bossing', 'hybrid'].map(val => (
                                <button
                                    key={val}
                                    onClick={() => setBuildArchetype(val as BuildArchetype)}
                                    className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold border uppercase poe-focus-ring ${
                                        buildArchetype === val
                                            ? 'poe-accent-builds-soft'
                                            : 'poe-input border-poe-border text-poe-text2'
                                    }`}
                                >
                                    {val === 'league_starter'
                                        ? t('recipeForm.leagueStarter')
                                        : val === 'mapper'
                                            ? t('recipeForm.mapper')
                                            : val === 'bossing'
                                                ? t('recipeForm.bossing')
                                                : t('recipeForm.hybrid')}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="poe-card poe-section-marker poe-section-settings p-6 rounded-3xl border border-poe-borderStrong shadow-sm">
                        <label className="block text-xs font-black text-poe-text2 uppercase tracking-widest mb-4">{t('generate.costs')}</label>
                        <div className="flex gap-2 flex-wrap">
                            {[
                                { value: 'cheap', label: t('recipeForm.cheap'), tooltip: t('recipeForm.costTooltipCheap') },
                                { value: 'medium', label: t('recipeForm.medium'), tooltip: t('recipeForm.costTooltipMedium') },
                                { value: 'expensive', label: t('recipeForm.expensive'), tooltip: t('recipeForm.costTooltipExpensive') },
                                { value: 'mirror_of_kalandra', label: t('recipeForm.mirrorOfKalandra'), tooltip: t('recipeForm.costTooltipMirrorOfKalandra') },
                            ].map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    title={option.tooltip}
                                    onClick={() => setCostTier(option.value as BuildCostTier)}
                                    className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold border uppercase poe-focus-ring ${
                                        costTier === option.value
                                            ? 'poe-accent-settings-soft'
                                            : 'poe-input border-poe-border text-poe-text2'
                                    }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Observation */}
                <div className="poe-card p-6 rounded-3xl border border-poe-borderStrong shadow-sm">
                    <label className="block text-xs font-black text-poe-text2 uppercase tracking-widest mb-4">{t('generate.specialRequests')}</label>
                    <textarea
                        value={observation}
                        onChange={e => setObservation(e.target.value)}
                        placeholder={t('generate.specialRequestsPlaceholder')}
                        className="w-full h-32 p-3 poe-input poe-focus-ring rounded-xl text-sm resize-none"
                    />
                </div>

                {/* Generate Button */}
                <button
                    onClick={handleCraftBuild}
                    disabled={isGenerating}
                    className="w-full py-6 poe-btn-primary poe-focus-ring rounded-3xl font-black text-xl shadow-xl shadow-black/30 hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
                >
                    {isGenerating ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-magic"></i>}
                    {isGenerating ? t('generate.generating') : t('generate.generateBtn')}
                </button>

                <div className="text-center">
                    <span className="text-poe-text2 font-medium text-sm"> {t('generate.or')} </span>
                    <Link href="/builds/create" className="block mt-4 py-3 poe-card border rounded-2xl text-poe-text1 font-bold hover:border-poe-sectionBuilds transition-all poe-focus-ring">
                        <i className="fas fa-pen-to-square mr-2"></i> {t('generate.createManually')}
                    </Link>
                </div>

                {error && <div className="p-4 poe-status-danger rounded-2xl font-bold text-center">{error}</div>}
            </main>

            <LoadingOverlay isVisible={isGenerating} />
        </div>
    );
}
