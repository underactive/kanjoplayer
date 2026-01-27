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
          KimochiPlayer
        </button>
        <button
          :class="{ active: activeTab === 'original' }"
          @click="activeTab = 'original'"
        >
          HTML5 &lt;video&gt;
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
  --bg-primary: #f0f2f5;
  --bg-secondary: #e4e6eb;
  --bg-tertiary: #d8dbe0;
  --text-primary: #1c1e21;
  --text-secondary: #606770;
  --accent: #2E82FF;
  --accent-hover: #5a9eff;
  --accent-secondary: #e7f0ff;
  --border: #ced0d4;
  --success: #31a24c;
  --warning: #f0932b;
  --error: #e41e3f;
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
