import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import {
  launchCamera,
  launchImageLibrary,
  Asset,
} from 'react-native-image-picker';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import { check, request, PERMISSIONS, RESULTS, openSettings } from 'react-native-permissions';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LogoutButton from './LogoutButton';
import Modal from 'react-native-modal';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

// const navigation=useNavigation();

type Location = { lat: number; lng: number };
type Media = Asset;

const audioRecorderPlayer = new AudioRecorderPlayer();

type RootStackParamList = {
  Home: undefined;
  // add other routes here if needed
};

const SeekHelp = () => {
  const [description, setDescription] = useState('');
  const [mediaFiles, setMediaFiles] = useState<Media[]>([]);
  const [voiceFiles, setVoiceFiles] = useState<string[]>([]);
  const [location, setLocation] = useState<Location | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingModalVisible, setRecordingModalVisible] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [recordTime, setRecordTime] = useState('00:00');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const requestMicPermission = async () => {
    const result = await request(
      Platform.OS === 'android'
        ? PERMISSIONS.ANDROID.RECORD_AUDIO
        : PERMISSIONS.IOS.MICROPHONE
    );
    if (result !== RESULTS.GRANTED) {
      Alert.alert('Permission Denied', 'Microphone access is required.');
      return false;
    }
    return true;
  };

  const pickMedia = () => {
    Alert.alert('Upload Media', 'Choose source:', [
      { text: 'Camera', onPress: openCamera },
      { text: 'Gallery', onPress: openGallery },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const openCamera = async () => {
    const result = await launchCamera({ mediaType: 'mixed' });
    if (Array.isArray(result.assets)) {
      setMediaFiles(prev => [...prev, ...result.assets? result.assets : []]);
    }
  };

  const openGallery = async () => {
    const result = await launchImageLibrary({ mediaType: 'mixed', selectionLimit: 5 });
    if (result.assets) {
      setMediaFiles(prev => [...prev, ...result.assets? result.assets : []]);
    }
  };

  const getLocation = async () => {
    const permission = await request(
      Platform.OS === 'android'
        ? PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION
        : PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
    );

    if (permission !== RESULTS.GRANTED) {
      Alert.alert(
        'Location Permission Required',
        'Please allow location access in settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => openSettings() },
        ]
      );
      return;
    }

    Geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
      },
      error => {
        Alert.alert('Location Error', error.message);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const startRecording = async () => {
    const granted = await requestMicPermission();
    if (!granted) return;
    setRecordingModalVisible(true);
    const path = await audioRecorderPlayer.startRecorder();
    audioRecorderPlayer.addRecordBackListener((e) => {
      setRecordSecs(e.currentPosition);
      setRecordTime(audioRecorderPlayer.mmssss(Math.floor(e.currentPosition)));
      return;
    });
    setRecording(true);
    setVoiceFiles(prev => [...prev, path]);
  };

  const stopRecording = async () => {
    await audioRecorderPlayer.stopRecorder();
    audioRecorderPlayer.removeRecordBackListener();
    setRecording(false);
    setRecordingModalVisible(false);
    setRecordSecs(0);
    setRecordTime('00:00');
    Alert.alert('Recording Saved', 'Voice input has been saved.');
  };

  const handleSubmit = async () => {
    setLoading(true);
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return Alert.alert('Error', 'User not logged in.');
    }
    if (!location) {
      await getLocation();
      if (!location) {
        setLoading(false);
        return;
      }
    }
    if (!description) {
      setLoading(false);
      Alert.alert('Error', 'Please describe the issue.');
      return;
    }
    const formData = new FormData();
    formData.append('description', description);
    formData.append('lat', location.lat.toString());
    formData.append('lng', location.lng.toString());
    mediaFiles.forEach((file, i) => {
      if (file.uri && file.type) {
        formData.append('media', {
          uri: file.uri,
          type: file.type,
          name: file.fileName || `media_${i}`,
        } as any);
      }
    });
    voiceFiles.forEach((path, i) => {
      formData.append('voice', {
        uri: path,
        type: 'audio/m4a',
        name: `voice_${i}.m4a`,
      } as any);
    });
    try {
      await axios.post('https://samsung-hackathon.onrender.com/post/submitIssue', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      Alert.alert('Success', 'Issue submitted successfully!');
      setDescription('');
      setMediaFiles([]);
      setVoiceFiles([]);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Submission failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}> 
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate("Home")}> 
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🚨 Seek Help</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Short Issue Description:</Text>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the issue"
            placeholderTextColor="#888"
            multiline
            numberOfLines={3}
          />
          <View style={styles.mediaRow}>
            <TouchableOpacity onPress={pickMedia} style={styles.mediaButton}>
              <Text style={styles.mediaButtonText}>📸 Add Photo/Video</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={startRecording} disabled={recording} style={styles.mediaButton}>
              <Text style={styles.mediaButtonText}>🎤 Voice Input</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={getLocation} style={styles.mediaButton}>
              <Text style={styles.mediaButtonText}>📍 Location</Text>
            </TouchableOpacity>
          </View>
          {mediaFiles.length > 0 && (
            <Image source={{ uri: mediaFiles[0].uri }} style={styles.imagePreview} />
          )}
          <Modal isVisible={recordingModalVisible} backdropOpacity={0.5}>
            <View style={styles.modalContent}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Recording...</Text>
              <Text style={{ fontSize: 32, color: '#d9534f', marginBottom: 20 }}>{recordTime}</Text>
              <TouchableOpacity onPress={stopRecording} style={[styles.button, { backgroundColor: '#d9534f' }]}> 
                <Text style={[styles.buttonText, { color: '#fff' }]}>⏹️ Stop Recording</Text>
              </TouchableOpacity>
            </View>
          </Modal>
          <TouchableOpacity onPress={handleSubmit} style={[styles.submitButton, loading && styles.buttonDisabled]} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit & 🚨 Seek Help</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default SeekHelp;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f7faff' },
  container: { flex: 1, backgroundColor: '#f7faff', padding: 0 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 22,
    marginHorizontal: 12,
    marginTop: 8,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  label: { fontSize: 16, fontWeight: '600', marginVertical: 10, color: '#222' },
  input: {
    borderWidth: 1,
    borderColor: '#e3eaf2',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f7faff',
    fontSize: 16,
    marginBottom: 10,
    color: '#222',
    minHeight: 60,
  },
  mediaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  mediaButton: {
    backgroundColor: '#f1f2f6',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginHorizontal: 2,
    flex: 1,
    alignItems: 'center',
    marginRight: 6,
  },
  mediaButtonText: {
    fontSize: 15,
    color: '#636e72',
    fontWeight: 'bold',
  },
  imagePreview: {
    width: 110,
    height: 110,
    borderRadius: 12,
    marginTop: 10,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#e3eaf2',
    backgroundColor: '#f7faff',
  },
  submitButton: {
    backgroundColor: '#d9534f',
    padding: 16,
    marginTop: 22,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 2,
  },
  submitText: { color: '#fff', textAlign: 'center', fontWeight: 'bold', fontSize: 17 },
  modalContent: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#d9534f',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 1,
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#b2bec3',
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f2f6',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 8,
    marginTop: 14,
    elevation: 1,
    marginLeft: 10,
  },
  backButtonText: {
    color: '#636e72',
    fontSize: 16,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#eee',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonText: { fontSize: 16 },
});
