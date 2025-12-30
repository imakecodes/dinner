import React, { useState, useMemo } from 'react';
import { PantryItem } from '../types';
import { storageService } from '../services/storageService';
import { ConfirmDialog } from './ConfirmDialog';

import { useCurrentMember } from '@/hooks/useCurrentMember';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  pantry: PantryItem[];
  setPantry: React.Dispatch<React.SetStateAction<PantryItem[]>>;
}

const PantrySection: React.FC<Props> = ({ pantry, setPantry }) => {
  const { isGuest } = useCurrentMember();
  const { t } = useTranslation();
  const [newItemName, setNewItemName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editRule, setEditRule] = useState<'ALWAYS' | 'ONE_SHOT' | 'NEVER'>('NEVER');

  // Confim Dialog State
  const [itemToDelete, setItemToDelete] = useState<PantryItem | null>(null);

  // FILTERED LIST
  const filteredPantry = useMemo(() => {
    return pantry.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [pantry, searchQuery]);

  // ACTIONS
  const handleAdd = async () => {
    if (!newItemName.trim()) return;
    try {
      // Optimistic Update
      const tempId = Date.now().toString();
      const tempItem: PantryItem = { id: tempId, name: newItemName, inStock: true, replenishmentRule: 'ONE_SHOT' };
      setPantry(prev => [...prev, tempItem]);
      setNewItemName('');

      const created = await storageService.addPantryItem(newItemName);
      if (created) {
        // Replace temp with real
        setPantry(prev => prev.map(i => i.id === tempId ? created : i));
      }
    } catch (error) {
      console.error("Failed to add item", error);
      // Revert on failure could be added here
    }
  };

  const handleToggleStock = async (item: PantryItem) => {
    const newState = !item.inStock;
    // Optimistic
    setPantry(prev => prev.map(i => i.id === item.id ? { ...i, inStock: newState } : i));

    try {
      await storageService.editPantryItem(item.name, { inStock: newState });
    } catch (error) {
      console.error("Failed to toggle stock", error);
      setPantry(prev => prev.map(i => i.id === item.id ? { ...i, inStock: !newState } : i));
    }
  };

  const startEditing = (item: PantryItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditQuantity(item.quantity || '');
    setEditUnit(item.unit || '');
    setEditRule(item.replenishmentRule || 'NEVER');
  };

  const saveEdit = async (item: PantryItem) => {
    if (!editName.trim()) {
      setEditingId(null);
      return;
    }
    // Optimistic
    const updates = { 
        name: editName, 
        quantity: editQuantity, 
        unit: editUnit, 
        replenishmentRule: editRule 
    };
    
    setPantry(prev => prev.map(i => i.id === item.id ? { ...i, ...updates } : i));
    setEditingId(null);

    try {
      await storageService.editPantryItem(item.name, updates);
    } catch (error) {
      console.error("Failed to edit item", error);
      setPantry(prev => prev.map(i => i.id === item.id ? item : i)); // Revert
    }
  };

  const deleteItem = (item: PantryItem) => {
    setItemToDelete(item);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    setPantry(prev => prev.filter(i => i.id !== itemToDelete.id));
    try {
      await storageService.removePantryItem(itemToDelete.name);
    } catch (error) {
      console.error("Failed to delete", error);
      // Ideally revert optimistic update here, but for now simple log
    }
    setItemToDelete(null);
  };

  return (
    <section className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header & Add */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
              <i className="fas fa-box-open text-amber-500"></i>
              {t('pantry.title')}
            </h2>
            <p className="text-sm text-slate-500 mt-1">{t('pantry.subtitle')}</p>
          </div>
        </div>

        {/* Add New Bar */}
        {!isGuest && (
          <div className="flex gap-2">
            <input
              placeholder={t('pantry.placeholder')}
              className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-amber-500"
              value={newItemName}
              onKeyPress={e => e.key === 'Enter' && handleAdd()}
              onChange={e => setNewItemName(e.target.value)}
            />
            <button
              onClick={handleAdd}
              disabled={!newItemName.trim()}
              className={`px-6 py-3 rounded-2xl font-bold shadow-lg transition-all active:scale-95 ${!newItemName.trim()
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-amber-500 text-white shadow-amber-100 hover:bg-amber-600'
                }`}
            >
              {t('pantry.include')}
            </button>
          </div>
        )}
      </div>

      {/* Search & List */}
      <div className="p-0">
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <i className="fas fa-search absolute left-4 top-3.5 text-slate-400"></i>
            <input
              type="text"
              placeholder={t('pantry.search')}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-slate-200 transition-all"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="max-h-[600px] overflow-y-auto">
          {filteredPantry.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <i className="fas fa-carrot text-4xl mb-3 opacity-20"></i>
              <p>{t('pantry.empty')}</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 sticky top-0 z-10 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">{t('pantry.ingredient')}</th>
                  <th className="px-6 py-3 text-center">{t('pantry.inStockQuestion')}</th>
                  {!isGuest && <th className="px-6 py-3 text-right">{t('pantry.actions')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPantry.map(item => (
                  <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                    {/* Name Column */}
                    {/* Name & Details Column */}
                    <td className="px-6 py-4">
                      {editingId === item.id ? (
                        <div className="flex flex-col gap-2">
                             <input
                               autoFocus
                               className="w-full px-2 py-1 border border-slate-300 rounded focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                               value={editName}
                               onChange={e => setEditName(e.target.value)}
                               onKeyDown={e => e.key === 'Enter' && saveEdit(item)}
                               placeholder="Item Name"
                             />
                             <div className="flex gap-2">
                                <input
                                    className="w-20 px-2 py-1 border border-slate-300 rounded text-xs"
                                    value={editQuantity}
                                    onChange={e => setEditQuantity(e.target.value)}
                                    placeholder="Qty"
                                />
                                <input
                                    className="w-20 px-2 py-1 border border-slate-300 rounded text-xs"
                                    value={editUnit}
                                    onChange={e => setEditUnit(e.target.value)}
                                    placeholder="Unit"
                                />
                                <select 
                                    className="text-xs border border-slate-300 rounded px-1"
                                    value={editRule}
                                    onChange={e => setEditRule(e.target.value as any)}
                                >
                                    <option value="NEVER">Manual</option>
                                    <option value="ONE_SHOT">One Shot</option>
                                    <option value="ALWAYS">Auto-Refill</option>
                                </select>
                                <button onClick={() => saveEdit(item)} className="text-xs bg-emerald-500 text-white px-2 rounded">OK</button>
                             </div>
                        </div>
                      ) : (
                        <div>
                            <span
                              className={`font-medium text-slate-700 block ${!item.inStock && 'opacity-50 line-through'} ${!isGuest ? 'cursor-pointer hover:text-amber-600' : ''}`}
                              onClick={() => !isGuest && startEditing(item)}
                            >
                              {item.name}
                            </span>
                            {(item.quantity || item.unit || item.replenishmentRule !== 'NEVER') && (
                                <div className="text-[10px] text-slate-400 flex gap-2 mt-0.5">
                                    {item.quantity && <span>{item.quantity} {item.unit}</span>}
                                    {item.replenishmentRule === 'ALWAYS' && <span className="text-amber-500 font-bold"><i className="fas fa-sync-alt"></i> Auto</span>}
                                    {item.replenishmentRule === 'ONE_SHOT' && <span className="text-blue-400"><i className="fas fa-arrow-right"></i> One-off</span>}
                                </div>
                            )}
                        </div>
                      )}
                    </td>

                    {/* Stock Toggle Column */}
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => !isGuest && handleToggleStock(item)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${item.inStock ? 'bg-emerald-500' : 'bg-slate-200'} ${isGuest ? 'cursor-default opacity-50' : ''}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${item.inStock ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </td>

                    {/* Actions Column */}
                    {!isGuest && (
                      <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEditing(item)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors" title="Edit">
                          <i className="fas fa-pen"></i>
                        </button>
                        <button onClick={() => deleteItem(item)} className="p-2 text-slate-400 hover:text-red-600 transition-colors" title="Delete">
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!itemToDelete}
        title={t('pantry.removeTitle')}
        message={t('pantry.removeMsg').replace('{item}', itemToDelete?.name || '')}
        onClose={() => setItemToDelete(null)}
        onConfirm={confirmDelete}
      />
    </section>
  );
};

export default PantrySection;
