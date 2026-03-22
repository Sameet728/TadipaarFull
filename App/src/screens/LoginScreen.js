import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, ScrollView, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Colors from '../constants/colors';
import API from '../api/api';
import { setToken } from '../utils/storage';

const LoginScreen = ({ navigation }) => {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!loginId.trim() || !password.trim()) {
      Alert.alert('Validation Error', 'Please enter your Official ID and Password.');
      return;
    }

    try {
      setLoading(true);
      
      const res = await API.post('/criminal/login', {
        loginId: loginId.trim(),
        password,
      });

      const token = res.data.token;

      // Save JWT token
      await setToken(token);

      // Save criminalId as STRING
      if (res.data?.criminal?._id) {
        await AsyncStorage.setItem(
          'criminalId',
          res.data.criminal._id.toString()
        );
      } else {
        console.warn('criminalId missing in login response');
      }

      // Navigate to main app
      navigation.replace('MainApp');

    } catch (err) {
      console.log('LOGIN ERROR:', err);
      Alert.alert(
        'Authentication Failed',
        err?.response?.data?.message || err.message || 'Unable to authenticate credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={styles.headerContainer}>
            <Text style={styles.title}>MAHARASHTRA POLICE</Text>
            <Text style={styles.subtitle}>TADIPAAR</Text>
            <Text style={styles.departmentText}>EXTERNMENT MONITORING SYSTEM</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>SECURE LOGIN</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>OFFICIAL ID</Text>
              <TextInput
                placeholder="Enter Official ID"
                placeholderTextColor="#94A3B8"
                value={loginId}
                onChangeText={setLoginId}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>PASSWORD</Text>
              <TextInput
                placeholder="Enter Password"
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.buttonText}>AUTHENTICATE</Text>
              )}
            </TouchableOpacity>
          </View>
          
          <Text style={styles.footerText}>
            RESTRICTED ACCESS • AUTHORIZED PERSONNEL ONLY
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Light professional grey/white background
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center', // Centers the content vertically
    padding: 24,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 2,
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E3A8A', // Deep official blue
    letterSpacing: 3,
    marginBottom: 8,
    textAlign: 'center',
  },
  departmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 16,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    padding: 14,
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#1E3A8A',
    padding: 16,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 2,
  },
  footerText: {
    marginTop: 40,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    letterSpacing: 1,
  }
});