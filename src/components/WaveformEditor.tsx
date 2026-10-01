import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, Square, Repeat, Scissors, RotateCcw, ZoomIn, ZoomOut, Maximize2, Save, HelpCircle } from 'lucide-react';
import { AudioSnippet, AudioTrimRange, AudioFadeSettings } from '../types/voice';
import { SETTING_INFO_MAP } from '../data/settingDescriptions';

interface WaveformEditorProps {
  snippet: AudioSnippet | null;
  isPlaying: boolean;
  isLooping: boolean;
  currentTime: number;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onToggleLoop: () => void;
  onSeek: (time: number) => void;
  onUpdateTrim: (trim: AudioTrimRange) => void;
  onUpdateFade: (fade: AudioFadeSettings) => void;
  onCropToSelection: () => void;
  onSaveCroppedAudio: () => void;
  onResetTrim: () => void;
  onOpenInfo?: (settingKey: string) => void;
  playbackSpeed?: number;
}

export const WaveformEditor: React.FC<WaveformEditorProps> = ({
  snippet,
  isPlaying,
  isLooping,
  currentTime,
  onPlay,
  onPause,
  onStop,
  onToggleLoop,
  onSeek,
  onUpdateTrim,
  onUpdateFade,
  onCropToSelection,
  onSaveCroppedAudio,
  onResetTrim,
  onOpenInfo,
  playbackSpeed = 1.0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [zoom, setZoom] = useState<number>(1);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [draggingHandle, setDraggingHandle] = useState<'start' | 'end' | null>(null);
  const [hoveredTime, setHoveredTime] = useState<number | null>(null);

  // Peak cache
  const peaksRef = useRef<number[]>([]);

  // Calculate audio peaks once when snippet buffer changes
  useEffect(() => {
    if (!snippet || !snippet.audioBuffer) {
      peaksRef.current = [];
      return;
    }

    const buffer = snippet.audioBuffer;
    const channelData = buffer.getChannelData(0);
    const numPoints = 800; // Resolution for rendering
    const step = Math.ceil(channelData.length / numPoints);
    const peaks: number[] = [];

    for (let i = 0; i < numPoints; i++) {
      let max = 0;
      const start = i * step;
      const end = Math.min(start + step, channelData.length);
      for (let j = start; j < end; j++) {
        const val = Math.abs(channelData[j]);
        if (val > max) max = val;
      }
      peaks.push(max);
    }

    peaksRef.current = peaks;
  }, [snippet?.audioBuffer]);

  // Format time in mm:ss.ms
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  // Redraw canvas
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !snippet || !snippet.audioBuffer) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const duration = snippet.duration;
    const trim = snippet.trim;
    const fade = snippet.fade;

    ctx.clearRect(0, 0, width, height);

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#0c0f17');
    bgGrad.addColorStop(1, '#07090e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Draw grid lines
    ctx.strokeStyle = '#1e2638';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);

    // Centerline
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Time markings
    const timeStep = duration > 10 ? 2 : duration > 4 ? 1 : 0.5;
    ctx.fillStyle = '#64748b';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';

    for (let t = 0; t <= duration; t += timeStep) {
      const x = (t / duration) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      ctx.fillText(`${t.toFixed(1)}s`, x + 3, 12);
    }
    ctx.setLineDash([]);

    // Calculate Trim positions
    const trimStartX = (trim.start / duration) * width;
    const trimEndX = (trim.end / duration) * width;

    // Dim out non-selected regions
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    // Left dimmed
    if (trimStartX > 0) {
      ctx.fillRect(0, 0, trimStartX, height);
    }
    // Right dimmed
    if (trimEndX < width) {
      ctx.fillRect(trimEndX, 0, width - trimEndX, height);
    }

    // Active region highlight background
    ctx.fillStyle = 'rgba(245, 158, 11, 0.04)';
    ctx.fillRect(trimStartX, 0, trimEndX - trimStartX, height);

    // Draw peaks
    const peaks = peaksRef.current;
    if (peaks.length > 0) {
      const barWidth = width / peaks.length;
      const centerY = height / 2;

      for (let i = 0; i < peaks.length; i++) {
        const peak = peaks[i];
        const barX = i * barWidth;
        const barHeight = Math.max(2, peak * (height * 0.42));
        const timeAtBar = (i / peaks.length) * duration;
        const isInTrim = timeAtBar >= trim.start && timeAtBar <= trim.end;

        // Waveform color
        if (isInTrim) {
          const grad = ctx.createLinearGradient(0, centerY - barHeight, 0, centerY + barHeight);
          grad.addColorStop(0, '#38bdf8');
          grad.addColorStop(0.5, '#f59e0b');
          grad.addColorStop(1, '#38bdf8');
          ctx.fillStyle = grad;
        } else {
          ctx.fillStyle = '#334155';
        }

        ctx.fillRect(barX, centerY - barHeight, Math.max(1, barWidth - 0.5), barHeight * 2);
      }
    }

    // Draw Fade Curves if set
    if (fade.fadeIn > 0) {
      const fadeInEndX = ((trim.start + fade.fadeIn) / duration) * width;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.beginPath();
      ctx.moveTo(trimStartX, height);
      ctx.lineTo(trimStartX, 0);
      ctx.lineTo(fadeInEndX, 0);
      ctx.closePath();
      ctx.fill();
    }

    if (fade.fadeOut > 0) {
      const fadeOutStartX = ((trim.end - fade.fadeOut) / duration) * width;
      ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
      ctx.beginPath();
      ctx.moveTo(fadeOutStartX, 0);
      ctx.lineTo(trimEndX, 0);
      ctx.lineTo(trimEndX, height);
      ctx.closePath();
      ctx.fill();
    }

    // Draw Trim handles
    // Start Trim Handle (Amber)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(trimStartX, 0);
    ctx.lineTo(trimStartX, height);
    ctx.stroke();

    // Start Handle Flag
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.roundRect(trimStartX - 2, 0, 16, 20, [0, 4, 4, 0]);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('IN', trimStartX + 2, 14);

    // End Trim Handle (Amber)
    ctx.strokeStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(trimEndX, 0);
    ctx.lineTo(trimEndX, height);
    ctx.stroke();

    // End Handle Flag
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.roundRect(trimEndX - 14, 0, 16, 20, [4, 0, 0, 4]);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('OUT', trimEndX - 12, 14);

    // Draw Playhead
    const playheadX = (currentTime / duration) * width;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Playhead head icon
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(playheadX - 5, 0);
    ctx.lineTo(playheadX + 5, 0);
    ctx.lineTo(playheadX, 9);
    ctx.closePath();
    ctx.fill();

    // Hover time marker line
    if (hoveredTime !== null && !isDraggingPlayhead && !draggingHandle) {
      const hoverX = (hoveredTime / duration) * width;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(hoverX, 0);
      ctx.lineTo(hoverX, height);
      ctx.stroke();
    }
  }, [snippet, currentTime, hoveredTime, isDraggingPlayhead, draggingHandle]);

  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const targetW = Math.round(container.clientWidth * zoom);
      canvas.width = targetW;
      canvas.style.width = `${targetW}px`;
      canvas.height = 140;
      drawWaveform();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [zoom, drawWaveform]);

  // Pointer interactions for seeking & trimming
  const getTimeFromEvent = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !snippet) return 0;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    return ratio * snippet.duration;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!snippet) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.setPointerCapture(e.pointerId);
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const duration = snippet.duration;
    const trim = snippet.trim;

    // Both clickX and trim handles are measured in the identical CSS screen space [0, rect.width]
    const trimStartX = (trim.start / duration) * rect.width;
    const trimEndX = (trim.end / duration) * rect.width;

    // Generous 16px hitzone around each handle
    if (Math.abs(clickX - trimStartX) <= 16) {
      setDraggingHandle('start');
      return;
    }
    if (Math.abs(clickX - trimEndX) <= 16) {
      setDraggingHandle('end');
      return;
    }

    // Otherwise, seek playhead
    setIsDraggingPlayhead(true);
    const time = getTimeFromEvent(e);
    onSeek(time);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!snippet) return;
    const time = getTimeFromEvent(e);
    setHoveredTime(time);

    if (draggingHandle === 'start') {
      const newStart = Math.max(0, Math.min(time, snippet.trim.end - 0.05));
      onUpdateTrim({ ...snippet.trim, start: newStart });
      onSeek(newStart);
    } else if (draggingHandle === 'end') {
      const newEnd = Math.max(snippet.trim.start + 0.05, Math.min(time, snippet.duration));
      onUpdateTrim({ ...snippet.trim, end: newEnd });
      // Keep playhead parked at trim.start so clicking Play plays the trimmed selection from the start!
      onSeek(snippet.trim.start);
    } else if (isDraggingPlayhead) {
      onSeek(time);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
    setIsDraggingPlayhead(false);
    setDraggingHandle(null);
  };

  if (!snippet) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-neutral-900/60 rounded-xl border border-neutral-800 text-neutral-400">
        <p className="text-sm">No audio loaded. Record from your mic, drop an audio file, or pick a sample cartoon line.</p>
      </div>
    );
  }

  const duration = snippet.duration;
  const trimDuration = Math.max(0, snippet.trim.end - snippet.trim.start);
  const clampedSpeed = Math.max(0.25, playbackSpeed || 1.0);
  const resultantDuration = trimDuration / clampedSpeed;

  return (
    <div className="flex flex-col gap-3 p-4 bg-neutral-900/90 rounded-2xl border border-neutral-800/80 shadow-xl backdrop-blur-sm">
      {/* Waveform Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-neutral-200 tracking-wide">{snippet.name}</span>
          <span className="text-neutral-500">·</span>
          <span className="font-mono text-neutral-400" title="Source clip duration">
            Source: {duration.toFixed(2)}s
          </span>
          <span className="text-neutral-500">·</span>
          <span className="font-mono text-neutral-300">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <span className="text-neutral-500">·</span>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-300 font-mono text-xs shadow-xs">
            <span className="font-sans font-bold text-amber-400">Resultant Audio:</span>
            <span className="font-bold text-white text-xs">{resultantDuration.toFixed(2)}s</span>
            {clampedSpeed !== 1.0 && (
              <span className="text-[10px] text-amber-300/80 font-normal">
                ({clampedSpeed.toFixed(2)}x speed)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Zoom controls */}
          <button
            onClick={() => setZoom(Math.max(1, zoom - 0.5))}
            disabled={zoom <= 1}
            title="Zoom out"
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom(Math.min(4, zoom + 0.5))}
            disabled={zoom >= 4}
            title="Zoom in"
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom(1)}
            title="Fit to view"
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <span className="w-px h-4 bg-neutral-800 mx-1" />

          {/* Crop & Save handles */}
          <div className="flex items-center gap-1">
            <button
              onClick={onCropToSelection}
              title="Crop audio buffer to active selection"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors"
            >
              <Scissors className="w-3.5 h-3.5 text-amber-400" />
              <span>Crop</span>
            </button>
            {onOpenInfo && (
              <span className="relative inline-flex items-center group">
                <button
                  type="button"
                  onClick={() => onOpenInfo('audioTrim')}
                  className="text-neutral-500 hover:text-amber-400 p-0.5 rounded transition-colors"
                  title={SETTING_INFO_MAP['audioTrim']?.plainEnglishSummary || 'Audio Trim & IN/OUT Markers'}
                  aria-label="Audio Trim Guide"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
                <span
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-neutral-900 text-neutral-200 text-xs leading-relaxed rounded-xl shadow-2xl border border-neutral-700/90 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 invisible group-hover:visible font-normal text-left"
                >
                  <span className="block font-bold text-amber-300 text-[11px] mb-1 border-b border-neutral-800 pb-1">
                    {SETTING_INFO_MAP['audioTrim']?.title || 'Audio Trim'}
                  </span>
                  <span className="block text-neutral-300 text-[11px] leading-snug">
                    {SETTING_INFO_MAP['audioTrim']?.plainEnglishSummary}
                  </span>
                  <span className="block text-[10px] text-amber-400/80 font-mono mt-1.5 pt-1 border-t border-neutral-800/80">
                    Click to open full guide ↗
                  </span>
                  <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-neutral-900" />
                </span>
              </span>
            )}
          </div>

          <button
            onClick={onSaveCroppedAudio}
            title="Export / Download the cropped selection as high-quality WAV"
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-colors font-medium text-xs"
          >
            <Save className="w-3.5 h-3.5 text-amber-400" />
            <span>Save Cropped Audio</span>
          </button>

          <button
            onClick={onResetTrim}
            title="Reset trim markers to full audio"
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Interactive Canvas Waveform */}
      <div
        ref={containerRef}
        className="relative w-full overflow-x-auto rounded-xl border border-neutral-800/80 bg-neutral-950 cursor-crosshair select-none"
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => setHoveredTime(null)}
          className="block w-full touch-none"
        />
      </div>

      {/* Playback & Quick Trim / Fade Faders */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        {/* Main Transport buttons */}
        <div className="flex items-center gap-2">
          {isPlaying ? (
            <button
              onClick={onPause}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-450 text-neutral-950 font-semibold shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
            >
              <Pause className="w-4 h-4 fill-current" />
              <span>Pause</span>
            </button>
          ) : (
            <button
              onClick={onPlay}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold shadow-lg shadow-amber-500/25 active:scale-95 transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Play Character Voice</span>
            </button>
          )}

          <button
            onClick={onStop}
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
            title="Stop"
          >
            <Square className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleLoop}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
              isLooping
                ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                : 'bg-neutral-800/60 border-neutral-700/50 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>Loop</span>
          </button>
        </div>

        {/* IN / OUT Precision Range Controls */}
        <div className="flex items-center gap-3 text-xs bg-neutral-950 px-3 py-1.5 rounded-xl border border-neutral-800">
          <div className="flex items-center gap-1.5">
            <span className="text-amber-400 font-bold font-mono text-[11px]">IN:</span>
            <input
              type="number"
              min={0}
              max={Math.max(0, snippet.trim.end - 0.1)}
              step={0.1}
              value={Number(snippet.trim.start.toFixed(2))}
              onChange={(e) => {
                const val = Math.max(0, Math.min(parseFloat(e.target.value) || 0, snippet.trim.end - 0.05));
                onUpdateTrim({ ...snippet.trim, start: val });
                onSeek(val);
              }}
              className="w-16 px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-neutral-200 font-mono text-xs text-right focus:border-amber-500 outline-none"
              title="Trim In Point (seconds)"
            />
            <span className="text-neutral-500 font-mono text-[11px]">s</span>
          </div>

          <span className="text-neutral-700">|</span>

          <div className="flex items-center gap-1.5">
            <span className="text-amber-400 font-bold font-mono text-[11px]">OUT:</span>
            <input
              type="number"
              min={snippet.trim.start + 0.1}
              max={snippet.duration}
              step={0.1}
              value={Number(snippet.trim.end.toFixed(2))}
              onChange={(e) => {
                const val = Math.max(
                  snippet.trim.start + 0.05,
                  Math.min(parseFloat(e.target.value) || snippet.duration, snippet.duration)
                );
                onUpdateTrim({ ...snippet.trim, end: val });
                onSeek(snippet.trim.start);
              }}
              className="w-16 px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-neutral-200 font-mono text-xs text-right focus:border-amber-500 outline-none"
              title="Trim Out Point (seconds)"
            />
            <span className="text-neutral-500 font-mono text-[11px]">s</span>
          </div>
        </div>

        {/* Fades Controls */}
        <div className="flex items-center gap-4 text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <span className="text-neutral-500 flex items-center">
              Fade In:
              {onOpenInfo && (
                <span className="relative inline-flex items-center group">
                  <button
                    type="button"
                    onClick={() => onOpenInfo('audioFade')}
                    className="text-neutral-500 hover:text-amber-400 p-0.5 rounded transition-colors ml-0.5"
                    title={SETTING_INFO_MAP['audioFade']?.plainEnglishSummary || 'Fade In & Fade Out Envelopes'}
                    aria-label="Fade Envelopes Guide"
                  >
                    <HelpCircle className="w-3 h-3" />
                  </button>
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-neutral-900 text-neutral-200 text-xs leading-relaxed rounded-xl shadow-2xl border border-neutral-700/90 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 invisible group-hover:visible font-normal text-left"
                  >
                    <span className="block font-bold text-amber-300 text-[11px] mb-1 border-b border-neutral-800 pb-1">
                      {SETTING_INFO_MAP['audioFade']?.title || 'Audio Fades'}
                    </span>
                    <span className="block text-neutral-300 text-[11px] leading-snug">
                      {SETTING_INFO_MAP['audioFade']?.plainEnglishSummary}
                    </span>
                    <span className="block text-[10px] text-amber-400/80 font-mono mt-1.5 pt-1 border-t border-neutral-800/80">
                      Click to open full guide ↗
                    </span>
                    <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-neutral-900" />
                  </span>
                </span>
              )}
            </span>
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.05"
              value={snippet.fade.fadeIn}
              onChange={(e) =>
                onUpdateFade({ ...snippet.fade, fadeIn: parseFloat(e.target.value) })
              }
              className="w-16 accent-amber-500 cursor-pointer"
            />
            <span className="font-mono text-neutral-300 w-10">
              {snippet.fade.fadeIn.toFixed(2)}s
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-neutral-500">Fade Out:</span>
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.05"
              value={snippet.fade.fadeOut}
              onChange={(e) =>
                onUpdateFade({ ...snippet.fade, fadeOut: parseFloat(e.target.value) })
              }
              className="w-16 accent-amber-500 cursor-pointer"
            />
            <span className="font-mono text-neutral-300 w-10">
              {snippet.fade.fadeOut.toFixed(2)}s
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
