const mongoose = require('mongoose');
const ClothingItem = require('../models/ClothingItem');
const WearLog = require('../models/WearLog');

// GET /api/stats/overview
exports.overview = async (req, res) => {
  try {
    const userId = req.user._id;

    const [totals] = await ClothingItem.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          totalValue: { $sum: '$price' },
          totalWears: { $sum: '$wearCount' },
          inLaundryCount: { $sum: { $cond: ['$inLaundry', 1, 0] } },
          neverWornCount: { $sum: { $cond: [{ $eq: ['$wearCount', 0] }, 1, 0] } },
        },
      },
    ]);

    const byCategory = await ClothingItem.aggregate([
      { $match: { user: userId } },
      { $group: { _id: '$category', count: { $sum: 1 }, value: { $sum: '$price' } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      totals: totals || { totalItems: 0, totalValue: 0, totalWears: 0, inLaundryCount: 0, neverWornCount: 0 },
      byCategory,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/stats/cost-per-wear?limit=10&order=asc|desc
exports.costPerWear = async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = Number(req.query.limit) || 10;
    const sortDir = req.query.order === 'asc' ? 1 : -1;

    const items = await ClothingItem.aggregate([
      { $match: { user: userId, price: { $gt: 0 } } },
      {
        $addFields: {
          effectiveWears: { $cond: [{ $gt: ['$wearCount', 0] }, '$wearCount', 1] },
        },
      },
      {
        $addFields: {
          costPerWear: { $divide: ['$price', '$effectiveWears'] },
        },
      },
      { $sort: { costPerWear: sortDir } },
      { $limit: limit },
      { $project: { name: 1, category: 1, imageUrl: 1, price: 1, wearCount: 1, costPerWear: 1 } },
    ]);

    res.json({ items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/stats/most-worn?limit=10
exports.mostWorn = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const items = await ClothingItem.find({ user: req.user._id })
      .sort({ wearCount: -1 })
      .limit(limit);
    res.json({ items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/stats/least-worn?limit=10  (worn at least once, ascending)
exports.leastWorn = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const items = await ClothingItem.find({ user: req.user._id })
      .sort({ wearCount: 1, createdAt: 1 })
      .limit(limit);
    res.json({ items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/stats/wear-timeline?days=30
exports.wearTimeline = async (req, res) => {
  try {
    const days = Number(req.query.days) || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const timeline = await WearLog.aggregate([
      { $match: { user: req.user._id, wornAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$wornAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({ timeline });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
