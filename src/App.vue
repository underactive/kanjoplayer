<script setup lang="ts">
import { ref } from 'vue'
import VideoPlayer from './components/VideoPlayer.vue'
import KimochiPlayerDemo from './components/KimochiPlayerDemo.vue'

const activeTab = ref<'kimochi' | 'original'>('kimochi')
</script>

<template>
  <div class="app">
    <header>
      <h1>KimochiPlayer PoC</h1>
      <p class="subtitle">WebAssembly Video Player Test Harness</p>

      <!-- Tab Switcher -->
      <div class="tabs">
        <button
          :class="{ active: activeTab === 'kimochi' }"
          @click="activeTab = 'kimochi'"
        >
          KimochiPlayer (New)
        </button>
        <button
          :class="{ active: activeTab === 'original' }"
          @click="activeTab = 'original'"
        >
          Original Player
        </button>
      </div>
    </header>
    <main>
      <KimochiPlayerDemo v-if="activeTab === 'kimochi'" />
      <VideoPlayer v-else />
    </main>
  </div>
</template>

<style>
:root {
  --bg-primary: #1a1a2e;
  --bg-secondary: #16213e;
  --bg-tertiary: #0f0f1a;
  --text-primary: #eaeaea;
  --text-secondary: #a0a0a0;
  --accent: #e94560;
  --accent-secondary: #0f3460;
  --border: #2a2a4a;
  --success: #4ade80;
  --warning: #fbbf24;
  --error: #ef4444;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.6;
}

.app {
  min-height: 100vh;
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

header {
  text-align: center;
  margin-bottom: 30px;
}

header h1 {
  font-size: 2rem;
  color: var(--accent);
  margin-bottom: 5px;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.tabs {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 20px;
}

.tabs button {
  padding: 10px 24px;
  border: 1px solid var(--border);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.tabs button:hover {
  border-color: var(--accent);
  color: var(--text-primary);
}

.tabs button.active {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
}

main {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
</style>
