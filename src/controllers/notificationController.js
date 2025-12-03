import User from "../models/userModel.js";
import { sendNotification, sendMultipleNotifications, sendTopicNotification } from "../utils/sendNotification.js";

/* ------------------------------------------------------------
   💾 UPDATE FCM TOKEN
------------------------------------------------------------ */
export const updateFcmToken = async (req, res) => {
  try {
    console.log('\n🔔 === UPDATE FCM TOKEN ===');
    console.log('⏰ Timestamp:', new Date().toISOString());
    const { userId, fcmToken } = req.body;

    if (!userId || !fcmToken) {
      console.log('❌ Missing userId or fcmToken');
      return res.status(400).json({ 
        success: false, 
        message: "userId and fcmToken are required" 
      });
    }

    console.log('👤 User ID:', userId);
    console.log('🔑 FCM Token (full):', fcmToken);
    console.log('📏 Token length:', fcmToken.length, 'characters');

    const user = await User.findOne({ user_id: userId });

    if (!user) {
      console.log('❌ User not found for userId:', userId);
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    // Check if token is already used by another user (prevent duplicates)
    const existingUser = await User.findOne({ fcmToken: fcmToken, user_id: { $ne: userId } });
    if (existingUser) {
      console.log('⚠️  Token already exists for another user:', existingUser.user_id);
      console.log('🔄 Removing token from previous user');
      existingUser.fcmToken = null;
      await existingUser.save();
    }

    const oldToken = user.fcmToken;
    user.fcmToken = fcmToken;
    await user.save();

    console.log('✅ FCM token updated successfully for user:', user.user_id);
    console.log('📱 Phone:', user.phone);
    console.log('👤 Name:', user.name || 'Not set');
    if (oldToken && oldToken !== fcmToken) {
      console.log('🔄 Token changed from:', oldToken.substring(0, 20) + '...');
    } else if (!oldToken) {
      console.log('🆕 First time token registration');
    } else {
      console.log('🔄 Token refreshed (same token)');
    }
    console.log('='.repeat(50));

    return res.json({ 
      success: true, 
      message: "FCM token updated successfully" 
    });
  } catch (err) {
    console.error('❌ Update FCM Token Error:', err.message);
    console.error('⚠️  Stack:', err.stack);
    return res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

/* ------------------------------------------------------------
   📤 SEND NOTIFICATION TO USER
------------------------------------------------------------ */
export const sendNotificationToUser = async (req, res) => {
  try {
    console.log('\n📤 === SEND NOTIFICATION TO USER ===');
    const { userId, title, body, data } = req.body;

    if (!userId || !title || !body) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ 
        success: false, 
        message: "userId, title, and body are required" 
      });
    }

    console.log('👤 Target User ID:', userId);
    console.log('📨 Title:', title);
    console.log('📝 Body:', body);

    // Get user's FCM token
    const user = await User.findOne({ user_id: userId });

    if (!user) {
      console.log('❌ User not found');
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    if (!user.fcmToken) {
      console.log('❌ User has no FCM token');
      return res.status(400).json({ 
        success: false, 
        message: "User has no FCM token registered" 
      });
    }

    console.log('🔑 Sending to FCM token:', user.fcmToken.substring(0, 20) + '...');

    // Send notification using utility function
    try {
      const response = await sendNotification(user.fcmToken, title, body, data || {});
      
      console.log('✅ Notification sent successfully');
      console.log('📬 Message ID:', response);
      console.log('='.repeat(50));

      return res.json({ 
        success: true, 
        message: "Notification sent successfully",
        messageId: response
      });
    } catch (notificationError) {
      // If token is invalid/expired, remove it from database
      if (notificationError.message.includes('Invalid or expired FCM token') ||
          notificationError.message.includes('FCM entity not found')) {
        console.log('🗑️  Removing invalid FCM token from database');
        user.fcmToken = null;
        await user.save();
        
        return res.status(400).json({
          success: false,
          message: "FCM token is invalid or expired. User needs to re-register for notifications.",
          tokenRemoved: true
        });
      }
      throw notificationError;
    }
  } catch (err) {
    console.error('❌ Send Notification Error:', err.message);
    return res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

/* ------------------------------------------------------------
   📤 SEND NOTIFICATION TO MULTIPLE USERS
------------------------------------------------------------ */
export const sendNotificationToMultipleUsers = async (req, res) => {
  try {
    console.log('\n📤 === SEND NOTIFICATION TO MULTIPLE USERS ===');
    const { userIds, title, body, data } = req.body;

    if (!userIds || !Array.isArray(userIds) || !title || !body) {
      console.log('❌ Missing required fields or invalid userIds array');
      return res.status(400).json({ 
        success: false, 
        message: "userIds (array), title, and body are required" 
      });
    }

    console.log('👥 Target User IDs:', userIds);
    console.log('📨 Title:', title);
    console.log('📝 Body:', body);

    // Get all users' FCM tokens
    const users = await User.find({ 
      user_id: { $in: userIds },
      fcmToken: { $ne: null }
    });

    if (users.length === 0) {
      console.log('❌ No users found with FCM tokens');
      return res.status(404).json({ 
        success: false, 
        message: "No users found with FCM tokens" 
      });
    }

    console.log(`✅ Found ${users.length} users with FCM tokens`);

    const tokens = users.map(user => user.fcmToken);

    // Send notifications using utility function
    const response = await sendMultipleNotifications(tokens, title, body, data || {});
    
    console.log('✅ Notifications sent');
    console.log(`📊 Success: ${response.successCount}, Failed: ${response.failureCount}`);
    
    // Clean up invalid tokens from database
    if (response.failureCount > 0) {
      const invalidTokenIndexes = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success && 
            (resp.error?.code === 'messaging/registration-token-not-registered' ||
             resp.error?.code === 'messaging/invalid-registration-token')) {
          invalidTokenIndexes.push(idx);
        }
      });
      
      if (invalidTokenIndexes.length > 0) {
        console.log(`🗑️  Removing ${invalidTokenIndexes.length} invalid tokens from database`);
        const invalidUserIds = invalidTokenIndexes.map(idx => users[idx].user_id);
        await User.updateMany(
          { user_id: { $in: invalidUserIds } },
          { $set: { fcmToken: null } }
        );
        console.log('✅ Invalid tokens removed');
      }
    }
    
    console.log('='.repeat(50));

    return res.json({ 
      success: true, 
      message: "Notifications sent",
      successCount: response.successCount,
      failureCount: response.failureCount,
      invalidTokensRemoved: response.failureCount
    });
  } catch (err) {
    console.error('❌ Send Multiple Notifications Error:', err.message);
    return res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};

/* ------------------------------------------------------------
   📤 SEND NOTIFICATION TO TOPIC
------------------------------------------------------------ */
export const sendNotificationToTopic = async (req, res) => {
  try {
    console.log('\n📤 === SEND NOTIFICATION TO TOPIC ===');
    const { topic, title, body, data } = req.body;

    if (!topic || !title || !body) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ 
        success: false, 
        message: "topic, title, and body are required" 
      });
    }

    console.log('📢 Topic:', topic);
    console.log('📨 Title:', title);
    console.log('📝 Body:', body);

    // Send notification using utility function
    const response = await sendTopicNotification(topic, title, body, data || {});
    
    console.log('✅ Topic notification sent successfully');
    console.log('📬 Message ID:', response);
    console.log('='.repeat(50));

    return res.json({ 
      success: true, 
      message: "Topic notification sent successfully",
      messageId: response
    });
  } catch (err) {
    console.error('❌ Send Topic Notification Error:', err.message);
    return res.status(500).json({ 
      success: false, 
      message: err.message 
    });
  }
};
