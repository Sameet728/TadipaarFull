import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

const resources = {
  en: {
    translation: {
      // Login
      "MAHARASHTRA POLICE": "MAHARASHTRA POLICE",
      "TADIPAAR": "TADIPAAR",
      "EXTERNMENT MONITORING SYSTEM": "EXTERNMENT MONITORING SYSTEM",
      "SECURE LOGIN": "SECURE LOGIN",
      "OFFICIAL ID": "OFFICIAL ID",
      "Enter Official ID": "Enter Official ID",
      "PASSWORD": "PASSWORD",
      "Enter Password": "Enter Password",
      "AUTHENTICATE": "AUTHENTICATE",
      "RESTRICTED ACCESS": "RESTRICTED ACCESS • AUTHORIZED PERSONNEL ONLY",
      "Validation Error": "Validation Error",
      "Please enter your Official ID and Password.": "Please enter your Official ID and Password.",
      "Authentication Failed": "Authentication Failed",
      
      // Check In
      "Face Verified": "Face Verified",
      "VERIFIED": "VERIFIED",
      "No Face Detected": "No Face Detected",
      "NO FACE": "NO FACE",
      "Multiple People Detected": "Multiple People Detected",
      "MULTIPLE FACES": "MULTIPLE FACES",
      "Face Mismatch": "Face Mismatch",
      "MISMATCH": "MISMATCH",
      "Tips:": "Tips:",
      "Face the camera directly": "Face the camera directly",
      "Ensure good lighting": "Ensure good lighting",
      "Remove sunglasses or mask": "Remove sunglasses or mask",
      "Only you should be in the frame": "Only you should be in the frame",
      "Move away from other people": "Move away from other people",
      "Find a private space to check in": "Find a private space to check in",
      "Ensure good, even lighting": "Ensure good, even lighting",
      "Contact your officer if issue persists": "Contact your officer if issue persists",
      "RETAKE PHOTO": "RETAKE PHOTO",
      "CONTINUE": "CONTINUE",
      "DISMISS": "DISMISS",
      "Secure Logout": "Secure Logout",
      "Are you sure you want to terminate this session?": "Are you sure you want to terminate this session?",
      "CANCEL": "CANCEL",
      "LOGOUT": "LOGOUT",
      "Location Error": "Location Error",
      "VERIFIED FOR TODAY": "VERIFIED FOR TODAY",
      "You have successfully completed your daily check-in verification. Your presence has been recorded by the system.": "You have successfully completed your daily check-in verification. Your presence has been recorded by the system.",
      "Check-ins will automatically unlock tomorrow.": "Check-ins will automatically unlock tomorrow.",
      "Submitting falsified information is a punishable offense under law.": "Submitting falsified information is a punishable offense under law.",
      "SUBMIT VERIFICATION": "SUBMIT VERIFICATION",
      "VERIFYING FACE...": "VERIFYING FACE...",
      "CAPTURE PHOTO": "CAPTURE PHOTO",
      "TAP TO GET LOCATION": "TAP TO GET LOCATION",
      "or capture photo to auto-detect": "or capture photo to auto-detect",
      "Open in Google Maps": "Open in Google Maps",
      "LATITUDE": "LATITUDE",
      "LONGITUDE": "LONGITUDE",
      "ACCURACY": "ACCURACY",
      "DAILY CHECK-IN": "DAILY CHECK-IN",
      "OFFICIAL VERIFICATION": "OFFICIAL VERIFICATION",
      "Look directly at the camera and slowly BLINK to capture!": "Look directly at the camera and slowly BLINK to capture!",
      "Face position optimal. Blink now.": "Face position optimal. Blink now.",
      "No face detected. Look at the camera.": "No face detected. Look at the camera.",
      "Multiple faces detected. Only you should be in the frame.": "Multiple faces detected. Only you should be in the frame.",
      "Move Closer": "Move Closer",
      "Move Further Away": "Move Further Away",
      "Center your face": "Center your face",
      "Please keep your phone perfectly straight and vertical": "Please keep your phone perfectly straight and vertical"
    }
  },
  mr: {
    translation: {
      // Login
      "MAHARASHTRA POLICE": "महाराष्ट्र पोलीस",
      "TADIPAAR": "तडीपार",
      "EXTERNMENT MONITORING SYSTEM": "हद्दपारी नियंत्रण प्रणाली",
      "SECURE LOGIN": "सुरक्षित लॉगिन",
      "OFFICIAL ID": "अधिकृत आयडी",
      "Enter Official ID": "अधिकृत आयडी प्रविष्ट करा",
      "PASSWORD": "पासवर्ड",
      "Enter Password": "पासवर्ड प्रविष्ट करा",
      "AUTHENTICATE": "प्रमाणित करा",
      "RESTRICTED ACCESS": "प्रतिबंधित प्रवेश • केवळ अधिकृत कर्मचाऱ्यांसाठी",
      "Validation Error": "प्रमाणीकरण त्रुटी",
      "Please enter your Official ID and Password.": "कृपया आपला अधिकृत आयडी आणि पासवर्ड प्रविष्ट करा.",
      "Authentication Failed": "प्रमाणीकरण अयशस्वी",
      
      // Check In
      "Face Verified": "चेहरा पडताळणी यशस्वी",
      "VERIFIED": "पडताळणी यशस्वी",
      "No Face Detected": "चेहरा आढळला नाही",
      "NO FACE": "चेहरा नाही",
      "Multiple People Detected": "एकापेक्षा जास्त लोक आढळले",
      "MULTIPLE FACES": "अनेक चेहरे",
      "Face Mismatch": "चेहरा जुळत नाही",
      "MISMATCH": "जुळत नाही",
      "Tips:": "टिपा:",
      "Only you should be in the frame": "फ्रेममध्ये फक्त तुम्ही असावे",
      "Move away from other people": "इतर लोकांपासून दूर जा",
      "Find a private space to check in": "हजेरी लावण्यासाठी खाजगी जागा शोधा",
      "Ensure good, even lighting": "पुरेसा प्रकाश असल्याची खात्री करा",
      "Face the camera directly": "कॅमेऱ्याकडे थेट पहा",
      "Contact your officer if issue persists": "समस्या कायम राहिल्यास अधिकाऱ्याशी संपर्क साधा",
      "RETAKE PHOTO": "पुन्हा फोटो काढा",
      "CONTINUE": "पुढे जा",
      "DISMISS": "रद्द करा",
      "OFFICIAL VERIFICATION": "अधिकृत पडताळणी",
      "DAILY CHECK-IN PORTAL": "दैनिक हजेरी पोर्टल",
      "Ensure your face is clearly visible and you are outdoors for accurate GPS.": "अचूक जीपीएस (GPS) साठी तुमचा चेहरा स्पष्ट दिसत असल्याची आणि तुम्ही बाहेर असल्याची खात्री करा.",
      "PHOTO": "फोटो",
      "LOCATION": "स्थान",
      "SUBMIT": "सबमिट",
      "FACIAL VERIFICATION": "चेहरा पडताळणी",
      "TAP TO CAPTURE PHOTO": "फोटो काढण्यासाठी टॅप करा",
      "RECAPTURE": "पुन्हा फोटो काढा",
      "GPS LOCATION": "जीपीएस स्थान",
      "REFRESH": "रिफ्रेश",
      
      // Map Modal
      "Secure Logout": "सुरक्षित लॉगआउट",
      "Are you sure you want to terminate this session?": "आपण हे सत्र समाप्त करू इच्छिता याची खात्री आहे का?",
      "CANCEL": "रद्द करा",
      "LOGOUT": "लॉगआउट",
      "Location Error": "स्थान त्रुटी",
      "VERIFIED FOR TODAY": "आजसाठी सत्यापित",
      "You have successfully completed your daily check-in verification. Your presence has been recorded by the system.": "आपण आपली दैनंदिन हजेरी पडताळणी यशस्वीरित्या पूर्ण केली आहे. प्रणालीद्वारे आपली उपस्थिती नोंदवली गेली आहे.",
      "Check-ins will automatically unlock tomorrow.": "उद्या हजेरी आपोआप अनलॉक होईल.",
      "Submitting falsified information is a punishable offense under law.": "खोटी माहिती देणे हा कायद्यानुसार दंडनीय गुन्हा आहे.",
      "SUBMIT VERIFICATION": "पडताळणी सबमिट करा",
      "VERIFYING FACE...": "चेहरा पडताळत आहे...",
      "CAPTURE PHOTO": "फोटो काढा",
      "TAP TO GET LOCATION": "स्थान मिळवण्यासाठी टॅप करा",
      "or capture photo to auto-detect": "किंवा स्वयंचलित शोधासाठी फोटो काढा",
      "Open in Google Maps": "गुगल मॅप्स मध्ये उघडा",
      "LATITUDE": "अक्षांश",
      "LONGITUDE": "रेखांश",
      "ACCURACY": "अचूकता",
      "DAILY CHECK-IN": "दैनंदिन हजेरी",
      "OFFICIAL VERIFICATION": "अधिकृत पडताळणी",
      "Look directly at the camera and slowly BLINK to capture!": "कॅमेऱ्याकडे थेट पहा आणि फोटो काढण्यासाठी हळू डोळे मिचकावा!",
      "Face position optimal. Blink now.": "चेहऱ्याची स्थिती योग्य आहे. आता डोळे मिचकावा.",
      "No face detected. Look at the camera.": "चेहरा आढळला नाही. कॅमेऱ्याकडे पहा.",
      "Multiple faces detected. Only you should be in the frame.": "अनेक चेहरे आढळले. फ्रेममध्ये फक्त तुम्हीच असावे.",
      "Move Closer": "जवळ या",
      "Move Further Away": "थोडे मागे जा",
      "Center your face": "तुमचा चेहरा मध्यभागी आणा",
      "Please keep your phone perfectly straight and vertical": "कृपया तुमचा फोन पूर्णपणे सरळ आणि उभा ठेवा"
    }
  }
};

const initI18n = async () => {
  let savedLanguage = 'en';
  try {
    savedLanguage = await AsyncStorage.getItem('appLanguage') || 'en';
  } catch (error) {
    console.log('Error reading language', error);
  }

  i18n
    .use(initReactI18next)
    .init({
      compatibilityJSON: 'v3',
      resources,
      lng: savedLanguage,
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false
      }
    });
};

initI18n();

export default i18n;
