/* Hydro-mon — UI wiring. State rules live in storage.js, data in pokemon.js. */
(function () {
  "use strict";

  let state = loadState();
  let dexFilter = "all";
  let revealQueue = [];
  let revealing = false;
  let shownLatestDex = null;

  const $ = (id) => document.getElementById(id);

  /* ---------------- water logging ---------------- */

  function addWater(oz) {
    oz = Math.round(Number(oz));
    if (!Number.isFinite(oz) || oz <= 0) return;
    if (oz > 500) {
      showToast("That's more than 500 oz in one go — try a smaller entry.");
      return;
    }
    state.entries.push({ id: makeId(), oz: oz, ts: Date.now() });
    state.lifetimeOz += oz;
    state.catchMeterOz += oz;
    grantDiscoveries();
    persist();
    render();
    showToast("+" + oz + " oz logged");
  }

  function removeEntry(entryId) {
    const idx = state.entries.findIndex((e) => e.id === entryId);
    if (idx === -1) return;
    const [removed] = state.entries.splice(idx, 1);
    state.lifetimeOz = Math.max(0, state.lifetimeOz - removed.oz);
    state.catchMeterOz = Math.max(0, state.catchMeterOz - removed.oz);
    // Caught Pokémon are permanent. Undoing an entry just pushes the next
    // discovery further away, it never takes one back.
    persist();
    render();
    showToast("Removed " + removed.oz + " oz");
  }

  function setDifficulty(key) {
    if (!THRESHOLDS[key] || key === state.difficulty) return;
    state.difficulty = key;
    // A lower bar can mean banked progress already clears it — grant right
    // away rather than waiting for the next log.
    grantDiscoveries();
    persist();
    render();
  }

  /* Hand out every discovery the current meter has earned at the current
     difficulty. A single big entry (or a difficulty change) can cross more
     than one threshold, so this loops. */
  function grantDiscoveries() {
    const threshold = thresholdFor(state);
    while (state.catchMeterOz >= threshold) {
      const pick = drawPokemon(state);
      if (!pick) break;
      state.catchMeterOz -= threshold;
      const record = {
        dex: pick.id,
        ts: Date.now(),
        milestone: state.lifetimeOz
      };
      state.caught.push(record);
      revealQueue.push(record);
    }
    if (revealQueue.length) playNextReveal();
  }

  /* ---------------- discovery reveal ---------------- */

  function playNextReveal() {
    if (revealing || revealQueue.length === 0) return;
    revealing = true;

    const record = revealQueue.shift();
    const mon = POKEDEX[record.dex - 1];
    const modal = $("discovery-modal");
    const art = $("reveal-art");
    const ball = $("pokeball");

    $("reveal-kicker").textContent = "A wild Pokémon appeared…";
    $("discovery-title").textContent = "???";
    $("reveal-meta").textContent = "";
    art.hidden = true;
    art.classList.remove("is-in", "is-pixel");
    ball.hidden = false;
    ball.classList.remove("is-open");
    ball.classList.add("is-shaking");
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add("is-open"));

    // Show the bundled sprite straight away so the reveal always lands, then
    // upgrade to the big official artwork only once it has actually decoded.
    // A slow or unreachable CDN just means you get the pixel art.
    art.src = spriteUrl(mon.id);
    art.alt = mon.name;
    art.classList.add("is-pixel");
    const upgrade = new Image();
    upgrade.onload = () => {
      if (art.alt !== mon.name) return; // a later reveal already took over
      art.src = upgrade.src;
      art.classList.remove("is-pixel");
    };
    upgrade.src = artworkUrl(mon.id);

    setTimeout(() => {
      ball.classList.remove("is-shaking");
      ball.classList.add("is-open");
      setTimeout(() => {
        ball.hidden = true;
        art.hidden = false;
        requestAnimationFrame(() => art.classList.add("is-in"));
        $("reveal-kicker").textContent = "You found";
        $("discovery-title").textContent = mon.name;
        $("reveal-meta").innerHTML =
          '<span class="type type-' + mon.type + '">' + mon.type + "</span>" +
          '<span class="dexno">#' + String(mon.id).padStart(3, "0") + "</span>" +
          '<span class="dexno">at ' + record.milestone.toLocaleString() + " oz</span>";
        modal.classList.add("is-revealed");
      }, 520);
    }, 1350);
  }

  function closeReveal() {
    const modal = $("discovery-modal");
    modal.classList.remove("is-open", "is-revealed");
    setTimeout(() => {
      modal.hidden = true;
      revealing = false;
      render();
      if (revealQueue.length) playNextReveal();
      else if (state.caught.length === TOTAL_POKEMON) {
        showToast("🏆 All 151 caught — Pokédex complete!");
      }
    }, 220);
  }

  /* ---------------- rendering ---------------- */

  function render() {
    renderHydrate();
    renderDex();
    renderStats();
  }

  function renderHydrate() {
    renderLatestCatch();

    const complete = state.caught.length >= TOTAL_POKEMON;
    const pct = complete ? 1 : progressToNext(state);
    const remaining = ozUntilNext(state);

    $("ball-fill").style.width = (pct * 100).toFixed(1) + "%";
    $("ball-water").style.width = (pct * 100).toFixed(1) + "%";
    $("ball-icon").style.left = "calc(" + (pct * 100).toFixed(1) + "% - 14px)";

    if (complete) {
      $("oz-until-next").textContent = "Complete";
      $("next-catch-note").textContent =
        "All 151 Gen 1 Pokémon are yours. Keep drinking anyway — your body still needs it.";
    } else {
      $("oz-until-next").textContent = remaining + " oz to go";
      $("next-catch-note").textContent =
        "A new Pokémon every " + thresholdFor(state) + " oz.";
    }

    document.querySelectorAll(".diff-btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.difficulty === state.difficulty);
    });

    const today = todayOz(state);
    $("today-oz").innerHTML = today + "<small>oz</small>";
    $("lifetime-oz").innerHTML = state.lifetimeOz.toLocaleString() + "<small>oz</small>";
    $("caught-sub").textContent = state.caught.length + " / " + TOTAL_POKEMON + " caught";

    const goalPct = Math.min(1, today / state.dailyGoal);
    $("goal-fill").style.width = (goalPct * 100).toFixed(1) + "%";
    $("goal-sub").textContent =
      today >= state.dailyGoal
        ? "daily goal met ✓"
        : "of " + state.dailyGoal + " oz goal";

    const list = $("log-list");
    const entries = todayEntries(state);
    list.innerHTML = "";
    $("log-empty").hidden = entries.length > 0;
    entries.forEach((e) => {
      const li = document.createElement("li");
      li.innerHTML =
        '<span class="log-oz">+' + e.oz + " oz</span>" +
        '<span class="log-time">' + formatTime(e.ts) + "</span>";
      const undo = document.createElement("button");
      undo.className = "log-undo";
      undo.textContent = "Undo";
      undo.setAttribute("aria-label", "Remove " + e.oz + " oz entry");
      undo.addEventListener("click", () => removeEntry(e.id));
      li.appendChild(undo);
      list.appendChild(li);
    });
  }

  /* The most recent catch, shown at the top of the Hydrate tab. Falls back to
     an empty Poke Ball until the first discovery. */
  function renderLatestCatch() {
    const card = $("latest-card");
    const sprite = $("latest-sprite");
    const emptyBall = $("latest-empty-ball");
    const last = state.caught[state.caught.length - 1];

    if (!last) {
      card.classList.remove("has-catch");
      card.classList.remove.apply(card.classList, typeClasses());
      sprite.hidden = true;
      sprite.removeAttribute("src");
      emptyBall.hidden = false;
      shownLatestDex = null;
      $("latest-kicker").textContent = "Latest catch";
      $("latest-name").textContent = "No Pokémon yet";
      $("latest-meta").textContent = "Your first appears at " + thresholdFor(state) + " oz.";
      return;
    }

    const mon = POKEDEX[last.dex - 1];
    card.classList.add("has-catch");
    card.classList.remove.apply(card.classList, typeClasses());
    card.classList.add("type-bg-" + mon.type);
    emptyBall.hidden = true;
    sprite.hidden = false;
    sprite.src = spriteUrl(mon.id);
    sprite.alt = mon.name;
    if (shownLatestDex !== mon.id) {
      sprite.classList.remove("is-new");
      void sprite.offsetWidth; // restart the animation
      sprite.classList.add("is-new");
      shownLatestDex = mon.id;
    }
    $("latest-kicker").textContent =
      state.caught.length === TOTAL_POKEMON ? "Final catch" : "Latest catch";
    $("latest-name").textContent = mon.name;
    $("latest-meta").innerHTML =
      '<span class="type type-' + mon.type + '">' + mon.type + "</span>" +
      '<span class="dexno">#' + String(mon.id).padStart(3, "0") + "</span>" +
      '<span class="dexno">' + formatDate(last.ts) + "</span>";
  }

  function typeClasses() {
    return TYPES.map((t) => "type-bg-" + t);
  }

  function renderDex() {
    const owned = new Map(state.caught.map((c) => [c.dex, c]));
    const grid = $("dex-grid");
    const count = state.caught.length;

    $("dex-progress-text").textContent = count + " / " + TOTAL_POKEMON + " caught";
    $("dex-progress-fill").style.width = ((count / TOTAL_POKEMON) * 100).toFixed(1) + "%";

    const frag = document.createDocumentFragment();
    POKEDEX.forEach((mon) => {
      const has = owned.has(mon.id);
      if (dexFilter === "caught" && !has) return;
      if (dexFilter === "missing" && has) return;

      const cell = document.createElement("div");
      cell.className = "dex-cell" + (has ? " is-caught type-bg-" + mon.type : " is-locked");

      const num = document.createElement("span");
      num.className = "dex-num";
      num.textContent = "#" + String(mon.id).padStart(3, "0");

      const img = document.createElement("img");
      img.className = "dex-sprite";
      img.loading = "lazy";
      img.src = spriteUrl(mon.id);
      img.alt = has ? mon.name : "Unknown Pokémon";

      const name = document.createElement("span");
      name.className = "dex-name";
      name.textContent = has ? mon.name : "???";

      cell.append(num, img, name);
      if (has) {
        cell.title = mon.name + " — caught " + formatDate(owned.get(mon.id).ts);
      }
      frag.appendChild(cell);
    });

    grid.innerHTML = "";
    if (!frag.childNodes.length) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent =
        dexFilter === "caught" ? "Nothing caught yet." : "You've caught them all!";
      grid.appendChild(empty);
    } else {
      grid.appendChild(frag);
    }
  }

  function renderStats() {
    const byDay = new Map();
    state.entries.forEach((e) => {
      const k = dayKey(e.ts);
      byDay.set(k, (byDay.get(k) || 0) + e.oz);
    });
    const days = byDay.size;
    const best = days ? Math.max.apply(null, Array.from(byDay.values())) : 0;
    const avg = days ? Math.round(state.lifetimeOz / days) : 0;

    $("s-lifetime").innerHTML = state.lifetimeOz.toLocaleString() + "<small>oz</small>";
    $("s-days").textContent = days;
    $("s-avg").innerHTML = avg + "<small>oz</small>";
    $("s-best").innerHTML = best + "<small>oz</small>";

    const log = $("catch-log");
    log.innerHTML = "";
    $("catch-empty").hidden = state.caught.length > 0;
    state.caught
      .slice()
      .reverse()
      .forEach((c) => {
        const mon = POKEDEX[c.dex - 1];
        const li = document.createElement("li");
        li.innerHTML =
          '<img class="catch-sprite" loading="lazy" src="' + spriteUrl(mon.id) + '" alt="">' +
          '<span class="catch-name">' + mon.name + "</span>" +
          '<span class="catch-when">' + formatDate(c.ts) +
          " · " + c.milestone.toLocaleString() + " oz</span>";
        log.appendChild(li);
      });
  }

  /* ---------------- data actions ---------------- */

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hydromon-backup-" + dayKey(Date.now()) + ".json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (typeof parsed !== "object" || parsed === null || !Array.isArray(parsed.caught)) {
          throw new Error("not a Hydro-mon backup");
        }
        if (!confirm("Replace your current data with this backup?")) return;
        state = migrate(parsed);
        persist();
        render();
        showToast("Backup restored");
      } catch (err) {
        showToast("That file isn't a valid Hydro-mon backup.");
      }
    };
    reader.readAsText(file);
  }

  function resetAll() {
    if (!confirm("Delete all water history and every Pokémon you've caught? This can't be undone.")) return;
    if (!confirm("Really sure? Your whole Pokédex goes with it.")) return;
    state = emptyState();
    persist();
    render();
    showToast("Starting over from zero.");
  }

  /* ---------------- helpers ---------------- */

  function persist() {
    if (!saveState(state)) {
      showToast("Couldn't save — this browser is blocking storage.");
    }
  }

  function makeId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function formatTime(ts) {
    return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  function formatDate(ts) {
    return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  }

  let toastTimer;
  function showToast(msg) {
    const el = $("toast");
    el.textContent = msg;
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add("is-up"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.remove("is-up");
      setTimeout(() => { el.hidden = true; }, 250);
    }, 1900);
  }

  function switchView(name) {
    document.querySelectorAll(".tab").forEach((t) => {
      const on = t.dataset.view === name;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", String(on));
    });
    document.querySelectorAll(".view").forEach((v) => {
      v.classList.toggle("is-active", v.id === "view-" + name);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------------- events ---------------- */

  document.querySelectorAll(".qa").forEach((btn) => {
    btn.addEventListener("click", () => addWater(btn.dataset.oz));
  });

  $("custom-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("custom-oz");
    addWater(input.value);
    input.value = "";
    input.blur();
  });

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => switchView(tab.dataset.view));
  });

  document.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      dexFilter = chip.dataset.filter;
      document.querySelectorAll(".chip").forEach((c) => c.classList.toggle("is-active", c === chip));
      renderDex();
    });
  });

  document.querySelectorAll(".diff-btn").forEach((btn) => {
    btn.addEventListener("click", () => setDifficulty(btn.dataset.difficulty));
  });

  $("discovery-close").addEventListener("click", closeReveal);
  $("discovery-modal").addEventListener("click", (e) => {
    if (e.target === $("discovery-modal") && !$("discovery-modal").hidden) closeReveal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("discovery-modal").hidden) closeReveal();
  });

  $("export-btn").addEventListener("click", exportData);
  $("import-btn").addEventListener("click", () => $("import-file").click());
  $("import-file").addEventListener("change", (e) => {
    if (e.target.files[0]) importData(e.target.files[0]);
    e.target.value = "";
  });
  $("reset-btn").addEventListener("click", resetAll);

  // A milestone can be owed from a previous session (e.g. an import, or a
  // save that landed after a crash) — settle up on load.
  grantDiscoveries();
  persist();
  render();
})();
