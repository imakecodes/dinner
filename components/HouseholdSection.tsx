import React, { useState } from 'react';
import { KitchenMember } from '../types';
import { ConfirmDialog } from './ConfirmDialog';
import { storageService } from '../services/storageService';
import { TagInput } from './TagInput';

interface Props {
  members: KitchenMember[];
  setMembers: React.Dispatch<React.SetStateAction<KitchenMember[]>>;
  activeDiners: string[];
  setActiveDiners: React.Dispatch<React.SetStateAction<string[]>>;
}

const HouseholdSection: React.FC<Props> = ({ members, setMembers, activeDiners, setActiveDiners }) => {
  const [newMember, setNewMember] = useState<{
    name: string;
    email: string;
    restrictions: string[];
    likes: string[];
    dislikes: string[];
  }>({ name: '', email: '', restrictions: [], likes: [], dislikes: [] });

  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);

  /**
   * Adds a new member to the kitchen state and selects them for the current session.
   */
  const addMember = async () => {
    if (!newMember.name) return;
    const member: any = {
      id: `temp-${Date.now()}`,
      name: newMember.name,
      email: newMember.email,
      restrictions: newMember.restrictions,
      likes: newMember.likes,
      dislikes: newMember.dislikes,
    };

    try {
      await storageService.saveMember(member);
      setMembers([...members, member]);
      setActiveDiners([...activeDiners, member.id]);
      setNewMember({ name: '', email: '', restrictions: [], likes: [], dislikes: [] });
    } catch (error) {
      console.error("Failed to save member:", error);
      alert("Failed to add member. If adding by email, verify the user exists.");
    }
  };

  const confirmDelete = (id: string) => {
    setMemberToDelete(id);
  };

  const handleRemoveMember = async () => {
    if (!memberToDelete) return;

    try {
      await storageService.deleteMember(memberToDelete);
      setMembers(members.filter(m => m.id !== memberToDelete));
      setActiveDiners(activeDiners.filter(d => d !== memberToDelete));
    } catch (error) {
      console.error("Failed to delete member:", error);
    } finally {
      setMemberToDelete(null);
    }
  };

  const toggleDiner = (id: string) => {
    setActiveDiners(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  };

  return (
    <section className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50">
        <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
          <i className="fas fa-users text-rose-500"></i>
          Kitchen Members
        </h2>
        <p className="text-sm text-slate-500 mt-1">Define who is present and their critical restrictions.</p>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {members.map(member => (
            <div key={member.id} className={`p-5 rounded-2xl border-2 transition-all ${activeDiners.includes(member.id) ? 'border-rose-500 bg-rose-50/30' : 'border-slate-100 bg-white opacity-60'}`}>
              <div className="flex justify-between items-start mb-3">
                <button onClick={() => toggleDiner(member.id)} className="flex items-center gap-3 text-left group">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${activeDiners.includes(member.id) ? 'bg-rose-500 border-rose-500' : 'border-slate-300 group-hover:border-rose-400'}`}>
                    {activeDiners.includes(member.id) && <i className="fas fa-check text-[10px] text-white"></i>}
                  </div>
                  <span className="font-extrabold text-slate-900 tracking-tight">{member.name}</span>
                </button>
                <button onClick={() => confirmDelete(member.id)} className="text-slate-300 hover:text-red-500 p-1 transition-colors">
                  <i className="fas fa-trash-alt text-xs"></i>
                </button>
              </div>
              <div className="space-y-2 text-xs">
                <p><span className="font-bold text-red-700">ALLERGIES:</span> {member.restrictions?.join(', ') || 'N/A'}</p>
                <p><span className="font-bold text-emerald-700">LIKES:</span> {member.likes?.join(', ') || 'N/A'}</p>
                <p><span className="font-bold text-slate-500">HATES:</span> {member.dislikes?.join(', ') || 'N/A'}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Form to add a new member */}
        <div className="bg-slate-50 p-6 rounded-2xl space-y-4 border border-slate-100">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">New Member</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              placeholder="Name (e.g. John)"
              className="px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none bg-white focus:border-rose-500 transition-colors"
              value={newMember.name}
              onChange={e => setNewMember({ ...newMember, name: e.target.value })}
            />
            <input
              placeholder="Email (Optional - Links to existing user)"
              className="px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none bg-white focus:border-rose-500 transition-colors"
              value={newMember.email}
              onChange={e => setNewMember({ ...newMember, email: e.target.value })}
            />
            <TagInput
              tags={newMember.restrictions}
              onChange={(tags) => setNewMember({ ...newMember, restrictions: tags })}
              placeholder="Restrictions (comma separated)"
              category="restriction"
            />
            <TagInput
              tags={newMember.likes}
              onChange={(tags) => setNewMember({ ...newMember, likes: tags })}
              placeholder="Likes (e.g. Pasta, Fish)"
              category="like"
            />
            <TagInput
              tags={newMember.dislikes}
              onChange={(tags) => setNewMember({ ...newMember, dislikes: tags })}
              placeholder="Dislikes (e.g. Onion)"
              category="dislike"
            />
          </div>
          <button onClick={addMember} className="w-full bg-slate-900 text-white py-3 rounded-xl text-sm font-bold hover:bg-black transition-all shadow-lg">
            Add to Kitchen
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!memberToDelete}
        onClose={() => setMemberToDelete(null)}
        onConfirm={handleRemoveMember}
        title="Remove Member?"
        message="Are you sure you want to remove this member from your kitchen? This action cannot be undone."
      />
    </section>
  );
};

export default HouseholdSection;
