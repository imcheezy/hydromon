/* Hydro-mon leaderboard — optional, best-effort sync of a small progress
   summary to Firestore so a couple of players can compare on one shared
   tab. Reads saved state via loadState() from storage.js, same as app.js
   does, but keeps no state of its own beyond the Firestore snapshot: the
   core app has no dependency on this file and works fully offline whether
   or not this loads or Firebase is reachable. */
(function () {
  "use strict";

  const NICKNAME_KEY = "hydromon.nickname";
  const DEVICE_KEY = "hydromon.deviceId";

  const $ = (id) => document.getElementById(id);

  let db = null;
  let players = [];

  function isConfigured() {
    const cfg = window.HYDROMON_FIREBASE_CONFIG;
    return !!(cfg && cfg.apiKey && cfg.apiKey.indexOf("REPLACE_ME") === -1);
  }

  function deviceId() {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = crypto.randomUUID
        ? crypto.randomUUID()
        : "p" + Date.now().toString(36) + Math.random().toString(36).slice(2);
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  }

  function getNickname() {
    return localStorage.getItem(NICKNAME_KEY) || "";
  }

  function setNickname(name) {
    localStorage.setItem(NICKNAME_KEY, name);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  }

  /* ---------------- rendering ---------------- */

  function renderYouLine() {
    const el = $("leaderboard-you");
    if (!el) return;
    el.textContent = getNickname() ? "Playing as " + getNickname() : "Not on the board yet";
  }

  function renderBody(html) {
    const el = $("leaderboard-body");
    if (el) el.innerHTML = html;
  }

  function renderUnconfigured() {
    renderBody('<p class="empty">Leaderboard isn’t set up yet.</p>');
  }

  function renderError() {
    renderBody('<p class="empty">Can’t reach the leaderboard right now — your own progress is unaffected.</p>');
  }

  function renderBoard() {
    if (!players.length) {
      renderBody('<p class="empty">No one’s here yet — be the first to join.</p>');
      return;
    }
    const mine = deviceId();
    const sorted = players.slice().sort((a, b) => (b.lifetimeOz || 0) - (a.lifetimeOz || 0));
    const rows = sorted
      .map((pl, i) => {
        const you = pl.id === mine;
        const last = pl.lastCatch && pl.lastCatch.name
          ? " · found " + escapeHtml(pl.lastCatch.name)
          : "";
        return (
          '<li class="board-row' + (you ? " is-you" : "") + '">' +
          '<span class="board-rank">' + (i + 1) + "</span>" +
          '<span class="board-name">' + escapeHtml(pl.nickname || "Anonymous") +
          (you ? " <em>you</em>" : "") + "</span>" +
          '<span class="board-stats">' + (pl.lifetimeOz || 0).toLocaleString() + " oz · " +
          (pl.caughtCount || 0) + "/" + TOTAL_POKEMON + last + "</span>" +
          "</li>"
        );
      })
      .join("");
    renderBody('<ul class="board-list">' + rows + "</ul>");
  }

  /* ---------------- Firestore ---------------- */

  function listen() {
    if (!db) return;
    db.collection("players").onSnapshot(
      (snap) => {
        players = [];
        snap.forEach((doc) => players.push(Object.assign({ id: doc.id }, doc.data())));
        renderBoard();
      },
      (err) => {
        console.warn("Leaderboard listener error:", err);
        renderError();
      }
    );
  }

  /* Called by app.js's persist() after every local save. Best-effort:
     never throws, never blocks the caller, no-ops until a nickname is
     set or Firebase isn't reachable. */
  function sync() {
    if (!db || !getNickname()) return;
    const state = loadState();
    const last = state.caught[state.caught.length - 1];
    const mon = last ? POKEDEX[last.dex - 1] : null;
    const summary = {
      nickname: getNickname(),
      lifetimeOz: state.lifetimeOz,
      caughtCount: state.caught.length,
      difficulty: state.difficulty,
      lastCatch: last ? { dex: last.dex, name: mon ? mon.name : "", ts: last.ts } : null,
      updatedAt: Date.now()
    };
    db.collection("players").doc(deviceId()).set(summary).catch((err) => {
      console.warn("Leaderboard sync failed:", err);
    });
  }

  function init() {
    if (!isConfigured()) {
      renderUnconfigured();
      return;
    }
    try {
      if (typeof firebase === "undefined") throw new Error("Firebase SDK unavailable");
      if (!firebase.apps.length) firebase.initializeApp(window.HYDROMON_FIREBASE_CONFIG);
      db = firebase.firestore();
      listen();
      if (getNickname()) sync();
    } catch (err) {
      console.warn("Leaderboard unavailable:", err);
      renderError();
    }
  }

  /* ---------------- events ---------------- */

  const form = $("nickname-form");
  const input = $("nickname-input");
  if (input) input.value = getNickname();
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = input.value.trim().slice(0, 20);
      if (!name) return;
      setNickname(name);
      renderYouLine();
      sync();
    });
  }

  renderYouLine();
  init();

  // Exposed so app.js's persist() can trigger a sync after every local
  // save, without app.js needing to know anything about Firebase.
  window.HydromonLeaderboard = { sync: sync };
})();
