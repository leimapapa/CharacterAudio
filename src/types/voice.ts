export type PitchMode = 'granular' | 'varispeed';

export type ReverbType = 'none' | 'room' | 'hall' | 'cave' | 'tin_can' | 'cathedral' | 'cosmic';

export interface EffectSettings {
  // Pitch & Speed
  pitchSemitones: number; // -24 to +24
  pitchFineCents: number; // -100 to +100
  pitchMode: PitchMode;   // granular (preserves speed) or varispeed (classic tape)
  speed: number;          // 0.3x to 2.5x

  // Tone & Formant
  formantShift: number;   // -12 to +12 semitones simulated formant filter
  lowGain: number;        // -15 to +15 dB
  midGain: number;        // -15 to +15 dB
  highGain: number;       // -15 to +15 dB
  filterCutoff: number;   // 200 to 18000 Hz
  filterType: 'none' | 'lowpass' | 'highpass' | 'bandpass';

  // Character & Emotion Modulations
  vibratoRate: number;    // 0 to 15 Hz (nervous waver)
  vibratoDepth: number;   // 0 to 100%
  robotizeMix: number;    // 0 to 100% (ring modulator carrier)
  robotizeFreq: number;   // 30 to 400 Hz
  saturation: number;     // 0 to 100% (warmth / villain growl)
  chorusMix: number;      // 0 to 100% (fairy / army / doubler)

  // Spatial & Atmosphere
  reverbMix: number;      // 0 to 100%
  reverbType: ReverbType;
  delayMix: number;       // 0 to 100%
  delayTime: number;      // 0.05 to 0.8 seconds
  delayFeedback: number;  // 0 to 80%

  // Master output
  outputGain: number;     // 0 to 2.0 (volume boost/cut)
}

export type EmotionType = 
  | 'custom'
  | 'excited'
  | 'villain'
  | 'terrified'
  | 'cute'
  | 'robotic'
  | 'heroic'
  | 'gloomy'
  | 'spooky'
  | 'alien';

export interface VoiceProfile {
  id: string;
  name: string;
  characterType: string;
  tagline: string;
  emotion: EmotionType;
  color: string;
  avatarIcon: string;
  isBuiltIn?: boolean;
  createdAt: number;
  settings: EffectSettings;
}

export interface AudioTrimRange {
  start: number; // in seconds
  end: number;   // in seconds
}

export interface AudioFadeSettings {
  fadeIn: number;  // in seconds
  fadeOut: number; // in seconds
}

export interface AudioSnippet {
  id: string;
  name: string;
  duration: number;
  sampleRate: number;
  numberOfChannels: number;
  audioBuffer: AudioBuffer | null;
  trim: AudioTrimRange;
  fade: AudioFadeSettings;
  blobUrl?: string;
  format?: string;
  fileSize?: number;
}
