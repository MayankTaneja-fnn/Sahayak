import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { db, storage, admin } from "../utils/firebase.config.js";
import axios from 'axios';
import {ApiError} from "../utils/ApiError.js";

const cleanUp = (filePath) => {
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
};


export const handleSubmitIssue = async (req, res) => {
  try {
    const { description, lat, lng } = req.body;
    const userId = req.userId;
    const mediaFiles = req.files?.media || [];
    const voiceFiles = req.files?.voice || [];
    const mediaUrls = [];
    let severity;
    let aiVerified = false;

    const uploadAndGetUrl = async (file, prefix) => {
      const ext = path.extname(file.originalname);
      const dest = `issues/${userId}/${prefix}_${uuidv4()}${ext}`;

      await storage.upload(file.path, {
        destination: dest,
        metadata: { contentType: file.mimetype },
      });

      const [url] = await storage.file(dest).getSignedUrl({
        action: 'read',
        expires: '03-01-2030',
      });

      cleanUp(file.path);
      return url;
    };

    // Upload media
    for (const file of mediaFiles) {
      const url = await uploadAndGetUrl(file, 'media');
      mediaUrls.push(url);
    }
    for (const file of voiceFiles) {
      const url = await uploadAndGetUrl(file, 'voice');
      mediaUrls.push(url);
    }

    // AI Categorization
    try {
      const response = await axios.post(
        `${process.env.FLASK_URL}/categorize`,
        { description },
        { headers: { 'Content-Type': 'application/json' } }
      );
      console.log('AI Response:', response.data);

      if (response) aiVerified = true;
      const sev = response.data.urgency;
      severity = sev === 0 ? 'green' : sev === 1 ? 'orange' : 'red';
    } catch (error) {
      console.log('AI Error:', error);
      throw new ApiError(500, error?.response?.data?.message || 'AI categorization failed');
    }

    const issueData = {
      userId,
      location: {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
      },
      issueType: 'basic_help',
      status: 'in_progress',
      severity,
      description,
      mediaUrls,
      responders: [],
      reportedAt: new Date(),
      resolvedAt: null,
      resolutionProof: {},
      notifyAuthorities: true,
      authorityType: 'ambulance',
      aiVerified,
      flaggedByAI: false,
    };

    // Save to Firestore
    const docRef = await db.collection('posts').add(issueData);

    // Notify users within 2km
    try {
      const usersSnap = await db.collection('users').get();
      const tokens = [];

      usersSnap.forEach(doc => {
        const user = doc.data();
        if (user.location && user.fcmToken && user.userId !== userId) {
          const dist = getDistanceFromLatLonInKm(
            parseFloat(lat),
            parseFloat(lng),
            user.location.lat,
            user.location.lng
          );
          if (dist <= 2) tokens.push(user.fcmToken);
        }
      });

      if (tokens.length > 0) {
        const message = {
          notification: {
            title: '🚨 Nearby Help Needed!',
            body: description || 'A new help request was posted near you.',
          },
        };

        const messaging = admin.messaging();
        await messaging.sendToDevice(tokens, message);


        // Save notifications to DB
        for (const token of tokens) {
          const userSnap = await db
            .collection('users')
            .where('fcmToken', '==', token)
            .get();

          if (!userSnap.empty) {
            const userDoc = userSnap.docs[0];
            await db.collection('notifications').add({
              userId: userDoc.id,
              issueId: docRef.id,
              title: '🚨 Nearby Help Needed!',
              body: description || 'A new help request was posted near you.',
              createdAt: new Date(),
              read: false,
            });
          }
        }
      }
    } catch (err) {
      console.error('Notification error:', err);
    }

    // Final response (only once)
    res.status(200).json({
      message: 'Issue submitted',
      data: { ...issueData, id: docRef.id },
    });
  } catch (err) {
    console.error('🔥 Error submitting issue:', err);
    res.status(500).json({ error: 'Server Error' });
  }
};



// Helper to get user name by userId
async function getUserNameById(userId) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      return userDoc.data().name || '';
    }
    return '';
  } catch (err) {
    return '';
  }
}

export const getAllPosts = async (req, res) => {
  try {
    const snap = await db.collection('posts').orderBy('reportedAt', 'desc').get();
    // Fetch all userIds in posts
    const userIds = Array.from(new Set(snap.docs.map(doc => doc.data().userId)));
    // Map userId to name
    const userIdToName = {};
    for (const uid of userIds) {
      userIdToName[uid] = await getUserNameById(uid);
    }
    const posts = snap.docs.map(doc => {
      const data = doc.data();
      const resolvedCount = (data.responders || []).filter(r => r.status === 'resolved').length;
      return {
        id: doc.id,
        ...data,
        userName: userIdToName[data.userId] || '',
        respondersResolvedCount: resolvedCount,
        reportedAt: data.reportedAt && data.reportedAt.toMillis ? data.reportedAt.toMillis() : data.reportedAt,
        resolvedAt: data.resolvedAt && data.resolvedAt.toMillis ? data.resolvedAt.toMillis() : data.resolvedAt,
        responders: Array.isArray(data.responders) ? data.responders.map(r => ({
          ...r,
          acceptedAt: r.acceptedAt && r.acceptedAt.toMillis ? r.acceptedAt.toMillis() : r.acceptedAt,
          resolvedAt: r.resolvedAt && r.resolvedAt.toMillis ? r.resolvedAt.toMillis() : r.resolvedAt,
          userName: userIdToName[r.userId] || '',
        })) : [],
      };
    });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch posts' });
  }
};

export const acceptHelp = async (req, res) => {
  try {
    const userId = req.userId;
    const postRef = db.collection('posts').doc(req.params.id);
    const postDoc = await postRef.get();
    if (!postDoc.exists) return res.status(404).json({ message: 'Post not found' });

    const responders = postDoc.data().responders || [];
    if (responders.some(r => r.userId === userId)) {
      return res.status(400).json({ message: 'Already accepted' });
    }
    responders.push({ userId, acceptedAt: Date.now(), status: 'in_progress' });
    await postRef.update({ responders, status: 'in_progress' });

    // Notify issuer
    const issuerId = postDoc.data().userId;
    const issuerDoc = await db.collection('users').doc(issuerId).get();
    if (issuerDoc.exists && issuerDoc.data().fcmToken) {
      const fcmToken = issuerDoc.data().fcmToken;
      const message = {
        notification: {
          title: 'Someone accepted your help request!',
          body: 'A responder is on the way.',
        },
        token: fcmToken,
      };
      await admin.messaging().send(message);
      // Save notification
      await db.collection('notifications').add({
        userId: issuerId,
        issueId: req.params.id,
        title: 'Someone accepted your help request!',
        body: 'A responder is on the way.',
        createdAt: new Date(),
        read: false,
      });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Failed to accept help' });
  }
};

export const responderMarkResolved = async (req, res) => {
  try {
    const userId = req.userId;
    const postRef = db.collection('posts').doc(req.params.id);
    const postDoc = await postRef.get();
    if (!postDoc.exists) return res.status(404).json({ message: 'Post not found' });

    let responders = postDoc.data().responders || [];
    let updated = false;
    responders = responders.map(r => {
      if (r.userId === userId) {
        updated = true;
        return { ...r, status: 'resolved', resolvedAt: Date.now() };
      }
      return r;
    });
    if (!updated) return res.status(400).json({ message: 'You are not a responder for this issue' });
    // console.log("Updated Responders:", responders);
    await postRef.update({ responders });

    // Notify issuer
    const issuerId = postDoc.data().userId;
    const issuerDoc = await db.collection('users').doc(issuerId).get();
    // console.log("Issuer Document:", issuerDoc.data());
    if (issuerDoc.exists && issuerDoc.data().fcmToken) {
      const fcmToken = issuerDoc.data().fcmToken;
      const message = {
        notification: {
          title: 'A responder marked your issue as resolved!',
          body: 'Please confirm if the issue is resolved.',
        },
        token: fcmToken,
      };
      const res1=await admin.messaging().send(message);
      // console.log("res1",res1);
      // Save notification
      const res=await db.collection('notifications').add({
        userId: issuerId,
        issueId: req.params.id,
        title: 'A responder marked your issue as resolved!',
        body: 'Please confirm if the issue is resolved.',
        createdAt: new Date(),
        read: false,
      });
      // console.log("response",res);
    }
    // console.log("Responder marked as resolved:", userId);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Failed to mark as resolved' });
  }
};

export const markResolved = async (req, res) => {
  try {
    const postRef = db.collection('posts').doc(req.params.id);
    const postDoc = await postRef.get();
    if (!postDoc.exists) return res.status(404).json({ message: 'Post not found' });

    await postRef.update({ status: 'resolved', resolvedAt: Date.now() });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Failed to mark as resolved' });
  }
};

// Helper function for distance
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
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
