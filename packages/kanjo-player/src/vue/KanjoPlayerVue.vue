<script setup lang="ts">
/**
 * Vue wrapper component for KanjoPlayer
 */
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { KanjoPlayer } from '../core/KanjoPlayer';
import type {
  KanjoPlayerOptions,
  KanjoPlayerState,
  KanjoPlayerEvents,
  KanjoPlugin,
  ThumbnailConfig,
  KanjoPlayerAPI
} from '../core/types';

// Props
interface Props {
  src?: string;
  autoplay?: boolean;
  muted?: boolean;
  controls?: boolean;
  loop?: boolean;
  poster?: string;
  preload?: 'none' | 'metadata' | 'auto';
  theme?: 'dark' | 'light';
  volume?: number;
  playbackRate?: number;
  thumbnails?: ThumbnailConfig | boolean;
  plugins?: KanjoPlugin[];
  keyboardShortcuts?: boolean;
  doubleClickFullscreen?: boolean;
  controlsTimeout?: number;
}

const props = withDefaults(defineProps<Props>(), {
  autoplay: false,
  muted: false,
  controls: true,
  loop: false,
  preload: 'metadata',
  theme: 'dark',
  volume: 1,
  playbackRate: 1,
  thumbnails: true,
  keyboardShortcuts: true,
  doubleClickFullscreen: true,
  controlsTimeout: 3000,
});

// Emits
const emit = defineEmits<{
  ready: [player: KanjoPlayerAPI];
  play: [];
  pause: [];
  ended: [];
  timeupdate: [data: KanjoPlayerEvents['timeupdate']];
  seeking: [data: KanjoPlayerEvents['seeking']];
  seeked: [data: KanjoPlayerEvents['seeked']];
  volumechange: [data: KanjoPlayerEvents['volumechange']];
  ratechange: [data: KanjoPlayerEvents['ratechange']];
  fullscreenchange: [data: KanjoPlayerEvents['fullscreenchange']];
  error: [data: KanjoPlayerEvents['error']];
  statechange: [state: KanjoPlayerState];
}>();

// Refs
const containerRef = ref<HTMLDivElement | null>(null);
const player = ref<KanjoPlayer | null>(null);
const state = ref<KanjoPlayerState | null>(null);

// Computed options
const playerOptions = computed<Partial<KanjoPlayerOptions>>(() => ({
  src: props.src,
  autoplay: props.autoplay,
  muted: props.muted,
  controls: props.controls,
  loop: props.loop,
  poster: props.poster,
  preload: props.preload,
  theme: props.theme,
  volume: props.volume,
  thumbnails: typeof props.thumbnails === 'boolean'
    ? { enabled: props.thumbnails }
    : props.thumbnails,
  plugins: props.plugins,
  keyboardShortcuts: props.keyboardShortcuts,
  doubleClickFullscreen: props.doubleClickFullscreen,
  controlsTimeout: props.controlsTimeout,
}));

// Initialize player
onMounted(() => {
  if (!containerRef.value) return;

  player.value = new KanjoPlayer({
    ...playerOptions.value,
    container: containerRef.value,
  });

  // Bind events
  bindEvents();

  // Get initial state
  state.value = player.value.getState();

  // Emit ready event
  emit('ready', player.value);
});

// Cleanup
onUnmounted(() => {
  if (player.value) {
    player.value.destroy();
    player.value = null;
  }
});

// Watch for src changes
watch(() => props.src, (newSrc) => {
  if (player.value && newSrc) {
    player.value.setSrc(newSrc);
  }
});

// Watch for volume changes
watch(() => props.volume, (newVolume) => {
  if (player.value && newVolume !== undefined) {
    player.value.setVolume(newVolume);
  }
});

// Watch for muted changes
watch(() => props.muted, (muted) => {
  if (player.value) {
    if (muted) {
      player.value.mute();
    } else {
      player.value.unmute();
    }
  }
});

// Watch for playback rate changes
watch(() => props.playbackRate, (rate) => {
  if (player.value && rate !== undefined) {
    player.value.setPlaybackRate(rate);
  }
});

// Bind player events
function bindEvents() {
  if (!player.value) return;

  player.value.on('play', () => emit('play'));
  player.value.on('pause', () => emit('pause'));
  player.value.on('ended', () => emit('ended'));
  player.value.on('timeupdate', (data) => emit('timeupdate', data));
  player.value.on('seeking', (data) => emit('seeking', data));
  player.value.on('seeked', (data) => emit('seeked', data));
  player.value.on('volumechange', (data) => emit('volumechange', data));
  player.value.on('ratechange', (data) => emit('ratechange', data));
  player.value.on('fullscreenchange', (data) => emit('fullscreenchange', data));
  player.value.on('error', (data) => emit('error', data));
  player.value.on('statechange', (newState) => {
    state.value = newState;
    emit('statechange', newState);
  });
}

// Expose player methods
defineExpose({
  getPlayer: () => player.value,
  getState: () => state.value,
  play: () => player.value?.play(),
  pause: () => player.value?.pause(),
  togglePlay: () => player.value?.togglePlay(),
  seek: (time: number) => player.value?.seek(time),
  seekPercent: (percent: number) => player.value?.seekPercent(percent),
  forward: (seconds?: number) => player.value?.forward(seconds),
  backward: (seconds?: number) => player.value?.backward(seconds),
  setVolume: (volume: number) => player.value?.setVolume(volume),
  getVolume: () => player.value?.getVolume(),
  mute: () => player.value?.mute(),
  unmute: () => player.value?.unmute(),
  toggleMute: () => player.value?.toggleMute(),
  setPlaybackRate: (rate: number) => player.value?.setPlaybackRate(rate),
  getPlaybackRate: () => player.value?.getPlaybackRate(),
  enterFullscreen: () => player.value?.enterFullscreen(),
  exitFullscreen: () => player.value?.exitFullscreen(),
  toggleFullscreen: () => player.value?.toggleFullscreen(),
  enterPiP: () => player.value?.enterPiP(),
  exitPiP: () => player.value?.exitPiP(),
  togglePiP: () => player.value?.togglePiP(),
  getCurrentTime: () => player.value?.getCurrentTime(),
  getDuration: () => player.value?.getDuration(),
  isPlaying: () => player.value?.isPlaying(),
  isPaused: () => player.value?.isPaused(),
  isEnded: () => player.value?.isEnded(),
});
</script>

<template>
  <div ref="containerRef" class="kanjo-player-vue"></div>
</template>

<style scoped>
.kanjo-player-vue {
  width: 100%;
  height: 100%;
}
</style>
