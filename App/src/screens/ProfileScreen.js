import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, Image, StatusBar, RefreshControl
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import Colors from '../constants/colors';
import API from '../api/api';
import { removeToken, getToken } from '../utils/storage';

const InfoRow = ({ icon, label, value, highlight }) => {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={18} color="#1E3A8A" />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label.toUpperCase()}</Text>
        <Text style={[styles.infoValue, highlight && styles.infoHighlight]}>
          {value}
        </Text>
      </View>
    </View>
  );
};

const SectionHeader = ({ title, icon }) => (
  <View style={styles.sectionHeader}>
    <Ionicons name={icon} size={18} color="#1E3A8A" />
    <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
  </View>
);

const ProfileScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [criminal, setCriminal] = useState(null);

  const fetchProfile = useCallback(async () => {
    try {
      const token = await getToken();
      const criminalId = await AsyncStorage.getItem('criminalId');
      if (!criminalId) { 
        setLoading(false); 
        return; 
      }

      const res = await API.get(`/criminal/${criminalId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setCriminal(res.data?.criminal ?? res.data);
    } catch (err) {
      Alert.alert('Retrieval Error', err?.response?.data?.message || 'Failed to load official profile data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { 
    fetchProfile(); 
  }, [fetchProfile]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  const handleLogout = () => {
    Alert.alert('Secure Logout', 'Are you sure you want to terminate this session?', [
      { text: 'CANCEL', style: 'cancel' },
      {
        text: 'LOGOUT',
        style: 'destructive',
        onPress: async () => {
          await removeToken();
          await AsyncStorage.removeItem('criminalId');
          navigation.replace('Login');
        },
      },
    ]);
  };

  const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
    : null;

  const periodActive = () => {
    const end = criminal?.periodTill || criminal?.endDate;
    if (!end) return null;
    
    const till = new Date(end);
    const now  = new Date();
    const diff = Math.ceil((till - now) / (1000 * 60 * 60 * 24));
    
    if (diff < 0)  return { text: 'EXTERNMENT PERIOD CONCLUDED', color: '#059669', bg: '#ECFDF5' };
    if (diff <= 30) return { text: `${diff} DAYS REMAINING`, color: '#DC2626', bg: '#FEF2F2' };
    return { text: `${diff} DAYS REMAINING`, color: '#D97706', bg: '#FFFBEB' };
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1E3A8A" />
        <Text style={styles.loadingText}>Retrieving Dossier…</Text>
      </View>
    );
  }

  const period = periodActive();

  return (
    <SafeAreaView style={styles.safe} edges={['right', 'left']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      
      {/* Header handled dynamically with insets */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>OFFICIAL PROFILE</Text>
        <Text style={styles.headerSub}>REGISTERED DETAILS</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#1E3A8A']}
            tintColor="#1E3A8A"
          />
        }
      >
        {/* ── Avatar / photo ── */}
        <View style={styles.avatarSection}>
          {criminal?.photoUrl ? (
            <Image source={{ uri: criminal.photoUrl }} style={styles.photo} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={52} color="#FFFFFF" />
            </View>
          )}
          <Text style={styles.nameText}>{criminal?.name?.toUpperCase() || 'DATA UNAVAILABLE'}</Text>
          <Text style={styles.loginIdText}>OFFICIAL ID: {criminal?.loginId || '—'}</Text>

          {criminal?.caseNumber && (
            <View style={styles.caseTag}>
              <Text style={styles.caseTagText}>CASE NO: {criminal.caseNumber}</Text>
            </View>
          )}
        </View>

        {/* ── Period status pill ── */}
        {period && (
          <View style={[styles.periodPill, { backgroundColor: period.bg, borderColor: period.color }]}>
            <Ionicons name="time" size={16} color={period.color} />
            <Text style={[styles.periodPillText, { color: period.color }]}> {period.text}</Text>
          </View>
        )}

        {/* ── Externment Details ── */}
        <View style={styles.card}>
          <SectionHeader title="Externment Details" icon="document-text" />

          <InfoRow
            icon="shield"
            label="Externment Section"
            value={criminal?.externmentSection ? `SECTION ${criminal.externmentSection}` : null}
            highlight
          />
          <InfoRow
            icon="calendar"
            label="Period From"
            value={fmtDate(criminal?.periodFrom || criminal?.startDate)}
          />
          <InfoRow
            icon="calendar"
            label="Period Till"
            value={fmtDate(criminal?.periodTill || criminal?.endDate)}
          />
          <InfoRow
            icon="home"
            label="Designated Residence"
            value={criminal?.residenceAddress || criminal?.residingAddress}
          />
        </View>

        {/* ── Jurisdiction ── */}
        <View style={styles.card}>
          <SectionHeader title="Jurisdiction" icon="business" />
          <InfoRow icon="layers" label="Zone" value={criminal?.zone} />
          <InfoRow icon="shield-half" label="ACP Division" value={criminal?.acpArea || criminal?.acpDivision} />
          <InfoRow icon="location" label="Police Station" value={criminal?.policeStation} />
        </View>

        {/* ── Personal Info ── */}
        <View style={styles.card}>
          <SectionHeader title="Personal Information" icon="person-circle" />
          <InfoRow icon="call" label="Contact Number" value={criminal?.phone} />
          <InfoRow icon="mail" label="Email Address" value={criminal?.email} />
          <InfoRow icon="map" label="Permanent Address" value={criminal?.address} />
        </View>

        {/* ── Logout ── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out" size={20} color="#FFFFFF" />
          <Text style={styles.logoutText}>TERMINATE SESSION</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  safe: { 
    flex: 1, 
    backgroundColor: '#F8FAFC' 
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#F8FAFC' 
  },
  loadingText: { 
    marginTop: 16, 
    color: '#475569',
    fontWeight: '600',
    letterSpacing: 1,
  },
  headerContainer: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 1.5,
  },
  headerSub: {
    color: '#1E3A8A',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 1.5,
  },
  container: { 
    padding: 20, 
    paddingBottom: 48 
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 8,
  },
  photo: {
    width: 120, 
    height: 120, 
    borderRadius: 60,
    borderWidth: 4, 
    borderColor: '#1E3A8A',
    marginBottom: 16,
    backgroundColor: '#E2E8F0',
  },
  avatarPlaceholder: {
    width: 120, 
    height: 120, 
    borderRadius: 60,
    backgroundColor: '#94A3B8',
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 4,
    borderColor: '#E2E8F0',
  },
  nameText: { 
    fontSize: 20, 
    fontWeight: '800', 
    color: '#0F172A',
    letterSpacing: 1,
    textAlign: 'center',
  },
  loginIdText: { 
    fontSize: 12, 
    fontWeight: '700',
    color: '#475569', 
    marginTop: 6,
    letterSpacing: 1,
  },
  caseTag: {
    marginTop: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  caseTagText: { 
    fontSize: 11, 
    color: '#1E3A8A', 
    fontWeight: '800',
    letterSpacing: 1,
  },
  periodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  periodPillText: { 
    fontSize: 12, 
    fontWeight: '800',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row', 
    alignItems: 'center',
    marginBottom: 16, 
    paddingBottom: 12,
    borderBottomWidth: 1, 
    borderBottomColor: '#E2E8F0',
  },
  sectionTitle: { 
    fontSize: 13, 
    fontWeight: '800', 
    color: '#1E3A8A',
    marginLeft: 8,
    letterSpacing: 1,
  },
  infoRow: {
    flexDirection: 'row', 
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1, 
    borderBottomColor: '#F8FAFC',
  },
  infoIcon: {
    width: 36, 
    height: 36,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    justifyContent: 'center', 
    alignItems: 'center',
    marginRight: 12,
  },
  infoText: { 
    flex: 1 
  },
  infoLabel: { 
    fontSize: 10, 
    fontWeight: '700',
    color: '#64748B', 
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  infoValue: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#0F172A' 
  },
  infoHighlight: { 
    color: '#DC2626', // Red highlight for severity 
    fontWeight: '800' 
  },
  logoutBtn: {
    flexDirection: 'row',
    backgroundColor: '#DC2626', // Red
    padding: 16, 
    borderRadius: 6,
    alignItems: 'center', 
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  logoutText: { 
    color: '#FFFFFF', 
    fontWeight: '800', 
    fontSize: 13, 
    letterSpacing: 1.5,
    marginLeft: 8,
  },
});