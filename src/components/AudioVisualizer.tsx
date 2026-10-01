import React, { useRef, useEffect } from 'react';
import { audioEngine } from '../audio/audioEngine';

interface AudioVisualizerProps {
  isPlaying: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = audioEngine.getAnalyser();
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      if (isPlaying) {
        analyser.getByteFrequencyData(dataArray);
      } else {
        // Flat line / idle state
        for (let i = 0; i < dataArray.length; i++) {
          dataArray[i] = Math.max(0, dataArray[i] * 0.9);
        }
      }

      const numBars = 36;
      const barWidth = Math.floor(width / numBars) - 1.5;
      const step = Math.floor(bufferLength / numBars);

      for (let i = 0; i < numBars; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) {
          sum += dataArray[i * step + j] || 0;
        }
        const avg = sum / step;
        const barHeight = Math.max(2, (avg / 255) * height);
        const x = i * (barWidth + 1.5);
        const y = height - barHeight;

        // Gradient for bars
        const grad = ctx.createLinearGradient(0, height, 0, 0);
        grad.addColorStop(0, '#38bdf8');
        grad.addColorStop(0.6, '#f59e0b');
        grad.addColorStop(1, '#ef4444');

        ctx.fillStyle = grad;
        ctx.fillRect(x, y, barWidth, barHeight);
      }

      animRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying]);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-950/80 rounded-xl border border-neutral-800/80">
      <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
        Output VU
      </span>
      <canvas
        ref={canvasRef}
        width={130}
        height={22}
        className="block rounded"
      />
    </div>
  );
};
