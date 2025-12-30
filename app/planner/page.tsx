"use client";

import { useApp } from "@/components/Providers";
import { useTranslation } from "@/hooks/useTranslation";
import { useEffect, useState } from "react";

interface MealPlan {
    id: string;
    date: string;
    mealType: string;
    status: string; // PLANNED, COOKED, SKIPPED
    notes: string;
    members?: { id: string; name: string }[];
}

interface KitchenMember {
    id: string;
    name: string;
}

interface AgentLog {
    id: string;
    message: string;
    type: string;
    createdAt: string;
}

export default function PlannerPage() {
    const { t, lang } = useTranslation();
    const [plans, setPlans] = useState<MealPlan[]>([]);
    const [kitchenMembers, setKitchenMembers] = useState<KitchenMember[]>([]);
    const [logs, setLogs] = useState<AgentLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    const loadData = async () => {
        try {
            const res = await fetch('/api/planner');
            if (res.ok) {
                const data = await res.json();
                setPlans(data.plans);
                setLogs(data.logs);
            }
            // Load members
            const memberRes = await fetch('/api/kitchen-members');
            if (memberRes.ok) {
                setKitchenMembers(await memberRes.json());
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const res = await fetch('/api/planner/generate', { 
                method: 'POST',
                body: JSON.stringify({ language: lang }) 
            });
            if (res.ok) {
                await loadData();
            } else {
                alert('Planning failed');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setGenerating(false);
        }
    };

    const handleStatusUpdate = async (id: string, status: string) => {
        try {
            await fetch(`/api/planner/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ status })
            });
            loadData();
        } catch (e) {
            console.error(e);
        }
    };

    const handleGuestsUpdate = async (id: string, memberIds: string[]) => {
        try {
             await fetch(`/api/planner/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ memberIds })
            });
            loadData();
        } catch(e) { console.error(e); }
    };

    // Group plans by date
    const plansByDate = plans.reduce((acc, plan) => {
        const dateKey = new Date(plan.date).toLocaleDateString();
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(plan);
        return acc;
    }, {} as Record<string, MealPlan[]>);

    return (
        <div className="min-h-screen bg-slate-50 pb-24">
            <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                    <h1 className="font-black text-xl tracking-tight text-slate-900">Chef Agent</h1>
                    <button 
                        onClick={handleGenerate} 
                        disabled={generating}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50"
                    >
                        {generating ? "Thinking..." : "Generate Week"}
                    </button>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 pt-24 space-y-8">
                {/* Agent Thoughts */}
                {logs.length > 0 && (
                    <section className="bg-white rounded-3xl p-6 shadow-sm border border-indigo-50">
                        <h2 className="text-sm font-bold text-indigo-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                             <i className="fas fa-brain text-indigo-500"></i> Agent Thought Stream
                        </h2>
                        <div className="space-y-4">
                            {logs.map(log => (
                                <div key={log.id} className="text-sm text-slate-600 border-l-2 border-indigo-200 pl-4 py-1">
                                    <p className="font-medium text-slate-900">{new Date(log.createdAt).toLocaleTimeString()}</p>
                                    <p>{log.message}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Plan Calendar */}
                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-slate-900">Weekly Plan</h2>
                    
                    {loading ? (
                        <div className="text-center py-12 text-slate-400">Loading schedule...</div>
                    ) : plans.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
                            <p className="text-slate-500 mb-4">No meals planned yet.</p>
                            <button onClick={handleGenerate} className="text-indigo-600 font-bold hover:underline">
                                Ask Agent to Plan
                            </button>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {Object.entries(plansByDate).map(([dateStr, dayPlans]) => (
                                <div key={dateStr} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-bold text-slate-800">{dateStr}</h3>
                                        <span className="text-xs font-medium text-slate-400">{dayPlans[0].date.split('T')[0]}</span>
                                    </div>
                                    <div className="space-y-3">
                                        {dayPlans.map(plan => (
                                            <div key={plan.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                                                        {plan.mealType}
                                                    </span>
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                                        plan.status === 'PLANNED' ? 'text-amber-600 border-amber-200 bg-amber-50' : 
                                                        'text-emerald-600 border-emerald-200 bg-emerald-50'
                                                    }`}>
                                                        {plan.status}
                                                    </span>
                                                </div>
                                                <p className="text-sm font-medium text-slate-700 leading-snug mb-3">
                                                    {plan.notes}
                                                </p>

                                                {/* Guests */}
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="flex -space-x-1">
                                                        {kitchenMembers.map(m => {
                                                            const isEating = plan.members?.some(pm => pm.id === m.id);
                                                            return (
                                                                <button
                                                                    key={m.id}
                                                                    onClick={() => {
                                                                        const currentIds = plan.members?.map(x => x.id) || [];
                                                                        const newIds = isEating 
                                                                            ? currentIds.filter(id => id !== m.id)
                                                                            : [...currentIds, m.id];
                                                                        handleGuestsUpdate(plan.id, newIds);
                                                                    }}
                                                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border border-white ring-1 ring-slate-100 transition-all ${
                                                                        isEating ? 'bg-indigo-100 text-indigo-700 opacity-100' : 'bg-slate-100 text-slate-300 opacity-50 grayscale'
                                                                    }`}
                                                                    title={m.name}
                                                                >
                                                                    {m.name[0]}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                    <span className="text-[10px] text-slate-400">
                                                        {plan.members?.length || 0} eating
                                                    </span>
                                                </div>
                                                
                                                {/* Actions */}
                                                <div className="flex gap-2 justify-end">
                                                    {plan.status === 'PLANNED' && (
                                                        <>
                                                            <button 
                                                                onClick={() => handleStatusUpdate(plan.id, 'SKIPPED')}
                                                                className="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 text-slate-500 hover:bg-slate-200"
                                                            >
                                                                Skip
                                                            </button>
                                                            <button 
                                                                onClick={() => handleStatusUpdate(plan.id, 'COOKED')}
                                                                className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
                                                            >
                                                                Cooked
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
