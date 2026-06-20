const { CompareFacesCommand, DetectFacesCommand } = require('@aws-sdk/client-rekognition');
const { rekognitionClient } = require('../config/rekognition');

async function fetchImageBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${url} — HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function verifyFace(registeredPhotoUrl, selfieUrl) {
  const threshold = parseFloat(process.env.FACE_SIMILARITY_THRESHOLD || '80');
  const effectiveThreshold = Number.isFinite(threshold) ? threshold : 80;
  const minDetectConfidenceRaw = parseFloat(process.env.FACE_DETECT_CONFIDENCE || '90');
  const minDetectConfidence = Number.isFinite(minDetectConfidenceRaw) ? minDetectConfidenceRaw : 90;

  const [registeredBuffer, selfieBuffer] = await Promise.all([
    fetchImageBuffer(registeredPhotoUrl),
    fetchImageBuffer(selfieUrl),
  ]);

  // ── Step 1: Count faces in selfie ──────────────────────────────
  let faceCount = 0;
  try {
    const detectRes = await rekognitionClient.send(
      new DetectFacesCommand({ Image: { Bytes: selfieBuffer }, Attributes: ['DEFAULT'] })
    );
    const details = detectRes.FaceDetails ?? [];
    // Filter out low-confidence false positives (common with blank/blurred images).
    const highConfidenceFaces = details.filter((d) => (d.Confidence ?? 0) >= minDetectConfidence);
    faceCount = highConfidenceFaces.length;
  } catch (err) {
    throw new Error(`Face detection failed: ${err.message}`);
  }

  if (faceCount === 0) {
    return {
      verified:        false,
      similarity:      0,
      threshold:       effectiveThreshold,
      faceCheckStatus: 'no_face',
      reason:          `No face detected in the selfie (min confidence ${minDetectConfidence}%). Please retake with your face clearly visible.`,
    };
  }

  if (faceCount > 1) {
    return {
      verified:        false,
      similarity:      0,
      threshold:       effectiveThreshold,
      faceCheckStatus: 'multiple_faces',
      reason:          `Multiple faces detected (${faceCount} people). Only you should be in the frame.`,
    };
  }

  // ── Step 2: Compare face with registered photo ─────────────────
  let response;
  try {
    response = await rekognitionClient.send(
      new CompareFacesCommand({
        SourceImage:         { Bytes: registeredBuffer },
        TargetImage:         { Bytes: selfieBuffer },
        // Always return best match; enforce threshold ourselves for better UX.
        SimilarityThreshold: 0,
      })
    );
  } catch (err) {
    if (err.name === 'InvalidParameterException') {
      return {
        verified: false,
        similarity: 0,
        threshold: effectiveThreshold,
        faceCheckStatus: 'no_face',
        reason: 'No face detected in registered photo or selfie.',
      };
    }
    if (err.name === 'ImageTooLargeException') {
      return {
        verified: false,
        similarity: 0,
        threshold: effectiveThreshold,
        faceCheckStatus: 'no_face',
        reason: 'Image too large. Please use an image under 5MB.',
      };
    }
    if (err.name === 'InvalidImageFormatException') {
      return {
        verified: false,
        similarity: 0,
        threshold: effectiveThreshold,
        faceCheckStatus: 'no_face',
        reason: 'Invalid image format. Use JPEG or PNG.',
      };
    }
    throw err;
  }

  if (!response.FaceMatches || response.FaceMatches.length === 0) {
    return {
      verified:        false,
      similarity:      0,
      threshold:       effectiveThreshold,
      faceCheckStatus: 'mismatch',
      reason:          'Face does not match your registered photo. Check-in rejected.',
    };
  }

  const best       = response.FaceMatches.sort((a, b) => b.Similarity - a.Similarity)[0];
  const similarity = parseFloat(best.Similarity.toFixed(2));

  if (similarity < effectiveThreshold) {
    return {
      verified:        false,
      similarity,
      threshold:       effectiveThreshold,
      faceCheckStatus: 'mismatch',
      reason:          `Face similarity too low (${similarity}%). Required at least ${effectiveThreshold}%. Check-in rejected.`,
    };
  }

  return {
    verified:        true,
    similarity,
    threshold:       effectiveThreshold,
    faceCheckStatus: 'verified',
    reason:          `Face verified with ${similarity}% similarity.`,
  };
}

module.exports = { verifyFace };