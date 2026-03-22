import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashScreen       from '../screens/SplashScreen';
import LoginScreen        from '../screens/LoginScreen';
import CriminalTabs       from './CriminalTabs';
import CheckInScreen      from '../screens/CheckInScreen';
import RestrictedMapScreen from '../screens/RestrictedMapScreen';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false }}
      >
        {/* Auth flow */}
        <Stack.Screen name="Splash"  component={SplashScreen} />
        <Stack.Screen name="Login"   component={LoginScreen} />

        {/* Main app (bottom tabs) */}
        <Stack.Screen name="MainApp" component={CriminalTabs} />

        {/* Standalone screens navigated from tabs */}
        <Stack.Screen
          name="CheckIn"
          component={CheckInScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="RestrictedMap"
          component={RestrictedMapScreen}
          options={{
            headerShown: true,
            title: 'Restricted Zone Map',
            headerStyle: { backgroundColor: '#1565C0' },
            headerTintColor: '#fff',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
