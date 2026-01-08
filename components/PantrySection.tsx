import React, { useState, useMemo } from 'react';
import { PantryItem } from '../types';
import { storageService } from '../services/storageService';
import { ConfirmDialog } from './ConfirmDialog';
import CustomUnitSelect from './CustomUnitSelect';
import PantryEditDialog from './PantryEditDialog';
import PantryItemCard from './PantryItemCard';

import { useCurrentMember } from '@/hooks/useCurrentMember';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  pantry: PantryItem[];
  setPantry: React.Dispatch<React.SetStateAction<PantryItem[]>>;
}

const PantrySection: React.FC<Props> = ({ pantry, setPantry }) => {
  const { isGuest, member } = useCurrentMember();
  const { t } = useTranslation();
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  const [newItemUnit, setNewItemUnit] = useState('un');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterRule, setFilterRule] = useState('ALL');

  // Edit Dialog State
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null);

  // Confim Dialog State
  const [itemToDelete, setItemToDelete] = useState<PantryItem | null>(null);

  // FILTERED LIST
  const filteredPantry = useMemo(() => {
    return pantry.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterRule === 'ALL' || item.replenishmentRule === filterRule;
      return matchesSearch && matchesFilter;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [pantry, searchQuery, filterRule]);

  // ACTIONS
  const handleAdd = async () => {
    if (!newItemName.trim()) return;
    try {
      // Optimistic Update
      const tempId = Date.now().toString();
      const tempItem: PantryItem = {
        id: tempId,
        name: newItemName,
        inStock: true,
        replenishmentRule: 'ONE_SHOT',
        quantity: newItemQuantity,
        unit: newItemUnit
      };
      setPantry(prev => [...prev, tempItem]);
      setNewItemName('');
      setNewItemQuantity('1');
      setNewItemUnit('un');

      const created = await storageService.addPantryItem(newItemName, undefined, undefined, newItemQuantity, newItemUnit);
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

  const openEdit = (item: PantryItem) => {
    setEditingItem(item);
  };

  const handleSaveEdit = async (updates: Partial<PantryItem>) => {
    if (!editingItem) return;

    // Optimistic Update
    setPantry(prev => prev.map(i => i.id === editingItem.id ? { ...i, ...updates } : i));

    try {
      await storageService.editPantryItem(editingItem.name, updates);
    } catch (error) {
      console.error("Failed to edit item", error);
      // Revert? For now keeping it simple as optimistic usually works unless offline
    }
  };

  const handleDeleteFromDialog = () => {
    if (editingItem) {
      setItemToDelete(editingItem);
      setEditingItem(null);
    }
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
          <div className="flex gap-2 flex-col md:flex-row">
            <div className="flex-1 flex gap-2">
              <input
                placeholder={t('pantry.placeholder')}
                className="flex-[2] px-4 py-3 rounded-2xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                value={newItemName}
                onKeyPress={e => e.key === 'Enter' && handleAdd()}
                onChange={e => setNewItemName(e.target.value)}
              />
              <input
                placeholder="Qty"
                className="w-20 px-3 py-3 rounded-2xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                value={newItemQuantity}
                onKeyPress={e => e.key === 'Enter' && handleAdd()}
                onChange={e => setNewItemQuantity(e.target.value)}
              />
              <CustomUnitSelect
                value={newItemUnit}
                onChange={setNewItemUnit}
                measurementSystem={member?.kitchen?.id ? 'METRIC' : 'METRIC'} // TODO: Fetch from user profile properly if available
                className="w-32"
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={!newItemName.trim()}
              className={`px-6 py-3 rounded-2xl font-bold shadow-lg transition-all active:scale-95 ${!newItemName.trim()
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-amber-500 text-white shadow-amber-100 hover:bg-amber-600'
                }`}
            >
              <i className="fas fa-plus mr-2 md:hidden"></i>
              {t('pantry.include')}
            </button>
          </div>
        )}
      </div>

      {/* Search & List */}
      <div className="p-0">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <i className="fas fa-search absolute left-4 top-3.5 text-slate-400"></i>
            <input
              type="text"
              placeholder={t('pantry.search')}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-slate-200 transition-all"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-3 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-slate-200 text-slate-600 font-bold"
            value={filterRule}
            onChange={e => setFilterRule(e.target.value)}
          >
            <option value="ALL">{t('shopping.filterAll')}</option>
            <option value="ALWAYS">{t('recipeCard.alwaysReplenish')}</option>
            <option value="ONE_SHOT">{t('recipeCard.oneShot')}</option>
            <option value="NEVER">{t('recipeCard.justTrack')}</option>
          </select>
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
                <PantryItemCard
                  key={item.id}
                  item={item}
                  onClick={() => openEdit(item)}
                  onToggleStock={(e) => {
                    e.stopPropagation();
                    handleToggleStock(item);
                  }}
                  isGuest={isGuest}
                />
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

      <PantryEditDialog
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        item={editingItem}
        onSave={handleSaveEdit}
        onDelete={handleDeleteFromDialog}
      />
    </section>
  );
};

export default PantrySection;
