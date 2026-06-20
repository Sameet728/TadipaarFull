import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, Linking, TouchableOpacity, SafeAreaView, StatusBar, Image } from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import API from '../api/api';

const UpdaterOverlay = ({ children }) => {
  const [isOutdated, setIsOutdated] = useState(false);
  const [apkUrl, setApkUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAppVersion = async () => {
      try {
        const response = await API.get('/public/app-config');
        const { min_app_version, apk_download_url } = response.data;
        
        const currentVersion = Constants.expoConfig?.version || '1.0.0';
        
        // Exact match comparison as requested
        if (currentVersion !== min_app_version) {
          setIsOutdated(true);
          setApkUrl(apk_download_url);
        }
      } catch (err) {
        console.warn('Failed to check app version:', err.message);
      } finally {
        setIsLoading(false);
      }
    };

    checkAppVersion();
  }, []);

  if (isOutdated) {
    return (
      <Modal visible={true} animationType="fade">
        <SafeAreaView style={s.safeArea}>
          <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
          
          <View style={s.container}>
            {/* Official Header */}
            <View style={s.header}>
              <Ionicons name="shield-checkmark" size={54} color="#F59E0B" style={s.shieldIcon} />
              <Text style={s.deptName}>GOVERNMENT OF MAHARASHTRA</Text>
              <Text style={s.policeName}>PUNE CITY POLICE</Text>
            </View>

            {/* Warning Card */}
            <View style={s.card}>
              <View style={s.cardTopBorder} />
              <View style={s.cardInner}>
              <View style={s.warningBanner}>
                <Ionicons name="warning-outline" size={24} color="#DC2626" />
                <Text style={s.warningTitle}>MANDATORY UPDATE</Text>
              </View>

              <Text style={s.message}>
                A critical protocol update is available. You are required to install the latest version to maintain compliance with your monitoring guidelines.
              </Text>
              
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>CURRENT VERSION</Text>
                <Text style={s.infoValue}>{Constants.expoConfig?.version || '1.0.0'}</Text>
              </View>

              <TouchableOpacity 
                style={s.button} 
                onPress={() => Linking.openURL(apkUrl)}
                activeOpacity={0.8}
              >
                <Ionicons name="download-outline" size={20} color="#FFFFFF" />
                <Text style={s.buttonText}>DOWNLOAD OFFICIAL APK</Text>
              </TouchableOpacity>
              </View>
            </View>

            <Text style={s.footerText}>
              UNAUTHORIZED BYPASS IS STRICTLY PROHIBITED.
            </Text>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return children;
};

const s = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Dark Slate
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  shieldIcon: {
    marginBottom: 16,
  },
  deptName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 2,
    marginBottom: 4,
  },
  policeName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 3,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  cardTopBorder: {
    height: 6,
    backgroundColor: '#DC2626',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  cardInner: {
    padding: 24,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginBottom: 20,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#DC2626',
    marginLeft: 12,
    letterSpacing: 1,
  },
  message: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 24,
    fontWeight: '500',
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginBottom: 24,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#1E3A8A', // Navy Blue
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginLeft: 10,
  },
  footerText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 40,
    letterSpacing: 1.5,
  },
});

export default UpdaterOverlay;
