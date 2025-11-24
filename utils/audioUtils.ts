import { Blob } from '@google/genai';

/**
 * Encodes a Float32Array (from AudioBuffer) to a raw 16-bit PCM base64 string.
 * This is used for sending audio TO the model.
 */
export function pcmToGeminiBlob(data: Float32Array, sampleRate: number): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // Clamp values between -1 and 1 and scale to Int16 range
    const s = Math.max(-1, Math.min(1, data[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  let binary = '';
  const bytes = new Uint8Array(int16.buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  
  return {
    data: btoa(binary),
    mimeType: `audio/pcm;rate=${sampleRate}`,
  };
}

/**
 * Decodes a base64 string containing raw 16-bit PCM data into a byte array.
 */
export function decodeBase64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Converts raw PCM 16-bit byte data into an AudioBuffer for playback.
 */
export async function pcmToAudioBuffer(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Normalize Int16 to Float32 [-1.0, 1.0]
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Resamples input audio buffer to target sample rate using simple linear interpolation.
 * Essential because microphone input is usually 44.1/48kHz, but Gemini Live often expects specific rates (e.g., 16kHz).
 */
export function resampleAudioBuffer(
  audioBuffer: AudioBuffer,
  targetSampleRate: number
): Float32Array {
  const sourceRate = audioBuffer.sampleRate;
  const sourceData = audioBuffer.getChannelData(0);
  
  if (sourceRate === targetSampleRate) return sourceData;

  const ratio = sourceRate / targetSampleRate;
  const newLength = Math.round(sourceData.length / ratio);
  const result = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const originalIndex = i * ratio;
    const index1 = Math.floor(originalIndex);
    const index2 = Math.min(index1 + 1, sourceData.length - 1);
    const weight = originalIndex - index1;
    
    result[i] = sourceData[index1] * (1 - weight) + sourceData[index2] * weight;
  }

  return result;
}