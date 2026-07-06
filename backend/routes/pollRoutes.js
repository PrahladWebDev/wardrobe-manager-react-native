const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createPoll, listMyPolls, getPollResults, closePoll, getPollByCode, voteOnPoll,
} = require('../controllers/pollController');

// Public — no auth — so anyone with the share code can view and vote.
router.get('/code/:code', getPollByCode);
router.post('/code/:code/vote', voteOnPoll);

// Everything below requires the poll creator to be logged in.
router.use(protect);
router.post('/', createPoll);
router.get('/', listMyPolls);
router.get('/:id', getPollResults);
router.patch('/:id/close', closePoll);

module.exports = router;
