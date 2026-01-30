/**
 * FFmpeg Web Worker for thumbnail extraction
 * Runs in isolated context to prevent blocking the main thread
 */

// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../../vite-env.d.ts" />

import type {
  WorkerRequest,
  WorkerResponse,
  ExtractMessage,
  InitMessage,
} from './messages';

// FFmpeg types
interface FFmpegInstance {
  load(): Promise<void>;
  writeFile(path: string, data: Uint8Array): Promise<void>;
  readFile(path: string): Promise<Uint8Array>;
  deleteFile(path: string): Promise<void>;
  exec(args: string[]): Promise<number>;
  on(event: string, callback: (data: { message: string }) => void): void;
  terminate(): void;
}

interface FFmpegModule {
  FFmpeg: new () => FFmpegInstance;
}

interface FetchFileModule {
  fetchFile: (url: string) => Promise<Uint8Array>;
}

let ffmpeg: FFmpegInstance | null = null;
let isLoaded = false;
let lastActiveTime = Date.now();
const INACTIVITY_TIMEOUT = 30000; // 30 seconds

// Send message to main thread
function postMessage(message: WorkerResponse): void {
  self.postMessage(message);
}

// Initialize FFmpeg
async function initFFmpeg(message: InitMessage): Promise<void> {
  if (isLoaded && ffmpeg) {
    postMessage({ type: 'INIT_COMPLETE', id: message.id });
    return;
  }

  try {
    // Dynamic import of @ffmpeg/ffmpeg
    const ffmpegModule = await import('@ffmpeg/ffmpeg') as FFmpegModule;

    ffmpeg = new ffmpegModule.FFmpeg();

    // Log progress
    ffmpeg.on('log', (data) => {
      console.debug('[FFmpeg]', data.message);
    });

    // Load FFmpeg WASM
    await ffmpeg.load();
    isLoaded = true;
    lastActiveTime = Date.now();

    postMessage({ type: 'INIT_COMPLETE', id: message.id });

    // Start inactivity timer
    startInactivityTimer();
  } catch (error) {
    postMessage({
      type: 'INIT_ERROR',
      id: message.id,
      payload: { error: error instanceof Error ? error.message : 'Failed to initialize FFmpeg' },
    });
  }
}

// Extract thumbnail at specific time
async function extractThumbnail(message: ExtractMessage): Promise<void> {
  const { videoUrl, time, width, height } = message.payload;
  lastActiveTime = Date.now();

  if (!ffmpeg || !isLoaded) {
    postMessage({
      type: 'EXTRACT_ERROR',
      id: message.id,
      payload: { time, error: 'FFmpeg not initialized' },
    });
    return;
  }

  try {
    // Import fetchFile utility
    const utilModule = await import('@ffmpeg/util') as FetchFileModule;

    // Fetch video data
    const videoData = await utilModule.fetchFile(videoUrl);
    const inputFileName = 'input.mp4';
    const outputFileName = 'thumbnail.jpg';

    // Write video to virtual filesystem
    await ffmpeg.writeFile(inputFileName, videoData);

    // Extract frame using -ss before -i for fast seeking
    await ffmpeg.exec([
      '-ss', time.toString(),
      '-i', inputFileName,
      '-vframes', '1',
      '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
      '-f', 'image2',
      '-q:v', '2',
      outputFileName,
    ]);

    // Read thumbnail data
    const thumbnailData = await ffmpeg.readFile(outputFileName);

    // Cleanup virtual filesystem
    await ffmpeg.deleteFile(inputFileName);
    await ffmpeg.deleteFile(outputFileName);

    // Send result
    postMessage({
      type: 'EXTRACT_COMPLETE',
      id: message.id,
      payload: {
        time,
        imageData: thumbnailData.buffer,
        width,
        height,
      },
    });
  } catch (error) {
    postMessage({
      type: 'EXTRACT_ERROR',
      id: message.id,
      payload: {
        time,
        error: error instanceof Error ? error.message : 'Failed to extract thumbnail',
      },
    });
  }
}

// Release FFmpeg resources
function releaseFFmpeg(id: string): void {
  if (ffmpeg) {
    ffmpeg.terminate();
    ffmpeg = null;
  }
  isLoaded = false;
  postMessage({ type: 'RELEASE_COMPLETE', id });
}

// Auto-release after inactivity
function startInactivityTimer(): void {
  const checkInactivity = () => {
    if (isLoaded && Date.now() - lastActiveTime > INACTIVITY_TIMEOUT) {
      console.debug('[FFmpeg Worker] Releasing due to inactivity');
      releaseFFmpeg('auto');
    } else if (isLoaded) {
      setTimeout(checkInactivity, 10000); // Check every 10 seconds
    }
  };
  setTimeout(checkInactivity, INACTIVITY_TIMEOUT);
}

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;

  switch (message.type) {
    case 'INIT':
      await initFFmpeg(message);
      break;
    case 'EXTRACT':
      await extractThumbnail(message);
      break;
    case 'RELEASE':
      releaseFFmpeg(message.id);
      break;
  }
};

// Export for TypeScript
export {};
