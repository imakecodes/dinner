
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

  const addIngredient = () => {
    if (!newIngredient) return;
    if (pantry.includes(newIngredient)) {
      setNewIngredient('');
      return;
    }
    setPantry(prev => [...prev, newIngredient]);
    setNewIngredient('');
  };

  const removeIngredient = (ing: string) => {
    setPantry(prev => prev.filter(i => i !== ing));
  };

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

        <div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 px-2">Itens em Estoque ({pantry.length})</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {pantry.sort().map(item => (
              <div 
                key={item} 
                className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex justify-between items-center group hover:bg-amber-50 hover:border-amber-200 transition-all"
              >
                <span className="font-bold text-slate-700 text-sm">{item}</span>
                <button 
                  onClick={() => removeIngredient(item)}
                  className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <i className="fas fa-trash-alt"></i>
                </button>
              </div>
            ))}
          </div>
          {pantry.length === 0 && (
            <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100">
              <i className="fas fa-shopping-cart text-4xl text-slate-200 mb-4"></i>
              <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Sua despensa está vazia.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PantryPage;
