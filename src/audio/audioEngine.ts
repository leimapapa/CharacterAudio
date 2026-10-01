import { EffectSettings, ReverbType, AudioTrimRange, AudioFadeSettings } from '../types/voice';
import { generateImpulseResponse } from './impulseResponses';
import { processPitchAndSpeed } from './pitchShift';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private isPlaying = false;
  private startTime = 0;
  private pauseOffset = 0;
  private activeBuffer: AudioBuffer | null = null;
  private onPlaybackEnded?: () => void;
  private animationFrameId?: number;
  private onProgressUpdate?: (time: number, progress: number) => void;

  // Distortion curve cache
  private distortionCurveCache = new Map<number, Float32Array>();

  public getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public getAnalyser(): AnalyserNode {
    const ctx = this.getContext();
    if (!this.analyser) {
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.8;
    }
    return this.analyser;
  }

  /**
   * Generates a non-linear distortion curve for warmth / villain growl
   */
  private getDistortionCurve(amount: number): Float32Array {
    const clampedAmount = Math.max(0, Math.min(100, amount));
    if (this.distortionCurveCache.has(clampedAmount)) {
      return this.distortionCurveCache.get(clampedAmount)!;
    }

    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const k = clampedAmount <= 0 ? 0 : Math.pow(clampedAmount / 10, 2) * 5;
    const deg = Math.PI / 180;

    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      if (k === 0) {
        curve[i] = x;
      } else {
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
      }
    }

    this.distortionCurveCache.set(clampedAmount, curve);
    return curve;
  }

  /**
   * Sets up real-time audio effect nodes graph
   */
  public buildEffectChain(
    targetCtx: BaseAudioContext,
    sourceNode: AudioNode,
    settings: EffectSettings
  ): { destinationNode: AudioNode; cleanup: () => void } {
    const cleanups: (() => void)[] = [];

    let currentNode: AudioNode = sourceNode;

    // 1. Saturation / Overdrive (WaveShaper)
    if (settings.saturation > 0) {
      const shaper = targetCtx.createWaveShaper();
      shaper.curve = this.getDistortionCurve(settings.saturation) as Float32Array<ArrayBuffer>;
      shaper.oversample = '4x';
      
      const dryGain = targetCtx.createGain();
      const wetGain = targetCtx.createGain();
      const satMix = targetCtx.createGain();
      
      const satRatio = settings.saturation / 100;
      dryGain.gain.value = 1 - satRatio * 0.4;
      wetGain.gain.value = satRatio * 0.7;

      currentNode.connect(dryGain);
      currentNode.connect(shaper);
      shaper.connect(wetGain);

      dryGain.connect(satMix);
      wetGain.connect(satMix);
      currentNode = satMix;
    }

    // 2. Robotize / Ring Modulator
    if (settings.robotizeMix > 0) {
      const carrierFreq = Math.max(20, settings.robotizeFreq);
      const robotMixRatio = settings.robotizeMix / 100;

      // Direct dry path
      const dryNode = targetCtx.createGain();
      dryNode.gain.value = 1 - robotMixRatio;

      // Modulated wet path
      const ringGain = targetCtx.createGain();
      ringGain.gain.value = 0; // modulated by carrier

      const carrier = targetCtx.createOscillator();
      carrier.type = 'sawtooth';
      carrier.frequency.value = carrierFreq;

      const carrierGain = targetCtx.createGain();
      carrierGain.gain.value = robotMixRatio * 1.5;

      carrier.connect(carrierGain);
      carrierGain.connect(ringGain.gain);

      currentNode.connect(dryNode);
      currentNode.connect(ringGain);

      carrier.start();
      cleanups.push(() => {
        try {
          carrier.stop();
          carrier.disconnect();
        } catch {
          // ignore already stopped
        }
      });

      const robotCombine = targetCtx.createGain();
      dryNode.connect(robotCombine);
      ringGain.connect(robotCombine);
      currentNode = robotCombine;
    }

    // 3. EQ & Formant Filters (Low Shelf, Mid Peaking, High Shelf)
    const lowFilter = targetCtx.createBiquadFilter();
    lowFilter.type = 'lowshelf';
    lowFilter.frequency.value = 250;
    lowFilter.gain.value = settings.lowGain;

    const midFilter = targetCtx.createBiquadFilter();
    midFilter.type = 'peaking';
    // Mid frequency adjusts with formantShift
    const baseMid = 1200;
    const midFreq = baseMid * Math.pow(2, (settings.formantShift || 0) / 12);
    midFilter.frequency.value = Math.max(300, Math.min(6000, midFreq));
    midFilter.Q.value = 1.2;
    midFilter.gain.value = settings.midGain;

    const highFilter = targetCtx.createBiquadFilter();
    highFilter.type = 'highshelf';
    highFilter.frequency.value = 4000;
    highFilter.gain.value = settings.highGain;

    currentNode.connect(lowFilter);
    lowFilter.connect(midFilter);
    midFilter.connect(highFilter);
    currentNode = highFilter;

    // 4. Character Filter (Cutoff: lowpass / highpass / bandpass)
    if (settings.filterType !== 'none') {
      const toneFilter = targetCtx.createBiquadFilter();
      toneFilter.type = settings.filterType;
      toneFilter.frequency.value = settings.filterCutoff;
      toneFilter.Q.value = settings.filterType === 'bandpass' ? 2.5 : 0.8;
      currentNode.connect(toneFilter);
      currentNode = toneFilter;
    }

    // 5. Chorus / Doubler
    if (settings.chorusMix > 0) {
      const chorusRatio = settings.chorusMix / 100;
      const dryGain = targetCtx.createGain();
      dryGain.gain.value = 1.0;

      const chorusDelay = targetCtx.createDelay();
      chorusDelay.delayTime.value = 0.025; // 25ms base

      const chorusLFO = targetCtx.createOscillator();
      chorusLFO.frequency.value = 1.8; // 1.8 Hz modulation
      const chorusLFOGain = targetCtx.createGain();
      chorusLFOGain.gain.value = 0.006; // 6ms swing
      chorusLFO.connect(chorusLFOGain);
      chorusLFOGain.connect(chorusDelay.delayTime);

      const wetGain = targetCtx.createGain();
      wetGain.gain.value = chorusRatio * 0.7;

      currentNode.connect(dryGain);
      currentNode.connect(chorusDelay);
      chorusDelay.connect(wetGain);

      const chorusMixNode = targetCtx.createGain();
      dryGain.connect(chorusMixNode);
      wetGain.connect(chorusMixNode);

      chorusLFO.start();
      cleanups.push(() => {
        try {
          chorusLFO.stop();
          chorusLFO.disconnect();
        } catch {
          // ignore
        }
      });

      currentNode = chorusMixNode;
    }

    // 6. Vibrato / Tremolo (Nervous Tremor / Flutter)
    if (settings.vibratoDepth > 0 && settings.vibratoRate > 0) {
      const tremoloGain = targetCtx.createGain();
      const depth = (settings.vibratoDepth / 100) * 0.45; // up to 45% tremolo
      tremoloGain.gain.value = 1 - depth;

      const tremoloLFO = targetCtx.createOscillator();
      tremoloLFO.type = 'sine';
      tremoloLFO.frequency.value = settings.vibratoRate;

      const lfoGain = targetCtx.createGain();
      lfoGain.gain.value = depth;

      tremoloLFO.connect(lfoGain);
      lfoGain.connect(tremoloGain.gain);

      currentNode.connect(tremoloGain);
      tremoloLFO.start();
      cleanups.push(() => {
        try {
          tremoloLFO.stop();
          tremoloLFO.disconnect();
        } catch {
          // ignore
        }
      });

      currentNode = tremoloGain;
    }

    // 7. Delay / Echo
    if (settings.delayMix > 0) {
      const delayRatio = settings.delayMix / 100;
      const delayNode = targetCtx.createDelay(2.0);
      delayNode.delayTime.value = Math.max(0.01, Math.min(1.5, settings.delayTime));

      const feedbackNode = targetCtx.createGain();
      feedbackNode.gain.value = Math.min(0.85, settings.delayFeedback / 100);

      const delayWet = targetCtx.createGain();
      delayWet.gain.value = delayRatio * 0.8;

      const delayCombine = targetCtx.createGain();

      currentNode.connect(delayCombine);
      currentNode.connect(delayNode);
      delayNode.connect(feedbackNode);
      feedbackNode.connect(delayNode);
      delayNode.connect(delayWet);
      delayWet.connect(delayCombine);

      currentNode = delayCombine;
    }

    // 8. Convolution Reverb
    if (settings.reverbMix > 0 && settings.reverbType !== 'none') {
      const reverbRatio = settings.reverbMix / 100;
      const convolver = targetCtx.createConvolver();
      const impulse = generateImpulseResponse(targetCtx, settings.reverbType);
      
      if (impulse) {
        convolver.buffer = impulse;
        const dryNode = targetCtx.createGain();
        const wetNode = targetCtx.createGain();
        dryNode.gain.value = 1 - reverbRatio * 0.35;
        wetNode.gain.value = reverbRatio * 0.75;

        currentNode.connect(dryNode);
        currentNode.connect(convolver);
        convolver.connect(wetNode);

        const reverbMix = targetCtx.createGain();
        dryNode.connect(reverbMix);
        wetNode.connect(reverbMix);

        currentNode = reverbMix;
      }
    }

    // 9. Dynamics Compressor / Master Limiter & Master Gain
    const compressor = targetCtx.createDynamicsCompressor();
    compressor.threshold.value = -6;
    compressor.knee.value = 12;
    compressor.ratio.value = 6;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.15;

    const masterGain = targetCtx.createGain();
    masterGain.gain.value = Math.max(0, Math.min(2.5, settings.outputGain));

    currentNode.connect(compressor);
    compressor.connect(masterGain);

    return {
      destinationNode: masterGain,
      cleanup: () => {
        cleanups.forEach((c) => c());
      },
    };
  }

  /**
   * Slice and apply fades to an AudioBuffer
   */
  public applyTrimAndFade(
    source: AudioBuffer,
    trim: AudioTrimRange,
    fade: AudioFadeSettings
  ): AudioBuffer {
    const sampleRate = source.sampleRate;
    const numChannels = source.numberOfChannels;
    const totalDuration = source.duration;

    const startSec = Math.max(0, Math.min(totalDuration, trim.start));
    const endSec = Math.max(startSec + 0.05, Math.min(totalDuration, trim.end));

    const startSample = Math.floor(startSec * sampleRate);
    const endSample = Math.floor(endSec * sampleRate);
    const sliceLength = Math.max(1, endSample - startSample);

    const ctx = this.getContext();
    const resultBuffer = ctx.createBuffer(numChannels, sliceLength, sampleRate);

    const fadeInSamples = Math.min(sliceLength, Math.floor(fade.fadeIn * sampleRate));
    const fadeOutSamples = Math.min(sliceLength, Math.floor(fade.fadeOut * sampleRate));

    for (let ch = 0; ch < numChannels; ch++) {
      const srcData = source.getChannelData(ch);
      const destData = resultBuffer.getChannelData(ch);

      for (let i = 0; i < sliceLength; i++) {
        let val = srcData[startSample + i] || 0;

        // Apply fade-in
        if (i < fadeInSamples && fadeInSamples > 0) {
          const progress = i / fadeInSamples;
          val *= 0.5 * (1 - Math.cos(Math.PI * progress)); // smooth half-cosine
        }

        // Apply fade-out
        const distFromEnd = sliceLength - 1 - i;
        if (distFromEnd < fadeOutSamples && fadeOutSamples > 0) {
          const progress = distFromEnd / fadeOutSamples;
          val *= 0.5 * (1 - Math.cos(Math.PI * progress));
        }

        destData[i] = val;
      }
    }

    return resultBuffer;
  }

  /**
   * Plays the audio buffer with the given effects settings
   */
  public async play(
    buffer: AudioBuffer,
    settings: EffectSettings,
    trim: AudioTrimRange,
    fade: AudioFadeSettings,
    offset = 0,
    isLooping = false,
    onEnded?: () => void,
    onProgress?: (time: number, progress: number) => void
  ) {
    this.stop();

    const ctx = this.getContext();
    this.onPlaybackEnded = onEnded;
    this.onProgressUpdate = onProgress;

    // Apply trim & fade first
    const trimmed = this.applyTrimAndFade(buffer, trim, fade);

    // Apply pitch & speed processing
    const processedBuffer = processPitchAndSpeed(
      ctx,
      trimmed,
      settings.pitchSemitones,
      settings.pitchFineCents,
      settings.speed,
      settings.pitchMode
    );

    this.activeBuffer = processedBuffer;

    const source = ctx.createBufferSource();
    source.buffer = processedBuffer;
    source.loop = isLooping;

    const analyser = this.getAnalyser();

    // Build the DSP chain
    const { destinationNode, cleanup } = this.buildEffectChain(ctx, source, settings);

    destinationNode.connect(analyser);
    analyser.connect(ctx.destination);

    const trimStart = trim.start;
    const trimDuration = Math.max(0.01, trim.end - trim.start);
    const clampedWaveformTime = Math.max(trimStart, Math.min(trim.end, offset));
    const normOffset = (clampedWaveformTime - trimStart) / trimDuration;
    const bufferOffset = Math.max(0, Math.min(processedBuffer.duration - 0.05, normOffset * processedBuffer.duration));

    this.startTime = ctx.currentTime - bufferOffset;
    this.isPlaying = true;

    source.onended = () => {
      if (this.isPlaying && !isLooping) {
        this.stop();
        cleanup();
        this.onPlaybackEnded?.();
      }
    };

    source.start(0, bufferOffset);
    this.currentSource = source;

    // Start tracking playback position accurately synced to the waveform and speed
    this.trackProgress(trimStart, trimDuration, processedBuffer.duration, isLooping);
  }

  private currentWaveformTime = 0;

  private trackProgress(
    trimStart: number,
    trimDuration: number,
    processedDuration: number,
    isLooping: boolean
  ) {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    const update = () => {
      if (!this.isPlaying || !this.ctx) return;
      const elapsed = this.ctx.currentTime - this.startTime;
      const tInTake = isLooping
        ? elapsed % processedDuration
        : Math.min(processedDuration, elapsed);
      const progress = processedDuration > 0 ? tInTake / processedDuration : 0;
      
      // Calculate exact position on the source waveform
      const waveformTime = trimStart + progress * trimDuration;
      this.currentWaveformTime = waveformTime;

      this.onProgressUpdate?.(waveformTime, progress);

      if (elapsed < processedDuration || isLooping) {
        this.animationFrameId = requestAnimationFrame(update);
      }
    };

    this.animationFrameId = requestAnimationFrame(update);
  }

  public pause(): number {
    this.stop();
    return this.currentWaveformTime;
  }

  public stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch {
        // ignore
      }
      this.currentSource = null;
    }
    this.isPlaying = false;
  }

  public getPlaybackState() {
    return {
      isPlaying: this.isPlaying,
      activeBufferDuration: this.activeBuffer?.duration || 0,
    };
  }

  /**
   * Renders the complete audio buffer offline with sample-accurate DSP effects for export
   */
  public async renderOffline(
    sourceBuffer: AudioBuffer,
    settings: EffectSettings,
    trim: AudioTrimRange,
    fade: AudioFadeSettings
  ): Promise<AudioBuffer> {
    // 1. Slice and fade
    const trimmed = this.applyTrimAndFade(sourceBuffer, trim, fade);

    // 2. Pitch and speed shift
    const tempCtx = this.getContext();
    const pitchedBuffer = processPitchAndSpeed(
      tempCtx,
      trimmed,
      settings.pitchSemitones,
      settings.pitchFineCents,
      settings.speed,
      settings.pitchMode
    );

    // 3. Setup OfflineAudioContext with extra tail for reverb & delay decay
    const tailSeconds = (settings.reverbMix > 0 ? 3.0 : 0) + (settings.delayMix > 0 ? 2.0 : 0);
    const renderDuration = pitchedBuffer.duration + tailSeconds;
    const sampleRate = pitchedBuffer.sampleRate;
    const length = Math.ceil(renderDuration * sampleRate);

    const offlineCtx = new OfflineAudioContext(
      pitchedBuffer.numberOfChannels,
      length,
      sampleRate
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = pitchedBuffer;

    const { destinationNode } = this.buildEffectChain(offlineCtx, source, settings);
    destinationNode.connect(offlineCtx.destination);

    source.start(0);
    const rendered = await offlineCtx.startRendering();
    return rendered;
  }

  /**
   * Decodes an uploaded audio file (WAV, MP3, OGG, WMA, M4A, FLAC, WebM, etc.)
   * Includes FFmpeg transcoding support for all WMA formats
   */
  public async decodeAudioFile(file: File): Promise<AudioBuffer> {
    const isWma = file.name.toLowerCase().endsWith('.wma') || file.type.toLowerCase().includes('wma');
    
    // For WMA files, route directly to the server transcoder
    if (isWma) {
      try {
        return await this.convertAndDecodeViaServer(file);
      } catch (wmaErr) {
        console.warn('Direct WMA transcoding error, falling back to local decoder...', wmaErr);
      }
    }

    const arrayBuffer = await file.arrayBuffer();
    const ctx = this.getContext();
    try {
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      return audioBuffer;
    } catch {
      // If native decode fails (e.g. encoded WMA, AMR, or uncommon codec), transcode via FFmpeg backend
      try {
        return await this.convertAndDecodeViaServer(file);
      } catch (serverErr) {
        // Final fallback via HTML Audio element
        return await this.decodeViaAudioElement(file);
      }
    }
  }

  /**
   * Transcodes audio via the backend FFmpeg converter for full format support (including all WMA versions)
   */
  private async convertAndDecodeViaServer(file: File): Promise<AudioBuffer> {
    const res = await fetch('/api/convert-audio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'x-filename': encodeURIComponent(file.name),
      },
      body: file,
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Audio transcoding failed with status ${res.status}`);
    }

    const wavArrayBuffer = await res.arrayBuffer();
    const ctx = this.getContext();
    return await ctx.decodeAudioData(wavArrayBuffer);
  }

  /**
   * Fallback decoder using an Audio element and MediaElementAudioSourceNode
   */
  private async decodeViaAudioElement(file: File): Promise<AudioBuffer> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const audio = new Audio();
      audio.src = url;

      audio.oncanplaythrough = async () => {
        try {
          const duration = audio.duration;
          if (!duration || isNaN(duration) || duration <= 0) {
            URL.revokeObjectURL(url);
            reject(new Error('Could not parse audio file duration'));
            return;
          }

          // Use OfflineAudioContext to capture
          const ctx = this.getContext();
          // Fetch raw arrayBuffer again to check
          const res = await fetch(url);
          const buf = await res.arrayBuffer();
          const decoded = await ctx.decodeAudioData(buf);
          URL.revokeObjectURL(url);
          resolve(decoded);
        } catch (err) {
          URL.revokeObjectURL(url);
          reject(new Error(`Failed to decode audio file: ${(err as Error).message}`));
        }
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Unsupported or corrupted audio format'));
      };
    });
  }

  /**
   * Synthesize a lively cartoon speech phrase for instant test preview
   */
  public createProceduralVoiceLine(type: 'hero' | 'evil' | 'cute' | 'alien' | 'goofy'): AudioBuffer {
    const ctx = this.getContext();
    const sampleRate = ctx.sampleRate;
    let duration = 2.4;
    
    // Setup vocal parameters for speech simulation
    let syllables: { freq: number; dur: number; vowel: 'a' | 'o' | 'i' | 'u' | 'e'; consonant?: string }[] = [];

    switch (type) {
      case 'cute':
        duration = 1.8;
        syllables = [
          { freq: 440, dur: 0.25, vowel: 'i' }, // "Pip!"
          { freq: 520, dur: 0.2, vowel: 'a' },  // "Squeak!"
          { freq: 660, dur: 0.35, vowel: 'e' }, // "Yay!"
          { freq: 580, dur: 0.4, vowel: 'o' },  // "Woo!"
        ];
        break;
      case 'evil':
        duration = 2.6;
        syllables = [
          { freq: 110, dur: 0.45, vowel: 'u' }, // "Mwa-"
          { freq: 130, dur: 0.4, vowel: 'a' },  // "ha-"
          { freq: 146, dur: 0.4, vowel: 'a' },  // "ha-"
          { freq: 98, dur: 0.8, vowel: 'a' },   // "haaa!"
        ];
        break;
      case 'alien':
        duration = 2.0;
        syllables = [
          { freq: 350, dur: 0.15, vowel: 'e' },
          { freq: 280, dur: 0.25, vowel: 'o' },
          { freq: 420, dur: 0.2, vowel: 'u' },
          { freq: 310, dur: 0.35, vowel: 'i' },
          { freq: 500, dur: 0.4, vowel: 'a' },
        ];
        break;
      case 'goofy':
        duration = 2.2;
        syllables = [
          { freq: 220, dur: 0.3, vowel: 'u' },  // "Guck"
          { freq: 290, dur: 0.35, vowel: 'o' }, // "Gawsh"
          { freq: 240, dur: 0.4, vowel: 'a' },  // "Ahyuk!"
          { freq: 330, dur: 0.5, vowel: 'i' },
        ];
        break;
      case 'hero':
      default:
        duration = 2.2;
        syllables = [
          { freq: 200, dur: 0.3, vowel: 'a' },  // "For-"
          { freq: 260, dur: 0.35, vowel: 'o' }, // "ward"
          { freq: 300, dur: 0.3, vowel: 'e' },  // "to"
          { freq: 392, dur: 0.65, vowel: 'a' }, // "vic-to-ry!"
        ];
        break;
    }

    const totalSamples = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, totalSamples, sampleRate);
    const data = buffer.getChannelData(0);

    // Formant frequencies (F1, F2) for basic vowels
    const formantMap = {
      a: { f1: 800, f2: 1200 },
      e: { f1: 500, f2: 1800 },
      i: { f1: 300, f2: 2400 },
      o: { f1: 500, f2: 900 },
      u: { f1: 350, f2: 800 },
    };

    let sampleOffset = 0;
    syllables.forEach((s) => {
      const sylSamples = Math.floor(s.dur * sampleRate);
      const formants = formantMap[s.vowel];
      
      for (let i = 0; i < sylSamples; i++) {
        if (sampleOffset + i >= totalSamples) break;
        const t = i / sampleRate;
        const env = Math.sin((Math.PI * i) / sylSamples); // bell envelope

        // Glottal pulse approximation (buzz harmonic)
        const f0 = s.freq + Math.sin(t * 8) * (s.freq * 0.04);
        let glottal = 0;
        for (let h = 1; h <= 8; h++) {
          glottal += (1 / h) * Math.sin(2 * Math.PI * f0 * h * t);
        }

        // Formant resonance boosts
        const formant1 = Math.sin(2 * Math.PI * formants.f1 * t) * 0.4;
        const formant2 = Math.sin(2 * Math.PI * formants.f2 * t) * 0.3;

        // Combine
        const sampleVal = (glottal * 0.5 + formant1 + formant2) * env * 0.5;
        data[sampleOffset + i] = sampleVal;
      }
      sampleOffset += sylSamples + Math.floor(sampleRate * 0.08); // small breath gap
    });

    return buffer;
  }
}

export const audioEngine = new AudioEngine();
