import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, Alert, ActivityIndicator, ScrollView,
  StatusBar, RefreshControl, Linking, Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Circle } from 'react-native-maps';

import Colors from '../constants/colors';
import API from '../api/api';
import { getToken } from '../utils/storage';

// ─── Face check status config ──────────────────────────────────────────────────
const FACE_STATUS = {
  verified: {
    icon:    'checkmark-circle',
    color:   '#059669',
    bg:      '#ECFDF5',
    border:  '#A7F3D0',
    title:   'Face Verified',
    label:   'VERIFIED',
  },
  no_face: {
    icon:    'person-remove-outline',
    color:   '#D97706',
    bg:      '#FFFBEB',
    border:  '#FDE68A',
    title:   'No Face Detected',
    label:   'NO FACE',
  },
  multiple_faces: {
    icon:    'people-outline',
    color:   '#DC2626',
    bg:      '#FEF2F2',
    border:  '#FECACA',
    title:   'Multiple People Detected',
    label:   'MULTIPLE FACES',
  },
  mismatch: {
    icon:    'close-circle-outline',
    color:   '#DC2626',
    bg:      '#FEF2F2',
    border:  '#FECACA',
    title:   'Face Mismatch',
    label:   'MISMATCH',
  },
};

// ─── Face Result Modal ─────────────────────────────────────────────────────────
const FaceResultModal = ({ visible, result, onClose, onRetake }) => {
  if (!result) return null;

  const cfg = FACE_STATUS[result.faceCheckStatus] || FACE_STATUS.mismatch;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={modal.overlay}>
        <View style={modal.card}>
          {/* Icon */}
          <View style={[modal.iconCircle, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
            <Ionicons name={cfg.icon} size={44} color={cfg.color} />
          </View>

          {/* Title */}
          <Text style={[modal.title, { color: cfg.color }]}>{cfg.title}</Text>

          {/* Reason */}
          <Text style={modal.reason}>{result.reason}</Text>

          {/* Similarity badge — only show when verified */}
          {result.faceCheckStatus === 'verified' && result.faceSimilarity != null && (
            <View style={[modal.badge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
              <Ionicons name="analytics-outline" size={14} color={cfg.color} />
              <Text style={[modal.badgeText, { color: cfg.color }]}>
                {result.faceSimilarity}% Match
              </Text>
            </View>
          )}

          {/* Tips for failure cases */}
          {result.faceCheckStatus === 'no_face' && (
            <View style={modal.tips}>
              <Text style={modal.tipsTitle}>Tips:</Text>
              <Text style={modal.tipItem}>• Face the camera directly</Text>
              <Text style={modal.tipItem}>• Ensure good lighting</Text>
              <Text style={modal.tipItem}>• Remove sunglasses or mask</Text>
            </View>
          )}
          {result.faceCheckStatus === 'multiple_faces' && (
            <View style={modal.tips}>
              <Text style={modal.tipsTitle}>Tips:</Text>
              <Text style={modal.tipItem}>• Only you should be in the frame</Text>
              <Text style={modal.tipItem}>• Move away from other people</Text>
              <Text style={modal.tipItem}>• Find a private space to check in</Text>
            </View>
          )}
          {result.faceCheckStatus === 'mismatch' && (
            <View style={modal.tips}>
              <Text style={modal.tipsTitle}>Tips:</Text>
              <Text style={modal.tipItem}>• Ensure good, even lighting</Text>
              <Text style={modal.tipItem}>• Face the camera directly</Text>
              <Text style={modal.tipItem}>• Contact your officer if issue persists</Text>
            </View>
          )}

          {/* Buttons */}
          <View style={modal.btnRow}>
            {result.faceCheckStatus !== 'verified' && (
              <TouchableOpacity
                style={[modal.btn, modal.retakeBtn]}
                onPress={onRetake}
                activeOpacity={0.8}
              >
                <Ionicons name="camera-reverse-outline" size={16} color="#1E3A8A" />
                <Text style={modal.retakeBtnText}>RETAKE PHOTO</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[modal.btn, modal.closeBtn, { backgroundColor: cfg.color }]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={modal.closeBtnText}>
                {result.faceCheckStatus === 'verified' ? 'CONTINUE' : 'DISMISS'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Main Screen ───────────────────────────────────────────────────────────────
const CheckInScreen = () => {
  const insets = useSafeAreaInsets();

  const [photo,           setPhoto]           = useState(null);
  const [loading,         setLoading]         = useState(false);
  const [locData,         setLocData]         = useState(null);
  const [refreshing,      setRefreshing]      = useState(false);
  const [step,            setStep]            = useState('idle'); // idle | capturing | locating | submitting
  const [faceResult,      setFaceResult]      = useState(null);  // result object from server
  const [faceModalVisible,setFaceModalVisible]= useState(false);

  // ── Pull to Refresh ──────────────────────────────────────────────────────────
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPhoto(null);
    setLocData(null);
    setStep('idle');
    setFaceResult(null);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  // ── Capture Selfie ───────────────────────────────────────────────────────────
  const captureSelfie = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Authorization Required', 'Camera permission is mandatory for official check-in.');
      return;
    }

    setStep('capturing');
    // Clear previous face result when retaking
    setFaceResult(null);

    const result = await ImagePicker.launchCameraAsync({
      cameraType: ImagePicker.CameraType.front,
      quality: 0.7,
      allowsEditing: false,
      exif: false,
    });

    if (!result.canceled && result.assets?.length > 0) {
      setPhoto(result.assets[0]);
      await fetchLocation();
    }
    setStep('idle');
  };

  // ── Get GPS + Reverse Geocode ────────────────────────────────────────────────
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

      let address = 'Locating address...';
      try {
        const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geo && geo.length > 0) {
          const g = geo[0];
          const parts = [g.name, g.street, g.district || g.subregion, g.city, g.region].filter(Boolean);
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

  // ── Refresh Location manually ────────────────────────────────────────────────
  const refreshLocation = async () => {
    try {
      await fetchLocation();
    } catch (err) {
      Alert.alert('Location Error', err.message);
    }
  };

  // ── Submit check-in ──────────────────────────────────────────────────────────
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
        uri:  photo.uri,
        type: 'image/jpeg',
        name: 'selfie.jpg',
      });
      formData.append('latitude',  String(locData.lat));
      formData.append('longitude', String(locData.lng));
      formData.append('accuracy',  String(locData.accuracy));

      const res = await API.post('/tadipaar/checkin', formData, {
        headers: {
          Authorization:  `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      const data         = res.data;
      const isCompliant  = data.compliant;

      // ── Success ────────────────────────────────────────────────────────────
      // Show face verified result in modal first, then success alert on close
      if (data.faceCheckStatus === 'verified') {
        setFaceResult({
          faceCheckStatus: 'verified',
          faceSimilarity:  data.faceSimilarity,
          reason:          `Face verified with ${data.faceSimilarity}% similarity.`,
        });
        setFaceModalVisible(true);

        // After modal is dismissed → show compliance alert
        // (handled via onClose of modal below via successPending flag)
        setSuccessPending({
          title:   isCompliant ? '✅ Check-In Successful' : '⚠️ Check-In Recorded',
          message: data.message || 'Your daily check-in has been recorded.',
        });
      } else {
        // Fallback — just show alert (shouldn't happen if backend is correct)
        Alert.alert(
          isCompliant ? '✅ Check-In Successful' : '⚠️ Check-In Recorded',
          data.message,
          [{ text: 'OK', onPress: resetForm }]
        );
      }

    } catch (err) {
      const data             = err?.response?.data;
      const faceCheckStatus  = data?.faceCheckStatus;

      // ── Face verification failure — show modal ──────────────────────────────
      if (faceCheckStatus && FACE_STATUS[faceCheckStatus]) {
        const similarity = data?.faceSimilarity;
        const threshold  = data?.faceThreshold;
        const detail =
          similarity != null && threshold != null
            ? `\n\nMatch: ${similarity}% (min ${threshold}%)`
            : similarity != null
              ? `\n\nMatch: ${similarity}%`
              : '';
        setFaceResult({
          faceCheckStatus,
          faceSimilarity: similarity ?? null,
          reason:         (data.reason || data.message || 'Face verification failed.') + detail,
        });
        setFaceModalVisible(true);
      } else if (err?.response?.status === 409) {
        // Already checked in today
        Alert.alert('Already Checked In', data?.message || 'You have already checked in today.');
      } else {
        // Generic error
        Alert.alert(
          'Submission Failed',
          data?.message || err.message || 'An unexpected error occurred.'
        );
      }
    } finally {
      setLoading(false);
      setStep('idle');
    }
  };

  // ── Success pending state (show after verified modal closes) ─────────────────
  const [successPending, setSuccessPending] = useState(null);

  const handleModalClose = () => {
    setFaceModalVisible(false);

    if (faceResult?.faceCheckStatus === 'verified' && successPending) {
      // Small delay so modal animation finishes
      setTimeout(() => {
        Alert.alert(
          successPending.title,
          successPending.message,
          [{ text: 'OK', onPress: resetForm }]
        );
        setSuccessPending(null);
      }, 400);
    }
  };

  const handleModalRetake = () => {
    setFaceModalVisible(false);
    setFaceResult(null);
    // Small delay then re-open camera
    setTimeout(captureSelfie, 300);
  };

  const resetForm = () => {
    setPhoto(null);
    setLocData(null);
    setStep('idle');
    setFaceResult(null);
    setSuccessPending(null);
  };

  const openGoogleMaps = () => {
    if (!locData) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${locData.lat},${locData.lng}`;
    Linking.openURL(url);
  };

  const isLocating   = step === 'locating';
  const isSubmitting = step === 'submitting' || loading;

  // Face status badge shown below photo
  const faceCfg = faceResult ? FACE_STATUS[faceResult.faceCheckStatus] : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['right', 'left']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* Face Result Modal */}
      <FaceResultModal
        visible={faceModalVisible}
        result={faceResult}
        onClose={handleModalClose}
        onRetake={handleModalRetake}
      />

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
              <View style={styles.previewWrapper}>
                <Image source={{ uri: photo.uri }} style={styles.preview} />

                {/* Face status badge overlaid on photo corner */}
                {faceCfg && (
                  <View style={[styles.faceBadgeOverlay, { backgroundColor: faceCfg.color }]}>
                    <Ionicons name={faceCfg.icon} size={12} color="#fff" />
                    <Text style={styles.faceBadgeOverlayText}>{faceCfg.label}</Text>
                  </View>
                )}
              </View>

              {/* Face result banner below photo */}
              {faceResult && (
                <TouchableOpacity
                  style={[styles.faceResultBanner, { backgroundColor: faceCfg.bg, borderColor: faceCfg.border }]}
                  onPress={() => setFaceModalVisible(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons name={faceCfg.icon} size={18} color={faceCfg.color} />
                  <View style={styles.faceResultBannerText}>
                    <Text style={[styles.faceResultTitle, { color: faceCfg.color }]}>{faceCfg.title}</Text>
                    <Text style={[styles.faceResultReason, { color: faceCfg.color }]} numberOfLines={2}>
                      {faceResult.reason}
                    </Text>
                  </View>
                  {faceResult.faceCheckStatus === 'verified' && faceResult.faceSimilarity != null && (
                    <View style={[styles.similarityPill, { backgroundColor: faceCfg.color }]}>
                      <Text style={styles.similarityPillText}>{faceResult.faceSimilarity}%</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={14} color={faceCfg.color} />
                </TouchableOpacity>
              )}

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

              <View style={styles.addressRow}>
                <Ionicons name="location" size={14} color="#1E3A8A" />
                <Text style={styles.addressText} numberOfLines={2}>{locData.address}</Text>
              </View>

              <View style={styles.mapContainer}>
                <MapView
                  style={styles.map}
                  initialRegion={{
                    latitude:       locData.lat,
                    longitude:      locData.lng,
                    latitudeDelta:  0.003,
                    longitudeDelta: 0.003,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  pitchEnabled={false}
                  rotateEnabled={false}
                  pointerEvents="none"
                >
                  <Marker coordinate={{ latitude: locData.lat, longitude: locData.lng }} title="Your Location" />
                  <Circle
                    center={{ latitude: locData.lat, longitude: locData.lng }}
                    radius={locData.accuracy}
                    strokeColor="rgba(30,58,138,0.5)"
                    fillColor="rgba(30,58,138,0.1)"
                  />
                </MapView>
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
            <Text style={styles.btnText}>{photo ? 'RETAKE PHOTO' : 'CAPTURE PHOTO'}</Text>
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
              <View style={styles.submittingRow}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.btnText}>VERIFYING FACE...</Text>
              </View>
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

// ─── Modal styles ──────────────────────────────────────────────────────────────
const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  reason: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    fontWeight: '500',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    marginBottom: 16,
  },
  badgeText: {
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  tips: {
    alignSelf: 'stretch',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tipsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  tipItem: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 20,
    fontWeight: '500',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    alignSelf: 'stretch',
  },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  retakeBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  retakeBtnText: {
    color: '#1E3A8A',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.8,
  },
  closeBtn: {
    // background set dynamically
  },
  closeBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.8,
  },
});

// ─── Main styles ───────────────────────────────────────────────────────────────
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

  // Steps
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  stepItem:       { alignItems: 'center', width: 64 },
  stepCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  stepCircleDone: { backgroundColor: '#059669' },
  stepNum:        { fontSize: 12, fontWeight: '700', color: '#64748B' },
  stepLabel:      { fontSize: 9, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5 },
  stepLabelDone:  { color: '#059669' },
  stepLine:       { flex: 1, height: 2, backgroundColor: '#E2E8F0', marginBottom: 14 },
  stepLineDone:   { backgroundColor: '#059669' },

  // Section card
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
    fontSize: 11, fontWeight: '800', color: '#1E3A8A', letterSpacing: 1.2, flex: 1,
  },
  refreshLocBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#EFF6FF', paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 20, gap: 4,
  },
  refreshLocText: { fontSize: 10, fontWeight: '700', color: '#1E3A8A', letterSpacing: 0.5 },

  // Photo preview
  previewBox:    { alignItems: 'center' },
  previewWrapper:{ width: '100%', position: 'relative' },
  preview: {
    width: '100%', height: 280, borderRadius: 8,
    backgroundColor: '#E2E8F0', borderWidth: 1, borderColor: '#CBD5E1',
  },

  // Face badge overlaid on photo
  faceBadgeOverlay: {
    position: 'absolute', bottom: 10, left: 10,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4, elevation: 4,
  },
  faceBadgeOverlayText: {
    color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.8,
  },

  // Face result banner
  faceResultBanner: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 8, borderWidth: 1,
    padding: 12, marginTop: 10, marginBottom: 4,
    gap: 10, width: '100%',
  },
  faceResultBannerText: { flex: 1 },
  faceResultTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  faceResultReason:{ fontSize: 11, fontWeight: '500', marginTop: 2, lineHeight: 16 },
  similarityPill: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  similarityPillText: { color: '#fff', fontWeight: '800', fontSize: 12 },

  retakeBtn: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 12, paddingVertical: 7, paddingHorizontal: 14,
    backgroundColor: '#EFF6FF', borderRadius: 6,
    borderWidth: 1, borderColor: '#BFDBFE', gap: 6,
  },
  retakeText: { color: '#1E3A8A', fontWeight: '700', fontSize: 11, letterSpacing: 1 },

  placeholder: {
    height: 200, backgroundColor: '#F8FAFC', borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#CBD5E1', borderStyle: 'dashed', gap: 8,
  },
  placeholderText: { color: '#94A3B8', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },

  // Location
  locatingBox: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 24, gap: 10,
  },
  locatingText: { color: '#1E3A8A', fontSize: 12, fontWeight: '600' },
  coordRow: {
    flexDirection: 'row', backgroundColor: '#F8FAFC',
    borderRadius: 8, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  coordItem:   { flex: 1, alignItems: 'center' },
  coordDivider:{ width: 1, backgroundColor: '#E2E8F0', marginVertical: 2 },
  coordLabel:  { fontSize: 9, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.8, marginBottom: 4 },
  coordValue:  { fontSize: 13, fontWeight: '800', color: '#1E3A8A', fontVariant: ['tabular-nums'] },
  addressRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#EFF6FF', borderRadius: 8,
    padding: 10, marginBottom: 12, gap: 6,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  addressText: { flex: 1, fontSize: 12, color: '#1E3A8A', fontWeight: '600', lineHeight: 18 },

  // Map
  mapContainer: {
    borderRadius: 10, overflow: 'hidden',
    borderWidth: 1, borderColor: '#CBD5E1', position: 'relative',
  },
  map: { width: '100%', height: 200 },
  openMapsBtn: {
    position: 'absolute', bottom: 10, right: 10,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1E3A8A', paddingHorizontal: 12,
    paddingVertical: 7, borderRadius: 20, gap: 5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  openMapsBtnText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  locPlaceholder: {
    height: 120, backgroundColor: '#F8FAFC', borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#CBD5E1', borderStyle: 'dashed', gap: 6,
  },
  locPlaceholderText: { color: '#94A3B8', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  locPlaceholderSub:  { color: '#CBD5E1', fontSize: 10, fontWeight: '500' },

  // Actions
  actionContainer: { marginBottom: 16, gap: 10 },
  captureBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#475569', paddingVertical: 15,
    borderRadius: 8, justifyContent: 'center',
    elevation: 2, gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4,
  },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#059669', paddingVertical: 15,
    borderRadius: 8, justifyContent: 'center',
    elevation: 2, gap: 8,
    shadowColor: '#059669', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4,
  },
  submittingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btnDisabled:   { backgroundColor: '#CBD5E1', elevation: 0, shadowOpacity: 0 },
  btnText:       { color: '#fff', fontWeight: '700', fontSize: 13, letterSpacing: 1.2 },

  // Warning
  warningContainer: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#FEF2F2', padding: 12,
    borderRadius: 8, borderWidth: 1, borderColor: '#FECACA', gap: 8,
  },
  warningText: { fontSize: 11, color: '#DC2626', flex: 1, fontWeight: '600', lineHeight: 16 },
});