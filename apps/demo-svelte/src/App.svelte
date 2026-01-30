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
    <nav class="demo-links">
      <a href="/">Plain HTML</a>
      <a href="/vue/">Vue</a>
      <a href="/react/">React</a>
      <a href="/svelte/" class="active">Svelte</a>
    </nav>
  </header>
  <main>
    <KanjoPlayerDemo />
  </main>
</div>
