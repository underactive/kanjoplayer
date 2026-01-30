/**
 * HTMLVideoElement wrapper with unified API
 */

import { EventEmitter } from './EventEmitter';
import { StateManager } from './StateManager';

interface MediaControllerEvents {
  play: void;
  pause: void;
  ended: void;
  timeupdate: { currentTime: number; duration: number };
  seeking: { time: number };
  seeked: { time: number };
  ratechange: { rate: number };
  loadstart: void;
  loadedmetadata: { duration: number; videoWidth: number; videoHeight: number };
  loadeddata: void;
  canplay: void;
  canplaythrough: void;
  waiting: void;
  playing: void;
  progress: { buffered: { start: number; end: number }[] };
  volumechange: { volume: number; muted: boolean };
  error: { code: number; message: string };
  enterpictureinpicture: void;
  leavepictureinpicture: void;
}

export class MediaController extends EventEmitter<MediaControllerEvents> {
  private video: HTMLVideoElement;
  private stateManager: StateManager;
  private eventCleanup: (() => void)[] = [];

  constructor(video: HTMLVideoElement, stateManager: StateManager) {
    super();
    this.video = video;
    this.stateManager = stateManager;
    this.bindVideoEvents();
  }

  // ============================================================================
  // Playback Control
  // ============================================================================

  async play(): Promise<void> {
    try {
      await this.video.play();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Play was interrupted by a pause or new load, this is normal
        return;
      }
      throw error;
    }
  }

  pause(): void {
    this.video.pause();
  }

  async togglePlay(): Promise<void> {
    if (this.video.paused) {
      await this.play();
    } else {
      this.pause();
    }
  }

  // ============================================================================
  // Seeking
  // ============================================================================

  seek(time: number): void {
    const clampedTime = Math.max(0, Math.min(time, this.video.duration || 0));
    this.video.currentTime = clampedTime;
  }

  seekPercent(percent: number): void {
    const time = (percent / 100) * (this.video.duration || 0);
    this.seek(time);
  }

  forward(seconds = 10): void {
    this.seek(this.video.currentTime + seconds);
  }

  backward(seconds = 10): void {
    this.seek(this.video.currentTime - seconds);
  }

  // ============================================================================
  // Volume
  // ============================================================================

  setVolume(volume: number): void {
    this.video.volume = Math.max(0, Math.min(1, volume));
  }

  getVolume(): number {
    return this.video.volume;
  }

  mute(): void {
    this.video.muted = true;
  }

  unmute(): void {
    this.video.muted = false;
  }

  toggleMute(): void {
    this.video.muted = !this.video.muted;
  }

  // ============================================================================
  // Playback Rate
  // ============================================================================

  setPlaybackRate(rate: number): void {
    this.video.playbackRate = Math.max(0.25, Math.min(4, rate));
  }

  getPlaybackRate(): number {
    return this.video.playbackRate;
  }

  // ============================================================================
  // Picture-in-Picture
  // ============================================================================

  async enterPiP(): Promise<void> {
    if (!document.pictureInPictureEnabled) {
      throw new Error('Picture-in-Picture is not supported');
    }
    if (this.video !== document.pictureInPictureElement) {
      await this.video.requestPictureInPicture();
    }
  }

  async exitPiP(): Promise<void> {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    }
  }

  async togglePiP(): Promise<void> {
    if (document.pictureInPictureElement) {
      await this.exitPiP();
    } else {
      await this.enterPiP();
    }
  }

  // ============================================================================
  // Source
  // ============================================================================

  setSrc(src: string): void {
    this.video.src = src;
    this.stateManager.setState({ src, isReady: false, isLoading: true });
  }

  getSrc(): string {
    return this.video.src;
  }

  // ============================================================================
  // State
  // ============================================================================

  getCurrentTime(): number {
    return this.video.currentTime;
  }

  getDuration(): number {
    return this.video.duration || 0;
  }

  isPlaying(): boolean {
    return !this.video.paused && !this.video.ended;
  }

  isPaused(): boolean {
    return this.video.paused;
  }

  isEnded(): boolean {
    return this.video.ended;
  }

  getVideoElement(): HTMLVideoElement {
    return this.video;
  }

  // ============================================================================
  // Event Binding
  // ============================================================================

  private bindVideoEvents(): void {
    const events: [keyof HTMLVideoElementEventMap, () => void][] = [
      [
        'play',
        () => {
          this.stateManager.setState({ paused: false, ended: false });
          this.emit('play', undefined);
        },
      ],
      [
        'pause',
        () => {
          this.stateManager.setState({ paused: true });
          this.emit('pause', undefined);
        },
      ],
      [
        'ended',
        () => {
          this.stateManager.setState({ ended: true, paused: true });
          this.emit('ended', undefined);
        },
      ],
      [
        'timeupdate',
        () => {
          const currentTime = this.video.currentTime;
          const duration = this.video.duration || 0;
          this.stateManager.setState({ currentTime, duration });
          this.emit('timeupdate', { currentTime, duration });
        },
      ],
      [
        'seeking',
        () => {
          this.stateManager.setState({ isSeeking: true });
          this.emit('seeking', { time: this.video.currentTime });
        },
      ],
      [
        'seeked',
        () => {
          this.stateManager.setState({ isSeeking: false });
          this.emit('seeked', { time: this.video.currentTime });
        },
      ],
      [
        'ratechange',
        () => {
          const rate = this.video.playbackRate;
          this.stateManager.setState({ playbackRate: rate });
          this.emit('ratechange', { rate });
        },
      ],
      [
        'loadstart',
        () => {
          this.stateManager.setState({ isLoading: true, isReady: false });
          this.emit('loadstart', undefined);
        },
      ],
      [
        'loadedmetadata',
        () => {
          const { duration, videoWidth, videoHeight } = this.video;
          this.stateManager.setState({
            duration: duration || 0,
            videoWidth,
            videoHeight,
          });
          this.emit('loadedmetadata', { duration: duration || 0, videoWidth, videoHeight });
        },
      ],
      [
        'loadeddata',
        () => {
          this.emit('loadeddata', undefined);
        },
      ],
      [
        'canplay',
        () => {
          this.stateManager.setState({ isLoading: false, isReady: true });
          this.emit('canplay', undefined);
        },
      ],
      [
        'canplaythrough',
        () => {
          this.stateManager.setState({ isLoading: false });
          this.emit('canplaythrough', undefined);
        },
      ],
      [
        'waiting',
        () => {
          this.stateManager.setState({ isWaiting: true });
          this.emit('waiting', undefined);
        },
      ],
      [
        'playing',
        () => {
          this.stateManager.setState({ isWaiting: false, paused: false });
          this.emit('playing', undefined);
        },
      ],
      [
        'progress',
        () => {
          const buffered = StateManager.timeRangesToArray(this.video.buffered);
          const seekable = StateManager.timeRangesToArray(this.video.seekable);
          this.stateManager.setState({ buffered, seekable });
          this.emit('progress', { buffered });
        },
      ],
      [
        'volumechange',
        () => {
          const { volume, muted } = this.video;
          this.stateManager.setState({ volume, muted });
          this.emit('volumechange', { volume, muted });
        },
      ],
      [
        'error',
        () => {
          const error = this.video.error;
          if (error) {
            this.stateManager.setState({ error, isLoading: false });
            this.emit('error', { code: error.code, message: error.message });
          }
        },
      ],
    ];

    events.forEach(([event, handler]) => {
      this.video.addEventListener(event, handler);
      this.eventCleanup.push(() => this.video.removeEventListener(event, handler));
    });

    // Picture-in-Picture events
    this.video.addEventListener('enterpictureinpicture', () => {
      this.stateManager.setState({ isPiP: true });
      this.emit('enterpictureinpicture', undefined);
    });
    this.eventCleanup.push(() => this.video.removeEventListener('enterpictureinpicture', () => {}));

    this.video.addEventListener('leavepictureinpicture', () => {
      this.stateManager.setState({ isPiP: false });
      this.emit('leavepictureinpicture', undefined);
    });
    this.eventCleanup.push(() => this.video.removeEventListener('leavepictureinpicture', () => {}));
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  destroy(): void {
    this.eventCleanup.forEach((cleanup) => cleanup());
    this.eventCleanup = [];
    this.removeAllListeners();
  }
}
