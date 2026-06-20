import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import CheckInScreen from '../screens/CheckInScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const TABS = [
  { name: 'CheckIn', label: 'Check In', iconA: 'camera', iconD: 'camera-outline' },
  { name: 'Profile', label: 'Profile', iconA: 'person-circle', iconD: 'person-circle-outline' },
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
          const label   = descriptors[route.key]?.options?.tabBarLabel ?? tab.label;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

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
                {label}
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
    <Tab.Screen name="CheckIn"    component={CheckInScreen} />
    <Tab.Screen name="Profile"    component={ProfileScreen} />
  </Tab.Navigator>
);

export default CriminalTabs;

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
});