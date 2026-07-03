<script lang="ts">
  import p5 from "p5";
  import { onMount } from "svelte";

  interface Props {
    /** A p5.js instance mode sketch function. */
    sketch: (p: p5) => void;
    /** CSS width for the sketch container. */
    width?: string;
    /** CSS min-height for the sketch container. */
    height?: string;
  }

  let { sketch, width = "100%", height = "400px" }: Props = $props();

  let container: HTMLDivElement | undefined = $state();

  onMount(() => {
    const instance = new p5(sketch, container!);
    return () => instance.remove();
  });
</script>

<div bind:this={container} class="at-p5-sketch" style:width style:min-height={height}></div>
