const Poll = require('../models/Poll');
const Outfit = require('../models/Outfit');

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid confusion when read aloud

function generateCode(len = 6) {
  let code = '';
  for (let i = 0; i < len; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

async function uniqueCode() {
  for (let i = 0; i < 8; i++) {
    const code = generateCode();
    // eslint-disable-next-line no-await-in-loop
    const exists = await Poll.exists({ code });
    if (!exists) return code;
  }
  throw new Error('Could not generate a unique poll code, try again');
}

// POST /api/polls  { question, outfitIds: [id, id, ...] }
exports.createPoll = async (req, res) => {
  try {
    const { question, outfitIds } = req.body;
    if (!Array.isArray(outfitIds) || outfitIds.length < 2) {
      return res.status(400).json({ message: 'Pick at least 2 outfits to poll between' });
    }
    const outfits = await Outfit.find({ _id: { $in: outfitIds }, user: req.user._id });
    if (outfits.length < 2) return res.status(400).json({ message: 'Could not find those outfits' });

    const code = await uniqueCode();
    const poll = await Poll.create({
      user: req.user._id,
      question: question || 'Which outfit should I wear?',
      code,
      options: outfits.map((o) => ({ outfit: o._id, label: o.name, votes: 0, voterDeviceIds: [] })),
    });
    res.status(201).json({ poll });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/polls  (creator's own polls, most recent first)
exports.listMyPolls = async (req, res) => {
  try {
    const polls = await Poll.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ polls });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/polls/:id  (creator viewing live results)
exports.getPollResults = async (req, res) => {
  try {
    const poll = await Poll.findOne({ _id: req.params.id, user: req.user._id }).populate('options.outfit');
    if (!poll) return res.status(404).json({ message: 'Poll not found' });
    res.json({ poll });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/polls/:id/close
exports.closePoll = async (req, res) => {
  try {
    const poll = await Poll.findOne({ _id: req.params.id, user: req.user._id });
    if (!poll) return res.status(404).json({ message: 'Poll not found' });
    poll.isOpen = false;
    await poll.save();
    res.json({ poll });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/polls/code/:code  (PUBLIC — anyone with the code can view + vote)
exports.getPollByCode = async (req, res) => {
  try {
    const poll = await Poll.findOne({ code: req.params.code.toUpperCase() }).populate('options.outfit');
    if (!poll) return res.status(404).json({ message: 'Poll not found. Check the code and try again.' });
    res.json({ poll });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/polls/code/:code/vote  (PUBLIC)  { optionId, deviceId }
exports.voteOnPoll = async (req, res) => {
  try {
    const { optionId, deviceId } = req.body;
    if (!optionId || !deviceId) return res.status(400).json({ message: 'optionId and deviceId are required' });

    const poll = await Poll.findOne({ code: req.params.code.toUpperCase() });
    if (!poll) return res.status(404).json({ message: 'Poll not found' });
    if (!poll.isOpen) return res.status(400).json({ message: 'This poll is closed' });
    if (poll.hasDeviceVoted(deviceId)) return res.status(400).json({ message: 'You already voted in this poll' });

    const option = poll.options.id(optionId);
    if (!option) return res.status(404).json({ message: 'Option not found' });

    option.votes += 1;
    option.voterDeviceIds.push(deviceId);
    await poll.save();

    const populated = await poll.populate('options.outfit');
    res.json({ poll: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
