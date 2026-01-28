<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import KanjoPlayerDemo from './lib/KanjoPlayerDemo.svelte'

  function handleCustomEvent(e: Event) {
    const detail = (e as CustomEvent).detail
    if (detail.eventKey === 'set_dark_mode') {
      document.documentElement.classList.add('dark-mode')
    } else if (detail.eventKey === 'set_light_mode') {
      document.documentElement.classList.remove('dark-mode')
    }
  }

  onMount(() => {
    document.addEventListener('kanjo-custom-event', handleCustomEvent)
  })

  onDestroy(() => {
    document.removeEventListener('kanjo-custom-event', handleCustomEvent)
  })
</script>

<div class="app">
  <header>
    <h1>KanjoPlayer Demo</h1>
    <p class="subtitle">Svelte Implementation</p>
  </header>
  <main>
    <KanjoPlayerDemo />
  </main>
</div>
