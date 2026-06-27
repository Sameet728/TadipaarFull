import React, { useRef, useState, useEffect } from 'react';
import {
  Modal, View, Text, StyleSheet,
  ActivityIndicator, Animated,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTranslation } from 'react-i18next';

const POLL_MS       = 300;
const COUNTDOWN_SEC = 3;

export default function BlinkCameraModal({ visible, onCapture, onCancel }) {
  const { t } = useTranslation();
  const cameraRef                       = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [hint, setHint]                 = useState(t('Look at the camera'));
  const [countdown, setCountdown]       = useState(null);
  const [status, setStatus]             = useState('waiting'); // waiting | countdown | capturing
  const flashAnim                       = useRef(new Animated.Value(0)).current;

  const activeRef        = useRef(false);
  const capturingRef     = useRef(false);
  const loopRunningRef   = useRef(false);
  const countdownRef     = useRef(null); // interval id

  const stopCountdown = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  };

  const doCapture = async () => {
    if (capturingRef.current || !cameraRef.current) return;
    capturingRef.current = true;
    activeRef.current    = false;
    stopCountdown();

    setStatus('capturing');
    setCountdown(null);
    setHint('📸 ' + t('Capturing…'));

    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 60,  useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85, exif: false });
      onCapture(photo);
    } catch {
      capturingRef.current = false;
      activeRef.current    = true;
      setStatus('waiting');
      setHint(t('Look at the camera'));
      loopRunningRef.current = false;
      setTimeout(runLoop, 300);
    }
  };

  const startCountdown = () => {
    if (countdownRef.current) return;
    setStatus('countdown');
    setCountdown(COUNTDOWN_SEC);
    setHint(t('Hold still...'));

    let remaining = COUNTDOWN_SEC;
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        stopCountdown();
        doCapture();
      } else {
        setCountdown(remaining);
      }
    }, 1000);
  };

  useEffect(() => {
    if (visible && permission?.granted) {
      activeRef.current    = true;
      capturingRef.current = false;
      flashAnim.setValue(0);
      setStatus('waiting');
      setCountdown(null);
      setHint(t('Position your face in the oval'));
    } else {
      activeRef.current = false;
      stopCountdown();
    }
    return () => {
      activeRef.current = false;
      stopCountdown();
    };
  }, [visible, permission?.granted]);

  const handleCancel = () => {
    activeRef.current = false;
    stopCountdown();
    onCancel();
  };

  if (!visible) return null;

  const ovalColor =
    status === 'countdown' ? '#10B981' :
    status === 'capturing' ? '#F59E0B' : 'rgba(255,255,255,0.35)';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleCancel}>
      <View style={s.container}>
        {!permission?.granted ? (
          <View style={s.center}>
            <Text style={s.permText}>Camera permission required</Text>
            <Text style={s.permBtn} onPress={requestPermission}>Grant Permission</Text>
          </View>
        ) : (
          <>
            <CameraView ref={cameraRef} style={s.camera} facing="front" />

            <Animated.View style={[s.flashOverlay, { opacity: flashAnim }]} pointerEvents="none" />

            <View style={s.overlay} pointerEvents="none">
              <View style={[s.oval, { borderColor: ovalColor }]} />
            </View>

            {/* Countdown number */}
            {status === 'countdown' && countdown !== null && (
              <View style={s.countdownWrap} pointerEvents="none">
                <Text style={s.countdownText}>{countdown}</Text>
              </View>
            )}

            <View style={s.hintBar} pointerEvents="none">
              <Text style={s.hintText}>{hint}</Text>
            </View>

            {status === 'capturing' && (
              <View style={s.capturingOverlay}>
                <ActivityIndicator color="#fff" size="large" />
                <Text style={s.capturingText}>Capturing…</Text>
              </View>
            )}

            {status !== 'capturing' && (
              <View style={s.cancelWrap}>
                {status === 'waiting' && (
                  <Text style={s.captureBtn} onPress={startCountdown}>📸 TAKE PHOTO</Text>
                )}
                <Text style={s.cancelBtn} onPress={handleCancel}>✕  CANCEL</Text>
              </View>
            )}
          </>
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#000' },
  camera:       { flex: 1 },
  flashOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#fff' },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  permText:     { color: '#fff', fontSize: 16, textAlign: 'center', fontWeight: '600' },
  permBtn:      {
    color: '#fff', backgroundColor: '#1E3A8A',
    padding: 12, borderRadius: 8, fontWeight: '700', overflow: 'hidden',
  },
  overlay:      { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  oval: {
    width: 220, height: 290, borderRadius: 110,
    borderWidth: 3, marginBottom: 140,
  },
  countdownWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
  },
  countdownText: {
    fontSize: 120, fontWeight: '900', color: '#fff',
    opacity: 0.85,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  hintBar: {
    position: 'absolute', bottom: 195,
    left: 0, right: 0, alignItems: 'center',
  },
  hintText: {
    color: '#fff', fontSize: 16, fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  capturingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center', gap: 12,
  },
  capturingText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelWrap:    { position: 'absolute', bottom: 44, left: 0, right: 0, alignItems: 'center', gap: 16 },
  captureBtn: {
    color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 1,
    backgroundColor: '#10B981',
    paddingHorizontal: 36, paddingVertical: 14,
    borderRadius: 30, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  cancelBtn: {
    color: '#fff', fontWeight: '700', fontSize: 13, letterSpacing: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 28, paddingVertical: 12,
    borderRadius: 30, overflow: 'hidden',
  },
});
