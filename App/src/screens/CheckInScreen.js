import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, Alert, ActivityIndicator, ScrollView,
  StatusBar, RefreshControl, Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Circle } from 'react-native-maps';

import Colors from '../constants/colors';
import API from '../api/api';
import { getToken } from '../utils/storage';

const CheckInScreen = () => {
  const insets = useSafeAreaInsets();

  const [photo,      setPhoto]      = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [locData,    setLocData]    = useState(null);   // { lat, lng, accuracy, address }
  const [refreshing, setRefreshing] = useState(false);
  const [step,       setStep]       = useState('idle'); // idle | capturing | locating | submitting

  // ── Pull to Refresh ────────────────────────────────────
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPhoto(null);
    setLocData(null);
    setStep('idle');
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  // ── Capture Selfie ─────────────────────────────────────
  const captureSelfie = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Authorization Required', 'Camera permission is mandatory for official check-in.');
      return;
    }

    setStep('capturing');
    const result = await ImagePicker.launchCameraAsync({
      cameraType: ImagePicker.CameraType.front,
      quality: 0.7,
      allowsEditing: false,
      exif: false,
    });

    if (!result.canceled && result.assets?.length > 0) {
      setPhoto(result.assets[0]);
      // Auto-fetch location right after photo capture
      await fetchLocation();
    }
    setStep('idle');
  };

  // ── Get GPS + Reverse Geocode ──────────────────────────
  const fetchLocation = async () => {
    try {
      setStep('locating');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission denied. Please enable it in device settings.');
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude, accuracy } = position.coords;

      if (accuracy > 150) {
        throw new Error(
          `GPS accuracy too low (${Math.round(accuracy)}m). Please move to an open outdoor area.`
        );
      }

      // Reverse geocode to get human-readable address
      let address = 'Locating address...';
      try {
        const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geo && geo.length > 0) {
          const g = geo[0];
          const parts = [
            g.name,
            g.street,
            g.district || g.subregion,
            g.city,
            g.region,
          ].filter(Boolean);
          address = parts.join(', ');
        }
      } catch {
        address = 'Address unavailable';
      }

      setLocData({ lat: latitude, lng: longitude, accuracy: Math.round(accuracy), address });
      setStep('idle');
      return { latitude, longitude };
    } catch (err) {
      setStep('idle');
      throw err;
    }
  };

  // ── Refresh Location manually ──────────────────────────
  const refreshLocation = async () => {
    try {
      await fetchLocation();
    } catch (err) {
      Alert.alert('Location Error', err.message);
    }
  };

  // ── Submit check-in ────────────────────────────────────
  const submitCheckIn = async () => {
    if (!photo) {
      Alert.alert('Verification Incomplete', 'Please capture your facial verification photo first.');
      return;
    }
    if (!locData) {
      Alert.alert('Location Required', 'Location is not captured yet. Please wait or tap "Refresh Location".');
      return;
    }

    try {
      setLoading(true);
      setStep('submitting');

      const token = await getToken();

      const formData = new FormData();
      formData.append('selfie', {
        uri: photo.uri,
        type: 'image/jpeg',
        name: 'selfie.jpg',
      });
      formData.append('latitude',  String(locData.lat));
      formData.append('longitude', String(locData.lng));
      formData.append('accuracy',  String(locData.accuracy));

      const res = await API.post('/tadipaar/checkin', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      const isCompliant = res.data.compliant;

      Alert.alert(
        isCompliant ? '✅ Check-In Successful' : '⚠️ Check-In Recorded',
        res.data.message || 'Your daily check-in has been recorded.',
        [{ text: 'OK', onPress: () => { setPhoto(null); setLocData(null); setStep('idle'); } }]
      );
    } catch (err) {
      Alert.alert(
        'Submission Failed',
        err?.response?.data?.message || err.message || 'An unexpected error occurred.'
      );
    } finally {
      setLoading(false);
      setStep('idle');
    }
  };

  const openGoogleMaps = () => {
    if (!locData) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${locData.lat},${locData.lng}`;
    Linking.openURL(url);
  };

  const isLocating   = step === 'locating';
  const isSubmitting = step === 'submitting' || loading;

  return (
    <SafeAreaView style={styles.safeArea} edges={['right', 'left']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>OFFICIAL VERIFICATION</Text>
        <Text style={styles.headerSub}>DAILY CHECK-IN PORTAL</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
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
        <Text style={styles.instructionText}>
          Ensure your face is clearly visible and you are outdoors for accurate GPS.
        </Text>

        {/* ── Step indicators ── */}
        <View style={styles.stepsRow}>
          {[
            { num: '1', label: 'PHOTO',    done: !!photo },
            { num: '2', label: 'LOCATION', done: !!locData },
            { num: '3', label: 'SUBMIT',   done: false },
          ].map((s, i) => (
            <React.Fragment key={s.num}>
              <View style={styles.stepItem}>
                <View style={[styles.stepCircle, s.done && styles.stepCircleDone]}>
                  {s.done
                    ? <Ionicons name="checkmark" size={14} color="#fff" />
                    : <Text style={styles.stepNum}>{s.num}</Text>}
                </View>
                <Text style={[styles.stepLabel, s.done && styles.stepLabelDone]}>{s.label}</Text>
              </View>
              {i < 2 && <View style={[styles.stepLine, s.done && styles.stepLineDone]} />}
            </React.Fragment>
          ))}
        </View>

        {/* ── Photo Section ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="camera-outline" size={16} color="#1E3A8A" />
            <Text style={styles.sectionTitle}>FACIAL VERIFICATION</Text>
          </View>

          {photo ? (
            <View style={styles.previewBox}>
              <Image source={{ uri: photo.uri }} style={styles.preview} />
              <TouchableOpacity style={styles.retakeBtn} onPress={captureSelfie} activeOpacity={0.8}>
                <Ionicons name="refresh-circle" size={18} color="#1E3A8A" />
                <Text style={styles.retakeText}>RECAPTURE</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.placeholder} onPress={captureSelfie} activeOpacity={0.85}>
              <Ionicons name="person-outline" size={56} color="#94A3B8" />
              <Text style={styles.placeholderText}>TAP TO CAPTURE PHOTO</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Location Section ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={16} color="#1E3A8A" />
            <Text style={styles.sectionTitle}>GPS LOCATION</Text>
            {locData && (
              <TouchableOpacity onPress={refreshLocation} style={styles.refreshLocBtn} disabled={isLocating}>
                <Ionicons name="refresh" size={14} color="#1E3A8A" />
                <Text style={styles.refreshLocText}>REFRESH</Text>
              </TouchableOpacity>
            )}
          </View>

          {isLocating ? (
            <View style={styles.locatingBox}>
              <ActivityIndicator color="#1E3A8A" size="small" />
              <Text style={styles.locatingText}>Acquiring GPS coordinates...</Text>
            </View>
          ) : locData ? (
            <View>
              {/* Coordinate row */}
              <View style={styles.coordRow}>
                <View style={styles.coordItem}>
                  <Text style={styles.coordLabel}>LATITUDE</Text>
                  <Text style={styles.coordValue}>{locData.lat.toFixed(6)}</Text>
                </View>
                <View style={styles.coordDivider} />
                <View style={styles.coordItem}>
                  <Text style={styles.coordLabel}>LONGITUDE</Text>
                  <Text style={styles.coordValue}>{locData.lng.toFixed(6)}</Text>
                </View>
                <View style={styles.coordDivider} />
                <View style={styles.coordItem}>
                  <Text style={styles.coordLabel}>ACCURACY</Text>
                  <Text style={[styles.coordValue, locData.accuracy > 50 ? { color: '#F59E0B' } : { color: '#059669' }]}>
                    ±{locData.accuracy}m
                  </Text>
                </View>
              </View>

              {/* Address */}
              <View style={styles.addressRow}>
                <Ionicons name="location" size={14} color="#1E3A8A" />
                <Text style={styles.addressText} numberOfLines={2}>{locData.address}</Text>
              </View>

              {/* Mini Map */}
              <View style={styles.mapContainer}>
                <MapView
                  style={styles.map}
                  initialRegion={{
                    latitude:      locData.lat,
                    longitude:     locData.lng,
                    latitudeDelta:  0.003,
                    longitudeDelta: 0.003,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  pitchEnabled={false}
                  rotateEnabled={false}
                  pointerEvents="none"
                >
                  <Marker
                    coordinate={{ latitude: locData.lat, longitude: locData.lng }}
                    title="Your Location"
                  />
                  <Circle
                    center={{ latitude: locData.lat, longitude: locData.lng }}
                    radius={locData.accuracy}
                    strokeColor="rgba(30,58,138,0.5)"
                    fillColor="rgba(30,58,138,0.1)"
                  />
                </MapView>

                {/* Google Maps button overlay */}
                <TouchableOpacity style={styles.openMapsBtn} onPress={openGoogleMaps}>
                  <Ionicons name="navigate" size={13} color="#fff" />
                  <Text style={styles.openMapsBtnText}>Open in Google Maps</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.locPlaceholder} onPress={refreshLocation} activeOpacity={0.85}>
              <Ionicons name="locate-outline" size={36} color="#94A3B8" />
              <Text style={styles.locPlaceholderText}>TAP TO GET LOCATION</Text>
              <Text style={styles.locPlaceholderSub}>or capture photo to auto-detect</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Action Buttons ── */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.captureBtn}
            onPress={captureSelfie}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            <Ionicons name="camera" size={20} color="#fff" />
            <Text style={styles.btnText}>
              {photo ? 'RETAKE PHOTO' : 'CAPTURE PHOTO'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.submitBtn,
              (!photo || !locData || isSubmitting) && styles.btnDisabled,
            ]}
            onPress={submitCheckIn}
            disabled={!photo || !locData || isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="shield-checkmark" size={20} color="#fff" />
                <Text style={styles.btnText}>SUBMIT VERIFICATION</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Warning ── */}
        <View style={styles.warningContainer}>
          <Ionicons name="alert-circle" size={16} color="#DC2626" />
          <Text style={styles.warningText}>
            Submitting falsified information is a punishable offense under law.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default CheckInScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 24,
    paddingBottom: 16,
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
  scrollContent: {
    padding: 20,
    paddingBottom: 48,
  },
  instructionText: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
    fontWeight: '500',
  },

  // ── Steps ──
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  stepItem: {
    alignItems: 'center',
    width: 64,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepCircleDone: {
    backgroundColor: '#059669',
  },
  stepNum: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  stepLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  stepLabelDone: {
    color: '#059669',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginBottom: 14,
  },
  stepLineDone: {
    backgroundColor: '#059669',
  },

  // ── Section card ──
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E3A8A',
    letterSpacing: 1.2,
    flex: 1,
  },
  refreshLocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  refreshLocText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1E3A8A',
    letterSpacing: 0.5,
  },

  // ── Photo ──
  previewBox: {
    alignItems: 'center',
  },
  preview: {
    width: '100%',
    height: 280,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 7,
    paddingHorizontal: 14,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 6,
  },
  retakeText: {
    color: '#1E3A8A',
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 1,
  },
  placeholder: {
    height: 200,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    gap: 8,
  },
  placeholderText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },

  // ── Location ──
  locatingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 10,
  },
  locatingText: {
    color: '#1E3A8A',
    fontSize: 12,
    fontWeight: '600',
  },

  coordRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  coordItem: {
    flex: 1,
    alignItems: 'center',
  },
  coordDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 2,
  },
  coordLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  coordValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E3A8A',
    fontVariant: ['tabular-nums'],
  },

  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  addressText: {
    flex: 1,
    fontSize: 12,
    color: '#1E3A8A',
    fontWeight: '600',
    lineHeight: 18,
  },

  // ── Map ──
  mapContainer: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    position: 'relative',
  },
  map: {
    width: '100%',
    height: 200,
  },
  openMapsBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  openMapsBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  locPlaceholder: {
    height: 120,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    gap: 6,
  },
  locPlaceholderText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  locPlaceholderSub: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '500',
  },

  // ── Actions ──
  actionContainer: {
    marginBottom: 16,
    gap: 10,
  },
  captureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#475569',
    paddingVertical: 15,
    borderRadius: 8,
    justifyContent: 'center',
    elevation: 2,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingVertical: 15,
    borderRadius: 8,
    justifyContent: 'center',
    elevation: 2,
    gap: 8,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  btnDisabled: {
    backgroundColor: '#CBD5E1',
    elevation: 0,
    shadowOpacity: 0,
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 1.2,
  },

  // ── Warning ──
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 8,
  },
  warningText: {
    fontSize: 11,
    color: '#DC2626',
    flex: 1,
    fontWeight: '600',
    lineHeight: 16,
  },
});