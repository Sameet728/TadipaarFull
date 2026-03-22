import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  ActivityIndicator, Alert, TouchableOpacity,
  Linking, StatusBar, RefreshControl
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import Colors from '../constants/colors';
import API from '../api/api';
import { getToken } from '../utils/storage';

const RestrictedScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [areas, setAreas] = useState([]);
  const [orderInfo, setOrderInfo] = useState(null);

  const fetchAreas = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await API.get('/tadipaar/my-areas', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrderInfo({
        startDate: res.data.startDate,
        endDate:   res.data.endDate,
        orderId:   res.data.orderId,
      });
      setAreas(res.data.areas || []);
    } catch (err) {
      Alert.alert('Retrieval Error', err?.response?.data?.message || 'Failed to securely load restricted zones.');
      setAreas([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { 
    fetchAreas(); 
  }, [fetchAreas]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAreas();
  };

  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric',
        }).toUpperCase() : 'UNAVAILABLE';

  const openGoogleMaps = (lat, lng) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Unable to open maps application.'));
  };

  const openInAppMap = (item) => {
    navigation.navigate('RestrictedMap', {
      latitude:  item.latitude,
      longitude: item.longitude,
      radiusKm:  item.radiusKm,
      areaName:  item.areaName,
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1E3A8A" />
        <Text style={styles.loadingText}>Retrieving Zone Data…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['right', 'left']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* Header handled dynamically with insets */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>RESTRICTED ZONES</Text>
        <Text style={styles.headerSub}>ACTIVE EXCLUSION AREAS</Text>
      </View>

      <FlatList
        data={areas}
        keyExtractor={(item) => item._id?.toString() || Math.random().toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#1E3A8A']}
            tintColor="#1E3A8A"
          />
        }
        ListHeaderComponent={
          <>
            {orderInfo?.startDate && (
              <View style={styles.orderBanner}>
                <View style={styles.orderHeader}>
                  <Ionicons name="document-text" size={18} color="#D97706" />
                  <Text style={styles.orderTitle}>OFFICIAL EXTERNMENT ORDER</Text>
                </View>
                <Text style={styles.orderText}>
                  <Text style={{fontWeight: '700'}}>PERIOD:</Text> {fmtDate(orderInfo.startDate)} — {fmtDate(orderInfo.endDate)}
                </Text>
                {orderInfo.orderId && (
                  <Text style={styles.orderText}>
                    <Text style={{fontWeight: '700'}}>ORDER ID:</Text> {orderInfo.orderId}
                  </Text>
                )}
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="shield-checkmark-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyText}>NO RESTRICTED ZONES</Text>
            <Text style={styles.emptySubText}>There are no active geographical restrictions on your profile at this time.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="warning" size={20} color="#DC2626" />
              <Text style={styles.areaName}>{item.areaName.toUpperCase()}</Text>
            </View>
            
            <View style={styles.metaRow}>
              <Ionicons name="radio-outline" size={14} color="#475569" />
              <Text style={styles.metaText}>
                <Text style={{fontWeight: '700'}}>RESTRICTION RADIUS:</Text> {item.radiusKm} KM
              </Text>
            </View>
            
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={14} color="#475569" />
              <Text style={styles.metaText}>
                <Text style={{fontWeight: '700'}}>IMPLEMENTED ON:</Text> {fmtDate(item.createdAt)}
              </Text>
            </View>

            <View style={styles.warningBox}>
              <Text style={styles.warningText}>MANDATORY EXCLUSION ZONE. DO NOT ENTER.</Text>
            </View>

            {/* Buttons */}
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.mapBtn, { backgroundColor: '#1E3A8A' }]}
                onPress={() => openInAppMap(item)}
                activeOpacity={0.8}
              >
                <Ionicons name="map" size={16} color="#FFFFFF" />
                <Text style={styles.mapBtnText}>IN-APP MAP</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.mapBtn, { backgroundColor: '#475569', marginLeft: 8 }]}
                onPress={() => openGoogleMaps(item.latitude, item.longitude)}
                activeOpacity={0.8}
              >
                <Ionicons name="navigate" size={16} color="#FFFFFF" />
                <Text style={styles.mapBtnText}>GOOGLE MAPS</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

export default RestrictedScreen;

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
    color: '#DC2626', // Danger red to highlight restriction
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 1.5,
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  orderBanner: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderLeftWidth: 4,
    borderLeftColor: '#D97706',
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderTitle: {
    fontWeight: '800', 
    color: '#D97706', 
    fontSize: 13,
    marginLeft: 6,
    letterSpacing: 1,
  },
  orderText: {
    fontSize: 12, 
    color: '#334155', 
    marginTop: 4,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderTopWidth: 4,
    borderTopColor: '#DC2626', // Red warning top border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
  areaName: {
    fontSize: 16, 
    fontWeight: '800', 
    color: '#0F172A', 
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 8,
  },
  metaText: {
    fontSize: 12, 
    color: '#475569',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  warningBox: {
    backgroundColor: '#FEF2F2',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
  },
  warningText: {
    color: '#DC2626',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  btnRow: {
    flexDirection: 'row', 
    marginTop: 16,
  },
  mapBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 6,
  },
  mapBtnText: {
    color: '#FFFFFF', 
    fontWeight: '800', 
    fontSize: 12,
    marginLeft: 6,
    letterSpacing: 1,
  },
  empty: {
    alignItems: 'center',
    marginTop: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16, 
    fontWeight: '800', 
    color: '#64748B', 
    marginTop: 16,
    letterSpacing: 1,
  },
  emptySubText: {
    fontSize: 12, 
    color: '#94A3B8', 
    textAlign: 'center', 
    marginTop: 8,
    lineHeight: 18,
    fontWeight: '500',
  },
});