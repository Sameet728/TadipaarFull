import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

export const requestCameraPermission = async () => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  return status === 'granted';
};

export const requestLocationPermission = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
};
