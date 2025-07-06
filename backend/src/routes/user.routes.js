import { Router } from "express";
import { signup, login, sendOtp, verifyOtp, getUserProfile, updateFcmToken, getUserNotifications } from "../controllers/user.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
// import {signup} from "../"

const router = Router();

router.post('/updateFcmToken', verifyToken, updateFcmToken);
router.route("/send-otp").post(sendOtp);
router.route("/verify-otp").post(verifyOtp);
router.route("/signup").post(signup);
router.route("/login").post(login);
router.route("/logout", verifyToken, (req, res) => {
  res.send({ success: true }); // No server-side session to clear with JWT

});
router.get('/notifications', verifyToken, getUserNotifications);
router.get('/profile', verifyToken, getUserProfile);

export default router;