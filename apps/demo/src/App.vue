<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import VideoPlayer from './components/VideoPlayer.vue'
import KanjoPlayerDemo from './components/KanjoPlayerDemo.vue'

const activeTab = ref<'kanjo' | 'original'>('kanjo')
const isDarkMode = ref(false)

function handleCustomEvent(e: Event) {
  const detail = (e as CustomEvent).detail
  if (detail.eventKey === 'set_dark_mode') {
    isDarkMode.value = true
    document.documentElement.classList.add('dark-mode')
  } else if (detail.eventKey === 'set_light_mode') {
    isDarkMode.value = false
    document.documentElement.classList.remove('dark-mode')
  }
}

onMounted(() => {
  document.addEventListener('kanjo-custom-event', handleCustomEvent)
})

onUnmounted(() => {
  document.removeEventListener('kanjo-custom-event', handleCustomEvent)
})
</script>

<template>
  <div class="app">
    <header>
      <h1>KanjoPlayer PoC</h1>
      <p class="subtitle">WebAssembly Video Player Test Harness</p>

      <!-- Tab Switcher -->
      <div class="tabs">
        <button
          :class="{ active: activeTab === 'kanjo' }"
          @click="activeTab = 'kanjo'"
        >
          KanjoPlayer
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
      <KanjoPlayerDemo v-if="activeTab === 'kanjo'" />
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
  --text-muted: #8a8d91;
  --accent: #2E82FF;
  --accent-hover: #5a9eff;
  --accent-secondary: #e7f0ff;
  --border: #ced0d4;
  --success: #31a24c;
  --warning: #f0932b;
  --error: #e41e3f;
}

:root.dark-mode {
  --bg-primary: #18191a;
  --bg-secondary: #242526;
  --bg-tertiary: #3a3b3c;
  --text-primary: #e4e6eb;
  --text-secondary: #b0b3b8;
  --text-muted: #6a6c6e;
  --accent: #2E82FF;
  --accent-hover: #5a9eff;
  --accent-secondary: #263c5a;
  --border: #3e4042;
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
  transition: background-color 1.5s ease, color 1.5s ease;
}

/* Theme transition for all elements using CSS variables */
*,
*::before,
*::after {
  transition: background-color 1.5s ease, border-color 1.5s ease, color 1.5s ease;
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
