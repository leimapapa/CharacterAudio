import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Upload, Sparkles, AlertCircle } from 'lucide-react';
import { audioEngine } from '../audio/audioEngine';

interface AudioInputBarProps {
  onAudioLoaded: (buffer: AudioBuffer, name: string) => void;
  onSampleDialogueSelected: (type: 'hero' | 'evil' | 'cute' | 'alien' | 'goofy', title: string) => void;
}

export const AudioInputBar: React.FC<AudioInputBarProps> = ({
  onAudioLoaded,
  onSampleDialogueSelected,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [recordLevel, setRecordLevel] = useState(0);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      streamRef.current = stream;

      // Audio meter analyzer
      const ctx = audioEngine.getContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const checkLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setRecordLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(checkLevel);
      };
      checkLevel();

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        setRecordLevel(0);

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const arrayBuffer = await audioBlob.arrayBuffer();
        try {
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
          const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          onAudioLoaded(audioBuffer, `Mic Take (${timestamp})`);
        } catch (err) {
          setErrorMessage('Could not process recorded audio snippet');
        }

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordDuration(0);

      const startTime = Date.now();
      timerRef.current = window.setInterval(() => {
        setRecordDuration((Date.now() - startTime) / 1000);
      }, 100);
    } catch (err) {
      setErrorMessage('Microphone access denied or unavailable. Please enable mic permissions in your browser.');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processAudioFile(files[0]);
    e.target.value = '';
  };

  const processAudioFile = async (file: File) => {
    try {
      const buffer = await audioEngine.decodeAudioFile(file);
      onAudioLoaded(buffer, file.name);
    } catch (err) {
      setErrorMessage(`Failed to decode "${file.name}": ${(err as Error).message}. Supported formats: WAV, MP3, OGG, WMA, M4A, FLAC, WebM.`);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processAudioFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {errorMessage && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="ml-auto text-red-400 hover:text-red-100 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
        {/* Record from Mic */}
        <div className="md:col-span-4 flex items-center justify-between p-3.5 bg-neutral-900/90 rounded-2xl border border-neutral-800">
          <div className="flex items-center gap-3">
            {isRecording ? (
              <button
                onClick={stopRecording}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 animate-pulse transition-all"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop Rec ({recordDuration.toFixed(1)}s)</span>
              </button>
            ) : (
              <button
                onClick={startRecording}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-semibold text-xs border border-neutral-700 transition-all hover:border-amber-500/50"
              >
                <Mic className="w-4 h-4 text-red-400" />
                <span>Record Voice</span>
              </button>
            )}

            {isRecording && (
              <div className="flex flex-col gap-1 w-24">
                <span className="text-[10px] text-neutral-400 font-mono">Mic Input</span>
                <div className="w-full h-2 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500 transition-all duration-75"
                    style={{ width: `${recordLevel}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <span className="text-[11px] text-neutral-500 hidden sm:inline">
            Direct Mic Input
          </span>
        </div>

        {/* Upload Audio File / Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingFile(true);
          }}
          onDragLeave={() => setIsDraggingFile(false)}
          onDrop={handleDrop}
          className={`md:col-span-5 flex items-center justify-between p-3.5 rounded-2xl border border-dashed text-xs transition-all ${
            isDraggingFile
              ? 'bg-amber-500/10 border-amber-500 text-amber-300'
              : 'bg-neutral-900/90 border-neutral-800 hover:border-neutral-700 text-neutral-400'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Upload className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <label className="font-semibold text-neutral-200 hover:text-amber-400 cursor-pointer underline underline-offset-2">
                Upload Audio Snippet
                <input
                  type="file"
                  accept="audio/*,.wav,.mp3,.ogg,.m4a,.aac,.flac,.webm"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <p className="text-[10px] text-neutral-500">
                WAV, MP3, OGG, AAC, M4A, FLAC, WebM (browser support varies)
              </p>
            </div>
          </div>
        </div>

        {/* Quick Sample Dialogue Buttons */}
        <div className="md:col-span-3 flex items-center justify-between p-3.5 bg-neutral-900/90 rounded-2xl border border-neutral-800 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-[10px] font-semibold text-neutral-400 shrink-0">Sample:</span>
            <button
              onClick={() => onSampleDialogueSelected('hero', 'Hero Line ("Victory!")')}
              className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] shrink-0"
              title="Lively Cartoon Hero Take"
            >
              🛡️ Hero
            </button>
            <button
              onClick={() => onSampleDialogueSelected('evil', 'Villain Cackle ("Mwahaha!")')}
              className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] shrink-0"
              title="Evil Villain Cackle"
            >
              😈 Villain
            </button>
            <button
              onClick={() => onSampleDialogueSelected('cute', 'Squeak Line ("Yay!")')}
              className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] shrink-0"
              title="Cute Mascot Chirp"
            >
              ✨ Cute
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
