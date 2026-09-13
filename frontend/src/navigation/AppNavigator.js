import React from 'react';
import { TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import WardrobeScreen from '../screens/WardrobeScreen';
import AddItemScreen from '../screens/AddItemScreen';
import ItemDetailScreen from '../screens/ItemDetailScreen';
import BarcodeScanScreen from '../screens/BarcodeScanScreen';
import OutfitsScreen from '../screens/OutfitsScreen';
import CreateOutfitScreen from '../screens/CreateOutfitScreen';
import OutfitDetailScreen from '../screens/OutfitDetailScreen';
import PollsScreen from '../screens/PollsScreen';
import CreatePollScreen from '../screens/CreatePollScreen';
import PollResultsScreen from '../screens/PollResultsScreen';
import VotePollScreen from '../screens/VotePollScreen';
import TodayScreen from '../screens/TodayScreen';
import CalendarScreen from '../screens/CalendarScreen';
import StatsScreen from '../screens/StatsScreen';
import PackingListScreen from '../screens/PackingListScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SurpriseOutfitScreen from '../screens/SurpriseOutfitScreen';
import RepairTrackerScreen from '../screens/RepairTrackerScreen';
import WishlistScreen from '../screens/WishlistScreen';
import WishlistFormScreen from '../screens/WishlistFormScreen';

const AuthStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();
const WardrobeStack = createNativeStackNavigator();
const OutfitsStack = createNativeStackNavigator();

function WardrobeStackNav() {
  const theme = useTheme();
  return (
    <WardrobeStack.Navigator screenOptions={{ headerShadowVisible: false, headerStyle: { backgroundColor: theme.colors.bg }, headerTintColor: theme.colors.text }}>
      <WardrobeStack.Screen
        name="Wardrobe"
        component={WardrobeScreen}
        options={({ navigation }) => ({
          title: 'My Wardrobe',
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
              <TouchableOpacity onPress={() => navigation.navigate('Wishlist')} style={{ paddingHorizontal: 4 }}>
                <Ionicons name="bag-handle-outline" size={22} color={theme.colors.accent} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('RepairTracker')} style={{ paddingHorizontal: 4 }}>
                <Ionicons name="build-outline" size={22} color={theme.colors.accent} />
              </TouchableOpacity>
            </View>
          ),
        })}
      />
      <WardrobeStack.Screen name="RepairTracker" component={RepairTrackerScreen} options={{ title: 'Repair Tracker' }} />
      <WardrobeStack.Screen name="Wishlist" component={WishlistScreen} options={{ title: 'Wishlist' }} />
      <WardrobeStack.Screen
        name="WishlistForm"
        component={WishlistFormScreen}
        options={({ route }) => ({ title: route.params?.item ? 'Edit Wishlist Item' : 'Add to Wishlist', presentation: 'modal' })}
      />
      <WardrobeStack.Screen
        name="AddItem"
        component={AddItemScreen}
        options={({ route }) => ({ title: route.params?.item ? 'Edit Item' : 'Add Item', presentation: 'modal' })}
      />
      <WardrobeStack.Screen name="ItemDetail" component={ItemDetailScreen} options={{ title: 'Item' }} />
      <WardrobeStack.Screen
        name="BarcodeScan"
        component={BarcodeScanScreen}
        options={{ title: 'Scan Barcode', presentation: 'modal', headerStyle: { backgroundColor: theme.colors.black }, headerTintColor: '#fff' }}
      />
    </WardrobeStack.Navigator>
  );
}

function OutfitsStackNav() {
  const theme = useTheme();
  return (
    <OutfitsStack.Navigator screenOptions={{ headerShadowVisible: false, headerStyle: { backgroundColor: theme.colors.bg }, headerTintColor: theme.colors.text }}>
      <OutfitsStack.Screen
        name="Outfits"
        component={OutfitsScreen}
        options={({ navigation }) => ({
          title: 'Outfits',
          headerRight: () => (
            <TouchableOpacity onPress={() => navigation.navigate('SurpriseOutfit')} style={{ paddingHorizontal: 4, marginRight: 8 }}>
              <Ionicons name="shuffle" size={22} color={theme.colors.accent} />
            </TouchableOpacity>
          ),
        })}
      />
      <OutfitsStack.Screen
        name="CreateOutfit"
        component={CreateOutfitScreen}
        options={({ route }) => ({ title: route.params?.outfit ? 'Edit Outfit' : 'New Outfit', presentation: 'modal' })}
      />
      <OutfitsStack.Screen name="OutfitDetail" component={OutfitDetailScreen} options={{ title: 'Outfit' }} />
      <OutfitsStack.Screen name="Polls" component={PollsScreen} options={{ title: 'Outfit Polls' }} />
      <OutfitsStack.Screen name="CreatePoll" component={CreatePollScreen} options={{ title: 'New Poll', presentation: 'modal' }} />
      <OutfitsStack.Screen name="PollResults" component={PollResultsScreen} options={{ title: 'Poll Results' }} />
      <OutfitsStack.Screen name="VotePoll" component={VotePollScreen} options={{ title: 'Vote on a Poll', presentation: 'modal' }} />
      <OutfitsStack.Screen name="SurpriseOutfit" component={SurpriseOutfitScreen} options={{ title: 'Surprise Me', presentation: 'modal' }} />
    </OutfitsStack.Navigator>
  );
}

// Tabs that contain a nested stack have a "root" screen — the tab bar
// should only show while that root screen is focused, and hide for any
// screen pushed on top of it (AddItem, ItemDetail, CreateOutfit, etc.),
// since those are full-screen forms with their own bottom action button.
const TAB_ROOT_SCREEN = {
  WardrobeTab: 'Wardrobe',
  OutfitsTab: 'Outfits',
};

function MainTabs() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      <Tabs.Navigator
        screenOptions={({ route }) => {
          const focusedRouteName = getFocusedRouteNameFromRoute(route);
          const rootName = TAB_ROOT_SCREEN[route.name];
          const hideChrome = !!rootName && !!focusedRouteName && focusedRouteName !== rootName;
          return {
            headerShown: false,
            tabBarActiveTintColor: theme.colors.text,
            tabBarInactiveTintColor: theme.colors.textFaint,
            tabBarActiveBackgroundColor: theme.colors.accentSoft,
            tabBarShowLabel: false,
            tabBarStyle: {
              display: hideChrome ? 'none' : 'flex',
              position: 'absolute',
              left: 16,
              right: 16,
              bottom: 12 + insets.bottom,
              height: 62,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.surface,
              borderWidth: theme.border.width,
              borderColor: theme.colors.text,
              paddingTop: 0,
              paddingHorizontal: 0,
              ...theme.shadow.card,
            },
            tabBarItemStyle: {
              borderRadius: theme.radius.pill,
              flex: 1,
              marginHorizontal: 2,
              marginVertical: 6,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
            },
            tabBarIcon: ({ color, size }) => {
              const icons = {
                WardrobeTab: 'shirt-outline',
                Today: 'sunny-outline',
                OutfitsTab: 'albums-outline',
                Calendar: 'calendar-outline',
                Stats: 'stats-chart-outline',
                Profile: 'person-outline',
              };
              return <Ionicons name={icons[route.name]} size={size} color={color} />;
            },
          };
        }}
      >
        <Tabs.Screen name="WardrobeTab" component={WardrobeStackNav} options={{ title: 'Wardrobe' }} />
        <Tabs.Screen name="Today" component={TodayScreen} options={{ title: 'Today' }} />
        <Tabs.Screen name="OutfitsTab" component={OutfitsStackNav} options={{ title: 'Outfits' }} />
        <Tabs.Screen name="Calendar" component={CalendarScreen} options={{ title: 'Calendar' }} />
        <Tabs.Screen name="Stats" component={StatsScreen} options={{ title: 'Stats' }} />
        <Tabs.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
      </Tabs.Navigator>
    </View>
  );
}

function AuthStackNav() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerShown: true, title: 'Server Settings', presentation: 'modal' }}
      />
    </AuthStack.Navigator>
  );
}

function StartupLoading() {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bg }}>
      <ActivityIndicator size="small" color={theme.colors.accent} />
    </View>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();
  const theme = useTheme();
  if (loading) return <StartupLoading />;

  const navTheme = {
    ...(theme.mode === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme.mode === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: theme.colors.bg,
      card: theme.colors.surface,
      text: theme.colors.text,
      border: theme.colors.border,
      primary: theme.colors.accent,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <RootStack.Group>
            <RootStack.Screen name="Main" component={MainTabs} />
            <RootStack.Screen
              name="PackingList"
              component={PackingListScreen}
              options={{ headerShown: true, title: 'Packing List', presentation: 'modal' }}
            />
            <RootStack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ headerShown: true, title: 'Server Settings', presentation: 'modal' }}
            />
          </RootStack.Group>
        ) : (
          <RootStack.Screen name="Auth" component={AuthStackNav} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}