import admin from "../config/firebase.js";

/**
 * Send push notification to a single device
 * @param {string} token - FCM device token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data payload (optional)
 * @returns {Promise<string>} - Message ID on success
 */
export const sendNotification = async (token, title, body, data = {}) => {
  try {
    // Convert all data values to strings as FCM requires
    const stringData = {};
    if (data && Object.keys(data).length > 0) {
      Object.keys(data).forEach(key => {
        stringData[key] = String(data[key]);
      });
    }
    stringData.clickAction = stringData.clickAction || "FLUTTER_NOTIFICATION_CLICK";

    const message = {
      token,
      notification: {
        title,
        body,
      },
      data: stringData,
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "default",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log("🔥 Notification sent successfully:", response);
    return response;
  } catch (error) {
    console.error("❌ Failed to send notification:", error.message);
    console.error("⚠️  Error code:", error.code);
    
    // Handle specific FCM errors
    if (error.code === 'messaging/registration-token-not-registered' || 
        error.code === 'messaging/invalid-registration-token') {
      console.error("🚫 Token is invalid or expired. The app may need to re-register for FCM.");
      throw new Error(`Invalid or expired FCM token: ${error.message}`);
    } else if (error.code === 'messaging/invalid-argument') {
      console.error("🚫 Invalid message payload. Check that all data values are strings.");
      throw new Error(`Invalid FCM message format: ${error.message}`);
    } else if (error.message.includes('Requested entity was not found')) {
      console.error("🚫 FCM project mismatch or token from deleted app instance.");
      console.error("💡 Solutions:");
      console.error("   1. Verify firebase-service-account.json matches your app's Firebase project");
      console.error("   2. Check if the app instance was deleted and needs to re-register");
      console.error("   3. Ensure the FCM token is from the correct Firebase project");
      throw new Error(`FCM entity not found: Token may be from wrong project or deleted app instance`);
    }
    
    throw error;
  }
};

/**
 * Send push notification to multiple devices
 * @param {string[]} tokens - Array of FCM device tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data payload (optional)
 * @returns {Promise<object>} - Batch response with success/failure counts
 */
export const sendMultipleNotifications = async (tokens, title, body, data = {}) => {
  try {
    // Convert all data values to strings as FCM requires
    const stringData = {};
    if (data && Object.keys(data).length > 0) {
      Object.keys(data).forEach(key => {
        stringData[key] = String(data[key]);
      });
    }
    stringData.clickAction = stringData.clickAction || "FLUTTER_NOTIFICATION_CLICK";

    const message = {
      notification: {
        title,
        body,
      },
      data: stringData,
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "default",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
          },
        },
      },
      tokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`🔥 Sent to ${response.successCount}/${tokens.length} devices`);
    
    if (response.failureCount > 0) {
      console.log(`⚠️  Failed to send to ${response.failureCount} devices`);
      
      // Log details about failed tokens
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error(`   ❌ Token ${idx + 1}: ${resp.error?.code} - ${resp.error?.message}`);
          if (resp.error?.code === 'messaging/registration-token-not-registered' ||
              resp.error?.code === 'messaging/invalid-registration-token') {
            console.error(`      🚫 Token ${tokens[idx].substring(0, 20)}... is invalid/expired`);
          }
        }
      });
    }

    return response;
  } catch (error) {
    console.error("❌ Failed to send multiple notifications:", error.message);
    console.error("⚠️  Error code:", error.code);
    throw error;
  }
};

/**
 * Send push notification to a topic
 * @param {string} topic - FCM topic name
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data payload (optional)
 * @returns {Promise<string>} - Message ID on success
 */
export const sendTopicNotification = async (topic, title, body, data = {}) => {
  try {
    // Convert all data values to strings as FCM requires
    const stringData = {};
    if (data && Object.keys(data).length > 0) {
      Object.keys(data).forEach(key => {
        stringData[key] = String(data[key]);
      });
    }
    stringData.clickAction = stringData.clickAction || "FLUTTER_NOTIFICATION_CLICK";

    const message = {
      topic,
      notification: {
        title,
        body,
      },
      data: stringData,
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "default",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log(`🔥 Notification sent to topic "${topic}":`, response);
    return response;
  } catch (error) {
    console.error(`❌ Failed to send notification to topic "${topic}":`, error.message);
    console.error("⚠️  Error code:", error.code);
    throw error;
  }
};

/**
 * Validate if an FCM token is valid by sending a test message (dry run)
 * @param {string} token - FCM device token to validate
 * @returns {Promise<boolean>} - True if valid, false if invalid
 */
export const validateFcmToken = async (token) => {
  try {
    const message = {
      token,
      notification: {
        title: "Test",
        body: "Validation",
      },
      data: {
        test: "true",
      },
    };

    // Use dryRun mode to validate without actually sending
    await admin.messaging().send(message, true);
    console.log("✅ FCM token is valid");
    return true;
  } catch (error) {
    if (error.code === 'messaging/registration-token-not-registered' || 
        error.code === 'messaging/invalid-registration-token' ||
        error.message.includes('Requested entity was not found')) {
      console.log("❌ FCM token is invalid or expired");
      return false;
    }
    // For other errors, assume token might be valid
    console.warn("⚠️  Could not validate token:", error.message);
    return true;
  }
};
