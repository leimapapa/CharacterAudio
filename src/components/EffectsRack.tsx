import React from 'react';
import { 
  Sliders, 
  Activity, 
  Volume2, 
  RotateCcw,
  Zap,
  Radio,
  Ghost,
  Bot,
  Flame,
  Music2,
  HelpCircle
} from 'lucide-react';
import { EffectSettings, ReverbType } from '../types/voice';
import { defaultEffectSettings } from '../data/defaultProfiles';
import { SETTING_INFO_MAP } from '../data/settingDescriptions';

interface EffectsRackProps {
  settings: EffectSettings;
  onChange: (settings: EffectSettings) => void;
  onOpenInfo: (settingKey: string) => void;
}

export const EffectsRack: React.FC<EffectsRackProps> = ({
  settings,
  onChange,
  onOpenInfo,
}) => {
  const updateSetting = <K extends keyof EffectSettings>(key: K, value: EffectSettings[K]) => {
    onChange({
      ...settings,
      [key]: value,
    });
  };

  const handleReset = () => {
    onChange({ ...defaultEffectSettings });
  };

  const InfoBtn = ({ settingKey, title }: { settingKey: string; title?: string }) => {
    const info = SETTING_INFO_MAP[settingKey];
    const summary = info?.plainEnglishSummary || title || 'Click for character voice setting details';

    return (
      <span className="relative inline-flex items-center group">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenInfo(settingKey);
          }}
          className="text-neutral-500 hover:text-amber-400 p-0.5 rounded transition-colors inline-flex items-center ml-1 focus:outline-none"
          title={`${info?.title ? info.title + ': ' : ''}${summary}`}
          aria-label={info?.title || settingKey}
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>

        {/* Hover popover tooltip showing the explanation */}
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-neutral-900 text-neutral-200 text-xs leading-relaxed rounded-xl shadow-2xl border border-neutral-700/90 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 invisible group-hover:visible font-normal text-left"
        >
          <span className="block font-bold text-amber-300 text-[11px] mb-1 border-b border-neutral-800 pb-1">
            {info?.title || settingKey}
          </span>
          <span className="block text-neutral-300 text-[11px] leading-snug">
            {summary}
          </span>
          <span className="block text-[10px] text-amber-400/80 font-mono mt-1.5 pt-1 border-t border-neutral-800/80">
            Click to open character voice guide ↗
          </span>
          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-neutral-900" />
        </span>
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Top Bar: Clean Audio Controls Header & Quick Reset */}
      <div className="flex items-center justify-between p-3 bg-neutral-900/90 rounded-2xl border border-neutral-800">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-amber-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-200">
            Audio Effects Rack & Tone Shaper
          </h2>
        </div>

        <button
          onClick={handleReset}
          title="Reset all effects to flat default"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-neutral-400 hover:text-neutral-100 bg-neutral-800/80 hover:bg-neutral-800 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Rack to Default</span>
        </button>
      </div>

      {/* Grid of Main Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* MODULE 1: Pitch & Speed (The Core Cartoon Engine) */}
        <div className="flex flex-col gap-4 p-4 bg-neutral-900/90 rounded-2xl border border-neutral-800 relative">
          <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2.5">
            <div className="flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-neutral-100 tracking-wide">Pitch & Speed</h3>
              <InfoBtn settingKey="pitchSemitones" title="Learn about Pitch & Speed" />
            </div>

            {/* Independent Pitch & Speed Engine Badge */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-neutral-950 border border-neutral-800 text-[11px] font-mono text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Independent Pitch & Speed</span>
            </div>
          </div>

          {/* Pitch Semitones */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center">
                <span className="font-medium text-neutral-300">Pitch Shift</span>
                <InfoBtn settingKey="pitchSemitones" />
              </div>
              <div className="flex items-center gap-1 font-mono text-amber-400 font-bold">
                <span>{settings.pitchSemitones > 0 ? `+${settings.pitchSemitones}` : settings.pitchSemitones}</span>
                <span className="text-[10px] text-neutral-500">ST</span>
              </div>
            </div>
            <input
              type="range"
              min="-24"
              max="24"
              step="1"
              value={settings.pitchSemitones}
              onChange={(e) => updateSetting('pitchSemitones', parseInt(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            {/* Quick Pitch step buttons */}
            <div className="flex items-center justify-between text-[10px] gap-1 pt-0.5">
              <button
                onClick={() => updateSetting('pitchSemitones', -12)}
                className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200"
              >
                -12 (Ogre)
              </button>
              <button
                onClick={() => updateSetting('pitchSemitones', -5)}
                className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200"
              >
                -5
              </button>
              <button
                onClick={() => updateSetting('pitchSemitones', 0)}
                className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200"
              >
                0 (Normal)
              </button>
              <button
                onClick={() => updateSetting('pitchSemitones', 7)}
                className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200"
              >
                +7
              </button>
              <button
                onClick={() => updateSetting('pitchSemitones', 12)}
                className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200"
              >
                +12 (Squeak)
              </button>
            </div>
          </div>

          {/* Fine Tuning Cents */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center">
                <span className="text-neutral-400">Fine Tune Detune</span>
                <InfoBtn settingKey="pitchFineCents" />
              </div>
              <span className="font-mono text-neutral-400">{settings.pitchFineCents} cents</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              step="5"
              value={settings.pitchFineCents}
              onChange={(e) => updateSetting('pitchFineCents', parseInt(e.target.value))}
              className="w-full accent-amber-500/70 cursor-pointer"
            />
          </div>

          {/* Speed / Tempo */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center">
                <span className="font-medium text-neutral-300">Playback Speed</span>
                <InfoBtn settingKey="speed" />
              </div>
              <span className="font-mono text-amber-400 font-bold">{settings.speed.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.3"
              max="2.5"
              step="0.05"
              value={settings.speed}
              onChange={(e) => updateSetting('speed', parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            {/* Speed shortcut tags */}
            <div className="flex items-center justify-between text-[10px] gap-1 pt-0.5">
              <button
                onClick={() => updateSetting('speed', 0.6)}
                className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400"
              >
                0.6x Slow
              </button>
              <button
                onClick={() => updateSetting('speed', 1.0)}
                className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400"
              >
                1.0x Normal
              </button>
              <button
                onClick={() => updateSetting('speed', 1.3)}
                className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400"
              >
                1.3x Fast
              </button>
              <button
                onClick={() => updateSetting('speed', 2.0)}
                className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400"
              >
                2.0x Double
              </button>
            </div>
          </div>
        </div>

        {/* MODULE 2: Spatial Atmosphere (Reverb & Echo Delay) */}
        <div className="flex flex-col gap-4 p-4 bg-neutral-900/90 rounded-2xl border border-neutral-800">
          <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2.5">
            <div className="flex items-center gap-1.5">
              <Ghost className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-neutral-100 tracking-wide">Reverb & Space</h3>
              <InfoBtn settingKey="reverbType" />
            </div>
            <span className="text-[10px] font-mono text-cyan-400/90">Impulse Convolver</span>
          </div>

          {/* Reverb Type Selector */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="text-neutral-400">Environment Chamber</label>
              <InfoBtn settingKey="reverbType" />
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              {[
                { id: 'none', label: 'Dry / Off' },
                { id: 'room', label: 'Small Room' },
                { id: 'hall', label: 'Concert Hall' },
                { id: 'cave', label: 'Echo Cave' },
                { id: 'tin_can', label: 'Tin Can' },
                { id: 'cathedral', label: 'Cathedral' },
              ].map((rev) => {
                const isActive = settings.reverbType === rev.id;
                return (
                  <button
                    key={rev.id}
                    onClick={() => {
                      updateSetting('reverbType', rev.id as ReverbType);
                      if (rev.id !== 'none' && settings.reverbMix === 0) {
                        updateSetting('reverbMix', 30);
                      }
                    }}
                    className={`py-1.5 px-2 rounded-xl text-center text-xs font-medium border transition-colors ${
                      isActive
                        ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300'
                        : 'bg-neutral-800/70 border-neutral-700/50 text-neutral-300 hover:bg-neutral-750'
                    }`}
                  >
                    {rev.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reverb Mix */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center">
                <span className="text-neutral-300">Reverb Wet Mix</span>
                <InfoBtn settingKey="reverbMix" />
              </div>
              <span className="font-mono text-cyan-400 font-bold">{settings.reverbMix}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.reverbMix}
              onChange={(e) => updateSetting('reverbMix', parseInt(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          {/* Echo / Delay */}
          <div className="flex flex-col gap-1.5 pt-1 border-t border-neutral-800/60">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center">
                <span className="text-neutral-300">Echo Delay Mix</span>
                <InfoBtn settingKey="delayMix" />
              </div>
              <span className="font-mono text-cyan-400">{settings.delayMix}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="80"
              value={settings.delayMix}
              onChange={(e) => updateSetting('delayMix', parseInt(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            {settings.delayMix > 0 && (
              <div className="flex items-center gap-3 text-[11px] text-neutral-400 pt-1">
                <span className="text-neutral-500 flex items-center">
                  Delay Time:
                  <InfoBtn settingKey="delayTime" />
                </span>
                <input
                  type="range"
                  min="0.05"
                  max="0.8"
                  step="0.02"
                  value={settings.delayTime}
                  onChange={(e) => updateSetting('delayTime', parseFloat(e.target.value))}
                  className="flex-1 accent-cyan-400 cursor-pointer"
                />
                <span className="font-mono text-neutral-300">{(settings.delayTime * 1000).toFixed(0)}ms</span>
              </div>
            )}
          </div>
        </div>

        {/* MODULE 3: Cartoon Emotion & Character Modulations */}
        <div className="flex flex-col gap-4 p-4 bg-neutral-900/90 rounded-2xl border border-neutral-800">
          <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2.5">
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-neutral-100 tracking-wide">Expression & FX</h3>
              <InfoBtn settingKey="vibratoDepth" />
            </div>
            <span className="text-[10px] font-mono text-emerald-400/90">Modulators</span>
          </div>

          {/* Vibrato / Nervous Tremble */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center">
                <span className="text-neutral-300">Tremble Vibrato (Nervous / Flutter)</span>
                <InfoBtn settingKey="vibratoDepth" />
              </div>
              <span className="font-mono text-emerald-400 font-bold">{settings.vibratoDepth}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.vibratoDepth}
              onChange={(e) => {
                const depth = parseInt(e.target.value);
                updateSetting('vibratoDepth', depth);
                if (depth > 0 && settings.vibratoRate === 0) {
                  updateSetting('vibratoRate', 6.0);
                }
              }}
              className="w-full accent-emerald-400 cursor-pointer"
            />
            {settings.vibratoDepth > 0 && (
              <div className="flex items-center justify-between text-[11px] text-neutral-400">
                <span className="text-neutral-500 flex items-center">
                  Wobble Speed:
                  <InfoBtn settingKey="vibratoRate" />
                </span>
                <input
                  type="range"
                  min="1"
                  max="14"
                  step="0.5"
                  value={settings.vibratoRate}
                  onChange={(e) => updateSetting('vibratoRate', parseFloat(e.target.value))}
                  className="w-32 accent-emerald-400 cursor-pointer"
                />
                <span className="font-mono text-neutral-300">{settings.vibratoRate} Hz</span>
              </div>
            )}
          </div>

          {/* Robot Ring Modulator */}
          <div className="flex flex-col gap-1.5 pt-1 border-t border-neutral-800/60">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-neutral-300">Robot / Ring Modulator</span>
                <InfoBtn settingKey="robotizeMix" />
              </div>
              <span className="font-mono text-cyan-400 font-bold">{settings.robotizeMix}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.robotizeMix}
              onChange={(e) => updateSetting('robotizeMix', parseInt(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            {settings.robotizeMix > 0 && (
              <div className="flex items-center justify-between text-[11px] text-neutral-400">
                <span className="text-neutral-500 flex items-center">
                  Carrier Freq:
                  <InfoBtn settingKey="robotizeFreq" />
                </span>
                <input
                  type="range"
                  min="30"
                  max="320"
                  step="5"
                  value={settings.robotizeFreq}
                  onChange={(e) => updateSetting('robotizeFreq', parseInt(e.target.value))}
                  className="w-32 accent-cyan-400 cursor-pointer"
                />
                <span className="font-mono text-neutral-300">{settings.robotizeFreq} Hz</span>
              </div>
            )}
          </div>

          {/* Villain Growl Saturation */}
          <div className="flex flex-col gap-1.5 pt-1 border-t border-neutral-800/60">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-red-400" />
                <span className="text-neutral-300">Villain Growl Overdrive</span>
                <InfoBtn settingKey="saturation" />
              </div>
              <span className="font-mono text-red-400 font-bold">{settings.saturation}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.saturation}
              onChange={(e) => updateSetting('saturation', parseInt(e.target.value))}
              className="w-full accent-red-400 cursor-pointer"
            />
          </div>

          {/* Chorus Doubler */}
          <div className="flex flex-col gap-1.5 pt-1 border-t border-neutral-800/60">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-1.5">
                <Music2 className="w-3.5 h-3.5 text-pink-400" />
                <span className="text-neutral-300">Fairy Chorus / Doubler</span>
                <InfoBtn settingKey="chorusMix" />
              </div>
              <span className="font-mono text-pink-400 font-bold">{settings.chorusMix}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.chorusMix}
              onChange={(e) => updateSetting('chorusMix', parseInt(e.target.value))}
              className="w-full accent-pink-400 cursor-pointer"
            />
          </div>
        </div>

        {/* MODULE 4: Tone, Formant & Equalization */}
        <div className="flex flex-col gap-4 p-4 bg-neutral-900/90 rounded-2xl border border-neutral-800">
          <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2.5">
            <div className="flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-violet-400" />
              <h3 className="text-sm font-bold text-neutral-100 tracking-wide">Tone & Formant</h3>
              <InfoBtn settingKey="formantShift" />
            </div>
            <span className="text-[10px] font-mono text-violet-400/90">3-Band EQ</span>
          </div>

          {/* Formant Shift */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center">
                <span className="text-neutral-300">Formant (Throat Size)</span>
                <InfoBtn settingKey="formantShift" />
              </div>
              <span className="font-mono text-violet-400 font-bold">
                {settings.formantShift > 0 ? `+${settings.formantShift}` : settings.formantShift}
              </span>
            </div>
            <input
              type="range"
              min="-12"
              max="12"
              step="1"
              value={settings.formantShift}
              onChange={(e) => updateSetting('formantShift', parseInt(e.target.value))}
              className="w-full accent-violet-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-neutral-500">
              <span>Deep Monster</span>
              <span>Natural</span>
              <span>Tiny Creature</span>
            </div>
          </div>

          {/* 3-Band EQ Faders */}
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-neutral-800/60 text-center">
            {/* Low Rumble */}
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center text-[11px] text-neutral-400">
                <span>Low Bass</span>
                <InfoBtn settingKey="lowGain" />
              </div>
              <input
                type="range"
                min="-15"
                max="15"
                step="0.5"
                value={settings.lowGain}
                onChange={(e) => updateSetting('lowGain', parseFloat(e.target.value))}
                className="w-full accent-violet-400 cursor-pointer"
              />
              <span className="text-[10px] font-mono text-neutral-400">
                {settings.lowGain > 0 ? `+${settings.lowGain}` : settings.lowGain} dB
              </span>
            </div>

            {/* Mid Presence */}
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center text-[11px] text-neutral-400">
                <span>Mid Body</span>
                <InfoBtn settingKey="midGain" />
              </div>
              <input
                type="range"
                min="-15"
                max="15"
                step="0.5"
                value={settings.midGain}
                onChange={(e) => updateSetting('midGain', parseFloat(e.target.value))}
                className="w-full accent-violet-400 cursor-pointer"
              />
              <span className="text-[10px] font-mono text-neutral-400">
                {settings.midGain > 0 ? `+${settings.midGain}` : settings.midGain} dB
              </span>
            </div>

            {/* High Sizzle */}
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center text-[11px] text-neutral-400">
                <span>High Air</span>
                <InfoBtn settingKey="highGain" />
              </div>
              <input
                type="range"
                min="-15"
                max="15"
                step="0.5"
                value={settings.highGain}
                onChange={(e) => updateSetting('highGain', parseFloat(e.target.value))}
                className="w-full accent-violet-400 cursor-pointer"
              />
              <span className="text-[10px] font-mono text-neutral-400">
                {settings.highGain > 0 ? `+${settings.highGain}` : settings.highGain} dB
              </span>
            </div>
          </div>
        </div>

        {/* MODULE 5: Character Radio / Telephone Filter */}
        <div className="flex flex-col gap-4 p-4 bg-neutral-900/90 rounded-2xl border border-neutral-800">
          <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2.5">
            <div className="flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-orange-400" />
              <h3 className="text-sm font-bold text-neutral-100 tracking-wide">Speaker & Filter</h3>
              <InfoBtn settingKey="filterType" />
            </div>
            <span className="text-[10px] font-mono text-orange-400/90">Acoustic Shaper</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="text-neutral-400">Filter Characteristic</label>
              <InfoBtn settingKey="filterType" />
            </div>
            <div className="grid grid-cols-4 gap-1 text-xs">
              {[
                { id: 'none', label: 'Clean' },
                { id: 'bandpass', label: 'Walkie' },
                { id: 'lowpass', label: 'Muffled' },
                { id: 'highpass', label: 'Thin' },
              ].map((f) => {
                const isActive = settings.filterType === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => {
                      updateSetting('filterType', f.id as 'none' | 'lowpass' | 'highpass' | 'bandpass');
                      if (f.id === 'bandpass') updateSetting('filterCutoff', 1800);
                      if (f.id === 'lowpass') updateSetting('filterCutoff', 1200);
                      if (f.id === 'highpass') updateSetting('filterCutoff', 1500);
                    }}
                    className={`py-1.5 px-1 rounded-xl text-center font-medium border text-xs transition-colors ${
                      isActive
                        ? 'bg-orange-500/20 border-orange-500/60 text-orange-300'
                        : 'bg-neutral-800/70 border-neutral-700/50 text-neutral-300 hover:bg-neutral-750'
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {settings.filterType !== 'none' && (
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center">
                  <span className="text-neutral-300">Cutoff Frequency</span>
                  <InfoBtn settingKey="filterCutoff" />
                </div>
                <span className="font-mono text-orange-400">{settings.filterCutoff} Hz</span>
              </div>
              <input
                type="range"
                min="300"
                max="8000"
                step="50"
                value={settings.filterCutoff}
                onChange={(e) => updateSetting('filterCutoff', parseInt(e.target.value))}
                className="w-full accent-orange-400 cursor-pointer"
              />
            </div>
          )}

          {/* Master Output Gain */}
          <div className="flex flex-col gap-1.5 pt-2 border-t border-neutral-800/60">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-neutral-300" />
                <span className="text-neutral-200 font-medium">Master Level</span>
                <InfoBtn settingKey="outputGain" />
              </div>
              <span className="font-mono text-amber-400 font-bold">{Math.round(settings.outputGain * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="2.0"
              step="0.05"
              value={settings.outputGain}
              onChange={(e) => updateSetting('outputGain', parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
        </div>

      </div>
    </div>
  );
};
