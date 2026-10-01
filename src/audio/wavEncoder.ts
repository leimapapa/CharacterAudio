/**
 * Encodes an AudioBuffer to standard uncompressed WAV format
 * Supports 16-bit and 24-bit PCM
 */

export interface WavEncodeOptions {
  bitDepth?: 16 | 24;
}

export function audioBufferToWav(
  buffer: AudioBuffer,
  options: WavEncodeOptions = { bitDepth: 16 }
): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitDepth = options.bitDepth || 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const length = buffer.length;
  const byteRate = sampleRate * blockAlign;
  const dataSize = length * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  // Helper to write ASCII strings
  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  // RIFF identifier
  writeString(0, 'RIFF');
  // RIFF chunk length
  view.setUint32(4, 36 + dataSize, true);
  // RIFF type
  writeString(8, 'WAVE');

  // Format chunk identifier
  writeString(12, 'fmt ');
  // Format chunk length
  view.setUint32(16, 16, true);
  // Sample format (1 = PCM)
  view.setUint16(20, 1, true);
  // Channels
  view.setUint16(22, numChannels, true);
  // Sample rate
  view.setUint32(24, sampleRate, true);
  // Byte rate (sample rate * block align)
  view.setUint32(28, byteRate, true);
  // Block align
  view.setUint16(32, blockAlign, true);
  // Bits per sample
  view.setUint16(34, bitDepth, true);

  // Data chunk identifier
  writeString(36, 'data');
  // Data chunk length
  view.setUint32(40, dataSize, true);

  // Write audio samples
  let offset = 44;
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(buffer.getChannelData(ch));
  }

  if (bitDepth === 16) {
    for (let i = 0; i < length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        let sample = channels[ch][i];
        // Clip to [-1.0, 1.0]
        sample = Math.max(-1, Math.min(1, sample));
        // Scale to 16-bit signed integer
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }
  } else if (bitDepth === 24) {
    for (let i = 0; i < length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        let sample = channels[ch][i];
        sample = Math.max(-1, Math.min(1, sample));
        // Scale to 24-bit signed integer
        const intSample = sample < 0 ? sample * 0x800000 : sample * 0x7fffff;
        const intVal = Math.floor(intSample);
        // Write 3 bytes little-endian
        view.setUint8(offset, intVal & 0xff);
        view.setUint8(offset + 1, (intVal >> 8) & 0xff);
        view.setUint8(offset + 2, (intVal >> 16) & 0xff);
        offset += 3;
      }
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

export async function audioBufferToMp3(
  buffer: AudioBuffer,
  filename = 'audio.mp3'
): Promise<Blob> {
  // First convert to 16-bit WAV
  const wavBlob = audioBufferToWav(buffer, { bitDepth: 16 });
  
  const res = await fetch('/api/encode-mp3', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'x-filename': encodeURIComponent(filename),
    },
    body: wavBlob,
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.error || `MP3 encoding failed with status ${res.status}`);
  }

  const mp3ArrayBuffer = await res.arrayBuffer();
  return new Blob([mp3ArrayBuffer], { type: 'audio/mpeg' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 2000);
}
