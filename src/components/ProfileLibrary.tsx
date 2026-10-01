import React, { useState } from 'react';
import { 
  FolderHeart, 
  Plus, 
  Trash2, 
  Download, 
  Upload, 
  Search, 
  Check, 
  X,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { VoiceProfile, EffectSettings, EmotionType } from '../types/voice';

interface ProfileLibraryProps {
  isOpen?: boolean;
  onClose?: () => void;
  profiles: VoiceProfile[];
  activeProfileId: string | null;
  currentSettings: EffectSettings;
  onSelectProfile: (profile: VoiceProfile) => void;
  onSaveProfile: (profile: VoiceProfile) => void;
  onDeleteProfile: (id: string) => void;
  onExportProject: () => void;
  onImportProject: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const AVATAR_OPTIONS = ['🐿️', '😈', '🧚', '🤖', '👹', '😱', '🛡️', '📻', '👻', '👽', '🧙', '🐉', '🐱', '🦊', '🐰', '🐸', '🤡', '🎃'];
const COLOR_OPTIONS = ['#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16', '#eab308', '#3b82f4', '#a855f7', '#10b981', '#64748b'];

export const ProfileLibrary: React.FC<ProfileLibraryProps> = ({
  isOpen = true,
  onClose,
  profiles,
  activeProfileId,
  currentSettings,
  onSelectProfile,
  onSaveProfile,
  onDeleteProfile,
  onExportProject,
  onImportProject,
}) => {
  const [search, setSearch] = useState('');
  const [selectedEmotion, setSelectedEmotion] = useState<string>('all');
  const [isSavingNew, setIsSavingNew] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<VoiceProfile | null>(null);
  
  // New profile form state - declared unconditionally at top level
  const [newName, setNewName] = useState('');
  const [newCharType, setNewCharType] = useState('Cartoon Character');
  const [newTagline, setNewTagline] = useState('');
  const [newAvatar, setNewAvatar] = useState('🦊');
  const [newColor, setNewColor] = useState('#f59e0b');
  const [newEmotion, setNewEmotion] = useState<EmotionType>('custom');

  if (!isOpen) return null;

  const filteredProfiles = profiles.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.characterType.toLowerCase().includes(search.toLowerCase()) ||
      p.tagline.toLowerCase().includes(search.toLowerCase());
    const matchesEmotion = selectedEmotion === 'all' || p.emotion === selectedEmotion;
    return matchesSearch && matchesEmotion;
  });

  const handleOpenSaveModal = () => {
    setNewName('');
    setNewTagline('');
    setIsSavingNew(true);
  };

  const handleConfirmSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newProfile: VoiceProfile = {
      id: `profile_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: newName.trim(),
      characterType: newCharType.trim() || 'Cartoon Character',
      tagline: newTagline.trim() || 'Custom cartoon voice preset',
      emotion: newEmotion,
      color: newColor,
      avatarIcon: newAvatar,
      isBuiltIn: false,
      createdAt: Date.now(),
      settings: { ...currentSettings },
    };

    onSaveProfile(newProfile);
    setIsSavingNew(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl h-full bg-neutral-900 border-l border-neutral-800 p-5 flex flex-col gap-4 overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800/80 pb-3">
          <div className="flex items-center gap-2">
            <FolderHeart className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-bold text-neutral-100 tracking-wide">Character Presets & Voice Library</h2>
              <p className="text-xs text-neutral-400">Audition cartoon archetypes or save custom voice settings</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
                title="Close presets menu"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Toolbar: Save & Backup */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-800/60 text-xs">
          <button
            onClick={handleOpenSaveModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-450 text-neutral-950 text-xs font-bold shadow-md shadow-amber-500/20 active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Save Current Voice as Preset</span>
          </button>

          <div className="flex items-center gap-1.5">
            <label className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs cursor-pointer transition-colors" title="Import profile library JSON file">
              <Upload className="w-3.5 h-3.5" />
              <span>Import JSON</span>
              <input
                type="file"
                accept=".json"
                onChange={onImportProject}
                className="hidden"
              />
            </label>

            <button
              onClick={onExportProject}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs transition-colors"
              title="Export profile library to JSON file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search cartoon characters or effects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500/60"
          />
        </div>

        <div className="flex items-center gap-1 text-xs">
          <span className="text-neutral-500 mr-1">Emotion:</span>
          {['all', 'excited', 'villain', 'cute', 'robotic'].map((emo) => (
            <button
              key={emo}
              onClick={() => setSelectedEmotion(emo)}
              className={`px-2.5 py-1 rounded-lg capitalize transition-colors ${
                selectedEmotion === emo
                  ? 'bg-neutral-800 text-amber-400 font-semibold border border-neutral-700'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {emo}
            </button>
          ))}
        </div>
      </div>

      {/* Profiles Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 max-h-[460px] overflow-y-auto pr-1">
        {filteredProfiles.map((p) => {
          const isActive = activeProfileId === p.id;
          return (
            <div
              key={p.id}
              onClick={() => onSelectProfile(p)}
              className={`group flex flex-col justify-between p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-150 relative ${
                isActive
                  ? 'bg-neutral-800/90 border-amber-500 shadow-md shadow-amber-500/10'
                  : 'bg-neutral-950/70 border-neutral-800/80 hover:border-neutral-700 hover:bg-neutral-900/60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-lg shadow-sm"
                    style={{ backgroundColor: `${p.color}25`, border: `1px solid ${p.color}60` }}
                  >
                    {p.avatarIcon}
                  </div>

                  <div className="flex items-center gap-1">
                    {isActive && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-400">
                        <Check className="w-3 h-3 stroke-[3]" />
                        Active
                      </span>
                    )}
                    {!p.isBuiltIn && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setProfileToDelete(p);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-neutral-800 text-neutral-500 hover:text-red-400 transition-opacity"
                        title="Delete custom profile"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <h4 className="text-xs font-bold text-neutral-100 truncate">{p.name}</h4>
                <p className="text-[11px] font-medium text-neutral-400 mb-1">{p.characterType}</p>
                <p className="text-[11px] text-neutral-500 line-clamp-2 leading-relaxed">
                  {p.tagline}
                </p>
              </div>

              {/* Specs footer */}
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-neutral-800/60 text-[10px] font-mono text-neutral-400">
                <span>
                  Pitch: {p.settings.pitchSemitones > 0 ? `+${p.settings.pitchSemitones}` : p.settings.pitchSemitones}st
                </span>
                <span>Speed: {p.settings.speed.toFixed(2)}x</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Save Profile Modal Drawer */}
      {isSavingNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-base font-bold text-neutral-100">Save Voice Profile</h3>
              </div>
              <button
                onClick={() => setIsSavingNew(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmSave} className="flex flex-col gap-4 text-xs">
              <div>
                <label className="block text-neutral-300 font-medium mb-1">Character Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Captain Thunderbeak"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">Role / Character Type</label>
                <input
                  type="text"
                  placeholder="e.g. Pirate Parrot / Comic Relief"
                  value={newCharType}
                  onChange={(e) => setNewCharType(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">Short Description</label>
                <input
                  type="text"
                  placeholder="e.g. Squawky, fast-talking feathered captain"
                  value={newTagline}
                  onChange={(e) => setNewTagline(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Avatar Selector */}
              <div>
                <label className="block text-neutral-300 font-medium mb-1.5">Avatar Emoji</label>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewAvatar(emoji)}
                      className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center border transition-all ${
                        newAvatar === emoji
                          ? 'border-amber-500 bg-amber-500/20 scale-110'
                          : 'border-neutral-800 bg-neutral-950 hover:bg-neutral-800'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Selector */}
              <div>
                <label className="block text-neutral-300 font-medium mb-1.5">Theme Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        newColor === c ? 'scale-125 border-white' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800 mt-2">
                <button
                  type="button"
                  onClick={() => setIsSavingNew(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-450 text-neutral-950 font-bold shadow-md shadow-amber-500/20"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Profile Confirmation Modal */}
      {profileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-150 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-100">Delete Voice Profile?</h3>
                  <p className="text-xs text-neutral-400">This action cannot be undone</p>
                </div>
              </div>
              <button
                onClick={() => setProfileToDelete(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
                title="Cancel (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Profile Summary Card */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-950 border border-neutral-800/80">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-inner"
                style={{
                  backgroundColor: `${profileToDelete.color}25`,
                  border: `1px solid ${profileToDelete.color}60`,
                }}
              >
                {profileToDelete.avatarIcon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-neutral-100 truncate">{profileToDelete.name}</h4>
                <p className="text-xs text-neutral-400 truncate">{profileToDelete.characterType}</p>
                <div className="text-[10px] font-mono text-neutral-500 mt-0.5">
                  Pitch: {profileToDelete.settings.pitchSemitones > 0 ? `+${profileToDelete.settings.pitchSemitones}` : profileToDelete.settings.pitchSemitones}st · Speed: {profileToDelete.settings.speed.toFixed(2)}x
                </div>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              Are you sure you want to permanently delete the <strong className="text-white">"{profileToDelete.name}"</strong> preset? 
              Its custom pitch, speed, and audio DSP effects will be removed from your saved library.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setProfileToDelete(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium text-xs transition-colors"
              >
                Keep Profile
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteProfile(profileToDelete.id);
                  setProfileToDelete(null);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/25 active:scale-95 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Profile</span>
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
