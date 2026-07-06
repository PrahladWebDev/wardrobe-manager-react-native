import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'wardrobe_device_id';

function randomId() {
  return `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function getDeviceId() {
  let id = await AsyncStorage.getItem(KEY);
  if (!id) {
    id = randomId();
    await AsyncStorage.setItem(KEY, id);
  }
  return id;
}
