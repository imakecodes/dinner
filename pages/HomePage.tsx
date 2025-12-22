
import React, { useState } from 'react';
import { HouseholdMember, MealType, GeneratedRecipe } from '../types';
import RecipeCard from '../components/RecipeCard';
import { Language, translations } from '../locales/translations';

interface Props {
  household: HouseholdMember[];
  setHousehold: React.Dispatch<React.SetStateAction<HouseholdMember[]>>;
  pantry: string[];
  activeDiners: string[];
  setActiveDiners: React.Dispatch<React.SetStateAction<string[]>>;
  mealType: MealType;
  setMealType: (type: MealType) => void;
  isGenerating: boolean;
  onGenerate: () => void;
  error: string | null;
  recipe: GeneratedRecipe | null;
  dishImage: string | null;
  setDishImage: React.Dispatch<React.SetStateAction<string | null>>;
  lang: Language;
  onSaved: () => void;
}

const HomePage: React.FC<Props> = ({ 
  household, setHousehold, activeDiners, setActiveDiners, 
  mealType, setMealType, isGenerating, onGenerate, error, 
  recipe, dishImage, setDishImage, lang, onSaved 
}) => {
  const t = translations[lang];
  const [isGuestsOpen, setIsGuestsOpen] = useState(false);
  const [guestSearch, setGuestSearch] = useState('');
  
  // Estado para o formulário detalhado do convidado
  const [isCreatingGuest, setIsCreatingGuest] = useState(false);
  const [guestForm, setGuestForm] = useState({
    name: '',
    restrictions: '',
    likes: '',
    dislikes: ''
  });

  const toggleDiner = (id: string) => {
    setActiveDiners(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  };

  const regularMembers = household.filter(m => !m.isGuest);
  const guests = household.filter(m => m.isGuest);

  const handleOpenGuestForm = () => {
    setGuestForm({ ...guestForm, name: guestSearch });
    setIsCreatingGuest(true);
  };

  const handleSaveGuest = () => {
    if (!guestForm.name) return;
    const newGuest: HouseholdMember = {
      id: `g-${Date.now()}`,
      name: guestForm.name,
      restrictions: guestForm.restrictions.split(',').map(s => s.trim()).filter(s => s),
      likes: guestForm.likes.split(',').map(s => s.trim()).filter(s => s),
      dislikes: guestForm.dislikes.split(',').map(s => s.trim()).filter(s => s),
      isGuest: true
    };
    setHousehold(prev => [...prev, newGuest]);
    setActiveDiners(prev => [...prev, newGuest.id]);
    setGuestSearch('');
    setGuestForm({ name: '', restrictions: '', likes: '', dislikes: '' });
    setIsCreatingGuest(false);
  };

  const filteredGuests = guests.filter(g => g.name.toLowerCase().includes(guestSearch.toLowerCase()));

  return (
    <div className="space-y-8">
      {/* Participant Selection */}
      <section className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Quem vai comer?</h2>
            <p className="text-sm text-slate-500">Selecione os participantes para personalizar a segurança.</p>
          </div>
          <div className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-2xl text-xs font-black">
            {activeDiners.length} Selecionados
          </div>
        </div>
        
        <div className="p-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
            {regularMembers.map(member => (
              <button
                key={member.id}
                onClick={() => toggleDiner(member.id)}
                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 group ${
                  activeDiners.includes(member.id) 
                    ? 'border-indigo-600 bg-indigo-50 shadow-md' 
                    : 'border-slate-100 hover:border-slate-200 bg-white'
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold transition-colors ${
                  activeDiners.includes(member.id) ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  {member.name[0].toUpperCase()}
                </div>
                <span className={`text-sm font-bold ${activeDiners.includes(member.id) ? 'text-indigo-900' : 'text-slate-600'}`}>
                  {member.name}
                </span>
              </button>
            ))}
          </div>

          {/* Guests Section */}
          <div className="border-t border-slate-100 pt-6">
            <button 
              onClick={() => setIsGuestsOpen(!isGuestsOpen)}
              className="flex items-center gap-2 text-slate-400 hover:text-slate-600 font-bold text-sm transition-colors mb-4"
            >
              <i className={`fas fa-chevron-${isGuestsOpen ? 'up' : 'down'} text-[10px]`}></i>
              {t.snack} / Convidados ({guests.length})
            </button>

            {isGuestsOpen && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                {!isCreatingGuest ? (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                      <input 
                        type="text" 
                        placeholder="Buscar ou digitar nome do convidado..."
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        value={guestSearch}
                        onChange={e => setGuestSearch(e.target.value)}
                      />
                    </div>
                    {guestSearch && !guests.some(g => g.name.toLowerCase() === guestSearch.toLowerCase()) && (
                      <button 
                        onClick={handleOpenGuestForm}
                        className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-xs font-bold shadow-lg shadow-indigo-100 whitespace-nowrap"
                      >
                        + Adicionar Preferências
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-50 p-6 rounded-[1.5rem] border border-indigo-100 space-y-4 animate-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-xs font-black text-indigo-900 uppercase tracking-widest">Novo Convidado</h4>
                      <button onClick={() => setIsCreatingGuest(false)} className="text-slate-400 hover:text-slate-600">
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input 
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm"
                        placeholder="Nome"
                        value={guestForm.name}
                        onChange={e => setGuestForm({...guestForm, name: e.target.value})}
                      />
                      <input 
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm"
                        placeholder="Restrições (Glúten, Nozes...)"
                        value={guestForm.restrictions}
                        onChange={e => setGuestForm({...guestForm, restrictions: e.target.value})}
                      />
                      <input 
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm"
                        placeholder="Likes (Peixe, Massas...)"
                        value={guestForm.likes}
                        onChange={e => setGuestForm({...guestForm, likes: e.target.value})}
                      />
                      <input 
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm"
                        placeholder="Dislikes (Coentro...)"
                        value={guestForm.dislikes}
                        onChange={e => setGuestForm({...guestForm, dislikes: e.target.value})}
                      />
                    </div>
                    <button 
                      onClick={handleSaveGuest}
                      className="w-full bg-indigo-600 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg"
                    >
                      Salvar e Selecionar
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {filteredGuests.map(guest => (
                    <button
                      key={guest.id}
                      onClick={() => toggleDiner(guest.id)}
                      className={`p-3 rounded-2xl border-2 transition-all flex items-center gap-3 relative overflow-hidden ${
                        activeDiners.includes(guest.id) 
                          ? 'border-amber-500 bg-amber-50' 
                          : 'border-slate-100 hover:border-slate-200 bg-white opacity-80'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        activeDiners.includes(guest.id) ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {guest.name[0].toUpperCase()}
                      </div>
                      <div className="flex flex-col items-start overflow-hidden">
                        <span className="text-xs font-bold text-slate-600 truncate w-full">{guest.name}</span>
                        {guest.restrictions.length > 0 && (
                          <span className="text-[8px] text-red-500 font-black uppercase truncate w-full">⚠️ Restrições</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Meal Type Selection */}
      <section className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">
          {t.meal_type_label}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {(['appetizer', 'snack', 'main', 'dessert'] as MealType[]).map(type => (
            <button
              key={type}
              onClick={() => setMealType(type)}
              className={`px-4 py-5 rounded-2xl font-black text-xs uppercase transition-all flex flex-col items-center gap-3 border-2 ${
                mealType === type 
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                  : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200 hover:bg-slate-50'
              }`}
            >
              <i className={`fas text-lg ${
                type === 'appetizer' ? 'fa-cheese' : 
                type === 'main' ? 'fa-utensils' : 
                type === 'dessert' ? 'fa-ice-cream' : 
                'fa-cookie'
              }`}></i>
              {t[type === 'main' ? 'main_course' : type as keyof typeof t] || type}
            </button>
          ))}
        </div>
      </section>

      {/* Action Button */}
      <div className="flex flex-col items-center gap-4 py-4">
        <button 
          disabled={isGenerating || activeDiners.length === 0}
          onClick={onGenerate}
          className="w-full md:w-auto px-16 py-7 rounded-[2rem] text-xl font-black transition-all flex items-center justify-center gap-4 btn-primary shadow-2xl group active:scale-95"
        >
          {isGenerating ? (
            <><i className="fas fa-brain fa-spin"></i> {t.generating_btn}</>
          ) : (
            <><i className="fas fa-hat-chef group-hover:rotate-12 transition-transform"></i> {t.generate_btn}</>
          )}
        </button>
        {error && (
          <div className="bg-red-50 px-6 py-3 rounded-2xl border border-red-200 text-red-600 font-bold text-xs tracking-wider animate-bounce uppercase">
            {error}
          </div>
        )}
      </div>

      {/* Recipe Result */}
      {recipe && (
        <RecipeCard 
          recipe={recipe} 
          dishImage={dishImage} 
          setDishImage={setDishImage} 
          lang={lang}
          onSaved={onSaved}
        />
      )}
    </div>
  );
};

export default HomePage;
