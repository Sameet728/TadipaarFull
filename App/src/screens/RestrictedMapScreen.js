import React, { useState, useCallback } from 'react';
import { 
  View, StyleSheet, Text, TouchableOpacity, 
  StatusBar, ActivityIndicator, Dimensions 
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const RestrictedMapScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  // Safely extract parameters with fallbacks
  const { 
    latitude = 19.0760, 
    longitude = 72.8777, 
    radiusKm = 1, 
    areaName = 'RESTRICTED ZONE' 
  } = route.params || {};

  // Calculate delta for appropriate map zoom level
  const delta = (radiusKm / 111) * 2.5;

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate a reload of the map data/coordinates
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* Official Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>GEOGRAPHICAL MAP</Text>
          <Text style={styles.headerSub}>RESTRICTED ZONE OVERVIEW</Text>
        </View>
        {/* Empty view for flex balance */}
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude,
            longitude,
            latitudeDelta: delta,
            longitudeDelta: delta,
          }}
          showsUserLocation={true}
          showsMyLocationButton={true}
          mapType="standard"
        >
          <Marker
            coordinate={{ latitude, longitude }}
            title={areaName.toUpperCase()}
            description={`RADIUS: ${radiusKm} KM`}
          />
          <Circle
            center={{ latitude, longitude }}
            radius={radiusKm * 1000} // Convert km to meters
            strokeWidth={2}
            strokeColor="rgba(220, 38, 38, 0.8)" // Official Red border
            fillColor="rgba(220, 38, 38, 0.15)"  // Light Red fill
          />
        </MapView>

        {/* Floating Refresh Button (Used instead of pull-to-refresh to preserve map panning) */}
        <TouchableOpacity 
          style={[styles.floatingRefresh, { top: 16 }]} 
          onPress={handleRefresh}
          activeOpacity={0.8}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#1E3A8A" />
          ) : (
            <Ionicons name="refresh" size={20} color="#1E3A8A" />
          )}
        </TouchableOpacity>
      </View>

      {/* Bottom Warning Banner - Automatically pads for devices with home indicators */}
      <View style={[styles.banner, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.bannerHeader}>
          <Ionicons name="warning" size={20} color="#DC2626" />
          <Text style={styles.bannerTitle}>{areaName.toUpperCase()}</Text>
        </View>
        <Text style={styles.bannerSub}>
          RESTRICTED RADIUS: {radiusKm} KM{'\n'}
          You are legally mandated to remain entirely outside the highlighted red zone.
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default RestrictedMapScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 1.5,
  },
  headerSub: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E3A8A',
    marginTop: 2,
    letterSpacing: 1,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  floatingRefresh: {
    position: 'absolute',
    right: 16,
    backgroundColor: '#FFFFFF',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  banner: {
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
    paddingHorizontal: 20,
    borderTopWidth: 4,
    borderTopColor: '#DC2626', // Official Danger Red
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 8,
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#DC2626',
    marginLeft: 8,
    letterSpacing: 1,
  },
  bannerSub: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
    lineHeight: 20,
    letterSpacing: 0.5,
  },
});