import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Image, Linking, Alert, Modal, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import firestore from '@react-native-firebase/firestore';

const BACKEND_URL = 'https://sahayak-yy09.onrender.com'; // Change to your backend

function getDistanceFromLatLonInKm(lat1:any, lon1:any, lat2:any, lon2:any) {
  // Haversine formula
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const Feed = ({ navigation, route = {} }: any) => {
  const [tab, setTab] = useState<'issues' | 'my'>('issues');
  const [issues, setIssues] = useState<any[]>([]);
  const [myIssues, setMyIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mediaModal, setMediaModal] = useState<{ visible: boolean; urls: string[] }>({ visible: false, urls: [] });
  const [acceptedIssueId, setAcceptedIssueId] = useState<string | null>(null);
  const highlightIssueId = route?.params?.highlightIssueId;
  const [glowAnim] = useState(new Animated.Value(0));

  // Fetch all posts from backend using axios and update state
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    const fetchAllPosts = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        // Get user location from profile or device
        const profileRes = await axios.get(`${BACKEND_URL}/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUserLocation(profileRes.data.location);
        const fetchedUserId = profileRes.data.userId || '';
        setUserId(fetchedUserId);
        // Fetch all posts from backend
        const res = await axios.get(`${BACKEND_URL}/post/posts`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const allPosts = res.data.sort((a: any, b: any) => b.reportedAt - a.reportedAt);
        if (isMounted) {
          const issuesList = allPosts.filter((i: any) => String(i.userId) !== String(fetchedUserId));
          const myIssuesList = allPosts.filter((i: any) => String(i.userId) === String(fetchedUserId));
          setIssues(issuesList);
          setMyIssues(myIssuesList);
          // If highlightIssueId is present, check which tab it belongs to and set tab accordingly
          if (highlightIssueId) {
            const inMyIssues = myIssuesList.some((i: any) => i.id === highlightIssueId);
            const inIssues = issuesList.some((i: any) => i.id === highlightIssueId);
            if (inMyIssues && tab !== 'my') setTab('my');
            else if (inIssues && tab !== 'issues') setTab('issues');
          }
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) setLoading(false);
      }
    };
    fetchAllPosts();
    return () => { isMounted = false; };
  }, [highlightIssueId, tab]);

  // Glow effect: run when highlightIssueId or tab changes
  useEffect(() => {
    if (highlightIssueId) {
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 400, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1200, useNativeDriver: false }),
      ]).start();
    }
  }, [highlightIssueId, tab]);

  const acceptHelp = async (issueId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.post(`${BACKEND_URL}/post/${issueId}/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      Alert.alert('Success', 'You have accepted to help!');
      setAcceptedIssueId(issueId); // Track accepted issue
      // Refresh issues to update status to 'in_progress'
      await refreshIssues();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || err.message || 'Failed to accept help');
    }
  };

  // Add a function to refresh issues after accepting help
  const refreshIssues = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const uid = await AsyncStorage.getItem('userId');
      // Get user location from profile or device
      const profileRes = await axios.get(`${BACKEND_URL}/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUserLocation(profileRes.data.location);
      // Fetch all issues
      const res = await axios.get(`${BACKEND_URL}/post/posts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const allIssues = res.data.sort((a: any, b: any) => b.reportedAt - a.reportedAt);
      setIssues(allIssues.filter((i: any) => i.userId !== userId));
      setMyIssues(allIssues.filter((i: any) => String(i.userId) === String(userId)));
    } catch (err: any) {
      // Optionally handle error
    }
  };

  // Mark as resolved handler
  const markResolved = async (issueId: string, isResponder: boolean) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const endpoint = isResponder
        ? `${BACKEND_URL}/post/${issueId}/responder-resolve`
        : `${BACKEND_URL}/post/${issueId}/resolve`;
      await axios.post(endpoint, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      Alert.alert('Marked as resolved!');
      await refreshIssues(); // Immediately refresh issues so UI updates
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || err.message || 'Failed to mark as resolved');
    }
  };

  const openMaps = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.openURL(url);
  };

  const renderIssue = (item: any) => {
    const respondersCount = item.responders?.length || 0;
    const postedAt = new Date(item.reportedAt).toLocaleString();
    const distance =
      userLocation && item.location
        ? getDistanceFromLatLonInKm(userLocation.lat, userLocation.lng, item.location.lat, item.location.lng).toFixed(2)
        : '--';
    // Check if current user is in responders
    const hasAccepted = Array.isArray(item.responders) && item.responders.some((r: any) => String(r.userId) === String(userId));
    const responderObj = Array.isArray(item.responders) ? item.responders.find((r: any) => String(r.userId) === String(userId)) : null;
    const responderMarkedResolved = responderObj?.status === 'resolved';
    const isAccepted = acceptedIssueId === item.id || hasAccepted;
    const isResolved = item.status === 'resolved';
    const isHighlighted = item.id === highlightIssueId;
    const animatedStyle = isHighlighted
      ? {
          borderColor: glowAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['#fdcb6e', '#ffeaa7'],
          }),
          shadowColor: '#fdcb6e',
          shadowOpacity: glowAnim,
          shadowRadius: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 16] }),
          elevation: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [2, 12] }),
        }
      : {};
    return (
      <Animated.View style={[{ backgroundColor: item.severity }, styles.issueCard, isResolved && styles.resolvedCard, isHighlighted && styles.highlightedCard, animatedStyle]}> 
        <Text style={styles.issueType}>{item.issueType?.toUpperCase()} <Text style={{ color: '#d35400' }}>{item.severity?.toUpperCase()}</Text></Text>
        <Text style={styles.status}>Status: {isResolved ? '✅ Resolved' : item.status}</Text>
        {/* <Text>{userId}</Text> */}
        <Text style={styles.desc}>{item.description}</Text>
        <Text style={styles.meta}>Posted by: {item.userName}</Text>
        <Text style={styles.meta}>Posted at: {postedAt}</Text>
        <Text style={styles.meta}>Responders: {respondersCount}</Text>
        <Text style={styles.meta}>Distance: {distance} km</Text>
        <View style={styles.actionsRow}>
          {!isResolved && item.mediaUrls && item.mediaUrls.length > 0 && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => setMediaModal({ visible: true, urls: item.mediaUrls })}>
              <Text style={styles.actionText}>See Media</Text>
            </TouchableOpacity>
          )}
          {/* Accept Help button for posts not by current user, not accepted, and in_progress */}
          {!isResolved && tab === 'issues' && item.status === 'in_progress' && !isAccepted && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#0984e3' }]} onPress={() => acceptHelp(item.id)}>
              <Text style={[styles.actionText, { color: '#fff' }]}>Accept Help</Text>
            </TouchableOpacity>
          )}
          {/* After accepting help, show Get Directions and Mark as Resolved */}
          {!isResolved && tab === 'issues' && hasAccepted && !responderMarkedResolved && (
            <>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#00b894' }]} onPress={() => openMaps(item.location.lat, item.location.lng)}>
                <Text style={styles.actionText}>Get Directions</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#fdcb6e' }]} onPress={() => markResolved(item.id, true)}>
                <Text style={[styles.actionText, { color: '#2d3436' }]}>Mark as Resolved</Text>
              </TouchableOpacity>
            </>
          )}
          {!isResolved && tab === 'issues' && hasAccepted && responderMarkedResolved && (
            <View style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <Text style={[styles.actionText, { color: '#fdcb6e', marginBottom: 2 }]}>Marked as resolved by you</Text>
              <Text style={[styles.actionText, { color: '#636e72' }]}>Waiting for confirmation from issuer</Text>
            </View>
          )}
          {!isResolved && tab === 'my' && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => markResolved(item.id, false)}>
              <Text style={styles.actionText}>Mark as Resolved</Text>
            </TouchableOpacity>
          )}
          {isResolved && (
            <View style={styles.resolvedRow}>
              <Text style={styles.resolvedTick}>✔</Text>
              <Text style={styles.resolvedText}>Resolved</Text>
            </View>
          )}
        </View>
      </Animated.View>
    );
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#0984e3" /></View>;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerRow}>
        {/* <Text>{userId?userId:1234}</Text> */}
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.backButtonText}>← Back to Home</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.container}>
        <View style={styles.tabRow}>
          <TouchableOpacity style={[styles.tab, tab === 'issues' && styles.tabActive]} onPress={() => setTab('issues')}>
            <Text style={styles.tabText}>Issues</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, tab === 'my' && styles.tabActive]} onPress={() => setTab('my')}>
            <Text style={styles.tabText}>My Issues</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={tab === 'issues' ? issues : myIssues}
          keyExtractor={item => item.id}
          renderItem={({ item }) =>
            tab === 'my' ? (
              <Animated.View style={[
                { backgroundColor: item.severity },
                styles.issueCard,
                item.status === 'resolved' && styles.resolvedCard
              ]}>
                <Text style={styles.issueType}>{item.issueType?.toUpperCase()} <Text style={{ color: "white" }}>{item.severity?.toUpperCase()}</Text></Text>
                <Text style={styles.status}>Status: {item.status === 'resolved' ? '✅ Resolved' : item.status}</Text>
                <Text style={styles.desc}>{item.description}</Text>
                <Text style={styles.meta}>Posted at: {new Date(item.reportedAt).toLocaleString()}</Text>
                <Text style={styles.meta}>Responders: {item.responders?.length || 0}</Text>
                <Text style={styles.meta}>Location: {item.location?.lat}, {item.location?.lng}</Text>
                <Text style={styles.meta}>AI Verified: {item.aiVerified ? 'Yes' : 'No'}</Text>
                <Text style={styles.meta}>Flagged by AI: {item.flaggedByAI ? 'Yes' : 'No'}</Text>
                {item.mediaUrls && item.mediaUrls.length > 0 && (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => setMediaModal({ visible: true, urls: item.mediaUrls })}>
                    <Text style={styles.actionText}>See Media</Text>
                  </TouchableOpacity>
                )}
                {item.status !== 'resolved' ? (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => markResolved(item.id, false)}>
                    <Text style={styles.actionText}>Mark as Resolved</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={[styles.actionText, { color: '#27ae60' }]}>Resolved</Text>
                )}
              </Animated.View>
            ) : (
              renderIssue(item)
            )
          }
          ListEmptyComponent={<Text style={styles.emptyText}>No issues found.</Text>}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
        <Modal visible={mediaModal.visible} transparent animationType="fade" onRequestClose={() => setMediaModal({ visible: false, urls: [] })}>
          <View style={styles.mediaModalOverlay}>
            <View style={styles.mediaModalContent}>
              <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center' }}>
                {mediaModal.urls.map((url, idx) => (
                  <Image key={idx} source={{ uri: url }} style={styles.mediaImgLarge} resizeMode="contain" />
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.closeBtnLarge} onPress={() => setMediaModal({ visible: false, urls: [] })}>
                <Text style={styles.closeTextLarge}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

// --- UI Improvements ---
// Update styles for more professional, modern look
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f7faff' },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, marginBottom: 4, justifyContent: 'space-between' },
  backButton: { backgroundColor: '#fff', borderRadius: 10, paddingVertical: 7, paddingHorizontal: 18, elevation: 2, shadowColor: '#0984e3', shadowOpacity: 0.08, shadowRadius: 4 },
  backButtonText: { color: '#0984e3', fontWeight: 'bold', fontSize: 17, letterSpacing: 0.5 },
  container: { flex: 1, backgroundColor: '#f7faff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabRow: { flexDirection: 'row', margin: 14, justifyContent: 'center', backgroundColor: '#e3eaf2', borderRadius: 12, padding: 4 },
  tab: { paddingVertical: 10, paddingHorizontal: 28, marginHorizontal: 2, borderRadius: 8, backgroundColor: 'transparent' },
  tabActive: { backgroundColor: '#0984e3', elevation: 2 },
  tabText: { color: '#222', fontWeight: 'bold', fontSize: 16 },
  issueCard: {  marginVertical: 10, marginHorizontal: 8, borderRadius: 16, padding: 18, elevation: 3, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, borderWidth: 1, borderColor: '#e3eaf2' },
  resolvedCard: {
    borderColor: '#27ae60',
    borderWidth: 2,
    backgroundColor: '#eafaf1',
  },
  highlightedCard: {
    borderWidth: 3,
    borderColor: '#fdcb6e',
    shadowColor: '#fdcb6e',
    shadowOpacity: 0.7,
    shadowRadius: 16,
    elevation: 8,
  },
  issueType: { fontSize: 19, fontWeight: 'bold', color: '#0984e3', marginBottom: 2 },
  status: { fontSize: 15, color: '#636e72', marginBottom: 6, fontWeight: 'bold' },
  desc: { fontSize: 16, color: '#2d3436', marginBottom: 8, fontWeight: '500' },
  meta: { fontSize: 13, color: '#636e72', marginBottom: 2 },
  actionsRow: { flexDirection: 'row', marginTop: 12, flexWrap: 'wrap' },
  actionBtn: { backgroundColor: '#d35400', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16, marginRight: 10, marginBottom: 6, elevation: 1 },
  actionText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  emptyText: { color: '#b2bec3', textAlign: 'center', marginTop: 40, fontSize: 16 },
  mediaModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
    minWidth: 320,
    minHeight: 320,
    maxWidth: 360,
    maxHeight: 440,
  },
  mediaImgLarge: {
    width: 280,
    height: 280,
    borderRadius: 16,
    marginHorizontal: 8,
    marginVertical: 6,
    backgroundColor: '#f7faff',
    borderWidth: 1,
    borderColor: '#e3eaf2',
  },
  closeBtnLarge: {
    marginTop: 18,
    backgroundColor: '#d35400',
    paddingVertical: 10,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignSelf: 'center',
    elevation: 2,
  },
  closeTextLarge: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
    letterSpacing: 1,
  },
  resolvedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    justifyContent: 'center',
  },
  resolvedTick: {
    color: '#27ae60',
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 8,
  },
  resolvedText: {
    color: '#27ae60',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default Feed;