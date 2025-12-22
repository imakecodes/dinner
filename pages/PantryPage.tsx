
import React, { useState } from 'react';
import { Language, translations } from '../locales/translations';

interface Props {
  pantry: string[];
  setPantry: React.Dispatch<React.SetStateAction<string[]>>;
  lang: Language;
}

const PantryPage: React.FC<Props> = ({ pantry, setPantry, lang }) => {
  const t = translations[lang];
  const [newIngredient, setNewIngredient] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  const addIngredient = () => {
    if (!newIngredient) return;
    const trimmed = newIngredient.trim();
    if (pantry.some(i => i.toLowerCase() === trimmed.toLowerCase())) {
      setNewIngredient('');
      return;
    }
    setPantry(prev => [...prev, trimmed]);
    setNewIngredient('');
  };

  const removeIngredient = (ing: string) => {
    setPantry(prev => prev.filter(i => i !== ing));
  };

  const startEditing = (index: number, value: string) => {
    setEditingIndex(index);
    setEditValue(value);
  };

  const saveEdit = () => {
    if (editingIndex === null || !editValue.trim()) return;
    const newPantry = [...pantry];
    newPantry[editingIndex] = editValue.trim();
    setPantry(newPantry);
    setEditingIndex(null);
  };

  const filteredPantry = pantry
    .filter(item => item.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{t.pantry_title}</h2>
        <p className="text-slate-500 font-medium">{t.pantry_subtitle}</p>
      </div>

      <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <i className="fas fa-plus absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input 
              className="w-full pl-12 pr-5 py-5 rounded-3xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-amber-500 transition-all font-bold text-slate-700"
              placeholder="Adicionar novo ingrediente (ex: Salmão, Alecrim...)"
              value={newIngredient}
              onChange={e => setNewIngredient(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && addIngredient()}
            />
          </div>
          <button 
            onClick={addIngredient}
            className="bg-amber-500 text-white px-12 py-5 rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl shadow-amber-100 hover:bg-amber-600 transition-all active:scale-95"
          >
            Adicionar
          </button>
        </div>

        <div className="relative">
          <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"></i>
          <input 
            className="w-full pl-12 pr-5 py-4 rounded-2xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
            placeholder="Buscar na despensa..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 px-2">
            Resultados ({filteredPantry.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredPantry.map((item, idx) => {
              const globalIndex = pantry.indexOf(item);
              const isEditing = editingIndex === globalIndex;

              return (
                <div 
                  key={globalIndex} 
                  className={`p-4 rounded-2xl flex justify-between items-center group transition-all border ${
                    isEditing ? 'border-indigo-500 bg-indigo-50 shadow-inner' : 'bg-slate-50 border-slate-100 hover:bg-amber-50 hover:border-amber-200'
                  }`}
                >
                  {isEditing ? (
                    <div className="flex-1 flex gap-2">
                      <input 
                        autoFocus
                        className="bg-white border border-indigo-200 px-3 py-1 rounded-xl w-full text-sm font-bold outline-none"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && saveEdit()}
                      />
                      <button onClick={saveEdit} className="text-indigo-600 p-2 hover:bg-indigo-100 rounded-xl">
                        <i className="fas fa-check"></i>
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="font-bold text-slate-700 text-sm">{item}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => startEditing(globalIndex, item)}
                          className="text-slate-400 hover:text-indigo-500 p-2"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button 
                          onClick={() => removeIngredient(item)}
                          className="text-slate-400 hover:text-red-500 p-2"
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          {pantry.length === 0 && (
            <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100">
              <i className="fas fa-shopping-cart text-4xl text-slate-200 mb-4"></i>
              <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Sua despensa está vazia.</p>
            </div>
          )}
          {pantry.length > 0 && filteredPantry.length === 0 && (
            <div className="text-center py-10 text-slate-400 text-xs font-bold uppercase tracking-widest">
              Nenhum item encontrado para "{searchTerm}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PantryPage;
