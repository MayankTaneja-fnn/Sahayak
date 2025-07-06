import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
// const db = admin.firestore();
const otpStore = new Map();
import {db,admin} from '../utils/firebase.config.js'; // Adjust the import based on your setup
import { sendOTP } from '../utils/twilio.config.js';


const SECRET_KEY = process.env.SESSION_TOKEN_KEY; // use dotenv in production

const sendOtp = async (req, res) => {
  console.log('Received request to send OTP');
  const { phone } = req.body;
  
  try {
    // 🔍 Check if user already exists
    console.log(`Checking if phone number ${phone} is already registered`);
    const snap = await db.collection('users').where('phone', '==', phone).get();
    console.log(snap);
    if (!snap.empty) {
      return res.status(400).json({
        success: false,
        message: 'Phone number already registered. Please log in instead.',
      });
    }
    
    // ✅ Proceed to generate and store OTP
    let formattedPhone = phone;
    if (!phone.startsWith('+91')) {
      formattedPhone = '+91' + phone.replace(/^0+/, '');
    }
    console.log(`Sending OTP to ${formattedPhone}`);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(formattedPhone, otp);
    console.log(`OTP for ${formattedPhone}: ${otp}`);
    // Send OTP via Twilio
    const twilioRes = await sendOTP(formattedPhone, otp);
    console.log(`OTP sent successfully: ${twilioRes}`);
    return res.status(200).json({ success: true, otp, phone: formattedPhone }); // Send otp for testing only (remove in production)
  } catch (err) {
    console.error('OTP Error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const verifyOtp = (req, res) => {
  const { phone, otp } = req.body;
   let formattedPhone1 = phone;
    if (!phone.startsWith('+91')) {
      formattedPhone1 = '+91' + phone.replace(/^0+/, '');
    }
  if (otpStore.get(formattedPhone1) === otp) {
    otpStore.delete(formattedPhone1);
    res.send({ success: true });
  } else {
    res.status(400).send({ message: 'Invalid OTP' });
  }
};

const signup = async (req, res) => {
  const { phone, name, email, age, password, location, fcmToken } = req.body;
  console.log(`Signing up user with phone: ${phone}, name: ${name}, email: ${email}, age: ${age}, location: ${JSON.stringify(location)}`);
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const userRef = db.collection('users').doc();
    await userRef.set({
      name,
      phone,
      location,
      fcmToken: fcmToken || '',
      points: 0,
      totalHelps: 0,
      totalPosts: 0,
      trustScore: 0,
      isBlocked: false,
      password: hashedPassword,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    res.send({ success: true });
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: err.message });
  }
};

const updateFcmToken = async (req, res) => {
  const userId = req.userId;
  const { fcmToken } = req.body;
  if (!fcmToken) return res.status(400).json({ message: 'No FCM token provided' });
  await db.collection('users').doc(userId).update({ fcmToken });
  res.json({ success: true });
};

const login = async (req, res) => {
  let { phone, password } = req.body;
  phone = String(phone); // Ensure phone is a string for Firestore query
  // console.log(`Logging in user with phone: ${phone}`);
  const snap = await db.collection('users').where('phone', '==', phone).get();
  if (snap.empty){
    console.log(`User not found for phone: ${phone}`);
     return res.status(404).send({ message: 'User not found' });
  }

  const userDoc = snap.docs[0];
  const user = userDoc.data();
  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) return res.status(400).send({ message: 'Incorrect password' });

  const token = jwt.sign({ uid: userDoc.id }, SECRET_KEY, { expiresIn: '7d' });

  res.send({ token, userId: userDoc.id });
};


const logout = async (_req, res) => {
  res.send({ success: true }); // No server-side session to clear with JWT
};

const getUserProfile = async (req, res) => {
  try {
    // Get user ID from JWT (set by auth middleware)
    const userId = req.userId;
    // console.log(`Fetching profile for user ID: ${userId}`);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // Fetch user document
    const userDoc = await db.collection('users').doc(userId).get();
    // console.log(`User document fetched: ${userDoc.id}`);
    if (!userDoc.exists) return res.status(404).json({ message: 'User not found' });
    const user = userDoc.data();

    // Convert Firestore Timestamps to millis if present
    const createdAt = user.createdAt && user.createdAt.toMillis ? user.createdAt.toMillis() : user.createdAt;
    const updatedAt = user.updatedAt && user.updatedAt.toMillis ? user.updatedAt.toMillis() : user.updatedAt;

    res.json({
      userId: userId,
      name: user.name,
      phone: user.phone,
      location: user.location,
      avatarUrl: user.avatarUrl || '',
      points: user.points || 0,
      trustScore: user.trustScore || 0,
      // totalHelps: user.totalHelps || 0,
      totalPosts: user.totalPosts || 0,
      helpHistory:[],
      // misuseReports,
      isBlocked: user.isBlocked || false,
      createdAt,
      updatedAt
    });
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getUserNotifications = async (req, res) => {
  try {
    const userId = String(req.userId);
    // Fetch notifications without orderBy
    const snap = await db.collection('notifications')
      .where('userId', '==', userId)
      .get();

    const notifications = snap.docs.map(doc => {
      const data = doc.data();
      // Convert Firestore Timestamp fields to millis if present
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt && data.createdAt.toMillis ? data.createdAt.toMillis() : data.createdAt,
        updatedAt: data.updatedAt && data.updatedAt.toMillis ? data.updatedAt.toMillis() : data.updatedAt,
      };
    });
    // Sort notifications by createdAt descending (most recent first)
    notifications.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
};

export {updateFcmToken,getUserNotifications, signup, login, logout, sendOtp, verifyOtp, getUserProfile};
