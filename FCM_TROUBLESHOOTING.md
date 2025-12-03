# FCM Notification Troubleshooting Guide

## ⚠️ Error: "Requested entity was not found"

This error occurs when Firebase Cloud Messaging cannot find the registration token. Here are the main causes and solutions:

### Common Causes

1. **Invalid or Expired FCM Token**
   - Token was invalidated when user uninstalled/reinstalled the app
   - Token expired due to app update or long inactivity
   - **Solution**: App needs to re-register for FCM and update the token on your backend

2. **Firebase Project Mismatch**
   - The FCM token was generated from a different Firebase project
   - Your `firebase-service-account.json` doesn't match the app's Firebase project
   - **Solution**: Verify project_id in service account matches your app's Firebase project
   - Current project: `convenz-customer-dfce7`

3. **Deleted App Instance**
   - The Firebase app instance was deleted from Firebase Console
   - **Solution**: Re-register the app in Firebase Console

### Implemented Fixes

The following improvements have been made to handle these errors gracefully:

#### 1. Enhanced Error Handling
- Detailed error logging with error codes
- Specific error messages for different failure types
- Automatic detection of invalid/expired tokens

#### 2. Automatic Token Cleanup
- Invalid tokens are automatically removed from the database
- Prevents repeated attempts to send to bad tokens
- Clean database with only valid tokens

#### 3. Data Validation
- All data payload values are converted to strings (FCM requirement)
- Proper message formatting to prevent payload errors

#### 4. Batch Notification Improvements
- Individual error tracking for each token in batch sends
- Detailed logging of which tokens failed and why
- Automatic cleanup of all invalid tokens after batch sends

### How to Fix on Mobile App Side

If users are getting this error, they need to:

```dart
// 1. Get new FCM token
String? newToken = await FirebaseMessaging.instance.getToken();

// 2. Update token on backend
await api.updateFcmToken(userId: currentUser.id, fcmToken: newToken);

// 3. Listen for token refresh
FirebaseMessaging.instance.onTokenRefresh.listen((newToken) {
  api.updateFcmToken(userId: currentUser.id, fcmToken: newToken);
});
```

### Testing FCM Tokens

You can now validate tokens before sending notifications:

```javascript
import { validateFcmToken } from './src/utils/sendNotification.js';

const isValid = await validateFcmToken(userFcmToken);
if (!isValid) {
  // Remove or update token
  user.fcmToken = null;
  await user.save();
}
```

### API Endpoints

#### Update FCM Token
```
POST /api/notifications/update-fcm-token
Body: {
  "userId": "user123",
  "fcmToken": "fcm_token_here"
}
```

#### Send Notification to User
```
POST /api/notifications/send
Body: {
  "userId": "user123",
  "title": "Hello",
  "body": "Test notification",
  "data": {
    "orderId": "123"
  }
}
```

### Response Handling

When a token is invalid, the API will return:

```json
{
  "success": false,
  "message": "FCM token is invalid or expired. User needs to re-register for notifications.",
  "tokenRemoved": true
}
```

The app should handle this by requesting a new token and re-registering.

### Verify Firebase Configuration

Check your `firebase-service-account.json`:
- ✅ project_id: `convenz-customer-dfce7`
- ✅ client_email: `firebase-adminsdk-fbsvc@convenz-customer-dfce7.iam.gserviceaccount.com`
- ✅ Ensure this matches your app's Firebase project in Firebase Console

### Prevention Tips

1. **Implement token refresh listener** in your mobile app
2. **Handle app reinstalls** by always checking and updating token on app start
3. **Monitor notification success rates** to catch issues early
4. **Use the validation endpoint** before sending important notifications
5. **Keep service account credentials secure** and up to date

### Debug Mode

To see detailed FCM logs, check the server console output:
- 🔥 = Success
- ❌ = Error
- ⚠️ = Warning
- 🚫 = Invalid token
- 🗑️ = Token removed from database
- 💡 = Helpful suggestions

### Still Having Issues?

1. Verify the Firebase project ID matches between app and backend
2. Check Firebase Console for app registration status
3. Ensure the service account has proper permissions in Firebase
4. Test with a fresh token from a newly installed app
5. Check if FCM is enabled in Firebase Console
