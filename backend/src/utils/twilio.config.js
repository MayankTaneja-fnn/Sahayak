// const twilio = require('twilio');
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;   // Get from Twilio Dashboard
const authToken = process.env.TWILIO_AUTH_TOKEN;     // Get from Twilio Dashboard
const client = twilio(accountSid, authToken);

function sendOTP(phoneNumber, otp) {
  client.messages
    .create({
      body: `Your OTP is ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER, // Your Twilio phone number
      to: phoneNumber       // Example: '+919812345678'
    })
    .then(message => console.log('OTP sent:', message.sid))
    .catch(error => console.error('Error sending OTP:', error));
}

// Example usage:
// sendOTP('+919812345678', '123456');
export { sendOTP };
