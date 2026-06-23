'use strict';

const express = require('express');
const { CHALLENGES, FLAG_TO_CHALLENGE } = require('../challenges');
const { saveProgress } = require('../progress');

module.exports = function scoreboardRoutes(store) {
  const router = express.Router();

  // Public-ish: lists objectives + the active domain's vocabulary. No flags.
  router.get('/', (req, res) => {
    res.json({
      domain: store.domain.key,
      brand: store.domain.brand,
      terms: store.domain.terms,
      solvedCount: store.solved.size,
      total: CHALLENGES.length,
      challenges: CHALLENGES.map((c) => ({
        id: c.id, title: c.title, category: c.category, hint: c.hint,
        titlePt: c.titlePt, categoryPt: c.categoryPt, hintPt: c.hintPt,
        difficulty: c.difficulty, solved: store.solved.has(c.id),
      })),
    });
  });

  // Submit a captured flag to mark a challenge solved.
  router.post('/submit', (req, res) => {
    const flag = (req.body && req.body.flag ? String(req.body.flag) : '').trim();
    const challenge = FLAG_TO_CHALLENGE[flag];
    if (!challenge) return res.json({ ok: false, message: 'not a valid flag' });
    const firstTime = !store.solved.has(challenge.id);
    store.solved.add(challenge.id);
    saveProgress(store.solved);
    res.json({
      ok: true, firstTime,
      challenge: { id: challenge.id, title: challenge.title, titlePt: challenge.titlePt, category: challenge.category },
      solvedCount: store.solved.size, total: CHALLENGES.length,
    });
  });

  return router;
};
