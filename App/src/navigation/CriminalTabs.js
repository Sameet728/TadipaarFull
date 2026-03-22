import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import CriminalHome     from '../screens/CriminalHome';
import CheckInScreen    from '../screens/CheckInScreen';
import HistoryScreen    from '../screens/HistoryScreen';
import RestrictedScreen from '../screens/RestrictedScreen';
import ProfileScreen    from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const TABS = [
  { name: 'Home',       label: 'Home',       iconA: 'home',          iconD: 'home-outline' },
  { name: 'History',    label: 'History',    iconA: 'time',          iconD: 'time-outline' },
  { name: 'CheckIn',    label: 'Check In',   iconA: 'camera',        iconD: 'camera-outline', pill: true },
  { name: 'Restricted', label: 'Restricted', iconA: 'warning',       iconD: 'warning-outline', alert: true },
  { name: 'Profile',    label: 'Profile',    iconA: 'person-circle', iconD: 'person-circle-outline' },
];

// ── Fully custom tab bar ───────────────────────────────────
function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.barWrapper, { paddingBottom: insets.bottom || 8 }]}>
      {/* White bar background */}
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const tab     = TABS.find(t => t.name === route.name);
          const focused = state.index === index;
          const icon    = focused ? tab.iconA : tab.iconD;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          // ── Centre pill tab ──────────────────────────
          if (tab.pill) {
            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                style={styles.pillTab}
                activeOpacity={0.85}
              >
                <View style={[styles.pill, focused && styles.pillActive]}>
                  <Ionicons name={icon} size={28} color="#fff" />
                </View>
                <Text style={[styles.pillText, focused && styles.pillTextActive]}>
                  Check In
                </Text>
              </TouchableOpacity>
            );
          }

          // ── Alert tab ────────────────────────────────
          if (tab.alert) {
            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                style={styles.tabBtn}
                activeOpacity={0.7}
              >
                <View style={[styles.iconWrap, focused && styles.alertWrap]}>
                  <Ionicons
                    name={icon}
                    size={22}
                    color={focused ? '#DC2626' : '#94A3B8'}
                  />
                  <View style={styles.dot} />
                </View>
                <Text style={[styles.tabText, focused && styles.alertText]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          }

          // ── Regular tab ──────────────────────────────
          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tabBtn}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
                <Ionicons
                  name={icon}
                  size={22}
                  color={focused ? '#1E3A8A' : '#94A3B8'}
                />
              </View>
              <Text style={[styles.tabText, focused && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── Navigator ──────────────────────────────────────────────
const CriminalTabs = () => (
  <Tab.Navigator
    tabBar={props => <CustomTabBar {...props} />}
    screenOptions={{ headerShown: false }}
  >
    <Tab.Screen name="Home"       component={CriminalHome} />
    <Tab.Screen name="History"    component={HistoryScreen} />
    <Tab.Screen name="CheckIn"    component={CheckInScreen} />
    <Tab.Screen name="Restricted" component={RestrictedScreen} />
    <Tab.Screen name="Profile"    component={ProfileScreen} />
  </Tab.Navigator>
);

export default CriminalTabs;

// ── Styles ─────────────────────────────────────────────────
const PILL_SIZE = 62;

const styles = StyleSheet.create({
  // outer wrapper sits at bottom of screen
  barWrapper: {
    position:        'absolute',
    bottom:          0,
    left:            0,
    right:           0,
    backgroundColor: '#fff',
    borderTopWidth:  1,
    borderTopColor:  '#E2E8F0',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: -3 },
    shadowOpacity:   0.07,
    shadowRadius:    8,
    elevation:       16,
  },

  // row that holds all tabs
  bar: {
    flexDirection:  'row',
    alignItems:     'flex-end',  // align all items to bottom so pill lifts up naturally
    height:         58,
  },

  // ── Regular tab ──
  tabBtn: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingBottom:  4,
    gap:            3,
  },
  iconWrap: {
    width:          40,
    height:         30,
    borderRadius:   8,
    alignItems:     'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: '#EFF6FF',
  },
  tabText: {
    fontSize:      10,
    fontWeight:    '600',
    color:         '#94A3B8',
    textAlign:     'center',
    letterSpacing: 0.1,
  },
  tabTextActive: {
    color:      '#1E3A8A',
    fontWeight: '800',
  },

  // ── Alert (Restricted) ──
  alertWrap: {
    backgroundColor: '#FEF2F2',
    position:        'relative',
  },
  alertText: {
    color:      '#DC2626',
    fontWeight: '800',
  },
  dot: {
    position:        'absolute',
    top:             3,
    right:           3,
    width:           7,
    height:          7,
    borderRadius:    4,
    backgroundColor: '#DC2626',
    borderWidth:     1.5,
    borderColor:     '#fff',
  },

  // ── Pill (Check In) ──
  pillTab: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'flex-end',
    paddingBottom:  4,
    gap:            3,
  },
  pill: {
    width:           PILL_SIZE,
    height:          PILL_SIZE,
    borderRadius:    PILL_SIZE / 2,
    backgroundColor: '#1E3A8A',
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     4,
    borderColor:     '#fff',
    // lift pill above the bar
    marginBottom:    -(PILL_SIZE / 2 - 10),
    shadowColor:     '#1E3A8A',
    shadowOffset:    { width: 0, height: 6 },
    shadowOpacity:   0.45,
    shadowRadius:    10,
    elevation:       16,
  },
  pillActive: {
    backgroundColor: '#0F172A',
  },
  pillText: {
    fontSize:      10,
    fontWeight:    '600',
    color:         '#94A3B8',
    textAlign:     'center',
    marginTop:     PILL_SIZE / 2 - 6,   // push label below where pill ends
  },
  pillTextActive: {
    color:      '#1E3A8A',
    fontWeight: '800',
  },
});