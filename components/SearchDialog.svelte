<script lang="ts">
  interface PagefindResult {
    url: string;
    meta: { title: string };
    excerpt: string;
  }

  interface PagefindSearchHit {
    data(): Promise<PagefindResult>;
  }

  interface PagefindApi {
    init(): Promise<void>;
    search(query: string): Promise<{ results: PagefindSearchHit[] }>;
  }

  let { basePath = "/" }: { basePath?: string } = $props();

  // Astro's import.meta.env.BASE_URL omits the trailing slash when `base` is
  // configured without one, so normalise before joining asset paths under it —
  // otherwise `${basePath}pagefind/…` collapses to `…sitepagefind/…` (404).
  const base = $derived(basePath.endsWith("/") ? basePath : `${basePath}/`);

  const searchIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m17 17l4 4M3 11a8 8 0 1 0 16 0a8 8 0 0 0-16 0"/></svg>`;

  let dialogEl: HTMLDialogElement;
  let inputEl: HTMLInputElement;
  let query = $state("");
  let results = $state<PagefindResult[]>([]);
  let loading = $state(false);
  let selectedIndex = $state(0);
  let pagefind = $state<PagefindApi | null>(null);
  let loadFailed = $state(false);
  let debounceTimer: ReturnType<typeof setTimeout>;

  async function loadPagefind(): Promise<PagefindApi | null> {
    if (pagefind) return pagefind;
    if (loadFailed) return null;
    try {
      const url = `${base}pagefind/pagefind.js`;
      const mod = (await import(/* @vite-ignore */ url)) as PagefindApi;
      await mod.init();
      pagefind = mod;
      return pagefind;
    } catch {
      loadFailed = true;
      return null;
    }
  }

  function openDialog() {
    dialogEl.showModal();
    requestAnimationFrame(() => inputEl?.focus());
  }

  function closeDialog() {
    dialogEl.close();
    query = "";
    results = [];
    selectedIndex = 0;
  }

  async function search(q: string) {
    if (!q.trim()) {
      results = [];
      return;
    }
    loading = true;
    const pf = await loadPagefind();
    if (!pf) {
      loading = false;
      return;
    }
    const searchResult = await pf.search(q);
    const loaded = await Promise.all(searchResult.results.slice(0, 10).map((r) => r.data()));
    results = loaded;
    selectedIndex = 0;
    loading = false;
  }

  function handleInput() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => search(query), 250);
  }

  function handleInputKeydown(e: KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
      scrollSelectedIntoView();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
      scrollSelectedIntoView();
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      window.location.href = results[selectedIndex].url;
    } else if (e.key === "Escape") {
      // A type="search" input swallows the first Escape to clear its own text,
      // so the dialog's native Escape-to-close never fires while the field has
      // content. Close explicitly so one Escape always dismisses the dialog.
      e.preventDefault();
      closeDialog();
    }
  }

  function scrollSelectedIntoView() {
    requestAnimationFrame(() => {
      dialogEl?.querySelector("[aria-selected='true']")?.scrollIntoView({ block: "nearest" });
    });
  }

  $effect(() => {
    function handleGlobalKeydown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (dialogEl.open) closeDialog();
        else openDialog();
      }
    }
    document.addEventListener("keydown", handleGlobalKeydown);
    return () => document.removeEventListener("keydown", handleGlobalKeydown);
  });

  $effect(() => {
    function handleOpen() {
      openDialog();
    }
    document.addEventListener("at-search-open", handleOpen);
    return () => document.removeEventListener("at-search-open", handleOpen);
  });
</script>

<dialog bind:this={dialogEl} class="at-search-dialog" onclose={closeDialog}>
  <div class="at-search-panel">
    <div class="at-search-header">
      {@html searchIconSvg}
      <input
        bind:this={inputEl}
        bind:value={query}
        oninput={handleInput}
        onkeydown={handleInputKeydown}
        type="search"
        placeholder="Search..."
        class="at-search-input"
        aria-label="Search"
        autocomplete="off"
      />
      <kbd class="at-search-kbd">Esc</kbd>
    </div>

    {#if loading}
      <p class="at-search-empty">Searching&hellip;</p>
    {:else if results.length > 0}
      <ul class="at-search-results" role="listbox" aria-label="Search results">
        {#each results as result, i}
          <li role="option" aria-selected={i === selectedIndex}>
            <a
              href={result.url}
              class="at-search-result"
              class:at-search-result--selected={i === selectedIndex}
            >
              <span class="at-search-result-title">{result.meta.title}</span>
              <span class="at-search-result-excerpt">{@html result.excerpt}</span>
            </a>
          </li>
        {/each}
      </ul>
    {:else if query && !loadFailed}
      <p class="at-search-empty">No results for &ldquo;{query}&rdquo;</p>
    {:else if loadFailed && query}
      <p class="at-search-empty">Search index not available.</p>
    {/if}
  </div>
</dialog>
