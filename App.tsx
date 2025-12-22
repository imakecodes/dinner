
import React, { useState } from 'react';
import { HouseholdMember, SessionContext, GeneratedRecipe, ImageSize, AspectRatio } from './types';
import { generateRecipe, generateDishImage } from './services/geminiService';

const App: React.FC = () => {
  // --- State ---
  const [household, setHousehold] = useState<HouseholdMember[]>([
    { id: 'pai', name: 'Carlos', restrictions: ['Diabetes Tipo 2'], likes: ['Carne', 'Churrasco'], dislikes: ['Legumes cozidos'] },
    { id: 'filha', name: 'Bia', restrictions: ['Vegetariana', 'Alergia a Amendoim'], likes: ['Massas', 'Cogumelos'], dislikes: ['Coentro'] }
  ]);
  const [pantry, setPantry] = useState<string[]>(['Macarrão tradicional', 'Molho de tomate', 'Açúcar', 'Abobrinha', 'Ovos', 'Queijo Parmesão', 'Amendoim torrado']);
  const [activeDiners, setActiveDiners] = useState<string[]>(['pai', 'filha']);
  const [newMember, setNewMember] = useState({ name: '', restrictions: '', likes: '', dislikes: '' });
  const [newIngredient, setNewIngredient] = useState('');
  
  const [recipe, setRecipe] = useState<GeneratedRecipe | null>(null);
  const [dishImage, setDishImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [imgSize, setImgSize] = useState<ImageSize>(ImageSize.S1K);
  const [imgRatio, setImgRatio] = useState<AspectRatio>(AspectRatio.A1_1);

  // --- Handlers ---
  const addMember = () => {
    if (!newMember.name) return;
    const member: HouseholdMember = {
      id: Date.now().toString(),
      name: newMember.name,
      restrictions: newMember.restrictions.split(',').map(s => s.trim()).filter(s => s),
      likes: newMember.likes.split(',').map(s => s.trim()).filter(s => s),
      dislikes: newMember.dislikes.split(',').map(s => s.trim()).filter(s => s),
    };
    setHousehold([...household, member]);
    setActiveDiners([...activeDiners, member.id]);
    setNewMember({ name: '', restrictions: '', likes: '', dislikes: '' });
  };

  const removeMember = (id: string) => {
    setHousehold(household.filter(m => m.id !== id));
    setActiveDiners(activeDiners.filter(d => d !== id));
  };

  const addIngredient = () => {
    if (!newIngredient) return;
    setPantry([...pantry, newIngredient]);
    setNewIngredient('');
  };

  const removeIngredient = (ing: string) => {
    setPantry(pantry.filter(i => i !== ing));
  };

  const toggleDiner = (id: string) => {
    setActiveDiners(prev => 
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const handleGenerateRecipe = async () => {
    if (activeDiners.length === 0) {
      setError("Selecione pelo menos um participante.");
      return;
    }
    setIsGenerating(true);
    setError(null);
    setRecipe(null);
    setDishImage(null);

    try {
      // Added missing 'requested_type' to satisfy SessionContext interface
      const context: SessionContext = {
        who_is_eating: activeDiners,
        pantry_ingredients: pantry,
        requested_type: 'main'
      };
      const result = await generateRecipe(household, context);
      setRecipe(result);
    } catch (err: any) {
      setError("Erro ao gerar sugestão. Verifique sua chave de API.");
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!recipe) return;
    
    // @ts-ignore
    if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
    }

    setIsGeneratingImage(true);
    try {
      const img = await generateDishImage(recipe.recipe_title, imgSize, imgRatio);
      setDishImage(img);
    } catch (err: any) {
      setError("Erro ao gerar imagem. Talvez a API Key não suporte este modelo.");
      console.error(err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 selection:bg-indigo-100">
      {/* Header */}
      <header className="bg-slate-900 text-white shadow-xl p-6 sticky top-0 z-50 border-b border-slate-800">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500 p-2 rounded-lg">
              <i className="fas fa-utensils text-xl"></i>
            </div>
            <h1 className="text-2xl font-black tracking-tighter">Dinner?</h1>
          </div>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-widest hidden md:block">Chef & Auditor Assistant</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8 space-y-8">
        {/* Household Section */}
        <section className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
              <i className="fas fa-home text-indigo-500"></i>
              Membros da Casa (Household)
            </h2>
            <p className="text-sm text-slate-500 mt-1">Defina quem está presente e suas restrições críticas.</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {household.map(member => (
                <div key={member.id} className={`p-5 rounded-2xl border-2 transition-all ${activeDiners.includes(member.id) ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-100 bg-white opacity-60'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <button onClick={() => toggleDiner(member.id)} className="flex items-center gap-3 text-left group">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${activeDiners.includes(member.id) ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 group-hover:border-indigo-400'}`}>
                        {activeDiners.includes(member.id) && <i className="fas fa-check text-[10px] text-white"></i>}
                      </div>
                      <span className="font-extrabold text-slate-900 tracking-tight">{member.name}</span>
                    </button>
                    <button onClick={() => removeMember(member.id)} className="text-slate-300 hover:text-red-500 p-1 transition-colors">
                      <i className="fas fa-trash-alt text-xs"></i>
                    </button>
                  </div>
                  <div className="space-y-2 text-xs">
                    <p className="flex items-center gap-2"><span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold">ALERGIAS:</span> <span className="text-slate-600">{member.restrictions.join(', ') || 'Nenhuma'}</span></p>
                    <p className="flex items-center gap-2"><span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold">GOSTA:</span> <span className="text-slate-600">{member.likes.join(', ')}</span></p>
                    <p className="flex items-center gap-2"><span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">ODEIA:</span> <span className="text-slate-400 italic">{member.dislikes.join(', ')}</span></p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl space-y-4 border border-slate-100">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Novo Membro</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                   <label className="text-[10px] font-bold text-slate-500 ml-1">NOME</label>
                   <input 
                    placeholder="Ex: João" 
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    value={newMember.name}
                    onChange={e => setNewMember({...newMember, name: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-bold text-slate-500 ml-1">RESTRIÇÕES (Separar por vírgula)</label>
                   <input 
                    placeholder="Ex: Diabetes, Glúten" 
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    value={newMember.restrictions}
                    onChange={e => setNewMember({...newMember, restrictions: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-bold text-slate-500 ml-1">LIKES</label>
                   <input 
                    placeholder="Ex: Massas, Peixe" 
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    value={newMember.likes}
                    onChange={e => setNewMember({...newMember, likes: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-bold text-slate-500 ml-1">DISLIKES</label>
                   <input 
                    placeholder="Ex: Coentro, Cebola" 
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    value={newMember.dislikes}
                    onChange={e => setNewMember({...newMember, dislikes: e.target.value})}
                  />
                </div>
              </div>
              <button 
                onClick={addMember}
                className="w-full bg-slate-900 text-white py-3 rounded-xl text-sm font-bold hover:bg-black transition-all"
              >
                Adicionar ao Household
              </button>
            </div>
          </div>
        </section>

        {/* Pantry Section */}
        <section className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
              <i className="fas fa-box-open text-amber-500"></i>
              Despensa & Geladeira (Pantry)
            </h2>
            <p className="text-sm text-slate-500 mt-1">O que temos hoje? A IA priorizará estes itens.</p>
          </div>
          <div className="p-6">
            <div className="flex flex-wrap gap-2 mb-6">
              {pantry.map(item => (
                <span key={item} className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 group hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700 transition-all cursor-default">
                  {item}
                  <button onClick={() => removeIngredient(item)} className="text-slate-400 hover:text-amber-600 p-0.5">
                    <i className="fas fa-times"></i>
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input 
                placeholder="Ex: Abobrinha, Peito de Frango..." 
                className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                value={newIngredient}
                onKeyPress={e => e.key === 'Enter' && addIngredient()}
                onChange={e => setNewIngredient(e.target.value)}
              />
              <button 
                onClick={addIngredient}
                className="bg-amber-500 text-white px-8 py-3 rounded-2xl font-bold hover:bg-amber-600 transition-all shadow-lg shadow-amber-100"
              >
                Incluir
              </button>
            </div>
          </div>
        </section>

        {/* Generate Button */}
        <div className="flex flex-col items-center gap-4 py-4">
          <button 
            disabled={isGenerating || activeDiners.length === 0}
            onClick={handleGenerateRecipe}
            className={`w-full md:w-auto px-16 py-5 rounded-3xl text-xl font-black shadow-2xl transition-all flex items-center justify-center gap-4 ${
              isGenerating || activeDiners.length === 0 
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] shadow-indigo-200'
            }`}
          >
            {isGenerating ? (
              <>
                <i className="fas fa-brain fa-spin"></i>
                AUDITANDO SEGURANÇA...
              </>
            ) : (
              <>
                <i className="fas fa-hat-chef"></i>
                O QUE VAMOS COMER?
              </>
            )}
          </button>
          {error && <p className="text-red-600 font-bold text-xs text-center bg-red-50 px-6 py-3 rounded-2xl border border-red-200 uppercase tracking-wider">{error}</p>}
        </div>

        {/* Recipe Result */}
        {recipe && (
          <article className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Header / Image Area */}
            <div className="relative min-h-[350px] bg-slate-900 overflow-hidden flex flex-col items-center justify-center">
              {dishImage ? (
                <img src={dishImage} alt={recipe.recipe_title} className="w-full h-[450px] object-cover opacity-90" />
              ) : (
                <div className="p-10 text-center space-y-6 z-10 relative">
                   <div className="inline-flex px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-full text-[10px] font-black tracking-widest uppercase mb-4 border border-indigo-500/30">
                    Sugestão de Hoje
                  </div>
                  <h3 className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-none mb-4">{recipe.recipe_title}</h3>
                  <p className="text-slate-400 text-sm max-w-md mx-auto">{recipe.match_reasoning}</p>
                  
                  <div className="pt-6 flex flex-wrap gap-4 items-center justify-center">
                    <select 
                      className="bg-slate-800 text-white border border-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold outline-none"
                      value={imgSize}
                      onChange={e => setImgSize(e.target.value as ImageSize)}
                    >
                      {Object.values(ImageSize).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select 
                      className="bg-slate-800 text-white border border-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold outline-none"
                      value={imgRatio}
                      onChange={e => setImgRatio(e.target.value as AspectRatio)}
                    >
                      {Object.values(AspectRatio).map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <button 
                      onClick={handleGenerateImage}
                      disabled={isGeneratingImage}
                      className="bg-white text-slate-900 px-8 py-3 rounded-2xl font-black hover:bg-indigo-50 transition-all disabled:opacity-50 text-xs uppercase tracking-tighter shadow-xl shadow-black/50 flex items-center gap-2"
                    >
                      {isGeneratingImage ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-camera-retro"></i>}
                      Gerar Foto do Prato
                    </button>
                  </div>
                </div>
              )}
              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60"></div>
            </div>

            {/* Main Content Area */}
            <div className="p-8 md:p-14">
              <div className="flex flex-wrap gap-4 mb-10">
                {recipe.safety_badge && (
                  <span className="bg-emerald-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-200">
                    <i className="fas fa-shield-check"></i>
                    AUDITORIA OK: 100% SEGURO
                  </span>
                )}
                <span className="bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                  <i className="fas fa-bolt mr-1"></i>
                  Chef Inteligente
                </span>
              </div>

              {/* Analysis Log */}
              <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl mb-12">
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-indigo-500 shadow-sm border border-slate-100 flex-shrink-0">
                    <i className="fas fa-microscope text-sm"></i>
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-xs uppercase tracking-widest mb-1">Log do Auditor</h4>
                    <p className="text-slate-600 text-sm leading-relaxed font-medium italic">"{recipe.analysis_log}"</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-16">
                {/* Left Column: Ingredients */}
                <div className="md:col-span-5 space-y-10">
                  <div className="space-y-4">
                    <h4 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                      <span className="w-8 h-8 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center text-xs">
                        <i className="fas fa-refrigerator"></i>
                      </span>
                      Da Despensa
                    </h4>
                    <ul className="space-y-3">
                      {recipe.ingredients_from_pantry.map((ing, idx) => (
                        <li key={idx} className="flex items-center gap-3 text-slate-700 bg-slate-50/80 p-3 rounded-2xl border border-slate-100 text-sm font-semibold">
                          <i className="fas fa-check text-emerald-500"></i>
                          {ing}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {recipe.shopping_list.length > 0 && (
                    <div className="bg-orange-50/50 p-8 rounded-[2rem] border-2 border-dashed border-orange-200">
                      <h4 className="text-lg font-black text-orange-900 tracking-tight flex items-center gap-3 mb-4">
                        <i className="fas fa-shopping-basket"></i>
                        Para Comprar
                      </h4>
                      <ul className="space-y-3">
                        {recipe.shopping_list.map((ing, idx) => (
                          <li key={idx} className="flex items-center gap-3 text-orange-800 text-sm font-bold">
                            <span className="w-1.5 h-1.5 bg-orange-400 rounded-full"></span>
                            {ing}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-6 text-[10px] text-orange-400 font-bold uppercase tracking-widest">Apenas o essencial.</p>
                    </div>
                  )}
                </div>

                {/* Right Column: Steps */}
                <div className="md:col-span-7">
                  <h4 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3 mb-10">
                    <span className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center text-xs">
                      <i className="fas fa-list-ol"></i>
                    </span>
                    Passo a Passo
                  </h4>
                  <div className="space-y-10 relative">
                    {/* Vertical line */}
                    <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-slate-100"></div>
                    
                    {recipe.step_by_step.map((step, idx) => (
                      <div key={idx} className="relative pl-12">
                        <div className="absolute left-0 w-8 h-8 bg-white border-4 border-indigo-500 rounded-full flex items-center justify-center font-black text-xs text-indigo-600 z-10">
                          {idx + 1}
                        </div>
                        <p className="text-slate-700 text-base leading-relaxed font-medium pt-1">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </article>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-32 py-16 border-t border-slate-200 text-center">
        <div className="max-w-4xl mx-auto px-6">
          <div className="inline-flex items-center gap-2 text-indigo-600 font-black tracking-tighter text-xl mb-4">
            <i className="fas fa-utensils"></i>
            Dinner?
          </div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">Culinária Inteligente & Segura</p>
          <div className="mt-8 flex justify-center gap-6 text-slate-300">
             <i className="fab fa-instagram hover:text-indigo-400 cursor-pointer transition-colors"></i>
             <i className="fab fa-twitter hover:text-indigo-400 cursor-pointer transition-colors"></i>
             <i className="fab fa-github hover:text-indigo-400 cursor-pointer transition-colors"></i>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
