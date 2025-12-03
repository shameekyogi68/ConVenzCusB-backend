import axios from "axios";
import User from "../models/userModel.js";
import Subscription from "../models/subscriptionModel.js";
import Plan from "../models/planModel.js";
import { sendNotification } from "../utils/sendNotification.js";

// In-memory OTP storage (RAM) - No database storage needed
const otpStore = new Map(); // { phone: { otp, timestamp } }

/* ------------------------------------------------------------
   📲 REGISTER USER (Send OTP)
------------------------------------------------------------ */
export const registerUser = async (req, res) => {
  try {
    console.log('\n🔐 === OTP REGISTRATION PROCESS ===');
    const { phone } = req.body;
    
    if (!phone) {
      console.log('❌ Registration failed: Phone number required');
      return res.json({ success: false, message: "Phone number required" });
    }

    console.log('📱 Phone number received:', phone);

    // Generate random 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000);
    console.log('🔑 Generated OTP:', otp);
    console.log('⚠️  IMPORTANT: Enter this OTP in the app:', otp);
    
    // Store OTP in memory (RAM) with timestamp
    otpStore.set(phone, {
      otp: otp,
      timestamp: Date.now()
    });
    console.log('💾 OTP stored in memory (RAM) for phone:', phone);
    
    let user = await User.findOne({ phone });

    if (!user) {
      user = await User.create({ phone });
      console.log("🆕 New user created:", phone);
    } else {
      console.log('🔄 Existing user found:', user.user_id);
    }

    console.log('✅ OTP sent successfully to phone:', phone);
    console.log('⏰ OTP valid for 5 minutes');
    
    // Send push notification with OTP if user has FCM token
    if (user.fcmToken) {
      try {
        await sendNotification(
          user.fcmToken,
          "🔐 Your OTP Code",
          `Your verification code is: ${otp}. Valid for 5 minutes.`,
          { type: "otp", otp: otp.toString() }
        );
        console.log('📲 OTP notification sent via FCM');
      } catch (error) {
        console.log('⚠️  FCM notification failed (user will still see OTP):', error.message);
      }
    }
    
    console.log('='.repeat(50));

    return res.json({
      success: true,
      message: "OTP sent successfully",
      otp,
      userId: user.user_id,
      isNewUser: !user.name && !user.gender,
    });
  } catch (err) {
    console.error('❌ Registration Error:', err.message);
    return res.json({ success: false, message: err.message });
  }
};

/* ------------------------------------------------------------
   🔍 VERIFY OTP
------------------------------------------------------------ */
export const verifyOtp = async (req, res) => {
  try {
    console.log('\n🔍 === OTP VERIFICATION PROCESS ===');
    const { phone, otp } = req.body;
    console.log('📱 Verifying OTP for phone:', phone);
    console.log('🔑 OTP received from user:', otp);
    
    // Check if OTP exists in memory
    const otpData = otpStore.get(phone);
    
    if (!otpData) {
      console.log('❌ Verification failed: No OTP found for this phone');
      return res.json({ success: false, message: "OTP not found or expired" });
    }

    console.log('🔑 Stored OTP in memory:', otpData.otp);
    console.log('🔑 User entered OTP:', Number(otp));

    // Check OTP expiry (5 minutes = 300000 ms)
    const otpAge = Date.now() - otpData.timestamp;
    if (otpAge > 300000) {
      console.log('❌ OTP expired (older than 5 minutes)');
      otpStore.delete(phone); // Clean up expired OTP
      return res.json({ success: false, message: "OTP expired" });
    }

    // Compare OTPs
    if (Number(otp) !== otpData.otp) {
      console.log('❌ OTP verification failed: OTP does not match');
      console.log('   Expected:', otpData.otp);
      console.log('   Received:', Number(otp));
      return res.json({ success: false, message: "Invalid OTP" });
    }

    // OTP is valid - remove it from memory
    otpStore.delete(phone);
    console.log('🗑️  OTP removed from memory after successful verification');

    const user = await User.findOne({ phone });

    if (!user) {
      console.log('❌ Verification failed: User not found for phone:', phone);
      return res.json({ success: false, message: "User not found" });
    }

    console.log('✅ OTP verified successfully for user:', user.user_id);
    console.log('🎉 User authenticated:', phone);
    
    // Send welcome notification after successful OTP verification
    if (user.fcmToken) {
      try {
        const isNewUser = !user.name && !user.gender;
        if (isNewUser) {
          await sendNotification(
            user.fcmToken,
            "✅ Verification Successful!",
            "Welcome! Please complete your profile to get started.",
            { type: "welcome", screen: "setup" }
          );
          console.log('📲 Welcome notification sent via FCM');
        } else {
          await sendNotification(
            user.fcmToken,
            "🎉 Welcome Back!",
            `Hello ${user.name}, you're successfully logged in.`,
            { type: "login", screen: "home" }
          );
          console.log('📲 Welcome back notification sent via FCM');
        }
      } catch (error) {
        console.log('⚠️  FCM notification failed:', error.message);
      }
    }
    
    console.log('='.repeat(50));

    return res.json({
      success: true,
      message: "OTP verified",
      user,
      userId: user.user_id,
      isNewUser: !user.name && !user.gender,
    });
  } catch (err) {
    console.error('❌ OTP Verification Error:', err.message);
    return res.json({ success: false, message: err.message });
  }
};

/* ------------------------------------------------------------
   ✏️ UPDATE USER DETAILS
------------------------------------------------------------ */
export const updateUserDetails = async (req, res) => {
  try {
    console.log('\n✏️  === UPDATE USER DETAILS ===');
    const { phone, name, gender } = req.body;
    console.log('📱 Phone:', phone);
    console.log('👤 Name:', name);
    console.log('⚥ Gender:', gender);
    
    const user = await User.findOne({ phone });

    if (!user) {
      console.log('❌ Update failed: User not found');
      return res.json({ success: false, message: "User not found" });
    }

    user.name = name || user.name;
    user.gender = gender || user.gender;
    await user.save();

    console.log('✅ User details updated successfully for:', user.user_id);
    
    // Send profile completion notification
    if (user.fcmToken) {
      try {
        await sendNotification(
          user.fcmToken,
          "✅ Profile Updated!",
          `Great job ${name}! Your profile has been successfully updated.`,
          { type: "profile_update", screen: "home" }
        );
        console.log('📲 Profile update notification sent via FCM');
      } catch (error) {
        console.log('⚠️  FCM notification failed:', error.message);
      }
    }
    
    console.log('='.repeat(50));

    return res.json({ success: true, message: "Details updated", user });
  } catch (err) {
    console.error('❌ Update Details Error:', err.message);
    return res.json({ success: false, message: err.message });
  }
};

/* ------------------------------------------------------------
   👤 GET USER PROFILE
------------------------------------------------------------ */
export const getUserProfile = async (req, res) => {
  try {
    console.log('\n👤 === GET USER PROFILE ===');
    const { userId } = req.params;
    console.log('🔍 Fetching profile for user ID:', userId);
    
    const user = await User.findOne({ user_id: userId });

    if (!user) {
      console.log('❌ Profile not found for user ID:', userId);
      return res.status(404).json({ success: false, message: "User not found" });
    }

    console.log('✅ Profile retrieved successfully for:', user.name || user.phone);
    console.log('='.repeat(50));

    return res.status(200).json({ success: true, data: user });
  } catch (err) {
    console.error('❌ Get Profile Error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ------------------------------------------------------------
   ✏️ UPDATE USER PROFILE (PUT)
------------------------------------------------------------ */
export const updateUserProfile = async (req, res) => {
  try {
    console.log('\n✏️  === UPDATE USER PROFILE ===');
    const { userId } = req.params;
    const { name, phone, address } = req.body;
    console.log('👤 Updating profile for user ID:', userId);
    console.log('📝 New data:', { name, phone, address });

    const updatedUser = await User.findOneAndUpdate(
      { user_id: userId },
      { name, phone, address },
      { new: true }
    );

    if (!updatedUser) {
      console.log('❌ Profile update failed: User not found');
      return res.status(404).json({ success: false, message: "User not found" });
    }

    console.log('✅ Profile updated successfully for:', updatedUser.name);
    console.log('='.repeat(50));

    return res.json({ success: true, message: "Profile updated", data: updatedUser });
  } catch (err) {
    console.error('❌ Update Profile Error:', err.message);
    return res.json({ success: false, message: err.message });
  }
};

/* ------------------------------------------------------------
   📍 UPDATE LOCATION
------------------------------------------------------------ */
export const updateVendorLocation = async (req, res) => {
  try {
    console.log('\n📍 === UPDATE VENDOR LOCATION ===');
    const { userId, latitude, longitude } = req.body;
    console.log('👤 User ID:', userId);
    console.log('🌍 Coordinates:', { latitude, longitude });

    const user = await User.findOne({ user_id: userId });
    if (!user) {
      console.log('❌ Location update failed: User not found');
      return res.json({ success: false, message: "User not found" });
    }

    let address = "Address not found";
    try {
      const apiKey = process.env.OPENCAGE_API_KEY;
      const geoUrl = `https://api.opencagedata.com/geocode/v1/json?q=${latitude},${longitude}&key=${apiKey}`;
      console.log('🔍 Fetching address from coordinates...');
      const response = await axios.get(geoUrl);
      if (response.data.results.length > 0) {
        address = response.data.results[0].formatted;
        console.log('📍 Address found:', address);
      }
    } catch (err) {
      console.error("⚠️ Geocoding failed:", err.message);
    }

    user.location = { type: "Point", coordinates: [longitude, latitude] };
    user.address = address;
    user.isOnline = true;

    await user.save();

    console.log('✅ Location updated successfully for user:', user.user_id);
    console.log('📍 New address:', address);
    console.log('🟢 User is now online');
    
    // Send location confirmation notification
    if (user.fcmToken) {
      try {
        await sendNotification(
          user.fcmToken,
          "📍 Location Updated",
          `Your location has been set to: ${address}`,
          { type: "location_update", address }
        );
        console.log('📲 Location update notification sent via FCM');
      } catch (error) {
        console.log('⚠️  FCM notification failed:', error.message);
      }
    }
    
    console.log('='.repeat(50));

    return res.json({
      success: true,
      message: "Location updated",
      location: { latitude, longitude, address },
    });
  } catch (err) {
    console.error('❌ Update Location Error:', err.message);
    return res.json({ success: false, message: err.message });
  }
};

/* ------------------------------------------------------------
   💳 SUBSCRIPTION FUNCTIONS
------------------------------------------------------------ */
export const createDefaultPlans = async (req, res) => {
  try {
    const existing = await Plan.find();
    if (existing.length > 0) {
      return res.json({ message: "Plans already exist" });
    }

    await Plan.insertMany([
      { name: "Basic Plan", price: 199, duration: "1 month", features: ["Basic access", "Email support"] },
      { name: "Pro Plan", price: 499, duration: "3 months", features: ["Unlimited storage", "Priority support"] },
      { name: "Premium Plan", price: 999, duration: "1 year", features: ["24/7 support", "Custom features"] },
    ]);

    return res.json({ message: "Plans created successfully" });
  } catch (err) {
    return res.json({ success: false, message: err.message });
  }
};

export const getAllPlans = async (req, res) => {
  try {
    const plans = await Plan.find();
    return res.json({ success: true, data: plans });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getPlansByType = async (req, res) => {
  try {
    const { planType } = req.query;
    
    if (!planType) {
      return res.status(400).json({ 
        success: false, 
        message: "planType query parameter is required" 
      });
    }

    const plans = await Plan.find({ planType: planType });
    
    return res.json({ success: true, data: plans });
  } catch (err) {
    console.error("❌ Error in getPlansByType:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getPlanById = async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) return res.status(404).json({ message: "Plan not found" });

    return res.json(plan);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
