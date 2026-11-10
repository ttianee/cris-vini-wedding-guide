/**
 * Cris & Vini — Wedding Jukebox
 * 1) Create a Google Sheet.
 * 2) Extensions > Apps Script; paste this file.
 * 3) Set SHEET_ID below to the spreadsheet ID.
 * 4) Deploy as Web app: Execute as Me; access Anyone.
 *
 * Public by design: song title, artist, nickname and vote totals are visible
 * to wedding guests. Do not collect personal or sensitive information here.
 */
const SHEET_ID = "PASTE_GOOGLE_SHEET_ID_HERE";
const SONGS_TAB = "Songs";
const VOTES_TAB = "Votes";

function doGet(e) {
  const p = (e && e.parameter) || {};
  const action = String(p.action || "list");
  let result;
  try {
    if (action === "list") result = { ok: true, songs: listSongs_() };
    else if (action === "suggest") result = suggestSong_(p);
    else if (action === "vote") result = voteSong_(p);
    else result = { ok: false, error: "Unknown action" };
  } catch (err) {
    result = { ok: false, error: String(err && err.message || err) };
  }
  const json = JSON.stringify(result);
  const callback = String(p.callback || "");
  if (callback && /^[A-Za-z_$][0-9A-Za-z_$\\.]*$/.test(callback)) {
    return ContentService.createTextOutput(callback + "(" + json + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function spreadsheet_() {
  if (!SHEET_ID || SHEET_ID.indexOf("PASTE_") === 0) throw new Error("Configure SHEET_ID in Apps Script.");
  return SpreadsheetApp.openById(SHEET_ID);
}

function ensureSheets_() {
  const ss = spreadsheet_();
  let songs = ss.getSheetByName(SONGS_TAB);
  if (!songs) {
    songs = ss.insertSheet(SONGS_TAB);
    songs.appendRow(["id", "song", "artist", "nickname", "submittedAt"]);
  }
  let votes = ss.getSheetByName(VOTES_TAB);
  if (!votes) {
    votes = ss.insertSheet(VOTES_TAB);
    votes.appendRow(["songId", "votedAt"]);
  }
  return { songs, votes };
}

function listSongs_() {
  const sh = ensureSheets_();
  const songRows = sh.songs.getDataRange().getValues();
  const voteRows = sh.votes.getLastRow() > 1
    ? sh.votes.getRange(2, 1, sh.votes.getLastRow() - 1, 2).getValues() : [];
  const counts = {};
  voteRows.forEach(r => { const id = String(r[0]); counts[id] = (counts[id] || 0) + 1; });
  return songRows.slice(1).filter(r => r[0]).map(r => ({
    id: String(r[0]), song: String(r[1]), artist: String(r[2]),
    nickname: String(r[3]), submittedAt: r[4] instanceof Date ? r[4].toISOString() : String(r[4] || ""),
    votes: counts[String(r[0])] || 0
  })).sort((a, b) => b.votes - a.votes || a.song.localeCompare(b.song));
}

function suggestSong_(p) {
  const song = clean_(p.song, 120);
  const artist = clean_(p.artist, 100);
  const nickname = clean_(p.nickname, 32);
  if (!song || !artist || !nickname) throw new Error("Song, artist and nickname are required.");
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = ensureSheets_().songs;
    const id = Utilities.getUuid();
    sh.appendRow([id, song, artist, nickname, new Date()]);
    return { ok: true, id: id };
  } finally { lock.releaseLock(); }
}

function voteSong_(p) {
  const songId = clean_(p.songId, 80);
  if (!songId) throw new Error("Missing song ID.");
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = ensureSheets_();
    const rows = sh.songs.getDataRange().getValues();
    const exists = rows.slice(1).some(r => String(r[0]) === songId);
    if (!exists) throw new Error("Song not found.");
    sh.votes.appendRow([songId, new Date()]);
    return { ok: true };
  } finally { lock.releaseLock(); }
}

function clean_(value, maxLength) {
  return String(value || "").replace(/[<>]/g, "").trim().slice(0, maxLength);
}
