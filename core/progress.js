'use strict';

const fs = require('fs');
const path = require('path');

// Scoreboard progress survives server restarts; everything else (records,
// mutations, sessions) stays in-memory and resets on purpose.
const PROGRESS_FILE = path.join(__dirname, '..', '.progress.json');

function loadProgress() {
  try {
    const raw = fs.readFileSync(PROGRESS_FILE, 'utf8');
    const ids = JSON.parse(raw);
    return new Set(Array.isArray(ids) ? ids : []);
  } catch {
    return new Set();
  }
}

function saveProgress(solvedSet) {
  try {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify([...solvedSet]));
  } catch (err) {
    console.error('Failed to persist scoreboard progress:', err.message);
  }
}

module.exports = { loadProgress, saveProgress };
