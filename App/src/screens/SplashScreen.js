import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getToken } from '../utils/storage';

const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await getToken();
      // Brief delay to display the official branding before routing
      setTimeout(() => {
        if (token) {
          navigation.replace('MainApp');
        } else {
          navigation.replace('Login');
        }
      }, 1500);
    } catch {
      navigation.replace('Login');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      
      <View style={styles.container}>
        <View style={styles.textContainer}>
          <Text style={styles.title}>MAHARASHTRA POLICE</Text>
          <Text style={styles.subtitle}>TADIPAAR</Text>
          <Text style={styles.department}>EXTERNMENT MONITORING SYSTEM</Text>
        </View>

        <ActivityIndicator
          size="large"
          color="#1E3A8A" // Official Deep Blue
          style={styles.loader}
        />
      </View>
    </SafeAreaView>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Professional light grey/white background
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A', // Dark Slate
    letterSpacing: 2,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1E3A8A', // Official Deep Blue
    letterSpacing: 4,
    marginBottom: 12,
    textAlign: 'center',
  },
  department: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569', // Medium Slate
    letterSpacing: 2,
    textAlign: 'center',
  },
  loader: {
    marginTop: 20,
  },
});