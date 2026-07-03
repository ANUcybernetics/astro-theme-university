<script lang="ts">
  interface Props {
    /** An ISO 8601 datetime string for the deadline. */
    deadline: string;
    /** Text label displayed before the countdown. */
    label?: string;
  }

  let { deadline, label = "Due" }: Props = $props();

  let now = $state(Date.now());

  $effect(() => {
    const id = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(id);
  });

  let target = $derived(new Date(deadline).getTime());
  let remaining = $derived(Math.max(0, target - now));
  let passed = $derived(remaining === 0);

  let days = $derived(Math.floor(remaining / 86_400_000));
  let hours = $derived(Math.floor((remaining % 86_400_000) / 3_600_000));
  let minutes = $derived(Math.floor((remaining % 3_600_000) / 60_000));
  let seconds = $derived(Math.floor((remaining % 60_000) / 1000));

  function pad(n: number) {
    return String(n).padStart(2, "0");
  }
</script>

<div class="at-countdown" class:at-countdown--passed={passed}>
  <span class="at-countdown-label">{label}</span>
  <time datetime={deadline}>
    {#if passed}
      Closed
    {:else if days > 0}
      {days}d {pad(hours)}h {pad(minutes)}m
    {:else}
      {pad(hours)}:{pad(minutes)}:{pad(seconds)}
    {/if}
  </time>
</div>
