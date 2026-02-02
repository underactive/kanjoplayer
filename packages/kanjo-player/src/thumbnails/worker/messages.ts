/**
 * Worker message types for ffmpeg.wasm communication
 */

export type WorkerMessageType =
  | 'INIT'
  | 'INIT_COMPLETE'
  | 'INIT_ERROR'
  | 'EXTRACT'
  | 'EXTRACT_COMPLETE'
  | 'EXTRACT_ERROR'
  | 'EXTRACT_PROGRESS'
  | 'RELEASE'
  | 'RELEASE_COMPLETE';

export interface WorkerMessage {
  type: WorkerMessageType;
  id: string;
  payload?: unknown;
}

export interface InitMessage extends WorkerMessage {
  type: 'INIT';
  payload: {
    wasmUrl?: string;
    coreUrl?: string;
  };
}

export interface InitCompleteMessage extends WorkerMessage {
  type: 'INIT_COMPLETE';
}

export interface InitErrorMessage extends WorkerMessage {
  type: 'INIT_ERROR';
  payload: {
    error: string;
  };
}

export interface ExtractMessage extends WorkerMessage {
  type: 'EXTRACT';
  payload: {
    videoUrl: string;
    time: number;
    width: number;
    height: number;
  };
}

export interface ExtractCompleteMessage extends WorkerMessage {
  type: 'EXTRACT_COMPLETE';
  payload: {
    time: number;
    imageData: ArrayBuffer;
    width: number;
    height: number;
  };
}

export interface ExtractErrorMessage extends WorkerMessage {
  type: 'EXTRACT_ERROR';
  payload: {
    time: number;
    error: string;
  };
}

export interface ExtractProgressMessage extends WorkerMessage {
  type: 'EXTRACT_PROGRESS';
  payload: {
    time: number;
    progress: number;
  };
}

export interface ReleaseMessage extends WorkerMessage {
  type: 'RELEASE';
}

export interface ReleaseCompleteMessage extends WorkerMessage {
  type: 'RELEASE_COMPLETE';
}

export type WorkerRequest = InitMessage | ExtractMessage | ReleaseMessage;
export type WorkerResponse =
  | InitCompleteMessage
  | InitErrorMessage
  | ExtractCompleteMessage
  | ExtractErrorMessage
  | ExtractProgressMessage
  | ReleaseCompleteMessage;

/**
 * Generate a cryptographically secure random string.
 * Uses crypto.getRandomValues for better uniqueness than Math.random.
 */
function generateSecureId(length: number = 9): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, length);
}

/**
 * Generate unique message ID using cryptographically secure randomness.
 */
export function generateMessageId(): string {
  return `${Date.now()}-${generateSecureId()}`;
}
