/**
 * High-Fidelity Phase-Locked Phase Vocoder (PLPV) DSP for Cartoon Character Voices
 * 
 * Features:
 * 1. Identity Phase Locking (Laroche & Dolson):
 *    Locks phase relationships around spectral peaks (formants & harmonics)
 *    to eliminate "phasiness", hollow comb-filtering, and time-domain grain repetition.
 * 2. Zero Doubling / Stutter:
 *    Operates in the frequency domain on stationary STFT windows, completely eliminating
 *    the voice doubling and syllable-echo artifacts caused by time-domain overlap-add (WSOLA/SOLA).
 * 3. Exact Duration Decoupling:
 *    Playback Speed exclusively governs the output audio length:
 *    Resultant Duration = Input Duration / Speed (e.g. 20s @ 2.0x = 10.0s).
 *    Pitch Shift operates smoothly and independently without affecting the output length.
 */

export function processPitchAndSpeed(
  audioCtx: BaseAudioContext,
  sourceBuffer: AudioBuffer,
  semitones: number,
  cents: number,
  speed: number,
  _mode?: 'granular' | 'varispeed'
): AudioBuffer {
  const totalPitchRatio = Math.pow(2, (semitones + (cents || 0) / 100) / 12);
  const clampedSpeed = Math.max(0.25, Math.min(3.0, speed || 1.0));

  const hasPitchChange = Math.abs(totalPitchRatio - 1.0) >= 0.002;
  const hasSpeedChange = Math.abs(clampedSpeed - 1.0) >= 0.002;

  // 1. Bypass check
  if (!hasPitchChange && !hasSpeedChange) {
    return sourceBuffer;
  }

  const sampleRate = sourceBuffer.sampleRate;
  const numChannels = sourceBuffer.numberOfChannels;
  const inLength = sourceBuffer.length;

  // Output duration is strictly determined by playback speed (e.g. 20s / 2.0 = 10.0s)
  const targetOutputLen = Math.max(1, Math.round(inLength / clampedSpeed));

  // 2. Pure speed change (no pitch shifting required)
  if (!hasPitchChange && hasSpeedChange) {
    const timeStretchFactor = 1.0 / clampedSpeed;
    const outBuffer = audioCtx.createBuffer(numChannels, targetOutputLen, sampleRate);

    // Get channel data
    const inChannels: Float32Array[] = [];
    for (let ch = 0; ch < numChannels; ch++) {
      inChannels.push(sourceBuffer.getChannelData(ch));
    }

    const stretchedChannels = runPhaseLockedVocoderMultiChannel(
      inChannels,
      timeStretchFactor,
      targetOutputLen
    );

    for (let ch = 0; ch < numChannels; ch++) {
      outBuffer.getChannelData(ch).set(stretchedChannels[ch]);
    }

    return outBuffer;
  }

  // 3. Pitch shift (with or without speed change)
  // MATHEMATICAL DERIVATION:
  // To achieve totalPitchRatio at targetOutputLen:
  // intermediateLength = targetOutputLen * totalPitchRatio
  // timeStretchFactor = intermediateLength / inLength = totalPitchRatio / clampedSpeed
  //
  // After stretching to intermediateLength, resampling into targetOutputLen applies the
  // exact pitch shift:
  // effectivePitchRatio = intermediateLength / targetOutputLen = totalPitchRatio
  // And the final duration is GUARANTEED to be targetOutputLen = inLength / clampedSpeed!
  const intermediateLen = Math.max(1, Math.round(targetOutputLen * totalPitchRatio));
  const timeStretchFactor = intermediateLen / inLength;

  const inChannels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    inChannels.push(sourceBuffer.getChannelData(ch));
  }

  const stretchedChannels = runPhaseLockedVocoderMultiChannel(
    inChannels,
    timeStretchFactor,
    intermediateLen
  );

  const outBuffer = audioCtx.createBuffer(numChannels, targetOutputLen, sampleRate);
  for (let ch = 0; ch < numChannels; ch++) {
    const resampled = resampleBufferLinear(stretchedChannels[ch], targetOutputLen);
    outBuffer.getChannelData(ch).set(resampled);
  }

  return outBuffer;
}

/**
 * Multi-channel Phase-Locked Phase Vocoder with shared spectral peaks
 * Ensures left and right channels maintain stereo phase alignment
 */
function runPhaseLockedVocoderMultiChannel(
  channels: Float32Array[],
  stretchFactor: number,
  targetOutputLength: number
): Float32Array[] {
  const numChannels = channels.length;
  const inLength = channels[0].length;
  const outLength = targetOutputLength;

  const outChannels: Float32Array[] = [];
  const norm = new Float32Array(outLength);

  for (let ch = 0; ch < numChannels; ch++) {
    outChannels.push(new Float32Array(outLength));
  }

  // FFT Parameters
  const N = 2048; // Window length
  const Ha = 512; // Analysis hop (75% overlap)
  const Hs = Math.max(1, Math.round(Ha * stretchFactor)); // Synthesis hop
  const numBins = N / 2 + 1;

  // Hanning window
  const window = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N - 1)));
  }

  const twoPi = 2 * Math.PI;
  const expectedPhaseAdv = new Float32Array(numBins);
  for (let k = 0; k < numBins; k++) {
    expectedPhaseAdv[k] = (twoPi * k * Ha) / N;
  }

  // State per channel
  const prevInPhase = Array.from({ length: numChannels }, () => new Float32Array(numBins));
  const outPhase = Array.from({ length: numChannels }, () => new Float32Array(numBins));
  const mag = Array.from({ length: numChannels }, () => new Float32Array(numBins));
  const currentInPhase = Array.from({ length: numChannels }, () => new Float32Array(numBins));

  const real = new Float32Array(N);
  const imag = new Float32Array(N);
  const peakRegion = new Int32Array(numBins);

  let inPos = 0;
  let outPos = 0;
  let isFirst = true;

  while (outPos + N <= outLength && inPos + N <= inLength) {
    // 1. Analyze all channels
    for (let ch = 0; ch < numChannels; ch++) {
      const inData = channels[ch];
      for (let i = 0; i < N; i++) {
        real[i] = inData[inPos + i] * window[i];
        imag[i] = 0;
      }

      forwardFFT(real, imag);

      const chMag = mag[ch];
      const chInPhase = currentInPhase[ch];
      for (let k = 0; k < numBins; k++) {
        const r = real[k];
        const im = imag[k];
        chMag[k] = Math.sqrt(r * r + im * im);
        chInPhase[k] = Math.atan2(im, r);
      }
    }

    if (isFirst) {
      for (let ch = 0; ch < numChannels; ch++) {
        for (let k = 0; k < numBins; k++) {
          outPhase[ch][k] = currentInPhase[ch][k];
          prevInPhase[ch][k] = currentInPhase[ch][k];
        }
      }
      isFirst = false;
    } else {
      // Find prominent spectral peaks across master channel (channel 0)
      const masterMag = mag[0];
      const peaks: number[] = [];
      for (let k = 1; k < numBins - 1; k++) {
        if (masterMag[k] > masterMag[k - 1] && masterMag[k] > masterMag[k + 1] && masterMag[k] > 1e-4) {
          peaks.push(k);
        }
      }

      if (peaks.length > 0) {
        // Map each frequency bin to its closest dominant peak (formant lock)
        let currentPeakIdx = 0;
        for (let k = 0; k < numBins; k++) {
          while (
            currentPeakIdx < peaks.length - 1 &&
            Math.abs(peaks[currentPeakIdx + 1] - k) < Math.abs(peaks[currentPeakIdx] - k)
          ) {
            currentPeakIdx++;
          }
          peakRegion[k] = peaks[currentPeakIdx];
        }

        // Apply peak-locked phase propagation across all channels
        for (let ch = 0; ch < numChannels; ch++) {
          const chInPhase = currentInPhase[ch];
          const chPrevIn = prevInPhase[ch];
          const chOutPhase = outPhase[ch];

          // Advance phase at peak frequencies
          for (let pIdx = 0; pIdx < peaks.length; pIdx++) {
            const p = peaks[pIdx];
            let delta = chInPhase[p] - chPrevIn[p] - expectedPhaseAdv[p];
            delta = delta - twoPi * Math.round(delta / twoPi);
            const trueFreq = (twoPi * p) / N + delta / Ha;
            chOutPhase[p] += trueFreq * Hs;
          }

          // Lock surrounding bins to their dominant peak (preserves voice formants and prevents doubling)
          for (let k = 0; k < numBins; k++) {
            const p = peakRegion[k];
            chOutPhase[k] = chInPhase[k] + (chOutPhase[p] - chInPhase[p]);
            chPrevIn[k] = chInPhase[k];
          }
        }
      } else {
        // Flat noise fallback
        for (let ch = 0; ch < numChannels; ch++) {
          const chInPhase = currentInPhase[ch];
          const chPrevIn = prevInPhase[ch];
          const chOutPhase = outPhase[ch];
          for (let k = 0; k < numBins; k++) {
            let delta = chInPhase[k] - chPrevIn[k] - expectedPhaseAdv[k];
            delta = delta - twoPi * Math.round(delta / twoPi);
            const trueFreq = (twoPi * k) / N + delta / Ha;
            chOutPhase[k] += trueFreq * Hs;
            chPrevIn[k] = chInPhase[k];
          }
        }
      }
    }

    // 2. Synthesize each channel with IFFT and Overlap-Add
    for (let ch = 0; ch < numChannels; ch++) {
      const chMag = mag[ch];
      const chOutPhase = outPhase[ch];

      for (let k = 0; k < numBins; k++) {
        const ph = chOutPhase[k];
        real[k] = chMag[k] * Math.cos(ph);
        imag[k] = chMag[k] * Math.sin(ph);

        if (k > 0 && k < N / 2) {
          real[N - k] = real[k];
          imag[N - k] = -imag[k];
        }
      }

      inverseFFT(real, imag);

      const outData = outChannels[ch];
      for (let i = 0; i < N; i++) {
        outData[outPos + i] += real[i] * window[i];
      }
    }

    // Accumulate normalization window weights
    for (let i = 0; i < N; i++) {
      norm[outPos + i] += window[i] * window[i];
    }

    inPos += Ha;
    outPos += Hs;
  }

  // 3. Normalize overlapping frames
  for (let ch = 0; ch < numChannels; ch++) {
    const outData = outChannels[ch];
    for (let i = 0; i < outLength; i++) {
      if (norm[i] > 1e-4) {
        outData[i] /= norm[i];
      }
    }
  }

  return outChannels;
}

/**
 * Resamples a single channel to targetLength with smooth linear interpolation
 */
function resampleBufferLinear(source: Float32Array, targetLength: number): Float32Array {
  const inLen = source.length;
  const outLen = targetLength;

  if (inLen === outLen) {
    return source;
  }

  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const srcIdx = (i / outLen) * inLen;
    const idx0 = Math.floor(srcIdx);
    const idx1 = Math.min(inLen - 1, idx0 + 1);
    const frac = srcIdx - idx0;

    if (idx0 < inLen) {
      out[i] = source[idx0] * (1 - frac) + (source[idx1] || 0) * frac;
    }
  }
  return out;
}

/**
 * In-place Radix-2 Cooley-Tukey Forward FFT
 */
function forwardFFT(real: Float32Array, imag: Float32Array) {
  const n = real.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = real[i]; real[i] = real[j]; real[j] = tr;
      const ti = imag[i]; imag[i] = imag[j]; imag[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const ang = (-2 * Math.PI) / len;
    const wStepR = Math.cos(ang);
    const wStepI = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let wr = 1;
      let wi = 0;
      for (let j = 0; j < half; j++) {
        const uR = real[i + j];
        const uI = imag[i + j];
        const vR = real[i + j + half] * wr - imag[i + j + half] * wi;
        const vI = real[i + j + half] * wi + imag[i + j + half] * wr;
        real[i + j] = uR + vR;
        imag[i + j] = uI + vI;
        real[i + j + half] = uR - vR;
        imag[i + j + half] = uI - vI;
        const nextWr = wr * wStepR - wi * wStepI;
        wi = wr * wStepI + wi * wStepR;
        wr = nextWr;
      }
    }
  }
}

/**
 * In-place Radix-2 Cooley-Tukey Inverse FFT
 */
function inverseFFT(real: Float32Array, imag: Float32Array) {
  const n = real.length;
  for (let i = 0; i < n; i++) {
    imag[i] = -imag[i];
  }
  forwardFFT(real, imag);
  const invN = 1 / n;
  for (let i = 0; i < n; i++) {
    real[i] = real[i] * invN;
    imag[i] = -imag[i] * invN;
  }
}
