import React, { useEffect } from 'react';
import { X, HelpCircle, ChevronLeft, ChevronRight, Sparkles, Sliders, BookOpen, Layers } from 'lucide-react';
import { SETTING_INFO_MAP, SettingInfo } from '../data/settingDescriptions';

interface SettingInfoModalProps {
  settingKey: string | null;
  onClose: () => void;
  onSelectSetting: (key: string) => void;
}

export const SettingInfoModal: React.FC<SettingInfoModalProps> = ({
  settingKey,
  onClose,
  onSelectSetting,
}) => {
  const settingKeys = Object.keys(SETTING_INFO_MAP);
  const currentIndex = settingKey ? settingKeys.indexOf(settingKey) : 0;
  const currentKey = settingKey && SETTING_INFO_MAP[settingKey] ? settingKey : settingKeys[0];
  const info: SettingInfo = SETTING_INFO_MAP[currentKey];

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        const nextIndex = (currentIndex + 1) % settingKeys.length;
        onSelectSetting(settingKeys[nextIndex]);
      } else if (e.key === 'ArrowLeft') {
        const prevIndex = (currentIndex - 1 + settingKeys.length) % settingKeys.length;
        onSelectSetting(settingKeys[prevIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, settingKeys, onClose, onSelectSetting]);

  if (!settingKey) return null;

  const handlePrev = () => {
    const prevIndex = (currentIndex - 1 + settingKeys.length) % settingKeys.length;
    onSelectSetting(settingKeys[prevIndex]);
  };

  const handleNext = () => {
    const nextIndex = (currentIndex + 1) % settingKeys.length;
    onSelectSetting(settingKeys[nextIndex]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-semibold">
                  {info.category}
                </span>
                <span className="text-neutral-600">·</span>
                <span className="text-xs text-neutral-400">
                  Setting {currentIndex + 1} of {settingKeys.length}
                </span>
              </div>
              <h3 className="text-base font-bold text-neutral-100">{info.title}</h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrev}
              title="Previous setting (Left arrow)"
              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              title="Next setting (Right arrow)"
              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="w-px h-4 bg-neutral-800 mx-1" />
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
              title="Close modal (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 text-neutral-300 text-xs leading-relaxed">
          {/* Easy-to-understand explanation */}
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80">
            <p className="text-neutral-100 text-sm leading-relaxed">
              {info.plainEnglishSummary}
            </p>
          </div>

          {/* Animation & Character Voice Context */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400/90 mb-2 flex items-center gap-1.5">
              <span>🎭</span> How This Affects Cartoon Characters:
            </h4>
            <p className="text-neutral-300 bg-neutral-900/60 p-3.5 rounded-xl border border-neutral-800/60">
              {info.animationUseCases}
            </p>
          </div>

          {/* Character Archetype Examples */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400/90 mb-2 flex items-center gap-1.5">
              <span>🎙️</span> Cartoon Archetype Examples:
            </h4>
            <ul className="flex flex-col gap-2">
              {info.characterExamples.map((ex, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 p-2.5 rounded-lg bg-neutral-950/70 border border-neutral-800/50 text-neutral-200"
                >
                  <span className="text-cyan-400 font-mono text-[11px] mt-0.5">•</span>
                  <span>{ex}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Repeatability & Voice Profile Tip */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-neutral-900 to-amber-500/5 border border-amber-500/30">
            <h4 className="text-xs font-bold text-amber-300 mb-1 flex items-center gap-1.5">
              <span>⭐</span> Consistency & Repeatability Tip:
            </h4>
            <p className="text-neutral-300">
              {info.repeatabilityTip}
            </p>
            {info.recommendedRange && (
              <div className="mt-2 pt-2 border-t border-amber-500/20 text-[11px] font-mono text-amber-400/90">
                Typical Range: {info.recommendedRange}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer: Quick Jumper */}
        <div className="px-6 py-3 border-t border-neutral-800 bg-neutral-950 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-neutral-500">Jump to setting:</span>
            <select
              value={currentKey}
              onChange={(e) => onSelectSetting(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 text-neutral-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-amber-500"
            >
              {settingKeys.map((k) => (
                <option key={k} value={k}>
                  {SETTING_INFO_MAP[k].title}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium transition-colors"
          >
            Got it, Back to Studio
          </button>
        </div>
      </div>
    </div>
  );
};
