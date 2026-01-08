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
  };

  const saveEdit = async (item: PantryItem) => {
    if (!editName.trim() || editName === item.name) {
      setEditingId(null);
      return;
    }
    // Optimistic
    setPantry(prev => prev.map(i => i.id === item.id ? { ...i, name: editName } : i));
    setEditingId(null);

    try {
      await storageService.editPantryItem(item.name, { name: editName });
    } catch (error) {
      console.error("Failed to edit name", error);
      setPantry(prev => prev.map(i => i.id === item.id ? { ...i, name: item.name } : i));
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

        <div className="p-6 max-h-[calc(100vh-250px)] overflow-y-auto">
          {filteredPantry.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <i className="fas fa-carrot text-4xl mb-3 opacity-20"></i>
              <p>{t('pantry.empty')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredPantry.map(item => (
                  <div key={item.id} className="group bg-slate-50 hover:bg-white p-4 rounded-2xl border border-slate-100 hover:border-amber-200 hover:shadow-md transition-all flex flex-col gap-3 relative">
                    
                    {/* Actions Top Right (Hidden unless hover/mobile) */}
                    {!isGuest && (
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button onClick={() => startEditing(item)} className="p-2 w-8 h-8 flex items-center justify-center rounded-lg bg-white text-slate-400 hover:text-indigo-600 shadow-sm border border-slate-100" title="Edit">
                          <i className="fas fa-pen text-xs"></i>
                        </button>
                        <button onClick={() => deleteItem(item)} className="p-2 w-8 h-8 flex items-center justify-center rounded-lg bg-white text-slate-400 hover:text-red-600 shadow-sm border border-slate-100" title="Delete">
                          <i className="fas fa-trash text-xs"></i>
                        </button>
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1">
                        {editingId === item.id ? (
                        <input
                          autoFocus
                          className="w-full px-2 py-1 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm font-bold"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onBlur={() => saveEdit(item)}
                          onKeyDown={e => e.key === 'Enter' && saveEdit(item)}
                        />
                      ) : (
                        <h3 
                          className={`font-bold text-slate-700 text-lg leading-tight break-words pr-8 ${!item.inStock && 'opacity-50 line-through'} ${!isGuest ? 'cursor-pointer hover:text-amber-600' : ''}`}
                          onClick={() => !isGuest && startEditing(item)}
                        >
                          {item.name}
                        </h3>
                      )}
                    </div>

                    {/* Stock Toggle */}
                    <div className="flex items-center justify-between mt-auto">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{item.inStock ? t('pantry.inStock') : t('pantry.outOfStock')}</span>
                        <button
                            onClick={() => !isGuest && handleToggleStock(item)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${item.inStock ? 'bg-emerald-500' : 'bg-slate-200'} ${isGuest ? 'cursor-default opacity-50' : ''}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${item.inStock ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                  </div>
                ))}
            </div>
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
