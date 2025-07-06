import React, { useState } from 'react';
import {
  View, TextInput, Button, Alert, Linking, Platform, StyleSheet,
  Text, ActivityIndicator, TouchableOpacity, KeyboardAvoidingView, ScrollView
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { check, request, PERMISSIONS, RESULTS, openSettings } from 'react-native-permissions';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';

export default function PhoneSignupScreen({ navigation }: any) {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [formData, setFormData] = useState({ name: '', age: '', email: '', password: '' });
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'pending' | 'granted' | 'denied'>('idle');
  const [loading, setLoading] = useState(false);

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      const status = await check(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
      if (status === RESULTS.GRANTED) return true;
      if (status === RESULTS.BLOCKED) {
        Alert.alert('Permission Blocked', 'Enable location in settings.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => openSettings() },
        ]);
        return false;
      }
      const granted = await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
      return granted === RESULTS.GRANTED;
    }
    const status = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
    return status === RESULTS.GRANTED;
  };

  const requestAndFetchLocation = async () => {
    setLocationStatus('pending');
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      setLocationStatus('denied');
      Alert.alert('Permission Required', 'Enable location to complete signup.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]);
      return;
    }

    Geolocation.getCurrentPosition(
      (position) => {
        setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocationStatus('granted');
        Alert.alert('Success', 'Location captured successfully.');
      },
      (error) => {
        setLocationStatus('denied');
        if (error.code === 2) {
          Alert.alert('Location Disabled', 'Turn on location services.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]);
        } else {
          Alert.alert('Error', error.message);
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const sendOTP = async () => {
    setLoading(true);
    try {
      console.log("sending otp",phone);
      const res = await axios.post('https://samsung-hackathon.onrender.com/user/send-otp', { phone });

      if (res.data.success) {
        setStep(2);
        Alert.alert('OTP Sent', 'OTP has been sent to your number.');
      } else {
        throw new Error(res.data?.message || 'Could not send OTP');
      }
    } catch (err) {
      console.log('OTP error:', err);
      Alert.alert('Signup Error',
        (err as any)?.response?.data?.message || 'Phone already registered. Please log in.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    setLoading(true);
    try {
      const res = await axios.post('https://samsung-hackathon.onrender.com/user/verify-otp', { phone, otp });
      if (res.data.success) setStep(3);
      else throw new Error(res.data?.message || 'Invalid OTP');
    } catch (err) {
      Alert.alert('Verification Failed',
        (err as any)?.response?.data?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const completeSignup = async () => {
    setLoading(true);
    try {
      if (!location) throw new Error('Location not captured');
      // Get FCM token
      let fcmToken = '';
      try {
        fcmToken = await messaging().getToken();
      } catch (e) {
        console.warn('FCM token fetch failed', e);
      }
      const payload = { phone, ...formData, location, fcmToken };
      const res = await axios.post('https://samsung-hackathon.onrender.com/user/signup', payload);
      // await AsyncStorage.setItem('token', res.data.token);
      navigation.replace('Login');
    } catch (err) {
      Alert.alert('Signup Failed',
        (err as any)?.response?.data?.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.appName}>Sahayak</Text>
        <Text style={styles.title}>Sign Up</Text>

        {step === 1 && (
          <>
            <TextInput
              placeholder="Phone Number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              style={styles.input}
              placeholderTextColor="#888"
            />
            <TouchableOpacity style={styles.button} onPress={sendOTP} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send OTP</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.linkText}>Already signed up? Click here to log in</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 2 && (
          <>
            <TextInput
              placeholder="OTP Code"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              style={styles.input}
              placeholderTextColor="#888"
            />
            <TouchableOpacity style={styles.button} onPress={verifyOTP} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify OTP</Text>}
            </TouchableOpacity>
          </>
        )}

        {step === 3 && (
          <>
            <TextInput placeholder="Name" value={formData.name} onChangeText={text => setFormData({ ...formData, name: text })} style={styles.input} placeholderTextColor="#888" />
            <TextInput placeholder="Age" value={formData.age} onChangeText={text => setFormData({ ...formData, age: text })} keyboardType="number-pad" style={styles.input} placeholderTextColor="#888" />
            <TextInput placeholder="Email" value={formData.email} onChangeText={text => setFormData({ ...formData, email: text })} keyboardType="email-address" style={styles.input} placeholderTextColor="#888" />
            <TextInput placeholder="Password" value={formData.password} secureTextEntry onChangeText={text => setFormData({ ...formData, password: text })} style={styles.input} placeholderTextColor="#888" />
            <TouchableOpacity style={[styles.button, locationStatus !== 'idle' ? styles.buttonDisabled : null]} onPress={requestAndFetchLocation} disabled={locationStatus !== 'idle'}>
              <Text style={styles.buttonText}>
                {locationStatus === 'granted' ? 'Location Allowed' : locationStatus === 'pending' ? 'Getting Location...' : 'Allow Location'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, !location ? styles.buttonDisabled : null]} onPress={completeSignup} disabled={!location || loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Complete Signup</Text>}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f6fa',
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
    fontSize: 26,
    fontWeight: '600',
    color: '#2d3436',
    marginBottom: 24,
  },
  input: {
    width: '100%',
    maxWidth: 350,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dfe6e9',
    padding: 14,
    marginBottom: 16,
    fontSize: 16,
    color: '#222',
  },
  button: {
    width: '100%',
    maxWidth: 350,
    backgroundColor: '#0984e3',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#b2bec3',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  linkButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  linkText: {
    color: '#636e72',
    fontSize: 15,
    textDecorationLine: 'underline',
  },
});
