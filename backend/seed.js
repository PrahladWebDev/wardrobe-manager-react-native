// Idempotent-ish demo seed: creates  demo user (if missing) and a starter wardrobe.
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const ClothingItem = require('./models/ClothingItem');
const Outfit = require('./models/Outfit');

const DEMO_EMAIL = 'demo@wardrobe.app';

const items = [
  { name: 'White Crew T-Shirt', category: 'top', color: 'white', season: 'summer', occasions: ['casual'], price: 599 },
  { name: 'Black Hoodie', category: 'top', color: 'black', season: 'winter', occasions: ['casual', 'lounge'], price: 1499 },
  { name: 'Blue Denim Shirt', category: 'top', color: 'blue', season: 'all', occasions: ['casual', 'work'], price: 1299 },
  { name: 'Formal White Shirt', category: 'top', color: 'white', season: 'all', occasions: ['work', 'formal'], price: 1799 },
  { name: 'Blue Slim Jeans', category: 'bottom', color: 'blue', season: 'all', occasions: ['casual'], price: 2199 },
  { name: 'Black Chinos', category: 'bottom', color: 'black', season: 'all', occasions: ['work', 'casual'], price: 1899 },
  { name: 'Grey Track Pants', category: 'bottom', color: 'grey', season: 'winter', occasions: ['lounge'], price: 999 },
  { name: 'White Sneakers', category: 'shoes', color: 'white', season: 'all', occasions: ['casual'], price: 3299 },
  { name: 'Black Formal Shoes', category: 'shoes', color: 'black', season: 'all', occasions: ['formal', 'work'], price: 3999 },
  { name: 'Brown Sandals', category: 'shoes', color: 'brown', season: 'summer', occasions: ['casual'], price: 899 },
  { name: 'Denim Jacket', category: 'outerwear', color: 'blue', season: 'winter', occasions: ['casual'], price: 2799 },
  { name: 'Rain Jacket', category: 'outerwear', color: 'yellow', season: 'monsoon', occasions: ['casual'], price: 2199 },
  { name: 'Leather Belt', category: 'accessory', color: 'brown', season: 'all', occasions: ['work', 'formal'], price: 799 },
  { name: 'Canvas Backpack', category: 'bag', color: 'green', season: 'all', occasions: ['casual', 'travel'], price: 1999 },
];

async function run() {
  await connectDB();

  let user = await User.findOne({ email: DEMO_EMAIL });
  if (!user) {
    user = await User.create({
      name: 'Demo User',
      email: DEMO_EMAIL,
      password: 'demo1234',
      homeCity: 'Gurgaon',
      homeLat: 28.4595,
      homeLon: 77.0266,
    });
    console.log('👤 Created demo user:', DEMO_EMAIL, '(password: demo1234)');
  } else {
    console.log('👤 Demo user already exists, reusing it (progress preserved)');
  }

  const existingCount = await ClothingItem.countDocuments({ user: user._id });
  if (existingCount === 0) {
    const created = await ClothingItem.insertMany(items.map((i) => ({ ...i, user: user._id })));
    console.log(`👕 Seeded ${created.length} clothing items`);

    const byName = Object.fromEntries(created.map((i) => [i.name, i._id]));
    await Outfit.create([
      {
        user: user._id,
        name: 'Casual Weekend',
        items: [byName['Blue Denim Shirt'], byName['Blue Slim Jeans'], byName['White Sneakers']],
        occasion: 'casual',
        season: 'all',
        favorite: true,
      },
      {
        user: user._id,
        name: 'Office Ready',
        items: [byName['Formal White Shirt'], byName['Black Chinos'], byName['Black Formal Shoes'], byName['Leather Belt']],
        occasion: 'work',
        season: 'all',
      },
    ]);
    console.log('👔 Seeded 2 starter outfits');
  } else {
    console.log(`👕 Demo user already has ${existingCount} items — skipping item seed (progress preserved)`);
  }

  console.log('✅ Seed complete');
  await mongoose.connection.close();
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
