import React, { useState, useEffect, useCallback } from 'react';
import { 
  Download, 
  FileDown,
  FolderHeart,
  Sliders,
  CheckCircle2,
  HelpCircle,
  BookOpen,
  RotateCcw,
  Sparkles,
  Save
} from 'lucide-react';
import { 
  AudioSnippet, 
  EffectSettings, 
  VoiceProfile, 
  AudioTrimRange, 
  AudioFadeSettings 
} from './types/voice';
import { defaultEffectSettings, defaultVoiceProfiles } from './data/defaultProfiles';
import { audioEngine } from './audio/audioEngine';
import { audioBufferToWav, audioBufferToMp3, downloadBlob } from './audio/wavEncoder';
import { WaveformEditor } from './components/WaveformEditor';
import { EffectsRack } from './components/EffectsRack';
import { ProfileLibrary } from './components/ProfileLibrary';
import { AudioInputBar } from './components/AudioInputBar';
import { ExportModal } from './components/ExportModal';
import { AudioVisualizer } from './components/AudioVisualizer';
import { SettingInfoModal } from './components/SettingInfoModal';

const PROFILES_STORAGE_KEY = 'toonvoice_profiles_v1';
const SETTINGS_STORAGE_KEY = 'toonvoice_custom_settings_v1';
const PROFILE_NAME_STORAGE_KEY = 'toonvoice_custom_profile_name_v1';

export default function App() {
  // 1. Audio Snippet State
  const [snippet, setSnippet] = useState<AudioSnippet | null>(null);

  // 2. Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // 3. Character Voice Name & Settings
  // Default to NO effects applied (defaultEffectSettings) or restored from localStorage
  const [characterName, setCharacterName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(PROFILE_NAME_STORAGE_KEY);
      if (saved && saved.trim()) return saved.trim();
    } catch {}
    return 'My Character';
  });

  const [settings, setSettings] = useState<EffectSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return { ...defaultEffectSettings, ...parsed };
        }
      }
    } catch {}
    // Clean flat defaults - absolutely NO effects applied
    return defaultEffectSettings;
  });

  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);

  // 4. Voice Profiles Library
  const [profiles, setProfiles] = useState<VoiceProfile[]>(() => {
    try {
      const saved = localStorage.getItem(PROFILES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return defaultVoiceProfiles;
  });

  // 5. Modals & Presets Menu Drawer State
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [infoSettingKey, setInfoSettingKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Save character name to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(PROFILE_NAME_STORAGE_KEY, characterName);
    } catch (e) {
      console.warn('Could not save character name to localStorage', e);
    }
  }, [characterName]);

  // Save active custom settings to localStorage whenever updated
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('Could not save settings to localStorage', e);
    }
  }, [settings]);

  // Save profile library to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
    } catch (e) {
      console.warn('Could not save profiles to localStorage', e);
    }
  }, [profiles]);

  // Load initial procedural cartoon audio phrase on first mount with clean settings
  useEffect(() => {
    try {
      const buffer = audioEngine.createProceduralVoiceLine('hero');
      const newSnippet: AudioSnippet = {
        id: 'initial_sample',
        name: 'Sample Cartoon Take ("Victory!")',
        duration: buffer.duration,
        sampleRate: buffer.sampleRate,
        numberOfChannels: buffer.numberOfChannels,
        audioBuffer: buffer,
        trim: { start: 0, end: buffer.duration },
        fade: { fadeIn: 0.05, fadeOut: 0.1 },
      };
      setSnippet(newSnippet);
    } catch (e) {
      console.warn('Initial procedural audio init', e);
    }
  }, []);

  // Update audio snippet when a file or recording is loaded
  const handleAudioLoaded = (buffer: AudioBuffer, name: string) => {
    audioEngine.stop();
    setIsPlaying(false);
    setCurrentTime(0);

    const newSnippet: AudioSnippet = {
      id: `snippet_${Date.now()}`,
      name,
      duration: buffer.duration,
      sampleRate: buffer.sampleRate,
      numberOfChannels: buffer.numberOfChannels,
      audioBuffer: buffer,
      trim: { start: 0, end: buffer.duration },
      fade: { fadeIn: 0.02, fadeOut: 0.05 },
    };
    setSnippet(newSnippet);
    setToastMessage(`Loaded: "${name}" (${buffer.duration.toFixed(2)}s)`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Sample dialogue selector
  const handleSampleDialogue = (type: 'hero' | 'evil' | 'cute' | 'alien' | 'goofy', title: string) => {
    const buffer = audioEngine.createProceduralVoiceLine(type);
    handleAudioLoaded(buffer, title);
  };

  // Handle Playback Start
  const handlePlay = useCallback(() => {
    if (!snippet || !snippet.audioBuffer) return;

    // Start from current time (or clamp inside trim)
    const startTime = currentTime >= snippet.trim.end || currentTime < snippet.trim.start 
      ? snippet.trim.start 
      : currentTime;

    audioEngine.play(
      snippet.audioBuffer,
      settings,
      snippet.trim,
      snippet.fade,
      startTime,
      isLooping,
      () => {
        setIsPlaying(false);
        setCurrentTime(snippet.trim.start);
      },
      (waveformTime) => {
        setCurrentTime(waveformTime);
      }
    );
    setIsPlaying(true);
  }, [snippet, settings, currentTime, isLooping]);

  // Handle Pause
  const handlePause = useCallback(() => {
    const pauseOffset = audioEngine.pause();
    setIsPlaying(false);
    setCurrentTime(pauseOffset);
  }, []);

  // Handle Stop
  const handleStop = useCallback(() => {
    audioEngine.stop();
    setIsPlaying(false);
    setCurrentTime(snippet?.trim.start || 0);
  }, [snippet]);

  // Seek playhead
  const handleSeek = (time: number) => {
    setCurrentTime(time);
    if (isPlaying && snippet && snippet.audioBuffer) {
      audioEngine.play(
        snippet.audioBuffer,
        settings,
        snippet.trim,
        snippet.fade,
        time,
        isLooping,
        () => {
          setIsPlaying(false);
          setCurrentTime(snippet.trim.start);
        },
        (t) => {
          setCurrentTime(t);
        }
      );
    }
  };

  // Toggle Looping
  const handleToggleLoop = () => {
    const nextLoop = !isLooping;
    setIsLooping(nextLoop);
    if (isPlaying && snippet && snippet.audioBuffer) {
      audioEngine.play(
        snippet.audioBuffer,
        settings,
        snippet.trim,
        snippet.fade,
        currentTime,
        nextLoop,
        () => {
          setIsPlaying(false);
          setCurrentTime(snippet.trim.start);
        },
        (t) => {
          setCurrentTime(t);
        }
      );
    }
  };

  // Update Settings from Effects Rack
  const handleSettingsChange = (newSettings: EffectSettings) => {
    setSettings(newSettings);
    // If playing, restart with new settings smoothly
    if (isPlaying && snippet && snippet.audioBuffer) {
      audioEngine.play(
        snippet.audioBuffer,
        newSettings,
        snippet.trim,
        snippet.fade,
        currentTime,
        isLooping,
        () => {
          setIsPlaying(false);
          setCurrentTime(snippet.trim.start);
        },
        (t) => {
          setCurrentTime(t);
        }
      );
    }
  };

  // Reset to flat default (NO effects applied)
  const handleResetToClean = () => {
    handleSettingsChange(defaultEffectSettings);
    setActiveProfileId(null);
    setToastMessage('Reset to clean voice (No effects applied)');
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Update Trim Range
  const handleUpdateTrim = (newTrim: AudioTrimRange) => {
    if (!snippet) return;
    setSnippet({
      ...snippet,
      trim: newTrim,
    });
    if (currentTime < newTrim.start || currentTime >= newTrim.end) {
      setCurrentTime(newTrim.start);
    }
  };

  // Update Fade
  const handleUpdateFade = (newFade: AudioFadeSettings) => {
    if (!snippet) return;
    setSnippet({
      ...snippet,
      fade: newFade,
    });
  };

  // Crop audio snippet to current selection
  const handleCropToSelection = () => {
    if (!snippet || !snippet.audioBuffer) return;
    const cropped = audioEngine.applyTrimAndFade(snippet.audioBuffer, snippet.trim, snippet.fade);
    audioEngine.stop();
    setIsPlaying(false);
    setCurrentTime(0);

    setSnippet({
      ...snippet,
      audioBuffer: cropped,
      duration: cropped.duration,
      trim: { start: 0, end: cropped.duration },
      fade: { fadeIn: 0, fadeOut: 0 },
    });
    setToastMessage(`Cropped audio buffer to ${cropped.duration.toFixed(2)}s`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Crop & Save Audio (immediately saves & downloads the cropped selection, named after profile)
  const handleSaveCroppedAudio = async () => {
    if (!snippet || !snippet.audioBuffer) return;
    try {
      const croppedBuffer = audioEngine.applyTrimAndFade(snippet.audioBuffer, snippet.trim, snippet.fade);
      
      // Update the active buffer in place
      audioEngine.stop();
      setIsPlaying(false);
      setCurrentTime(0);

      setSnippet({
        ...snippet,
        audioBuffer: croppedBuffer,
        duration: croppedBuffer.duration,
        trim: { start: 0, end: croppedBuffer.duration },
        fade: { fadeIn: 0, fadeOut: 0 },
      });

      // Render with current DSP effects
      const renderedBuffer = await audioEngine.renderOffline(
        croppedBuffer,
        settings,
        { start: 0, end: croppedBuffer.duration },
        { fadeIn: 0, fadeOut: 0 }
      );

      const cleanProfile = (characterName || 'my_character').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      const filename = `${cleanProfile}_cropped_${Date.now().toString().slice(-4)}.wav`;
      
      const wavBlob = audioBufferToWav(renderedBuffer, { bitDepth: 16 });
      downloadBlob(wavBlob, filename);

      setToastMessage(`Saved & downloaded "${filename}"!`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      alert(`Could not save cropped audio: ${(err as Error).message}`);
    }
  };

  // Reset trim to full range
  const handleResetTrim = () => {
    if (!snippet) return;
    setSnippet({
      ...snippet,
      trim: { start: 0, end: snippet.duration },
      fade: { fadeIn: 0.02, fadeOut: 0.05 },
    });
  };

  // Select profile from library
  const handleSelectProfile = (profile: VoiceProfile) => {
    setActiveProfileId(profile.id);
    setCharacterName(profile.name);
    handleSettingsChange(profile.settings);
    setToastMessage(`Loaded profile: "${profile.name}"`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Save current voice to library list
  const handleSaveCurrentAsPreset = () => {
    const newProfile: VoiceProfile = {
      id: `profile_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: characterName.trim() || 'Custom Character',
      characterType: 'Cartoon Character',
      tagline: 'Custom character voice preset',
      emotion: 'custom',
      color: '#f59e0b',
      avatarIcon: '🎭',
      isBuiltIn: false,
      createdAt: Date.now(),
      settings: { ...settings },
    };
    setProfiles((prev) => [newProfile, ...prev]);
    setActiveProfileId(newProfile.id);
    setToastMessage(`Saved "${newProfile.name}" into Voice Profile Library!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Save new profile from library modal
  const handleSaveProfile = (newProfile: VoiceProfile) => {
    setProfiles((prev) => [newProfile, ...prev]);
    setActiveProfileId(newProfile.id);
    setCharacterName(newProfile.name);
    setToastMessage(`Saved new voice preset "${newProfile.name}"!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Delete profile
  const handleDeleteProfile = (id: string) => {
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    if (activeProfileId === id) {
      setActiveProfileId(null);
    }
  };

  // Export full project file (JSON)
  const handleExportProject = () => {
    const projectData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      characterName,
      currentSettings: settings,
      profiles,
    };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], {
      type: 'application/json',
    });
    const cleanProfile = (characterName || 'project').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    downloadBlob(blob, `${cleanProfile}_voice_project_${Date.now().toString().slice(-4)}.json`);
  };

  // Import project file (JSON)
  const handleImportProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        if (data.profiles && Array.isArray(data.profiles)) {
          const builtIns = defaultVoiceProfiles;
          const userImported = data.profiles.filter((p: VoiceProfile) => !p.isBuiltIn);
          const merged = [...userImported, ...builtIns];
          setProfiles(merged);

          if (data.characterName) {
            setCharacterName(data.characterName);
          }
          if (data.currentSettings) {
            handleSettingsChange(data.currentSettings);
          }
          setToastMessage(`Imported ${userImported.length} profiles from project file!`);
          setTimeout(() => setToastMessage(null), 3000);
        } else {
          alert('Invalid project file format.');
        }
      } catch (err) {
        alert('Could not read project JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Keyboard shortcuts (Space = Play/Pause, Esc = Stop, L = Loop)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (isPlaying) {
          handlePause();
        } else {
          handlePlay();
        }
      } else if (e.code === 'Escape') {
        handleStop();
      } else if (e.key === 'l' || e.key === 'L') {
        handleToggleLoop();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, handlePlay, handlePause, handleStop, handleToggleLoop]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs shadow-xl animate-in fade-in slide-from-top-2 duration-150">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation & Studio Header */}
      <header className="border-b border-neutral-800/80 bg-neutral-900/60 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Subtitle */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center text-neutral-950 font-black shadow-lg shadow-amber-500/20 text-lg">
              🎭
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold tracking-tight text-white">
                  ToonVoice FX
                </h1>
                <span className="text-[11px] font-mono text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                  Audio Pitch & FX Editor
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Direct cartoon voice editing, pitch & formant DSP, and MP3/WAV export
              </p>
            </div>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2.5">
            {/* Live Audio Visualizer VU Meter */}
            <AudioVisualizer isPlaying={isPlaying} />

            {/* Voice Setting Guide Button */}
            <button
              onClick={() => setInfoSettingKey('pitchSemitones')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 hover:text-amber-300 border border-neutral-700/80 text-xs font-semibold shadow-sm transition-all"
              title="Open the Setting Guide explaining each control"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Setting Guide</span>
            </button>

            {/* Presets Menu Button (Hidden in Drawer Menu as requested) */}
            <button
              onClick={() => setIsPresetsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 hover:text-white border border-neutral-700/80 text-xs font-semibold shadow-sm transition-all"
              title="Open presets and voice library menu"
            >
              <FolderHeart className="w-3.5 h-3.5 text-amber-400" />
              <span>Presets Library ({profiles.length})</span>
            </button>

            {/* Export Audio Button (WAV or MP3) */}
            <button
              onClick={() => setIsExportOpen(true)}
              disabled={!snippet}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold text-xs shadow-lg shadow-amber-500/25 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              <Download className="w-4 h-4" />
              <span>Export Audio (WAV / MP3)</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Studio Body: Focused purely on editing audio pitch, speed, reverb, and DSP */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Audio Intake Bar (Mic recording, universal audio dropzone including all WMA formats, sample lines) */}
        <AudioInputBar
          onAudioLoaded={handleAudioLoaded}
          onSampleDialogueSelected={handleSampleDialogue}
        />

        {/* Waveform Editor (Scrubbing, Trim handles, In/Out markers, Fades, Crop, and Save Cropped Audio) */}
        <WaveformEditor
          snippet={snippet}
          isPlaying={isPlaying}
          isLooping={isLooping}
          currentTime={currentTime}
          onPlay={handlePlay}
          onPause={handlePause}
          onStop={handleStop}
          onToggleLoop={handleToggleLoop}
          onSeek={handleSeek}
          onUpdateTrim={handleUpdateTrim}
          onUpdateFade={handleUpdateFade}
          onCropToSelection={handleCropToSelection}
          onSaveCroppedAudio={handleSaveCroppedAudio}
          onResetTrim={handleResetTrim}
          onOpenInfo={(key) => setInfoSettingKey(key)}
          playbackSpeed={settings.speed}
        />

        {/* Character Voice Profile Name Bar (Auto-saved to localStorage & used in exports) */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-neutral-900/90 rounded-2xl border border-neutral-800 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Character Profile:
              </span>
              <input
                type="text"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                placeholder="Name your character voice (e.g. Captain Barnacle, Evil Witch)..."
                className="px-3 py-1.5 bg-neutral-950 border border-neutral-750 focus:border-amber-500 rounded-xl text-xs font-bold text-amber-300 w-64 md:w-80 outline-none transition-colors"
              />
            </div>

            <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
              <CheckCircle2 className="w-3 h-3" />
              <span>Saved to Browser</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveCurrentAsPreset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-semibold transition-colors"
              title="Save current custom voice settings as a reusable library preset"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save into Library</span>
            </button>

            <button
              onClick={handleResetToClean}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-400 hover:text-neutral-200 text-xs font-medium transition-colors"
              title="Reset all pitch, speed, and FX to clean flat sound (No effects)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Clean (No FX)</span>
            </button>
          </div>
        </div>

        {/* The Audio Effects Rack (Pitch, Speed, Reverb, Tone, Expression, and Filters) */}
        <EffectsRack
          settings={settings}
          onChange={handleSettingsChange}
          onOpenInfo={(key) => setInfoSettingKey(key)}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800/80 bg-neutral-900/30 py-4 text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span>ToonVoice FX Studio</span>
            <span>·</span>
            <span>Character Voice: <span className="text-neutral-300 font-medium">{characterName}</span></span>
            <span>·</span>
            <span>MP3 & WAV Export</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setInfoSettingKey('pitchSemitones')}
              className="hover:text-amber-400 transition-colors flex items-center gap-1"
            >
              <HelpCircle className="w-3 h-3" />
              <span>Setting Guide</span>
            </button>
            <span>·</span>
            <button
              onClick={() => setIsPresetsOpen(true)}
              className="hover:text-amber-400 transition-colors"
            >
              Presets Library
            </button>
            <span>·</span>
            <button
              onClick={handleExportProject}
              className="hover:text-neutral-300 transition-colors flex items-center gap-1"
            >
              <FileDown className="w-3 h-3" />
              <span>Backup Project File</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Slide-Over Menu: Character Voice Presets & Library Drawer */}
      <ProfileLibrary
        isOpen={isPresetsOpen}
        onClose={() => setIsPresetsOpen(false)}
        profiles={profiles}
        activeProfileId={activeProfileId}
        currentSettings={settings}
        onSelectProfile={handleSelectProfile}
        onSaveProfile={handleSaveProfile}
        onDeleteProfile={handleDeleteProfile}
        onExportProject={handleExportProject}
        onImportProject={handleImportProject}
      />

      {/* Audio Export Modal (WAV or MP3) */}
      {isExportOpen && (
        <ExportModal
          snippet={snippet}
          settings={settings}
          activeProfileName={characterName}
          onClose={() => setIsExportOpen(false)}
        />
      )}

      {/* Setting Information Modal (Clear & Direct Character Voice Guide) */}
      <SettingInfoModal
        settingKey={infoSettingKey}
        onClose={() => setInfoSettingKey(null)}
        onSelectSetting={(key) => setInfoSettingKey(key)}
      />
    </div>
  );
}
