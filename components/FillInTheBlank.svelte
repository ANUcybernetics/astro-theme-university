<script lang="ts">
  interface Blank {
    name: string;
    answer: string;
    input: string;
    correct: boolean;
  }

  interface Props {
    /** Code template with placeholders in `<name:answer>` format. */
    template: string;
    /** Optional group label for categorising exercises on a page. */
    group?: string;
  }

  let { template, group = "" }: Props = $props();

  let blanks: Blank[] = $state(parse(template));
  let segments = $derived(split(template));
  let total = $derived(blanks.length);
  let completed = $derived(blanks.filter((b) => b.correct).length);
  let allCorrect = $derived(completed === total && total > 0);

  function parse(tmpl: string): Blank[] {
    const re = /<(\w+):([^>]+)>/g;
    const result: Blank[] = [];
    let m;
    while ((m = re.exec(tmpl)) !== null) {
      result.push({ name: m[1], answer: m[2], input: "", correct: false });
    }
    return result;
  }

  function split(tmpl: string): string[] {
    return tmpl.split(/<\w+:[^>]+>/);
  }

  function check(blank: Blank) {
    blank.correct = blank.input.trim() === blank.answer.trim();
  }
</script>

<div class="at-fitb" class:at-fitb--complete={allCorrect}>
  <pre class="at-fitb-code"><code
      >{#each segments as seg, i}{seg}{#if i < blanks.length}<input
            class="at-fitb-input"
            class:at-fitb-input--correct={blanks[i].correct}
            type="text"
            size={Math.max(blanks[i].answer.length, 4)}
            placeholder={blanks[i].name}
            bind:value={blanks[i].input}
            oninput={() => check(blanks[i])}
            readonly={blanks[i].correct}
          />{/if}{/each}</code
    ></pre>
  <p class="at-fitb-status">
    {completed}/{total}
    {#if allCorrect}
      — complete
    {/if}
  </p>
</div>

<style>
  .at-fitb {
    margin-block: var(--at-spacing-md);
  }

  .at-fitb-code {
    overflow-x: auto;
    padding: var(--at-spacing-md);
    border-radius: var(--at-border-radius, 0.25rem);
    background: var(--at-bg-elevated, #f5f5f5);
    border: 1px solid var(--at-divider, #e0e0e0);
    font-size: var(--at-font-size-sm, 0.875rem);
    white-space: pre-wrap;
  }

  .at-fitb-input {
    font-family: inherit;
    font-size: inherit;
    border: none;
    border-bottom: 2px solid var(--at-accent, #be830e);
    background: transparent;
    padding: 0 0.25em;
    color: inherit;
    outline: none;
  }

  .at-fitb-input:focus {
    border-bottom-color: var(--at-tertiary, #0085ad);
  }

  .at-fitb-input--correct {
    border-bottom-color: var(--at-success, #16a34a);
    color: var(--at-success, #16a34a);
  }

  .at-fitb-status {
    font-size: var(--at-font-size-sm, 0.875rem);
    color: var(--at-text-muted, #6b7280);
    margin-block-start: var(--at-spacing-xs);
  }

  .at-fitb--complete .at-fitb-status {
    color: var(--at-success, #16a34a);
    font-weight: 600;
  }
</style>
