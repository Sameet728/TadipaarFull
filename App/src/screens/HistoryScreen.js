import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, 
  RefreshControl, Image, TouchableOpacity, Linking, StatusBar
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import Colors from '../constants/colors';
import API from '../api/api';
import { getToken } from '../utils/storage';

const STATUS_CONFIG = {
  compliant:     { color: '#059669', bg: '#ECFDF5', icon: 'checkmark-circle',  label: 'COMPLIANT' },
  'non-compliant': { color: '#DC2626', bg: '#FEF2F2', icon: 'close-circle',      label: 'VIOLATION' },
  non_compliant: { color: '#DC2626', bg: '#FEF2F2', icon: 'close-circle',      label: 'VIOLATION' },
  pending:       { color: '#D97706', bg: '#FFFBEB', icon: 'time',              label: 'PENDING' },
};

const getStatusCfg = (status = '') =>
  STATUS_CONFIG[status.toLowerCase()] || { color: '#64748B', bg: '#F1F5F9', icon: 'ellipse', label: status.toUpperCase() };

const openGoogleMaps = (lat, lng) => {
  const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  Linking.openURL(url).catch(() => Alert.alert('Error', 'Unable to open maps application.'));
};

const CheckInItem = ({ item }) => {
  const [imgExpanded, setImgExpanded] = useState(false);

  const dateStr  = item.checkInTime || item.createdAt || item.date;
  const lat      = item.latitude  != null ? parseFloat(item.latitude)  : null;
  const lng      = item.longitude != null ? parseFloat(item.longitude) : null;
  const status   = item.status || 'pending';
  const cfg      = getStatusCfg(status);

  const formatted = dateStr
    ? new Date(dateStr).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : 'DATE UNAVAILABLE';

  return (
    <View style={[styles.card, { borderLeftColor: cfg.color }]}>

      {/* ── Header: date + badge ── */}
      <View style={styles.cardHeader}>
        <Ionicons name="calendar-outline" size={16} color="#475569" />
        <Text style={styles.dateText}>{formatted.toUpperCase()}</Text>
        <View style={[styles.badge, { backgroundColor: cfg.color }]}>
          <Ionicons name={cfg.icon} size={12} color="#FFFFFF" />
          <Text style={styles.badgeText}>{cfg.label}</Text>
        </View>
      </View>

      {/* ── Selfie image ── */}
      {item.selfieUrl ? (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setImgExpanded(!imgExpanded)}
        >
          <Image
            source={{ uri: item.selfieUrl }}
            style={[styles.selfie, imgExpanded && styles.selfieExpanded]}
            resizeMode="cover"
          />
          <View style={styles.imgHintContainer}>
            <Text style={styles.imgHint}>
              {imgExpanded ? 'TAP TO COLLAPSE IMAGE' : 'TAP TO EXPAND IMAGE'}
            </Text>
          </View>
        </TouchableOpacity>
      ) : (
        <View style={styles.noImg}>
          <Ionicons name="image-outline" size={28} color="#94A3B8" />
          <Text style={styles.noImgText}>NO IMAGE PROVIDED</Text>
        </View>
      )}

      {/* ── Status banner ── */}
      <View style={[styles.statusBanner, { backgroundColor: cfg.bg, borderColor: cfg.color }]}>
        <Ionicons name={cfg.icon} size={18} color={cfg.color} />
        <Text style={[styles.statusText, { color: cfg.color }]}>
          {status.toLowerCase() === 'compliant'
            ? 'VERIFIED: Outside all restricted zones.'
            : (status.toLowerCase() === 'non_compliant' || status.toLowerCase() === 'non-compliant')
            ? 'ALERT: Restricted area violation detected!'
            : 'STATUS: ' + status.toUpperCase()}
        </Text>
      </View>

      {/* ── Violation reason (if any) ── */}
      {(item.violationReason || item.remarks) ? (
        <View style={styles.violationBox}>
          <Ionicons name="document-text-outline" size={14} color="#0F172A" style={{ marginTop: 2 }} />
          <Text style={styles.violationText}> 
            <Text style={{fontWeight: '700'}}>OFFICIAL REMARKS: </Text>
            {item.violationReason || item.remarks}
          </Text>
        </View>
      ) : null}

      {/* ── Location + map button ── */}
      {lat != null && (
        <View style={styles.locationRow}>
          <View style={styles.coordBox}>
            <Ionicons name="location-outline" size={16} color="#475569" />
            <Text style={styles.coordText}>
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.mapBtn}
            onPress={() => openGoogleMaps(lat, lng)}
            activeOpacity={0.8}
          >
            <Ionicons name="map" size={14} color="#FFFFFF" />
            <Text style={styles.mapBtnText}>VIEW MAP</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const HistoryScreen = () => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkIns, setCheckIns] = useState([]);
  const [stats, setStats] = useState({ total: 0, compliant: 0, non_compliant: 0 });

  const fetchHistory = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await API.get('/tadipaar/history', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = res.data?.checkIns ?? res.data?.history ?? res.data ?? [];
      const list = Array.isArray(data) ? data : [];
      setCheckIns(list);

      // Compute local stats resiliently
      const compliant = list.filter(i => (i.status || '').toLowerCase() === 'compliant').length;
      const non_compliant = list.filter(i => {
        const s = (i.status || '').toLowerCase();
        return s === 'non_compliant' || s === 'non-compliant';
      }).length;
      
      setStats({ total: list.length, compliant, non_compliant });
    } catch (err) {
      Alert.alert('Data Retrieval Error', err?.response?.data?.message || 'Failed to securely load history records.');
      setCheckIns([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const onRefresh = () => { 
    setRefreshing(true); 
    fetchHistory(); 
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1E3A8A" />
        <Text style={styles.loadingText}>Retrieving Official Records…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['right', 'left']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      
      {/* Header handled dynamically with insets */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>VERIFICATION HISTORY</Text>
        <Text style={styles.headerSub}>PAST COMPLIANCE RECORDS</Text>
      </View>

      {/* ── Summary strip ── */}
      {checkIns.length > 0 && (
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { borderTopColor: '#1E3A8A' }]}>
            <Text style={[styles.statNum, { color: '#1E3A8A' }]}>{stats.total}</Text>
            <Text style={styles.statLabel}>TOTAL LOGS</Text>
          </View>
          <View style={[styles.statBox, { borderTopColor: '#059669' }]}>
            <Text style={[styles.statNum, { color: '#059669' }]}>{stats.compliant}</Text>
            <Text style={styles.statLabel}>COMPLIANT</Text>
          </View>
          <View style={[styles.statBox, { borderTopColor: '#DC2626' }]}>
            <Text style={[styles.statNum, { color: '#DC2626' }]}>{stats.non_compliant}</Text>
            <Text style={styles.statLabel}>VIOLATIONS</Text>
          </View>
        </View>
      )}

      {checkIns.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="folder-open-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyText}>NO RECORDS FOUND</Text>
          <Text style={styles.emptySub}>
            Your daily check-in logs will appear here once submitted.
          </Text>
        </View>
      ) : (
        <FlatList
          data={checkIns}
          keyExtractor={(item, idx) => item._id?.toString() ?? idx.toString()}
          renderItem={({ item }) => <CheckInItem item={item} />}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#1E3A8A']}
              tintColor="#1E3A8A"
            />
          }
          contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 20 }}
        />
      )}
    </SafeAreaView>
  );
};

export default HistoryScreen;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  center: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
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

  // Stats strip
  statsRow: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    gap: 12,
  },
  statBox: {
    flex: 1, 
    backgroundColor: '#FFFFFF', 
    borderRadius: 8, 
    paddingVertical: 16,
    alignItems: 'center', 
    borderTopWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNum: { 
    fontSize: 24, 
    fontWeight: '800' 
  },
  statLabel: { 
    fontSize: 10, 
    fontWeight: '700',
    color: '#64748B', 
    marginTop: 4,
    letterSpacing: 0.5,
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 14,
  },
  dateText: {
    flex: 1, 
    fontSize: 13, 
    fontWeight: '700',
    color: '#1E293B', 
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  badge: {
    flexDirection: 'row', 
    alignItems: 'center',
    paddingHorizontal: 8, 
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    color: '#FFFFFF', 
    fontSize: 10, 
    fontWeight: '800', 
    letterSpacing: 0.5,
    marginLeft: 4,
  },

  // Selfie
  selfie: {
    width: '100%', 
    height: 200, 
    borderRadius: 6,
    backgroundColor: '#E2E8F0', 
  },
  selfieExpanded: {
    height: 400,
  },
  imgHintContainer: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    marginBottom: 12,
  },
  imgHint: {
    fontSize: 10, 
    fontWeight: '700',
    color: '#64748B', 
    textAlign: 'center', 
    letterSpacing: 1,
  },
  noImg: {
    height: 120, 
    backgroundColor: '#F8FAFC', 
    borderRadius: 6,
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 16,
    borderWidth: 1, 
    borderColor: '#CBD5E1', 
    borderStyle: 'dashed',
  },
  noImgText: { 
    color: '#94A3B8', 
    fontSize: 11, 
    fontWeight: '700',
    marginTop: 8,
    letterSpacing: 1,
  },

  // Status banner
  statusBanner: {
    flexDirection: 'row', 
    alignItems: 'center',
    padding: 12, 
    borderRadius: 6, 
    marginBottom: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12, 
    fontWeight: '700', 
    flex: 1,
    marginLeft: 8,
    letterSpacing: 0.5,
  },

  // Violation/Remarks
  violationBox: {
    flexDirection: 'row', 
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC', 
    borderRadius: 6,
    padding: 12, 
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  violationText: {
    fontSize: 12, 
    color: '#334155', 
    flex: 1, 
    lineHeight: 18,
    marginLeft: 6,
  },

  // Location
  locationRow: {
    flexDirection: 'row', 
    alignItems: 'center',
    justifyContent: 'space-between', 
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  coordBox: {
    flexDirection: 'row', 
    alignItems: 'center', 
    flex: 1,
  },
  coordText: { 
    fontSize: 12, 
    fontWeight: '600',
    color: '#475569',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  mapBtn: {
    flexDirection: 'row', 
    alignItems: 'center',
    backgroundColor: '#1E3A8A', // Deep Blue
    paddingHorizontal: 12, 
    paddingVertical: 8,
    borderRadius: 6,
  },
  mapBtnText: {
    color: '#FFFFFF', 
    fontSize: 11, 
    fontWeight: '700',
    marginLeft: 6,
    letterSpacing: 1,
  },

  // Empty State
  empty: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 40,
  },
  emptyText: { 
    fontSize: 16, 
    fontWeight: '800', 
    color: '#64748B', 
    marginTop: 16,
    letterSpacing: 1,
  },
  emptySub:  { 
    fontSize: 12, 
    color: '#94A3B8', 
    textAlign: 'center', 
    marginTop: 8,
    lineHeight: 18,
    fontWeight: '500',
  },
});