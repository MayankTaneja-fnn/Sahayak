import React, { useState , useEffect} from 'react';
import { View, TextInput, Button, Alert, StyleSheet, Text, TouchableOpacity, Platform } from 'react-native';
import axios from 'axios';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PhoneLoginScreen({ navigation }: any) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function updateFcmTokenAfterLogin() {
    try {
      // Request permission if not already granted
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      if (!enabled) {
        Alert.alert('Notification permission not granted');
        return;
      }
      // Get the FCM token
      let fcmToken = await messaging().getToken();
      if (!fcmToken) {
        // Try to refresh the token if not available
        fcmToken = await messaging().getToken();
      }
      if (fcmToken) {
        await AsyncStorage.setItem('fcmToken', fcmToken);
        const token = await AsyncStorage.getItem('token');
        if (token) {
          await axios.post('https://sahayak-yy09.onrender.com/user/updateFcmToken', { fcmToken }, {
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      } else {
        Alert.alert('Failed to get FCM token');
      }
    } catch (err) {
      console.log('FCM Error:', err);
      Alert.alert('FCM Error', (err as any)?.message || 'Failed to get FCM token');
    }
  }

  const login = async () => {
    setLoading(true);
    try {
      const res = await axios.post('https://sahayak-yy09.onrender.com/user/login', { phone, password });
      await AsyncStorage.setItem('token', res.data.token);
      await updateFcmTokenAfterLogin();
      navigation.replace('Home');
    } catch (err) {
      Alert.alert('Login Failed', (err as any)?.response?.data?.message || (err as any)?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.appName}>Sahayak</Text>
      <Text style={styles.title}>Welcome Back!</Text>
      <TextInput
        placeholder="Phone Number"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        style={styles.input}
        placeholderTextColor="#888"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
        placeholderTextColor="#888"
      />
      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.7 }]}
        onPress={login}
        disabled={loading}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'Login'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('SignUp')} style={styles.signupLink}>
        <Text style={styles.signupText}>Don't have an account? <Text style={{ color: '#2196F3', fontWeight: 'bold' }}>Sign Up</Text></Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F6FB',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  appName: {
      fontSize: 36,
      fontWeight: 'bold',
      color: '#00b894', // Green
      marginBottom: 8,
      fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Bold' : 'sans-serif-condensed',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 32,
    letterSpacing: 1,
  },
  input: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    color: '#222',
  },
  button: {
    width: '100%',
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    elevation: 2,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  signupLink: {
    marginTop: 8,
  },
  signupText: {
    color: '#888',
    fontSize: 15,
  },
});