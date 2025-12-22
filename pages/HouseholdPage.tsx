
import React, { useState } from 'react';
import { HouseholdMember } from '../types';
import { Language, translations } from '../locales/translations';
import TagInput from '../components/TagInput';
import { storageService } from '../services/storageService';

interface Props {
  household: HouseholdMember[];
  setHousehold: React.Dispatch<React.SetStateAction<HouseholdMember[]>>;
  lang: Language;
}

const HouseholdPage: React.FC<Props> = ({ household, setHousehold, lang }) => {
  const t = translations[lang];
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'resident' | 'guest'>('resident');
  
  const [form, setForm] = useState<Omit<HouseholdMember, 'id' | 'isGuest'>>({
    name: '',
    restrictions: [],
    likes: [],
    dislikes: []
  });

  const members = household.filter(m => !m.isGuest);
  const guests = household.filter(m => m.isGuest);

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    
    let updatedMember: HouseholdMember;

    if (editingId) {
      const existing = household.find(m => m.id === editingId);
      updatedMember = { ...existing!, ...form, name: form.name.trim() };
    } else {
      updatedMember = {
        id: `${activeTab === 'resident' ? 'h' : 'g'}-${Date.now()}`,
        ...form,
        name: form.name.trim(),
        isGuest: activeTab === 'guest'
      };
    }

    await storageService.saveMember(updatedMember);
    
    if (editingId) {
      setHousehold(prev => prev.map(m => m.id === editingId ? updatedMember : m));
    } else {
      setHousehold(prev => [...prev, updatedMember]);
    }

    setForm({ name: '', restrictions: [], likes: [], dislikes: [] });
    setIsAdding(false);
    setEditingId(null);
  };

  const startEdit = (member: HouseholdMember) => {
    setForm({
      name: member.name,
      restrictions: member.restrictions,
      likes: member.likes,
      dislikes: member.dislikes
    });
    setEditingId(member.id);
    setActiveTab(member.isGuest ? 'guest' : 'resident');
    setIsAdding(true);
  };

  const removeMember = async (id: string) => {
    await storageService.deleteMember(id);
    setHousehold(prev => prev.filter(m => m.id !== id));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{t.household_title}</h2>
          <p className="text-slate-500 font-medium">Gerencie o banco de dados de moradores e visitantes frequentes.</p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => { setIsAdding(true); setActiveTab('resident'); }}
            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
          >
            <i className="fas fa-plus"></i>
            Adicionar Novo
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-white p-8 rounded-[2.5rem] border-2 border-indigo-100 shadow-2xl shadow-indigo-50/50 space-y-8 animate-in zoom-in-95 duration-300">
          <div className="flex justify-between items-center">
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button 
                onClick={() => setActiveTab('resident')}
                className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'resident' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
              >
                RESIDENTE
              </button>
              <button 
                onClick={() => setActiveTab('guest')}
                className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'guest' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-400'}`}
              >
                CONVIDADO
              </button>
            </div>
            <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="text-slate-300 hover:text-slate-600 p-2">
              <i className="fas fa-times"></i>
            </button>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
              <input 
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-lg"
                placeholder="Ex: Carlos Silva"
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TagInput 
                category="restrictions"
                tags={form.restrictions}
                onChange={tags => setForm({...form, restrictions: tags})}
                label="Restrições / Alergias"
                placeholder="Glúten, Nozes..."
                accentColor="focus-within:ring-red-400"
              />
              <TagInput 
                category="likes"
                tags={form.likes}
                onChange={tags => setForm({...form, likes: tags})}
                label="Preferências (Likes)"
                placeholder="Peixe, Massa..."
                accentColor="focus-within:ring-emerald-400"
              />
              <div className="md:col-span-2">
                <TagInput 
                  category="dislikes"
                  tags={form.dislikes}
                  onChange={tags => setForm({...form, dislikes: tags})}
                  label="Não Gosta (Dislikes)"
                  placeholder="Coentro, Cebola..."
                  accentColor="focus-within:ring-slate-400"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-4">
            <button 
              onClick={handleSubmit}
              className="flex-1 bg-slate-900 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-200 active:scale-95"
            >
              {editingId ? 'Salvar Alterações' : `Confirmar ${activeTab === 'resident' ? 'Residente' : 'Convidado'}`}
            </button>
            <button 
              onClick={() => { setIsAdding(false); setEditingId(null); }}
              className="px-8 bg-slate-100 text-slate-500 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Exibição dos Membros */}
      <div className="space-y-12">
        {members.length > 0 && (
          <div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <i className="fas fa-house-user text-indigo-500"></i> Residentes Cadastrados
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {members.map(member => (
                <MemberCard key={member.id} member={member} onEdit={() => startEdit(member)} onRemove={() => removeMember(member.id)} />
              ))}
            </div>
          </div>
        )}

        {guests.length > 0 && (
          <div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <i className="fas fa-user-friends text-amber-500"></i> Convidados no Banco de Dados
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {guests.map(member => (
                <MemberCard key={member.id} member={member} isGuest onEdit={() => startEdit(member)} onRemove={() => removeMember(member.id)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const MemberCard = ({ member, isGuest, onEdit, onRemove }: { member: HouseholdMember, isGuest?: boolean, onEdit: () => void, onRemove: () => void }) => (
  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col hover:shadow-md transition-all group">
    <div className="flex justify-between items-start mb-6">
      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black ${isGuest ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}>
          {member.name[0].toUpperCase()}
        </div>
        <div>
          <h3 className="font-black text-slate-900 text-lg">{member.name}</h3>
          <p className={`text-[10px] font-bold uppercase tracking-widest ${isGuest ? 'text-amber-500' : 'text-indigo-500'}`}>
            {isGuest ? 'Convidado Frequente' : 'Membro da Casa'}
          </p>
        </div>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
        <button onClick={onEdit} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors" title="Editar">
          <i className="fas fa-edit"></i>
        </button>
        <button onClick={onRemove} className="p-2 text-slate-400 hover:text-red-600 transition-colors" title="Excluir">
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
        {member.restrictions.length === 0 && <span className="text-slate-300 text-[10px] font-bold italic">Livre de restrições</span>}
      </div>
      
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Preferências</p>
          <div className="flex flex-wrap gap-1">
            {member.likes.length > 0 ? member.likes.map((l, i) => (
              <span key={i} className="text-[10px] font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded-md">{l}</span>
            )) : <span className="text-slate-300 text-[10px]">Não informado</span>}
          </div>
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Evita</p>
          <div className="flex flex-wrap gap-1">
            {member.dislikes.length > 0 ? member.dislikes.map((d, i) => (
              <span key={i} className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md italic">{d}</span>
            )) : <span className="text-slate-300 text-[10px]">Não informado</span>}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default HouseholdPage;
