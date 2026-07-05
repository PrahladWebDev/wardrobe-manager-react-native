import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import WardrobeScreen from '../screens/WardrobeScreen';
import AddItemScreen from '../screens/AddItemScreen';
import ItemDetailScreen from '../screens/ItemDetailScreen';
import OutfitsScreen from '../screens/OutfitsScreen';
import CreateOutfitScreen from '../screens/CreateOutfitScreen';
import OutfitDetailScreen from '../screens/OutfitDetailScreen';
import TodayScreen from '../screens/TodayScreen';
import StatsScreen from '../screens/StatsScreen';
import PackingListScreen from '../screens/PackingListScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';

const AuthStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();
const WardrobeStack = createNativeStackNavigator();
const OutfitsStack = createNativeStackNavigator();

function WardrobeStackNav() {
  return (
    <WardrobeStack.Navigator screenOptions={{ headerShadowVisible: false, headerStyle: { backgroundColor: colors.bg } }}>
      <WardrobeStack.Screen name="Wardrobe" component={WardrobeScreen} options={{ title: 'My Wardrobe' }} />
      <WardrobeStack.Screen
        name="AddItem"
        component={AddItemScreen}
        options={({ route }) => ({ title: route.params?.item ? 'Edit Item' : 'Add Item', presentation: 'modal' })}
      />
      <WardrobeStack.Screen name="ItemDetail" component={ItemDetailScreen} options={{ title: 'Item' }} />
    </WardrobeStack.Navigator>
  );
}

function OutfitsStackNav() {
  return (
    <OutfitsStack.Navigator screenOptions={{ headerShadowVisible: false, headerStyle: { backgroundColor: colors.bg } }}>
      <OutfitsStack.Screen name="Outfits" component={OutfitsScreen} options={{ title: 'Outfits' }} />
      <OutfitsStack.Screen
        name="CreateOutfit"
        component={CreateOutfitScreen}
        options={({ route }) => ({ title: route.params?.outfit ? 'Edit Outfit' : 'New Outfit', presentation: 'modal' })}
      />
      <OutfitsStack.Screen name="OutfitDetail" component={OutfitDetailScreen} options={{ title: 'Outfit' }} />
    </OutfitsStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 60, paddingBottom: 8, paddingTop: 6 },
        tabBarIcon: ({ color, size }) => {
          const icons = {
            WardrobeTab: 'shirt-outline',
            Today: 'sunny-outline',
            OutfitsTab: 'albums-outline',
            Stats: 'stats-chart-outline',
            Profile: 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="WardrobeTab" component={WardrobeStackNav} options={{ title: 'Wardrobe' }} />
      <Tabs.Screen name="Today" component={TodayScreen} options={{ title: 'Today' }} />
      <Tabs.Screen name="OutfitsTab" component={OutfitsStackNav} options={{ title: 'Outfits' }} />
      <Tabs.Screen name="Stats" component={StatsScreen} options={{ title: 'Stats' }} />
      <Tabs.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tabs.Navigator>
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

export default function AppNavigator() {
  const { user, loading } = useAuth();
  if (loading) return null;

  return (
    <NavigationContainer>
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
