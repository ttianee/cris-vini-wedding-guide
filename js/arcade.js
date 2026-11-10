(() => {
  "use strict";
  const cfg = window.ARCADE_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const currentLang = () => document.documentElement.lang === "en" ? "en" : "pt";
  const msg = (pt, en) => currentLang() === "en" ? en : pt;

  // JSONP keeps the static GitHub Pages site compatible with Apps Script's
  // cross-origin response behavior without requiring a separate server.
  function jsonp(url, params = {}) {
    return new Promise((resolve, reject) => {
      if (!url) return reject(new Error("API_URL_MISSING"));
      const callbackName = "arcadeCb_" + Math.random().toString(36).slice(2);
      const script = document.createElement("script");
      const query = new URLSearchParams({...params, callback: callbackName});
      const timer = setTimeout(() => cleanup(new Error("TIMEOUT")), 15000);
      function cleanup(err, data) {
        clearTimeout(timer);
        try { delete window[callbackName]; } catch (_) { window[callbackName] = undefined; }
        script.remove();
        err ? reject(err) : resolve(data);
      }
      window[callbackName] = (data) => cleanup(null, data);
      script.onerror = () => cleanup(new Error("NETWORK"));
      script.src = url + (url.includes("?") ? "&" : "?") + query.toString();
      document.head.appendChild(script);
    });
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[ch]));
  }

  function normalizeRows(payload) {
    // Wedding Mayhem's existing backend returns { ok: true, entries: [...] }.
    const raw = payload?.entries || payload?.data?.entries ||
      payload?.data?.leaderboard || payload?.data?.top10 ||
      payload?.data?.scores || payload?.leaderboard || payload?.top10 ||
      payload?.scores || payload?.data || payload;
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.items)) return raw.items;
    return [];
  }

  async function loadLeaderboard() {
    const tbody = $("leaderboardRows");
    const status = $("leaderboardStatus");
    if (!tbody) return;
    if (!cfg.leaderboardApiUrl) {
      tbody.innerHTML = `<tr><td colspan="4" class="table-state">${msg("O jogo já está disponível! O placar será conectado ao painel de pontuação existente assim que configurarmos o endereço público do Web App.","The game is ready! The scoreboard will connect to the existing score service once its public Web App URL is configured.")}</td></tr>`;
      status.textContent = msg("A conexão do placar depende do endereço do Web App já usado pelo Wedding Mayhem.","The scoreboard needs the Web App URL already used by Wedding Mayhem.");
      return;
    }
    tbody.innerHTML = `<tr><td colspan="4" class="table-state">${msg("Atualizando...","Refreshing...")}</td></tr>`;
    try {
      // The original Wedding Mayhem endpoint is JSON (not JSONP) and uses action=top.
      const endpoint = new URL(cfg.leaderboardApiUrl);
      endpoint.searchParams.set("action", "top");
      const response = await fetch(endpoint.toString(), { method: "GET", redirect: "follow" });
      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      const data = await response.json();
      if (data?.ok === false) throw new Error(data.error || "API_ERROR");
      const rows = normalizeRows(data).map(item => ({
        nickname: item.nickname || item.player || item.name || item.nick || "Player",
        score: Number(item.score ?? item.finalScore ?? item.totalScore ?? 0),
        title: item.title || item.rankTitle || item.badge || "PLAYER"
      })).filter(x => Number.isFinite(x.score)).sort((a,b) => b.score-a.score).slice(0,10);
      if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="table-state">${msg("Ainda não há pontuações. Seja o primeiro a jogar!","No scores yet. Be the first to play!")}</td></tr>`;
        status.textContent = msg("Placar conectado. Aguardando as primeiras partidas.","Leaderboard connected. Waiting for the first games.");
        return;
      }
      tbody.innerHTML = rows.map((r,i) => `<tr><td>${String(i+1).padStart(2,"0")}</td><td>${escapeHtml(r.nickname)}</td><td>${r.score.toLocaleString(currentLang()==="en"?"en-US":"pt-BR")}</td><td>${escapeHtml(r.title)}</td></tr>`).join("");
      status.textContent = msg("Placar atualizado.","Scoreboard updated.");
    } catch (e) {
      console.error("Wedding Mayhem leaderboard error:", e);
      tbody.innerHTML = `<tr><td colspan="4" class="table-state">${msg("Não foi possível carregar o placar agora.","The scoreboard could not be loaded right now.")}</td></tr>`;
      status.textContent = msg("Verifique se a URL é a mesma usada pelo Wedding Mayhem e se o Web App está publicado com acesso para qualquer pessoa.","Check that this is the same URL used by Wedding Mayhem and that the Web App is deployed with access for anyone.");
    }
  }

  function renderSongs(songs) {
    const list = $("songList");
    if (!list) return;
    if (!songs.length) {
      list.innerHTML = `<div class="song-empty">${msg("A playlist está esperando pela primeira música. Que tal começar?","The playlist is waiting for its first song. Why not start it?")}</div>`;
      return;
    }
    list.innerHTML = songs.map((s,i) => `
      <article class="song-item">
        <div class="song-rank">${String(i+1).padStart(2,"0")}</div>
        <div class="song-details">
          <strong>${escapeHtml(s.song)}</strong>
          <span>${escapeHtml(s.artist)}</span>
          <small>${msg("pedido por","requested by")} ${escapeHtml(s.nickname)} · ♡ ${Number(s.votes||0)}</small>
        </div>
        <button class="vote-button" type="button" data-vote="${escapeHtml(s.id)}" aria-label="${msg("Votar em","Vote for")} ${escapeHtml(s.song)}">♥ ${Number(s.votes||0)}</button>
      </article>`).join("");
  }

  async function loadSongs() {
    const status = $("songListStatus");
    if (!cfg.jukeboxApiUrl) {
      status.textContent = msg("A jukebox será ativada quando o Web App de músicas for publicado e conectado.","The jukebox will go live once the music Web App is deployed and connected.");
      return;
    }
    status.textContent = msg("Carregando pedidos...","Loading requests...");
    try {
      const data = await jsonp(cfg.jukeboxApiUrl, {action:"list"});
      if (!data || data.ok === false) throw new Error("API");
      renderSongs(data.songs || data.data?.songs || []);
      status.textContent = msg("Lista atualizada. Pode votar quantas vezes quiser!","List updated. Vote as many times as you like!");
    } catch (e) {
      status.textContent = msg("Não foi possível carregar a playlist. Tente atualizar em instantes.","Could not load the playlist. Please refresh in a moment.");
    }
  }

  function bindJukebox() {
    const form = $("songForm");
    if (form) form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const status = $("songFormStatus");
      const button = form.querySelector("button[type=submit]");
      const params = {
        action:"suggest",
        song:$("songTitle").value.trim(),
        artist:$("songArtist").value.trim(),
        nickname:$("songNickname").value.trim()
      };
      if (!params.song || !params.artist || !params.nickname) return;
      if (!cfg.jukeboxApiUrl) {
        status.textContent = msg("O formulário está pronto, mas falta conectar o Web App de músicas.","The form is ready, but the music Web App still needs to be connected.");
        return;
      }
      button.disabled = true;
      status.textContent = msg("Enviando sua música...","Sending your song...");
      try {
        const result = await jsonp(cfg.jukeboxApiUrl, params);
        if (!result?.ok) throw new Error(result?.error || "FAILED");
        form.reset();
        status.textContent = msg("Música adicionada! Obrigado pela sugestão 🎶","Song added! Thanks for the request 🎶");
        await loadSongs();
      } catch (e) {
        status.textContent = msg("Não foi possível enviar. Tente novamente.","Couldn't submit the request. Please try again.");
      } finally { button.disabled = false; }
    });

    const list = $("songList");
    if (list) list.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-vote]");
      if (!button) return;
      if (!cfg.jukeboxApiUrl) {
        $("songListStatus").textContent = msg("A votação será ativada quando a jukebox estiver conectada.","Voting will be enabled once the jukebox is connected.");
        return;
      }
      button.disabled = true;
      try {
        const result = await jsonp(cfg.jukeboxApiUrl, {action:"vote", songId:button.dataset.vote});
        if (!result?.ok) throw new Error("VOTE");
        await loadSongs();
      } catch (_) {
        $("songListStatus").textContent = msg("Não foi possível registrar o voto. Tente novamente.","Could not register your vote. Please try again.");
      } finally { button.disabled = false; }
    });
    $("refreshSongs")?.addEventListener("click", loadSongs);
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("refreshLeaderboard")?.addEventListener("click", loadLeaderboard);
    bindJukebox();
    loadLeaderboard();
    loadSongs();
    // Language switch on the shared site changes data-pt/data-en labels.
    $("languageSwitch")?.addEventListener("click", () => setTimeout(() => {
      loadLeaderboard(); loadSongs();
    }, 50));
  });
})();
