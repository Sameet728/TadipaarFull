import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, StatusBar, RefreshControl
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/colors';

const ActionCard = ({ icon, label, subtitle, color, onPress }) => (
  <TouchableOpacity style={[styles.actionCard, { borderLeftColor: color }]} onPress={onPress} activeOpacity={0.8}>
    <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
      <Ionicons name={icon} size={26} color={color} />
    </View>
    <View style={styles.actionText}>
      <Text style={styles.actionLabel}>{label}</Text>
      <Text style={styles.actionSub}>{subtitle}</Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
  </TouchableOpacity>
);

const CriminalHome = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate a network request or data reload
    setTimeout(() => {
      setRefreshing(false);
    }, 1200);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['right', 'left']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      
      {/* Header - Dynamically pushed below the notch using insets */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>MAHARASHTRA POLICE</Text>
        <Text style={styles.headerSub}>EXTERNMENT MONITORING SYSTEM</Text>
      </View>

      <ScrollView 
        style={styles.body} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={['#1E3A8A']} // Official Blue
            tintColor="#1E3A8A"
          />
        }
      >
        {/* Compliance Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerHeader}>
            <Ionicons name="information-circle" size={20} color="#1E3A8A" />
            <Text style={styles.bannerTitle}>MANDATORY COMPLIANCE</Text>
          </View>
          <Text style={styles.bannerSub}>
            Complete your daily check-in on time to stay compliant with your active externment order. Failure to comply will result in immediate legal action.
          </Text>
        </View>

        {/* Action cards */}
        <Text style={styles.sectionTitle}>SYSTEM ACTIONS</Text>

        <ActionCard
          icon="camera"
          label="Daily Check-In"
          subtitle="Submit facial & location verification"
          color="#1E3A8A" // Deep Blue
          onPress={() => navigation.navigate('CheckIn')}
        />
        <ActionCard
          icon="time"
          label="Verification History"
          subtitle="Review past compliance records"
          color="#059669" // Emerald Green
          onPress={() => navigation.navigate('History')}
        />
        <ActionCard
          icon="warning"
          label="Restricted Zones"
          subtitle="View active geographical restrictions"
          color="#DC2626" // Red
          onPress={() => navigation.navigate('Restricted')}
        />
        <ActionCard
          icon="person"
          label="Profile Information"
          subtitle="View official registered details"
          color="#475569" // Slate Gray
          onPress={() => navigation.navigate('Profile')}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default CriminalHome;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 1.5,
  },
  headerSub: {
    color: '#1E3A8A',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 1,
  },
  body: {
    flex: 1,
    backgroundColor: '#F1F5F9', // Slightly darker off-white for contrast against cards
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  banner: {
    backgroundColor: '#EFF6FF', // Light blue background
    borderRadius: 8,
    padding: 16,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderLeftWidth: 4,
    borderLeftColor: '#1E3A8A',
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A8A',
    marginLeft: 6,
    letterSpacing: 1,
  },
  bannerSub: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 16,
    letterSpacing: 1.5,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionText: { 
    flex: 1 
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  actionSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
  },
});