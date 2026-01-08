import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { PantryItem } from '../types';
import CustomUnitSelect from './CustomUnitSelect';
import { useCurrentMember } from '@/hooks/useCurrentMember';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    item: PantryItem | null;
    onSave: (updates: Partial<PantryItem>) => void;
    onDelete: () => void;
}

const PantryEditDialog: React.FC<Props> = ({ isOpen, onClose, item, onSave, onDelete }) => {
    const { t } = useTranslation();
    const { member } = useCurrentMember();

    const [name, setName] = useState('');
    const [quantity, setQuantity] = useState('');
    const [unit, setUnit] = useState('un');
    const [unitDetails, setUnitDetails] = useState('');
    const [inStock, setInStock] = useState(true);
    const [replenishmentRule, setReplenishmentRule] = useState<PantryItem['replenishmentRule']>('ONE_SHOT');

    useEffect(() => {
        if (item) {
            setName(item.name);
            setQuantity(item.quantity || '');
            setUnit(item.unit || 'un');
            setUnitDetails(item.unitDetails || '');
            setInStock(item.inStock);
            setReplenishmentRule(item.replenishmentRule);
        }
    }, [item, isOpen]);

    if (!isOpen || !item) return null;

    const handleSave = () => {
        onSave({
            name,
            quantity,
            unit,
            unitDetails,
            inStock,
            replenishmentRule
        });
        onClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-lg mx-4 shadow-2xl border border-white/20 animate-in zoom-in-95 duration-200 overflow-hidden">

                {/* Header */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white flex justify-between items-center">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <i className="fas fa-edit opacity-80"></i>
                        {t('common.edit')}
                    </h3>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 space-y-6">

                    {/* Name Input */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('pantry.ingredient')}</label>
                        <input
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ex: Rice, Eggs..."
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Quantity */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('recipeForm.qty')}</label>
                            <input
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
                                value={quantity}
                                onChange={e => setQuantity(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="1, 0.5..."
                            />
                        </div>

                        {/* Unit */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('recipeForm.unit')}</label>
                            <CustomUnitSelect
                                value={unit}
                                onChange={setUnit}
                                measurementSystem={member?.kitchen?.id ? 'METRIC' : 'METRIC'}
                                className="w-full"
                            />
                        </div>
                        {/* Replenishment Rule */}
                        <div className="col-span-2 space-y-3 pt-2 border-t border-slate-100">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">{t('recipeCard.trackItem')}</label>
                            <div className="grid grid-cols-1 gap-3">
                                {[
                                    { value: 'ALWAYS', label: t('recipeCard.alwaysReplenish'), desc: t('recipeCard.alwaysReplenishDesc'), icon: 'fa-sync-alt', color: 'text-blue-500 bg-blue-50 border-blue-200' },
                                    { value: 'ONE_SHOT', label: t('recipeCard.oneShot'), desc: t('recipeCard.oneShotDesc'), icon: 'fa-bullseye', color: 'text-amber-500 bg-amber-50 border-amber-200' },
                                    { value: 'NEVER', label: t('recipeCard.justTrack'), desc: t('recipeCard.justTrackDesc'), icon: 'fa-eye', color: 'text-slate-500 bg-slate-50 border-slate-200' }
                                ].map((option) => (
                                    <div
                                        key={option.value}
                                        onClick={() => setReplenishmentRule(option.value as any)}
                                        className={`relative p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${replenishmentRule === option.value ? option.color + ' border-current ring-1 ring-offset-1 ' + option.color.split(' ')[0] : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${replenishmentRule === option.value ? 'bg-white/50' : 'bg-slate-100'} ${replenishmentRule === option.value ? '' : 'text-slate-400'}`}>
                                            <i className={`fas ${option.icon}`}></i>
                                        </div>
                                        <div>
                                            <p className={`font-bold text-sm ${replenishmentRule === option.value ? '' : 'text-slate-700'}`}>{option.label}</p>
                                            <p className={`text-xs ${replenishmentRule === option.value ? 'opacity-80' : 'text-slate-400'}`}>{option.desc}</p>
                                        </div>
                                        {replenishmentRule === option.value && (
                                            <div className="absolute top-3 right-3 text-current">
                                                <i className="fas fa-check-circle"></i>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Stock Toggle */}
                    <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <span className="font-bold text-slate-600">{t('pantry.inStockQuestion')}</span>
                        <button
                            onClick={() => setInStock(!inStock)}
                            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none ${inStock ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        >
                            <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${inStock ? 'translate-x-7' : 'translate-x-1'}`} />
                        </button>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between">
                    <button
                        onClick={onDelete}
                        className="px-6 py-3 rounded-xl font-bold text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors flex items-center gap-2"
                    >
                        <i className="fas fa-trash"></i>
                        {t('common.delete')}
                    </button>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!name.trim()}
                            className="px-8 py-3 rounded-xl font-bold bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {t('common.save')}
                        </button>
                    </div>
                </div>

            </div >
        </div >
    );
};

export default PantryEditDialog;
