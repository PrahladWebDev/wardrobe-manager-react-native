# Bug Fix Guide

Status as of 2026-09-15:

- `backend/.env` now defines all 13 variables the code reads. The four empty ones (`OCR_API_KEY`, `REMOVEBG_API_KEY`, `UPC_API_KEY`, `UPC_API_USER_KEY`) are optional and the code degrades gracefully without them.
- The backend connects to MongoDB Atlas and `GET /api/health` on port 5009 returns `{"ok":true}`.
- `.env` is gitignored and untracked. A `backend/.env.example` has been added so the README's `cp .env.example .env` step works.

Each fix below has: what breaks, where, the patch, and how to verify. Work top to bottom; the first seven are the ones users will hit on day one.

| # | Fix | Area | Severity |
|---|---|---|---|
| 1 | Fail fast on missing env and busy port | backend | high |
| 2 | Deleting an item crashes the Outfits tab | backend + frontend | high |
| 3 | Polls are unreachable | frontend | high |
| 4 | Server Settings screen does not exist | frontend | high |
| 5 | Any startup error logs the user out, and 401s are never handled | frontend | high |
| 6 | Public poll voting has no outfit images and leaks device IDs | backend | high |
| 7 | Android drops "Scan Receipt" and "Cancel" from the Add Photo menu | frontend | high |
| 8 | Wear dates shift by one day outside UTC | backend + frontend | medium |
| 9 | Search: regex injection and a request per keystroke | backend + frontend | medium |
| 10 | Packing list: unvalidated dates and wrong occasion keys | backend + frontend | medium |
| 11 | Outfit builder and Create Poll only see the first page | frontend | medium |
| 12 | Barcode scanner fires multiple lookups | frontend | medium |
| 13 | Outfits accept other users' item IDs | backend | medium |
| 14 | Invalid IDs and enum values return 500 | backend | medium |
| 15 | app.json blocks EAS builds and over-requests permissions | frontend | medium |
| 16 | Smaller fixes (one-liners) | both | low |

---

## 1. Fail fast on missing env and busy port

**Breaks:** with an empty `.env`, login throws `secretOrPrivateKey must have a value` and uploads fail with a Cloudinary 500. When port 5009 is already taken (a second `nodemon`, or PM2), the process dies with an unhandled `EADDRINUSE` stack trace.

**File:** `backend/server.js`

```js
// top of file, right after require('dotenv').config();
const REQUIRED_ENV = ['MONGO_URI', 'JWT_SECRET', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
const missingEnv = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missingEnv.length) {
  console.error(`❌ Missing required env vars: ${missingEnv.join(', ')} (see backend/.env.example)`);
  process.exit(1);
}

// bottom of file, replace the connectDB().then(...) block
connectDB().then(() => {
  const server = app.listen(PORT, () => console.log(`🚀 Wardrobe Manager API running on port ${PORT}`));
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') console.error(`❌ Port ${PORT} is already in use. Stop the other instance (nodemon / pm2) or change PORT in .env.`);
    else console.error(err);
    process.exit(1);
  });
});
```

**Verify:** temporarily blank `JWT_SECRET` and run `npm start`; it should exit with the message. Start a second instance while one is running; it should print the port message instead of a stack trace.

---

## 2. Deleting an item crashes the Outfits tab

**Breaks:** `deleteItem` removes the document but not its references. Outfits keep the ObjectId, `populate('items')` returns `null` for it, and `OutfitsScreen.js` line 96 does `it._id` on null. Cloudinary images are also never deleted, on delete or on photo replace.

**File:** `backend/controllers/itemController.js`

```js
const Outfit = require('../models/Outfit');
const PackingList = require('../models/PackingList');
const WishlistItem = require('../models/WishlistItem');

// Cloudinary secure_url -> public_id ("wardrobe-manager/abc123")
function publicIdFromUrl(url = '') {
  const m = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-z0-9]+$/i);
  return m ? m[1] : null;
}
async function destroyCloudinaryImages(urls = []) {
  await Promise.all(urls.map((u) => {
    const id = publicIdFromUrl(u);
    return id ? cloudinary.uploader.destroy(id).catch(() => {}) : null;
  }));
}

exports.deleteItem = async (req, res) => {
  try {
    const item = await ClothingItem.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    const id = item._id;
    await Promise.all([
      WearLog.deleteMany({ item: id }),
      Outfit.updateMany({ user: req.user._id, items: id }, { $pull: { items: id } }),
      PackingList.updateMany({ user: req.user._id }, { $pull: { tops: id, bottoms: id, shoes: id, outerwear: id, accessories: id } }),
      WishlistItem.updateMany({ linkedItem: id }, { $set: { linkedItem: null } }),
      destroyCloudinaryImages(item.images && item.images.length ? item.images : [item.imageUrl].filter(Boolean)),
    ]);
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
```

In `updateItem`, after the `images = images.filter(...)` line, also clean up removed photos:

```js
if (Array.isArray(toRemove) && toRemove.length) {
  const before = images;
  images = images.filter((url) => !toRemove.includes(url));
  destroyCloudinaryImages(before.filter((url) => toRemove.includes(url))); // fire and forget
}
```

**File:** `backend/controllers/outfitController.js`. Existing data may already contain dangling refs, so strip nulls in every response that populates:

```js
// in getOutfits, inside the map:
obj.items = (obj.items || []).filter(Boolean);
// in getOutfit / createOutfit / updateOutfit before res.json:
const out = populated.toObject(); out.items = out.items.filter(Boolean); res.json({ outfit: out });
```

**File:** `frontend/src/screens/OutfitsScreen.js` line 96 and `OutfitDetailScreen.js` line 67. Belt and braces:

```js
{(item.items || []).filter(Boolean).slice(0, 4).map((it) => (
```

**Verify:** create an outfit with three items, delete one of the items, open the Outfits tab. It should render two thumbnails and not crash. Check the Cloudinary media library: the deleted item's photos are gone.

---

## 3. Polls are unreachable

**Breaks:** `Polls`, `CreatePoll`, `PollResults`, `VotePoll` are registered in the Outfits stack but nothing navigates to `Polls`. Four screens and three routes are dead.

**File:** `frontend/src/navigation/AppNavigator.js`, Outfits header (around line 91):

```jsx
headerRight: () => (
  <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
    <TouchableOpacity
      onPress={() => navigation.navigate('Polls')}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityRole="button" accessibilityLabel="Outfit polls"
      style={{ paddingHorizontal: 6 }}
    >
      <Ionicons name="people-outline" size={22} color={theme.colors.accent} />
    </TouchableOpacity>
    <TouchableOpacity
      onPress={() => navigation.navigate('SurpriseOutfit')}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityRole="button" accessibilityLabel="Surprise me"
      style={{ paddingHorizontal: 6 }}
    >
      <Ionicons name="shuffle" size={22} color={theme.colors.accent} />
    </TouchableOpacity>
  </View>
),
```

Also note: voting lives inside the authenticated stack while the backend route is public. Friends without an account cannot vote. Add an "I have a poll code" link on `LoginScreen` that navigates to a `VotePoll` screen registered in `AuthStackNav`, and register it there as well.

**Verify:** Outfits tab shows a people icon; tapping it opens Outfit Polls; create a poll with two outfits and share the code.

---

## 4. Server Settings screen does not exist

**Breaks:** `client.js` and the README describe a screen to set the API URL. `SettingsScreen.js` only has themes and rotation. `setBaseURL` and `testConnection` are exported but never imported, so the app is hard-wired to `DEFAULT_BASE_URL`.

**File:** `frontend/src/screens/SettingsScreen.js`

```jsx
import React, { useState, useEffect } from 'react';
import Input from '../components/Input';
import Button from '../components/Button';
import { getBaseURL, setBaseURL, testConnection, DEFAULT_BASE_URL } from '../api/client';

// inside the component:
const { user, updateProfile, logout } = useAuth();
const [serverUrl, setServerUrl] = useState('');
const [testing, setTesting] = useState(false);
useEffect(() => { getBaseURL().then(setServerUrl); }, []);

const onTest = async () => {
  setTesting(true);
  try {
    await testConnection(serverUrl);
    Alert.alert('Connected', `Reached ${serverUrl.replace(/\/+$/, '')}/api/health`);
  } catch (err) {
    Alert.alert('Not reachable', err.message);
  } finally {
    setTesting(false);
  }
};

const onSave = async () => {
  if (!/^https?:\/\/.+/i.test(serverUrl.trim())) return Alert.alert('Invalid URL', 'Start with http:// or https://');
  const saved = await setBaseURL(serverUrl);
  if (user) {
    Alert.alert('Server changed', 'You will be signed out because your login belongs to the previous server.', [
      { text: 'OK', onPress: logout },
    ]);
  } else {
    Alert.alert('Saved', saved);
  }
};

// in the JSX, after the Appearance card:
<Text style={[theme.typography.h1, { marginBottom: 4 }]}>Server</Text>
<Text style={[theme.typography.bodyMuted, { marginBottom: 16 }]}>
  Where the app talks to. Default: {DEFAULT_BASE_URL}
</Text>
<Card style={{ marginBottom: 28 }}>
  <Input label="Backend URL" autoCapitalize="none" keyboardType="url" value={serverUrl} onChangeText={setServerUrl} placeholder="http://192.168.1.10:5009" />
  <View style={{ flexDirection: 'row', gap: 10 }}>
    <Button title="Test connection" variant="outline" onPress={onTest} loading={testing} style={{ flex: 1 }} />
    <Button title="Save" onPress={onSave} style={{ flex: 1 }} />
  </View>
</Card>
```

**File:** `frontend/src/screens/LoginScreen.js`. Add a gear button so the screen is reachable before login (the `Settings` route already exists in `AuthStackNav`):

```jsx
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// inside component:
const insets = useSafeAreaInsets();
// first child inside KeyboardAvoidingView:
<TouchableOpacity
  onPress={() => navigation.navigate('Settings')}
  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
  accessibilityRole="button" accessibilityLabel="Server settings"
  style={{ position: 'absolute', top: insets.top + 12, right: 20, zIndex: 10 }}
>
  <Ionicons name="settings-outline" size={24} color={theme.colors.textMuted} />
</TouchableOpacity>
```

**Verify:** on the login screen tap the gear, enter `http://<your LAN IP>:5009`, Test connection shows "Connected", Save, log in with the demo user.

---

## 5. Any startup error logs the user out, and 401s are never handled

**Breaks:** `AuthContext.js` removes the token on every bootstrap error, and the interceptor in `client.js` throws away the HTTP status, so a timeout on a cold Render instance looks like an expired token. After the 30-day token actually expires, every screen just alerts "invalid token" while the tabs stay mounted.

**File:** `frontend/src/api/client.js`, replace the response interceptor:

```js
let onUnauthorized = null;
export function setUnauthorizedHandler(fn) { onUnauthorized = fn; }

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const message = err?.response?.data?.message
      || (err.code === 'ECONNABORTED' ? 'Request timed out. Is the server awake?' : null)
      || (!err.response ? 'Cannot reach the server. Check your connection.' : null)
      || err.message || 'Something went wrong';
    const e = new Error(message);
    e.status = status;
    e.code = err.code;
    e.isNetworkError = !err.response;
    const isLoginCall = /\/auth\/(login|register)$/.test(err?.config?.url || '');
    if (status === 401 && !isLoginCall && onUnauthorized) onUnauthorized();
    return Promise.reject(e);
  }
);
```

**File:** `frontend/src/context/AuthContext.js`

```js
import api, { setUnauthorizedHandler } from '../api/client';

// bootstrap effect:
useEffect(() => {
  setUnauthorizedHandler(async () => {
    await AsyncStorage.multiRemove(['token', 'user']);
    setToken(null);
    setUser(null);
  });
  (async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      if (!storedToken) return;
      setToken(storedToken);
      const cached = await AsyncStorage.getItem('user');
      if (cached) setUser(JSON.parse(cached)); // show the app immediately
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
    } catch (err) {
      if (err.status === 401) await AsyncStorage.multiRemove(['token', 'user']);
      // network / 5xx: keep the token and the cached user, the next request will retry
    } finally {
      setLoading(false);
    }
  })();
}, []);
```

Also `await AsyncStorage.setItem('user', JSON.stringify(data.user))` inside `login`, `register` and `updateProfile`, and `multiRemove(['token','user'])` in `logout`.

**Verify:** log in, turn on airplane mode, kill and reopen the app. You should still be inside the app with your profile shown. Then change `JWT_SECRET` on the server and restart it; the next request should bounce you to Login.

---

## 6. Public poll voting has no outfit images and leaks device IDs

**Breaks:** `VotePollScreen.js` line 63 reads `opt.outfit.items[0].imageUrl`, but `getPollByCode` populates only the outfit, so `items` are ObjectIds. The response also includes every voter's `deviceId`.

**File:** `backend/controllers/pollController.js`

```js
const POPULATE_OUTFIT_WITH_ITEMS = {
  path: 'options.outfit',
  select: 'name occasion season items',
  populate: { path: 'items', select: 'name category color imageUrl' },
};

// strip voter device IDs from anything that leaves the server
function publicPoll(poll, deviceId) {
  const obj = poll.toObject();
  obj.hasVoted = poll.hasDeviceVoted(deviceId);
  obj.options = obj.options.map(({ voterDeviceIds, ...rest }) => rest);
  return obj;
}

exports.getPollByCode = async (req, res) => {
  try {
    const poll = await Poll.findOne({ code: req.params.code.toUpperCase() }).populate(POPULATE_OUTFIT_WITH_ITEMS);
    if (!poll) return res.status(404).json({ message: 'Poll not found. Check the code and try again.' });
    res.json({ poll: publicPoll(poll, req.query.deviceId) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// voteOnPoll: replace the read-modify-write with one atomic update so two
// taps from the same device cannot both count.
exports.voteOnPoll = async (req, res) => {
  try {
    const { optionId, deviceId } = req.body;
    if (!optionId || !deviceId) return res.status(400).json({ message: 'optionId and deviceId are required' });
    const code = req.params.code.toUpperCase();

    const updated = await Poll.findOneAndUpdate(
      { code, isOpen: true, 'options.voterDeviceIds': { $ne: deviceId }, 'options._id': optionId },
      { $inc: { 'options.$.votes': 1 }, $push: { 'options.$.voterDeviceIds': deviceId } },
      { new: true }
    ).populate(POPULATE_OUTFIT_WITH_ITEMS);

    if (!updated) {
      const poll = await Poll.findOne({ code });
      if (!poll) return res.status(404).json({ message: 'Poll not found' });
      if (!poll.isOpen) return res.status(400).json({ message: 'This poll is closed' });
      if (poll.hasDeviceVoted(deviceId)) return res.status(400).json({ message: 'You already voted in this poll' });
      return res.status(404).json({ message: 'Option not found' });
    }
    res.json({ poll: publicPoll(updated, deviceId) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
```

Use the same populate object in `getPollResults` so the creator's results view gets item thumbnails too. In `VotePollScreen.js`, pass `params: { deviceId }` on the GET so `hasVoted` comes back and the vote buttons can be disabled.

**Verify:** `curl http://localhost:5009/api/polls/code/<CODE>` shows outfit items with `imageUrl` and no `voterDeviceIds`. Vote twice with the same `deviceId`: second call returns 400.

---

## 7. Android drops "Scan Receipt" and "Cancel" from the Add Photo menu

**Breaks:** `AddItemScreen.js` line 147 passes five buttons to `Alert.alert`. Android renders at most three.

**New file:** `frontend/src/components/ActionSheet.js`

```jsx
import React from 'react';
import { Modal, Pressable, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

export default function ActionSheet({ visible, title, actions, onClose }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={onClose} />
      <View style={{
        backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.radius.lg, borderTopRightRadius: theme.radius.lg,
        padding: 16, paddingBottom: 16 + insets.bottom, borderWidth: theme.border.width, borderColor: theme.colors.text,
      }}>
        {title ? <Text style={[theme.typography.h3, { marginBottom: 6 }]}>{title}</Text> : null}
        {actions.map((a) => (
          <TouchableOpacity
            key={a.label}
            onPress={() => { onClose(); a.onPress(); }}
            accessibilityRole="button"
            style={{ flexDirection: 'row', alignItems: 'center', minHeight: 48 }}
          >
            <Ionicons name={a.icon} size={22} color={a.destructive ? theme.colors.danger : theme.colors.accent} />
            <Text style={[theme.typography.body, { marginLeft: 14, color: a.destructive ? theme.colors.danger : theme.colors.text }]}>{a.label}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={onClose} style={{ minHeight: 48, justifyContent: 'center', alignItems: 'center', marginTop: 4 }}>
          <Text style={[theme.typography.body, { color: theme.colors.textMuted }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
```

**File:** `frontend/src/screens/AddItemScreen.js`

```jsx
import ActionSheet from '../components/ActionSheet';
const [photoSheet, setPhotoSheet] = useState(false);
const openPhotoOptions = () => setPhotoSheet(true);

// in JSX, at the end of the screen:
<ActionSheet
  visible={photoSheet}
  onClose={() => setPhotoSheet(false)}
  title="Add photo"
  actions={[
    { label: 'Take Photo', icon: 'camera-outline', onPress: () => addImages(true) },
    { label: 'Choose from Library', icon: 'images-outline', onPress: () => addImages(false) },
    { label: 'Scan Barcode', icon: 'barcode-outline', onPress: () => navigation.navigate('BarcodeScan') },
    { label: 'Scan Receipt', icon: 'receipt-outline', onPress: scanReceipt },
  ]}
/>
```

Reuse this sheet for the Wishlist delete action, which is currently long-press only.

---

## 8. Wear dates shift by one day outside UTC

**Breaks:** the backend groups wear logs by UTC day and the frontend computes "today" with `toISOString()`. In IST a wear logged at 01:00 on the 16th is shown on the 15th, and the packing list's default start date is yesterday.

**New file:** `frontend/src/utils/dates.js`

```js
export const localDateStr = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

export const deviceTimeZone = () => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; }
};
```

Replace `todayStr` in `CalendarScreen.js` and `toISODate` in `PackingListScreen.js` with `localDateStr`, and send `tz: deviceTimeZone()` as a query param on `/stats/wear-calendar`, `/stats/wear-on-date` and `/stats/wear-timeline`.

**File:** `backend/controllers/statsController.js`

```js
const TZ_RE = /^(UTC|[A-Za-z_]+(?:\/[A-Za-z_+\-]+){1,2})$/;
const tzOf = (req) => (TZ_RE.test(req.query.tz || '') ? req.query.tz : 'UTC');
const DAY_MS = 24 * 60 * 60 * 1000;

exports.wearCalendar = async (req, res) => {
  try {
    const month = /^\d{4}-\d{2}$/.test(req.query.month || '') ? req.query.month : new Date().toISOString().slice(0, 7);
    const tz = tzOf(req);
    const start = new Date(`${month}-01T00:00:00.000Z`);
    const end = new Date(start); end.setUTCMonth(end.getUTCMonth() + 1);
    const days = await WearLog.aggregate([
      // widen by a day each side, then filter on the local-day string
      { $match: { user: req.user._id, wornAt: { $gte: new Date(start - DAY_MS), $lt: new Date(+end + DAY_MS) } } },
      { $addFields: { day: { $dateToString: { format: '%Y-%m-%d', date: '$wornAt', timezone: tz } } } },
      { $match: { day: { $regex: `^${month}` } } },
      { $group: { _id: '$day', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: '$_id', count: 1 } },
    ]);
    res.json({ month, tz, days });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.wearOnDate = async (req, res) => {
  try {
    const date = req.query.date || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ message: 'date query param is required as YYYY-MM-DD' });
    const tz = tzOf(req);
    const mid = new Date(`${date}T00:00:00.000Z`);
    const ids = await WearLog.aggregate([
      { $match: { user: req.user._id, wornAt: { $gte: new Date(mid - DAY_MS), $lt: new Date(+mid + 2 * DAY_MS) } } },
      { $addFields: { day: { $dateToString: { format: '%Y-%m-%d', date: '$wornAt', timezone: tz } } } },
      { $match: { day: date } },
      { $project: { _id: 1 } },
    ]);
    const logs = await WearLog.find({ _id: { $in: ids.map((d) => d._id) } })
      .sort({ wornAt: 1 })
      .populate('item')
      .populate({ path: 'outfit', populate: { path: 'items' } });
    res.json({ date, tz, logs });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// wearTimeline: add `timezone: tzOf(req)` inside its $dateToString.
```

**Verify:** log a wear at 01:00 local time (or temporarily set the phone clock). The Calendar tab highlights today, not yesterday.

---

## 9. Search: regex injection and a request per keystroke

**Breaks:** `itemController.js` line 128 puts raw input into `$regex`, so typing `(` returns a 500 the client swallows. `WardrobeScreen.js` refetches on every keystroke with no debounce and no stale-response guard, so a slow "sh" response can overwrite the newer "shirt" result.

**File:** `backend/controllers/itemController.js`

```js
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// ...
if (search) filter.name = { $regex: escapeRegex(search.trim()).slice(0, 100), $options: 'i' };
```

**File:** `frontend/src/screens/WardrobeScreen.js`

```js
import { useRef, useEffect } from 'react';

const [search, setSearch] = useState('');
const [query, setQuery] = useState('');        // debounced value that drives fetches
const requestId = useRef(0);

useEffect(() => {
  const t = setTimeout(() => setQuery(search.trim()), 300);
  return () => clearTimeout(t);
}, [search]);

const fetchItems = useCallback(async (targetPage = 1, append = false) => {
  const id = ++requestId.current;
  try {
    const params = { page: targetPage, limit: PAGE_SIZE };
    if (category !== 'all') params.category = category;
    if (dressCode !== 'all') params.occasion = dressCode;
    if (query) params.search = query;
    const { data } = await api.get('/items', { params });
    if (id !== requestId.current) return; // a newer request has been issued, drop this one
    setItems((prev) => (append ? [...prev, ...data.items] : data.items));
    setHasMore(!!data.pagination?.hasMore);
    setPage(targetPage);
  } catch (err) {
    if (id === requestId.current) setError(err.message); // see UI guide, ErrorState
  }
}, [category, dressCode, query]);
```

Remove the `onSubmitEditing={() => fetchItems(1, false)}` prop; the debounce covers it.

---

## 10. Packing list: unvalidated dates and wrong occasion keys

**Breaks:** free-text dates reach the backend, `Math.ceil(NaN)` yields `days: NaN`, Mongoose rejects it and the user sees a 500. The screen's occasion list uses `work`, but items are tagged with `office` from `constants/dressCodes.js`, so office clothes are never packed.

**File:** `backend/controllers/suggestionController.js`, top of `packing`:

```js
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
if (!ISO_DATE.test(startDate || '') || !ISO_DATE.test(endDate || '') || Number.isNaN(Date.parse(startDate)) || Number.isNaN(Date.parse(endDate))) {
  return res.status(400).json({ message: 'startDate and endDate must be YYYY-MM-DD' });
}
if (endDate < startDate) return res.status(400).json({ message: 'endDate must be on or after startDate' });
const days = Math.min(60, Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1);
```

**File:** `frontend/src/screens/PackingListScreen.js`

```js
import { DRESS_CODES } from '../constants/dressCodes';
// replace OCCASIONS with DRESS_CODES and render:
{DRESS_CODES.map((d) => (
  <Chip key={d.key} label={d.label} active={occasion === d.key} onPress={() => setOccasion(d.key)} style={{ marginBottom: 8 }} />
))}

// at the top of generate():
const ISO = /^\d{4}-\d{2}-\d{2}$/;
if (!ISO.test(startDate) || !ISO.test(endDate) || Number.isNaN(Date.parse(startDate)) || Number.isNaN(Date.parse(endDate))) {
  return Alert.alert('Check your dates', 'Use the YYYY-MM-DD format.');
}
if (endDate < startDate) return Alert.alert('Check your dates', 'The end date is before the start date.');
```

The UI guide replaces these text inputs with native date pickers.

---

## 11. Outfit builder and Create Poll only see the first page

**Breaks:** `CreateOutfitScreen.js` asks for `limit: 200`, the backend clamps to 100, and there is no paging. In edit mode it filters `inLaundry: 'false'`, so a piece in the laundry is pre-selected but invisible and cannot be deselected. `CreatePollScreen.js` gets the default 20 outfits and has no `.catch`.

**File:** `frontend/src/api/client.js`, add a helper:

```js
export async function fetchAllPages(path, key, params = {}) {
  let page = 1; let all = [];
  for (;;) {
    const { data } = await api.get(path, { params: { ...params, page, limit: 100 } });
    all = all.concat(data[key] || []);
    if (!data.pagination?.hasMore || page > 20) return all;
    page += 1;
  }
}
```

**File:** `frontend/src/screens/CreateOutfitScreen.js`

```js
import api, { fetchAllPages } from '../api/client';
// replace the api.get('/items', { params: { limit: 200, inLaundry: 'false' } }) call with:
const items = await fetchAllPages('/items', 'items', isEdit ? {} : { inLaundry: 'false' });
```

`ItemCard` already shows the laundry badge, so laundry pieces are visibly flagged in edit mode.

**File:** `frontend/src/screens/CreatePollScreen.js`

```js
useEffect(() => {
  fetchAllPages('/outfits', 'outfits')
    .then(setOutfits)
    .catch((err) => Alert.alert('Could not load outfits', err.message))
    .finally(() => setLoading(false));
}, []);
```

---

## 12. Barcode scanner fires multiple lookups

**Breaks:** the guard in `BarcodeScanScreen.js` is React state. `onBarcodeScanned` fires per camera frame, so several callbacks run before the re-render commits, triggering duplicate lookups and navigations. Dismissing the "No match" alert with the Android back button also leaves the scanner frozen.

**File:** `frontend/src/screens/BarcodeScanScreen.js`

```js
const scannedRef = useRef(false);

const reset = () => { scannedRef.current = false; setScanned(false); };

const onScanned = async ({ data }) => {
  if (scannedRef.current) return;
  scannedRef.current = true;
  setScanned(true);
  setLooking(true);
  try {
    const { data: result } = await api.get('/items/lookup-barcode', { params: { code: data } });
    if (!result.found) {
      Alert.alert('No match found', `Barcode ${data} isn't in the product database. You can fill the item in manually.`, [
        { text: 'Scan again', onPress: reset },
        { text: 'Fill in manually', onPress: () => navigation.goBack() },
      ], { cancelable: false });
      return;
    }
    navigation.navigate({ name: 'AddItem', params: { barcodeResult: result }, merge: true });
  } catch (err) {
    Alert.alert('Lookup failed', err.message, [{ text: 'Try again', onPress: reset }, { text: 'Close', onPress: () => navigation.goBack() }], { cancelable: false });
  } finally {
    setLooking(false);
  }
};
```

---

## 13. Outfits accept other users' item IDs

**Breaks:** `createOutfit` and `updateOutfit` store whatever IDs the client sends. Populating then leaks another user's item names and photos.

**File:** `backend/controllers/outfitController.js`

```js
const ClothingItem = require('../models/ClothingItem'); // move to top, remove the require inside logWear

async function ownedItemIds(userId, ids) {
  const unique = [...new Set((Array.isArray(ids) ? ids : []).map(String))];
  if (!unique.length) return [];
  const owned = await ClothingItem.find({ _id: { $in: unique }, user: userId }).select('_id');
  const ownedSet = new Set(owned.map((d) => String(d._id)));
  return unique.filter((id) => ownedSet.has(id)); // keep client order
}

// createOutfit:
const items = await ownedItemIds(req.user._id, req.body.items);
if (!name || !items.length) return res.status(400).json({ message: 'name and at least one item you own are required' });
// ... Outfit.create({ ..., items, ... })

// updateOutfit: remove 'items' from the fields array and add
if (req.body.items !== undefined) {
  const items = await ownedItemIds(req.user._id, req.body.items);
  if (!items.length) return res.status(400).json({ message: 'An outfit needs at least one item' });
  outfit.items = items;
}
```

---

## 14. Invalid IDs and enum values return 500

**Breaks:** every controller returns Mongoose `CastError` (bad `:id`) and `ValidationError` (bad enum, short password) as a 500 with a raw internal message like "User validation failed: password: Path `password` ... is shorter than the minimum allowed length (6)".

**File:** `backend/server.js`, replace the error handler:

```js
const multer = require('multer');

app.use((err, req, res, next) => {
  if (err.name === 'CastError') return res.status(404).json({ message: 'Not found' });
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join('. ') });
  }
  if (err.code === 11000) return res.status(409).json({ message: 'Already exists' });
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: err.code === 'LIMIT_FILE_SIZE' ? 'Each image must be under 8 MB' : err.message });
  }
  if (err.message === 'Only image files are allowed') return res.status(400).json({ message: err.message });
  console.error(err);
  res.status(err.status || 500).json({ message: process.env.NODE_ENV === 'production' ? 'Server error' : err.message });
});
```

Then let controllers forward to it. In every controller change the signature to `(req, res, next)` and every `catch (err) { res.status(500).json({ message: err.message }); }` to `catch (err) { next(err); }`. This is a mechanical find-and-replace across the seven controller files. Also add explicit messages for the two most common validation cases in `authController.register`:

```js
if (typeof password !== 'string' || password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) return res.status(400).json({ message: 'Enter a valid email address' });
```

**Verify:** `curl -H "Authorization: Bearer <token>" http://localhost:5009/api/items/not-an-id` returns 404 JSON, not a 500 with "Cast to ObjectId failed".

---

## 15. app.json blocks EAS builds and over-requests permissions

**File:** `frontend/app.json`

- Add `"bundleIdentifier": "com.wardrobemanager.app"` under `ios`. Without it `eas build -p ios` fails in non-interactive mode.
- Add `"infoPlist": { "ITSAppUsesNonExemptEncryption": false }` under `ios` to skip the export-compliance prompt on every TestFlight upload.
- Remove `"android.permission.RECORD_AUDIO"` from `android.permissions` and add `"blockedPermissions": ["android.permission.RECORD_AUDIO"]`. Add `"microphonePermission": false` to both the `expo-image-picker` and `expo-camera` plugin configs. The app never records audio; Play review flags unused mic access.
- In the `expo-location` plugin, rename `locationAlwaysAndWhenInUsePermission` to `locationWhenInUsePermission`. Only foreground location is used.
- `"owner": "prahladsingh7512"` and `extra.eas.projectId` must match the EAS account you build with. Run `eas whoami`; if it differs, remove both and run `eas init` to link your own project.

---

## 16. Smaller fixes

Backend:

- **Fetch timeouts.** `utils/weather.js`, `utils/removeBackground.js`, `utils/ocr.js`: add `timeout: 8000` (remove.bg: `20000`) to each `fetch(url, { ... })` call so a stalled third party cannot hang an upload request. `barcodeLookup.js` already does this.
- **WearLog index.** In `models/WearLog.js` add `wearLogSchema.index({ user: 1, wornAt: -1 });`. Every stats query filters on that pair.
- **ClothingItem index.** `clothingItemSchema.index({ user: 1, createdAt: -1 }); clothingItemSchema.index({ user: 1, category: 1 });`.
- **Duplicate index warnings.** `models/Poll.js` and `models/PackingList.js` declare both `unique: true` and `index: true` on the same path. Drop `index: true`.
- **costPerWear limit.** `const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));` A negative value currently throws inside `$limit`.
- **leastWorn.** The comment says "worn at least once" but nothing filters `wearCount: { $gt: 0 }`. Pick one and make the code match.
- **Dresses.** `today`, `surprise` and `packing` never consider `category: 'dress'` or `'bag'`. Add a dress branch: when a dress is chosen, skip top and bottom.
- **Auth hardening.** `npm i helmet express-rate-limit` and in `server.js`: `app.use(helmet()); app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30 }));` plus `express.json({ limit: '200kb' })`.
- **README.** Images are on Cloudinary, not `backend/uploads`. The port is 5009 under PM2, not 5000.

Frontend:

- **Surprise Me stale closure.** `SurpriseOutfitScreen.js` line 81: `useFocusEffect(useCallback(() => { roll(occasion); }, [roll, occasion]))`. Also add `reveal.setValue(1)` in the `catch` so a failed roll does not leave the card invisible.
- **Outfits double fetch.** `OutfitsScreen.js`: `toggleFresh` and `selectDressCode` call `load()` and also change the state `load` depends on, so the focus effect fires again. Remove the explicit `load(...)` calls and let the effect drive.
- **Today location errors.** `TodayScreen.js` line 63: wrap `Location.getCurrentPositionAsync` in its own `try/catch` as `SurpriseOutfitScreen.js` already does, and pass `{ accuracy: Location.Accuracy.Low }`. Same in `PackingListScreen.js`.
- **Calendar refetch loop.** `CalendarScreen.js`: store the server `days` array in state and derive `markedDates` with `useMemo([days, selectedDate, theme])`. Fetch the calendar on focus and month change only, and logs on date change only.
- **Pull-to-refresh spinner on every focus.** Stats, Calendar, Today, Repair, Wishlist and Polls reuse `loading` for `refreshing`. Add a separate `refreshing` state set only inside `onRefresh`.
- **ImagePicker API.** `AddItemScreen.js` lines 61, 63, 82 and `ProfileScreen.js` line 29: replace `mediaTypes: ImagePicker.MediaTypeOptions.Images` with `mediaTypes: ['images']`. The enum is deprecated since SDK 52.
- **"Shuffle Suggestion" on Today** calls the deterministic `/suggestion/today` and returns the same outfit every tap. Point it at `/suggestion/surprise` or rename it "Refresh".
- **Wishlist category clear.** `WishlistFormScreen.js` line 38 sends `category || undefined`, which JSON drops, so clearing a category never saves. Send `null` and in `wishlistController.updateWishlistItem` treat `null` as `item.category = undefined`.
- **Dead code.** Delete `src/theme/colors.js` (never imported), and either delete `src/components/Fab.js` or wire it up as the quick-add sheet (the UI guide does the latter).
- **Token storage.** Move the JWT to `expo-secure-store` and read it from context instead of AsyncStorage on every request.
