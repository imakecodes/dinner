
import React, { useState } from 'react';
import { HouseholdMember } from '../types';
import { Language, translations } from '../locales/translations';

interface Props {
  household: HouseholdMember[];
  setHousehold: React.Dispatch<React.SetStateAction<HouseholdMember[]>>;
  lang: Language;
}

const HouseholdPage: React.FC<Props> = ({ household, setHousehold, lang }) => {
  const t = translations[lang];
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', restrictions: '', likes: '', dislikes: '' });

  const members = household.filter(m => !m.isGuest);

  const handleSubmit = () => {
    if (!form.name) return;
    
    const data = {
      name: form.name,
      restrictions: form.restrictions.split(',').map(s => s.trim()).filter(s => s),
      likes: form.likes.split(',').map(s => s.trim()).filter(s => s),
      dislikes: form.dislikes.split(',').map(s => s.trim()).filter(s => s),
    };

    if (editingId) {
      setHousehold(prev => prev.map(m => m.id === editingId ? { ...m, ...data } : m));
    } else {
      const newMember: HouseholdMember = {
        id: `h-${Date.now()}`,
        ...data,
        isGuest: false
      };
      setHousehold(prev => [...prev, newMember]);
    }

    setForm({ name: '', restrictions: '', likes: '', dislikes: '' });
    setIsAdding(false);
    setEditingId(null);
  };

  const startEdit = (member: HouseholdMember) => {
    setForm({
      name: member.name,
      restrictions: member.restrictions.join(', '),
      likes: member.likes.join(', '),
      dislikes: member.dislikes.join(', ')
    });
    setEditingId(member.id);
    setIsAdding(true);
  };

  const removeMember = (id: string) => {
    setHousehold(prev => prev.filter(m => m.id !== id));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{t.household_title}</h2>
          <p className="text-slate-500 font-medium">Gerencie quem mora com você e suas necessidades.</p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
          >
            <i className="fas fa-plus"></i>
            Novo Membro
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-white p-8 rounded-[2rem] border-2 border-indigo-100 shadow-xl shadow-indigo-50/50 space-y-6 animate-in zoom-in-95 duration-300">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-black text-slate-900">{editingId ? 'Editar Perfil' : 'Novo Perfil de Residente'}</h3>
            <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="text-slate-400 hover:text-slate-600 p-2">
              <i className="fas fa-times"></i>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome</label>
              <input 
                className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                placeholder="Ex: Carlos"
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Restrições / Alergias</label>
              <input 
                className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-red-400 transition-all font-medium"
                placeholder="Glúten, Lactose, Diabetes..."
                value={form.restrictions}
                onChange={e => setForm({...form, restrictions: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Do que gosta</label>
              <input 
                className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-400 transition-all font-medium"
                placeholder="Massas, Cogumelos, Churrasco..."
                value={form.likes}
                onChange={e => setForm({...form, likes: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Do que NÃO gosta</label>
              <input 
                className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-slate-400 transition-all font-medium"
                placeholder="Coentro, Berinjela, Cebola..."
                value={form.dislikes}
                onChange={e => setForm({...form, dislikes: e.target.value})}
              />
            </div>
          </div>

          <div className="pt-4">
            <button 
              onClick={handleSubmit}
              className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-200"
            >
              {editingId ? 'Salvar Alterações' : 'Cadastrar na Casa'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {members.map(member => (
          <div key={member.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl font-black">
                  {member.name[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-lg">{member.name}</h3>
                  <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Residente</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEdit(member)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                  <i className="fas fa-edit"></i>
                </button>
                <button onClick={() => removeMember(member.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors">
                  <i className="fas fa-trash-alt"></i>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {member.restrictions.map((r, i) => (
                  <span key={i} className="px-3 py-1 bg-red-50 text-red-600 text-[10px] font-bold rounded-full border border-red-100 uppercase">
                    {r}
                  </span>
                ))}
                {member.restrictions.length === 0 && <span className="text-slate-400 text-[10px] font-bold italic">Sem restrições</span>}
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Likes</p>
                  <p className="text-xs font-semibold text-slate-700">{member.likes.join(', ') || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Dislikes</p>
                  <p className="text-xs font-semibold text-slate-400 italic">{member.dislikes.join(', ') || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HouseholdPage;
