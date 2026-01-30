<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import KanjoPlayerDemo from './components/KanjoPlayerDemo.vue';

function handleCustomEvent(e: Event) {
  const detail = (e as CustomEvent).detail;
  if (detail.eventKey === 'set_dark_mode') {
    document.documentElement.classList.add('dark-mode');
  } else if (detail.eventKey === 'set_light_mode') {
    document.documentElement.classList.remove('dark-mode');
  }
}

onMounted(() => {
  document.addEventListener('kanjo-custom-event', handleCustomEvent);
});

onUnmounted(() => {
  document.removeEventListener('kanjo-custom-event', handleCustomEvent);
});
</script>

<template>
  <div class="external-links">
    <a href="https://github.com/underactive/kanjoplayer" target="_blank" rel="noopener" title="GitHub Repository">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
    </a>
    <a href="https://www.npmjs.com/package/kanjo-player" target="_blank" rel="noopener" title="npm Package">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M0 0v16h16V0H0zm3 3h10v10H8V5.5H5.5V13H3V3z"/></svg>
    </a>
  </div>
  <div class="app">
    <header>
      <h1>KanjoPlayer Demo</h1>
      <nav class="demo-links">
        <a href="/">Plain HTML</a>
        <a href="/vue/" class="active">Vue</a>
        <a href="/react/">React</a>
        <a href="/svelte/">Svelte</a>
      </nav>
    </header>
    <main>
      <KanjoPlayerDemo />
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
  --accent: #2e82ff;
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
  --accent: #2e82ff;
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
  transition:
    background-color 1.5s ease,
    color 1.5s ease;
}

/* Theme transition for all elements using CSS variables */
*,
*::before,
*::after {
  transition:
    background-color 1.5s ease,
    border-color 1.5s ease,
    color 1.5s ease;
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

.demo-links {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.demo-links a {
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.85rem;
  padding: 6px 12px;
  border-radius: 4px;
  border: 1px solid var(--border);
  transition: all 0.2s;
}

.demo-links a:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.demo-links a.active {
  color: var(--accent);
  border-color: var(--accent);
  background: var(--accent-secondary);
}

.external-links {
  position: fixed;
  top: 20px;
  right: 20px;
  display: flex;
  gap: 8px;
  z-index: 100;
}

.external-links a {
  color: var(--text-secondary);
  padding: 6px;
  border-radius: 4px;
  border: 1px solid var(--border);
  transition: all 0.2s;
  display: flex;
  background: var(--bg-secondary);
}

.external-links a:hover {
  color: var(--accent);
  border-color: var(--accent);
}

main {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
</style>
