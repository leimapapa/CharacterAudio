import { ReverbType } from '../types/voice';

// Cache generated impulse responses by sample rate and type
const impulseCache = new Map<string, AudioBuffer>();

export function generateImpulseResponse(
  ctx: BaseAudioContext,
  type: ReverbType
): AudioBuffer | null {
  if (type === 'none') return null;

  const cacheKey = `${type}_${ctx.sampleRate}`;
  if (impulseCache.has(cacheKey)) {
    return impulseCache.get(cacheKey)!;
  }

  const sampleRate = ctx.sampleRate;
  let duration = 1.5;
  let decay = 2.0;
  let reverse = false;
  let isMetallic = false;

  switch (type) {
    case 'room':
      duration = 0.6;
      decay = 3.5;
      break;
    case 'hall':
      duration = 2.0;
      decay = 2.2;
      break;
    case 'cave':
      duration = 3.2;
      decay = 1.4;
      break;
    case 'tin_can':
      duration = 0.35;
      decay = 5.0;
      isMetallic = true;
      break;
    case 'cathedral':
      duration = 4.5;
      decay = 1.1;
      break;
    case 'cosmic':
      duration = 5.5;
      decay = 0.9;
      break;
  }

  const length = Math.floor(sampleRate * duration);
  const impulse = ctx.createBuffer(2, length, sampleRate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const progress = i / length;
    
    // Exponential decay curve
    const expDecay = Math.exp(-decay * progress * (isMetallic ? 8 : 4));
    
    // Add noise burst + subtle reflections
    let noiseL = (Math.random() * 2 - 1);
    let noiseR = (Math.random() * 2 - 1);

    if (isMetallic) {
      // Ringing frequency bursts for tin can
      const ring = Math.sin(2 * Math.PI * 880 * t) * 0.4 + Math.sin(2 * Math.PI * 1420 * t) * 0.3;
      noiseL = (noiseL * 0.5 + ring * 0.5);
      noiseR = (noiseR * 0.5 + ring * 0.5);
    } else if (type === 'cave') {
      // Periodic echo flutter in cave
      const flutter = Math.sin(2 * Math.PI * 14 * t) * 0.2 + 1;
      noiseL *= flutter;
      noiseR *= flutter;
    }

    left[i] = noiseL * expDecay;
    right[i] = noiseR * expDecay;
  }

  impulseCache.set(cacheKey, impulse);
  return impulse;
}
