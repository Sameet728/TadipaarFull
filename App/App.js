import React from 'react';
import './src/i18n/i18n';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import GlobalErrorBoundary from './src/components/GlobalErrorBoundary';
import UpdaterOverlay from './src/components/UpdaterOverlay';

export default function App() {
  return (
    <SafeAreaProvider>
      <GlobalErrorBoundary>
        <UpdaterOverlay>
          <StatusBar style="light" />
          <AppNavigator />
        </UpdaterOverlay>
      </GlobalErrorBoundary>
    </SafeAreaProvider>
  );
}
