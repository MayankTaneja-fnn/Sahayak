import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions, Platform } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LogoutButton from './LogoutButton';

const { width } = Dimensions.get('window');

const Home = ({ navigation }: any) => {
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Sahayak</Text>
        <LogoutButton />
      </View>

      {/* Big Red Panic Button */}
      <TouchableOpacity
        style={styles.panicButton}
        activeOpacity={0.85}
      >
        <MaterialIcons name="report-problem" size={54} color="#fff" />
        <Text style={styles.panicText}>PANIC</Text>
      </TouchableOpacity>

      {/* Main Action Buttons */}
      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={[styles.actionButton, styles.seekHelpBtn]}
          onPress={() => navigation?.navigate('SubmitIssue')}
        >
          <FontAwesome5 name="hands-helping" size={26} color="#fff" style={styles.actionIcon} />
          <Text style={styles.buttonText}>Seek Help Now</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.feedBtn]}
          onPress={() => navigation?.navigate('Feed')}
        >
          <Ionicons name="eye" size={26} color="#fff" style={styles.actionIcon} />
          <Text style={styles.buttonText}>View My Feed</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.notifBtn]}
          onPress={() => navigation?.navigate('Notifications')}
        >
          <Ionicons name="notifications" size={26} color="#fff" style={styles.actionIcon} />
          <Text style={styles.buttonText}>Notifications</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Tab: Profile */}
      <View style={styles.bottomTab}>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation?.navigate('Profile')}
        >
          <Ionicons name="person-circle" size={38} color="#2196F3" />
          <Text style={styles.profileText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const BUTTON_WIDTH = width * 0.88;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7faff',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: Platform.OS === 'android' ? 18 : 8,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2196F3',
    letterSpacing: 1.5,
  },
  panicButton: {
    marginTop: 24,
    alignSelf: 'center',
    backgroundColor: '#D32F2F',
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowColor: '#D32F2F',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    borderWidth: 4,
    borderColor: '#fff',
  },
  panicText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 22,
    marginTop: 10,
    letterSpacing: 2,
    textShadowColor: '#b71c1c',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 6,
  },
  buttonGroup: {
    marginTop: 44,
    width: '100%',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: BUTTON_WIDTH,
    paddingVertical: 20,
    borderRadius: 18,
    marginVertical: 13,
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    backgroundColor: '#fff',
  },
  actionIcon: {
    marginRight: 18,
  },
  seekHelpBtn: {
    backgroundColor: '#FF9800',
  },
  feedBtn: {
    backgroundColor: '#2196F3',
  },
  notifBtn: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: 1,
  },
  bottomTab: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 74,
    backgroundColor: '#fff',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 12,
    shadowColor: '#2196F3',
    shadowOpacity: 0.13,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
    borderTopWidth: 1,
    borderColor: '#e3eaf2',
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#f3f8ff',
    elevation: 2,
  },
  profileText: {
    color: '#2196F3',
    fontSize: 19,
    marginLeft: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});

export default Home;