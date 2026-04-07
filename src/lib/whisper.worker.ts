import { pipeline, env } from '@huggingface/transformers';

// Disable local model loading since we are running in a browser
env.allowLocalModels = false;

let transcriber: any = null;

self.onmessage = async (e) => {
  const { type, audio } = e.data;

  if (type === 'load') {
    try {
      transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
        dtype: 'fp32', // Use fp32 to avoid ONNX Runtime quantization bugs in some browsers
        progress_callback: (progress: any) => {
          self.postMessage({ type: 'progress', progress });
        }
      });
      self.postMessage({ type: 'ready' });
    } catch (err: any) {
      self.postMessage({ type: 'error', error: err.message });
    }
  } else if (type === 'transcribe') {
    if (!transcriber) return;
    try {
      const result = await transcriber(audio, {
        chunk_length_s: 30,
        stride_length_s: 5,
      });
      self.postMessage({ type: 'result', text: result.text });
    } catch (err: any) {
      self.postMessage({ type: 'error', error: err.message });
    }
  }
};
