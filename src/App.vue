<script setup lang="ts">
import VideoPlayer from './components/VideoPlayer.vue'
</script>

<template>
  <div class="app">
    <header>
      <h1>KimochiPlayer PoC</h1>
      <p class="subtitle">WebAssembly Video Player Test Harness</p>
    </header>
    <main>
      <VideoPlayer />
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

main {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
</style>
