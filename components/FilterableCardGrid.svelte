<script lang="ts">
  import { matchCardItems, type CardItem } from "../match-card-items.js";
  import { withBase } from "../url.js";

  type HeadingLevel = "h2" | "h3" | "h4";

  interface Props {
    /** Items to render and filter. */
    items: CardItem[];
    /** Number of columns in the grid. */
    columns?: 2 | 3;
    /** Accessible label for the search input. */
    label?: string;
    /** Placeholder text for the search input. */
    placeholder?: string;
    /** Message shown when the query matches no items. */
    emptyMessage?: string;
    /** Heading level for card titles. */
    headingLevel?: HeadingLevel;
  }

  let {
    items,
    columns = 3,
    label = "Filter items",
    placeholder = "Filter…",
    emptyMessage = "No items match",
    headingLevel = "h3",
  }: Props = $props();

  const searchIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" class="at-card-filter-icon"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m17 17l4 4M3 11a8 8 0 1 0 16 0a8 8 0 0 0-16 0"/></svg>`;

  let query = $state("");
  let inputEl: HTMLInputElement | undefined = $state();

  const filtered = $derived(matchCardItems(items, query));
  const trimmedQuery = $derived(query.trim());

  $effect(() => {
    function handleSlash(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.matches("input, textarea, [contenteditable=true]")) return;
      e.preventDefault();
      inputEl?.focus();
      inputEl?.select();
    }
    document.addEventListener("keydown", handleSlash);
    return () => document.removeEventListener("keydown", handleSlash);
  });

  function handleInputKeydown(e: KeyboardEvent) {
    if (e.key === "Escape" && query) {
      e.preventDefault();
      query = "";
    }
  }
</script>

<div class="at-card-filter">
  <div class="at-card-filter-bar">
    {@html searchIconSvg}
    <input
      bind:this={inputEl}
      bind:value={query}
      onkeydown={handleInputKeydown}
      type="search"
      class="at-card-filter-input"
      {placeholder}
      aria-label={label}
      aria-controls="at-card-filter-results"
      autocomplete="off"
      spellcheck="false"
      data-pagefind-ignore
    />
    <kbd class="at-card-filter-kbd" aria-hidden="true">/</kbd>
  </div>

  <p class="at-card-filter-status" aria-live="polite" aria-atomic="true">
    {#if trimmedQuery}
      Showing {filtered.length} of {items.length}
    {:else}
      {items.length}
      {items.length === 1 ? "item" : "items"}
    {/if}
  </p>

  {#if filtered.length > 0}
    <div id="at-card-filter-results" class={`at-card-grid at-card-grid--${columns}`}>
      {#each filtered as item (item.href)}
        <a class="at-card" href={withBase(item.href)}>
          <div class="at-card-body">
            <svelte:element this={headingLevel} class="at-card-title">
              {item.title}
            </svelte:element>
            {#if item.description}
              <p>{item.description}</p>
            {/if}
          </div>
        </a>
      {/each}
    </div>
  {:else}
    <p class="at-card-filter-empty">
      {emptyMessage}{trimmedQuery ? ` “${trimmedQuery}”.` : "."}
    </p>
  {/if}
</div>
