import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { PantryItem } from '../types';

interface Props {
    item: PantryItem;
    onClick: () => void;
    onToggleStock: (e: React.MouseEvent) => void;
    isGuest?: boolean;
}

const PantryItemCard: React.FC<Props> = ({ item, onClick, onToggleStock, isGuest }) => {
    const { t } = useTranslation();

    return (
        <div
            onClick={!isGuest ? onClick : undefined}
            className={`group relative bg-white rounded-2xl p-4 border transition-all duration-200 flex flex-col gap-2
        ${!isGuest ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-amber-300' : ''}
        ${item.inStock ? 'border-slate-100' : 'border-slate-100 bg-slate-50/50 opacity-80'}
        `}
        >
            {/* Status Indicator Dot */}
            <div className={`absolute top-4 right-4 w-3 h-3 rounded-full ${item.inStock ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-slate-300'}`}></div>

            {/* Content */}
            <div className="pr-6">
                <h3 className={`font-bold text-lg leading-tight text-slate-800 ${!item.inStock && 'text-slate-500 line-through decoration-slate-400 decoration-2'}`}>
                    {item.name}
                </h3>
                <div className="flex items-center gap-1 mt-1 text-sm font-medium text-amber-600/80">
                    {item.quantity && (
                        <span>{item.quantity}</span>
                    )}
                    <span>{item.quantity ? (t(`units.${item.unit}`) || item.unit) : ''}</span>
                    {item.unitDetails && (
                        <span className="text-slate-400 font-normal ml-1">({item.unitDetails})</span>
                    )}
                </div>
            </div>

            {/* Quick Actions (Hover/Mobile) - replacing the old switch with a simpler overlay or action */}
            {/* Actually, keeping the toggle on the card is nice for quick interactions without opening the modal */}
            <div className="mt-2 pt-3 border-t border-slate-50 flex justify-between items-center">

                <span className={`text-[10px] font-bold uppercase tracking-widest ${item.inStock ? 'text-emerald-500' : 'text-slate-400'}`}>
                    {item.inStock ? t('pantry.inStock') : t('pantry.outOfStock')}
                </span>

                {!isGuest && (
                    <button
                        onClick={onToggleStock}
                        className={`p-2 rounded-full transition-colors hover:bg-slate-100 ${item.inStock ? 'text-emerald-500' : 'text-slate-300'}`}
                        title="Toggle Stock"
                    >
                        <i className={`fas fa-toggle-${item.inStock ? 'on' : 'off'} text-xl`}></i>
                    </button>
                )}
            </div>
        </div>
    );
};

export default PantryItemCard;
