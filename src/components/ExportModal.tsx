import React, { useState } from 'react';
import { Download, X, Check } from 'lucide-react';
import { AudioSnippet, EffectSettings } from '../types/voice';
import { audioEngine } from '../audio/audioEngine';
import { audioBufferToWav, audioBufferToMp3, downloadBlob } from '../audio/wavEncoder';

interface ExportModalProps {
  snippet: AudioSnippet | null;
  settings: EffectSettings;
  activeProfileName: string;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  snippet,
  settings,
  activeProfileName,
  onClose,
}) => {
  const [format, setFormat] = useState<'mp3' | 'wav16' | 'wav24'>('mp3');
  const [exportRange, setExportRange] = useState<'trimmed' | 'full'>('trimmed');
  const [filename, setFilename] = useState(() => {
    const cleanProfile = (activeProfileName || 'my_character').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    return `${cleanProfile}_take_${Date.now().toString().slice(-4)}`;
  });
  const [isRendering, setIsRendering] = useState(false);
  const [renderSuccess, setRenderSuccess] = useState(false);

  if (!snippet || !snippet.audioBuffer) return null;

  const handleExport = async () => {
    setIsRendering(true);
    setRenderSuccess(false);

    if (!snippet || !snippet.audioBuffer) return;

    try {
      const bufferToRender = snippet.audioBuffer;
      const trimRange =
        exportRange === 'trimmed'
          ? snippet.trim
          : { start: 0, end: snippet.duration };

      const fadeSettings =
        exportRange === 'trimmed'
          ? snippet.fade
          : { fadeIn: 0, fadeOut: 0 };

      // High-precision offline rendering with bit-accurate DSP effects
      const renderedBuffer = await audioEngine.renderOffline(
        bufferToRender,
        settings,
        trimRange,
        fadeSettings
      );

      const baseName = filename.trim() || 'cartoon_voice';

      if (format === 'mp3') {
        const mp3Blob = await audioBufferToMp3(renderedBuffer, `${baseName}.mp3`);
        downloadBlob(mp3Blob, `${baseName}.mp3`);
      } else {
        const bitDepth = format === 'wav24' ? 24 : 16;
        const wavBlob = audioBufferToWav(renderedBuffer, { bitDepth });
        downloadBlob(wavBlob, `${baseName}.wav`);
      }

      setRenderSuccess(true);
      setTimeout(() => {
        setIsRendering(false);
      }, 800);
    } catch (err) {
      alert(`Export failed: ${(err as Error).message}`);
      setIsRendering(false);
    }
  };

  const trimDuration = snippet.trim.end - snippet.trim.start;
  const durationToExport = exportRange === 'trimmed' ? trimDuration : snippet.duration;
  const estimatedRenderDuration = durationToExport / (settings.speed || 1.0);
  const fileExt = format === 'mp3' ? '.mp3' : '.wav';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-100">Export Character Audio</h3>
              <p className="text-xs text-neutral-400">
                Voice Profile: <span className="text-amber-400 font-semibold">{activeProfileName || 'My Character'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Export Form */}
        <div className="flex flex-col gap-4 text-xs">
          {/* Filename Input */}
          <div>
            <label className="block text-neutral-300 font-medium mb-1.5">File Name</label>
            <div className="flex items-center">
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-l-xl text-neutral-100 font-mono focus:outline-none focus:border-amber-500"
              />
              <span className="px-3 py-2 bg-neutral-800 border-y border-r border-neutral-800 rounded-r-xl font-mono text-neutral-400">
                {fileExt}
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              File name includes your character voice profile prefix for easy organization.
            </p>
          </div>

          {/* Format Selection (MP3 vs WAV) */}
          <div>
            <label className="block text-neutral-300 font-medium mb-1.5">Audio Format</label>
            <div className="grid grid-cols-3 gap-2">
              {/* MP3 Option */}
              <button
                type="button"
                onClick={() => setFormat('mp3')}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  format === 'mp3'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-200'
                    : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-neutral-200">
                  <span>MP3 (320k)</span>
                  {format === 'mp3' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                </div>
                <span className="text-[10px] text-neutral-400">
                  High-bitrate LAME. Compact, ideal for games and web.
                </span>
              </button>

              {/* WAV 16-Bit Option */}
              <button
                type="button"
                onClick={() => setFormat('wav16')}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  format === 'wav16'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-200'
                    : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-neutral-200">
                  <span>WAV 16-Bit</span>
                  {format === 'wav16' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                </div>
                <span className="text-[10px] text-neutral-400">
                  Uncompressed PCM. Broadcast standard for video editors.
                </span>
              </button>

              {/* WAV 24-Bit Option */}
              <button
                type="button"
                onClick={() => setFormat('wav24')}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  format === 'wav24'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-200'
                    : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-neutral-200">
                  <span>WAV 24-Bit</span>
                  {format === 'wav24' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                </div>
                <span className="text-[10px] text-neutral-400">
                  Studio master PCM. Maximum dynamic range headroom.
                </span>
              </button>
            </div>
          </div>

          {/* Range Selection */}
          <div>
            <label className="block text-neutral-300 font-medium mb-1.5">Export Duration Range</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setExportRange('trimmed')}
                className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                  exportRange === 'trimmed'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                    : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div>
                  <div className="font-semibold text-neutral-200">Active Trimmed Region</div>
                  <div className="text-[11px] text-neutral-500 font-mono">
                    {trimDuration.toFixed(2)}s (with fades applied)
                  </div>
                </div>
                {exportRange === 'trimmed' && <Check className="w-3.5 h-3.5 text-amber-400" />}
              </button>

              <button
                type="button"
                onClick={() => setExportRange('full')}
                className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                  exportRange === 'full'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                    : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div>
                  <div className="font-semibold text-neutral-200">Full Audio Take</div>
                  <div className="text-[11px] text-neutral-500 font-mono">
                    {snippet.duration.toFixed(2)}s (entire file)
                  </div>
                </div>
                {exportRange === 'full' && <Check className="w-3.5 h-3.5 text-amber-400" />}
              </button>
            </div>
          </div>

          {/* Render specs info */}
          <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800/80 flex flex-col gap-1 text-[11px] font-mono text-neutral-400">
            <div className="flex justify-between">
              <span>Sample Rate:</span>
              <span className="text-neutral-200">44.1 kHz</span>
            </div>
            <div className="flex justify-between">
              <span>Format:</span>
              <span className="text-amber-400 font-semibold">{format.toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span>Estimated Rendered Length:</span>
              <span className="text-neutral-200">~{estimatedRenderDuration.toFixed(2)}s</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isRendering}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={isRendering}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold shadow-lg shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {isRendering ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                  <span>Rendering {format.toUpperCase()}...</span>
                </>
              ) : renderSuccess ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download {format.toUpperCase()}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
