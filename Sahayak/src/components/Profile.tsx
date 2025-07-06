import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import LogoutButton from './LogoutButton';

const Profile = ({ navigation }: any) => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) throw new Error('User not logged in');
        const res = await axios.get('https://samsung-hackathon.onrender.com/user/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProfile(res.data);
      } catch (err: any) {
        Alert.alert('Error', err?.response?.data?.message || err.message || 'Failed to fetch profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}><ActivityIndicator size="large" color="#0984e3" /></View>
    );
  }

  if (!profile) {
    return (
      
      <View style={styles.centered}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Home')}>
        <Text style={styles.backButtonText}>← Back to Home</Text>
      </TouchableOpacity>
        <Text>Profile not found.</Text></View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <LogoutButton />
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Home')}>
        <Text style={styles.backButtonText}>← Back to Home</Text>
      </TouchableOpacity>
      <View style={styles.avatarContainer}>
        <Image
          source={profile.avatarUrl ? { uri: profile.avatarUrl } : require('../../assets/avatar.png')}
          style={styles.avatar}
        />
        <Text style={styles.name}>{profile.name || profile.phone || 'User'}</Text>
      </View>
      <View style={styles.scoreBox}>
        <Text style={styles.scoreLabel}>🏅 Sahaayak Points</Text>
        <Text style={styles.scoreValue}>{profile.points || 82}</Text>
        <Text style={styles.scoreLabel}>Trust Score</Text>
        <Text style={styles.scoreValue}>{profile.trustScore || 0.82}</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Help History</Text>
        {profile.helpHistory && profile.helpHistory.length > 0 ? (
          profile.helpHistory.map((item: any, idx: number) => (
            <View key={idx} style={styles.historyItem}>
              <Text style={styles.historyText}>{item.issueType} - {item.status} ({new Date(item.reportedAt).toLocaleDateString()})</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No help history yet.</Text>
        )}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚫 Misuse Reports</Text>
        {profile.misuseReports && profile.misuseReports.length > 0 ? (
          profile.misuseReports.map((item: any, idx: number) => (
            <View key={idx} style={styles.historyItem}>
              <Text style={styles.historyText}>{item.reason} ({new Date(item.reportedAt).toLocaleDateString()})</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No misuse reports.</Text>
        )}
      </View>
    </ScrollView>
  );
};

export default Profile;

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#f5f6fa',
    alignItems: 'center',
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f6fa',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#dfe6e9',
    marginBottom: 12,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d3436',
    marginBottom: 8,
  },
  scoreBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
    maxWidth: 350,
    shadowColor: '#636e72',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  scoreLabel: {
    fontSize: 16,
    color: '#636e72',
    marginTop: 4,
  },
  scoreValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0984e3',
    marginBottom: 8,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 18,
    width: '100%',
    maxWidth: 350,
    shadowColor: '#636e72',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d35400',
    marginBottom: 8,
  },
  historyItem: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f2f6',
  },
  historyText: {
    fontSize: 15,
    color: '#222',
  },
  emptyText: {
    color: '#b2bec3',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 8,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 12,
    backgroundColor: '#dfe6e9',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#0984e3',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
