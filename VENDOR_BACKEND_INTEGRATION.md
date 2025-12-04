# 🔗 Vendor Backend Integration Guide

## What Your Vendor Backend Needs to Implement

### Endpoint: `POST /vendor/api/new-booking`

This endpoint receives booking notifications from the customer backend.

---

## 📥 Request from Customer Backend

### Headers
```
Content-Type: application/json
X-API-Source: customer-backend
```

### Request Body
```json
{
  "bookingId": 1,
  "vendorId": 5,
  "customerId": 1,
  "customerName": "John Doe",
  "customerPhone": 9876543210,
  "service": "Plumbing",
  "jobDescription": "Kitchen sink is leaking",
  "date": "2025-12-10",
  "time": "10:00 AM",
  "location": {
    "latitude": 12.9716,
    "longitude": 77.5946,
    "address": "123 Main Street, Bangalore"
  },
  "distance": 2.5,
  "createdAt": "2025-12-04T10:30:00.000Z"
}
```

---

## 📤 Expected Response from Vendor Backend

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Booking received",
  "vendorNotified": true,
  "bookingId": 1
}
```

### Error Response (4xx/5xx)
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

---

## 🎯 What Vendor Backend Should Do

1. **Receive the booking data**
2. **Store in vendor's database** (optional)
3. **Send push notification to vendor's device** via FCM
4. **Return success response** to customer backend

---

## 💻 Sample Implementation (Node.js/Express)

```javascript
import express from "express";
import admin from "firebase-admin";

const router = express.Router();

// POST /vendor/api/new-booking
router.post("/new-booking", async (req, res) => {
  try {
    const {
      bookingId,
      vendorId,
      customerId,
      customerName,
      customerPhone,
      service,
      jobDescription,
      date,
      time,
      location,
      distance,
      createdAt
    } = req.body;

    console.log(`📥 New booking received: ${bookingId} for vendor: ${vendorId}`);

    // 1. Find vendor in your database
    const vendor = await Vendor.findOne({ vendorId });
    
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found"
      });
    }

    // 2. Send FCM notification to vendor
    if (vendor.fcmToken) {
      const notification = {
        title: "🔔 New Service Request",
        body: `${customerName} needs ${service} on ${date} at ${time}. Distance: ${distance}km`,
      };

      const data = {
        type: "NEW_BOOKING",
        bookingId: String(bookingId),
        customerId: String(customerId),
        customerName,
        customerPhone: String(customerPhone),
        service,
        date,
        time,
        address: location.address,
        distance: String(distance),
      };

      await admin.messaging().send({
        token: vendor.fcmToken,
        notification,
        data,
        android: { priority: "high" },
        apns: { headers: { "apns-priority": "10" } }
      });

      console.log(`✅ Vendor ${vendorId} notified via FCM`);
    }

    // 3. Optional: Store booking in vendor's local database
    await VendorBooking.create({
      bookingId,
      customerId,
      customerName,
      customerPhone,
      service,
      jobDescription,
      date,
      time,
      location,
      distance,
      status: "pending"
    });

    // 4. Return success response
    return res.status(200).json({
      success: true,
      message: "Booking received",
      vendorNotified: true,
      bookingId
    });

  } catch (error) {
    console.error("❌ Error processing booking:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
});

export default router;
```

---

## 🔐 Security Recommendations

1. **Validate the request source**
   ```javascript
   if (req.headers['x-api-source'] !== 'customer-backend') {
     return res.status(403).json({ message: "Unauthorized" });
   }
   ```

2. **Add API key authentication**
   ```javascript
   const API_KEY = process.env.CUSTOMER_BACKEND_API_KEY;
   if (req.headers['x-api-key'] !== API_KEY) {
     return res.status(401).json({ message: "Invalid API key" });
   }
   ```

3. **Verify vendor exists before processing**

4. **Log all requests for debugging**

---

## 🧪 Testing the Integration

### 1. Start Vendor Backend
```bash
cd vendor-backend
npm start
```

### 2. Set Customer Backend URL
In customer backend `.env`:
```env
VENDOR_BACKEND_URL=http://localhost:3000
```

### 3. Create Test Booking
```bash
curl -X POST http://localhost:5005/api/user/booking/create \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "selectedService": "Plumbing",
    "jobDescription": "Fix leak",
    "date": "2025-12-10",
    "time": "10:00 AM",
    "location": {
      "latitude": 12.9716,
      "longitude": 77.5946,
      "address": "Bangalore"
    }
  }'
```

### 4. Check Vendor Backend Logs
You should see:
```
📥 New booking received: 1 for vendor: 5
✅ Vendor 5 notified via FCM
```

---

## 📱 Vendor App Should Handle

When the vendor app receives the FCM notification:

1. **Show notification** with customer details
2. **Navigate to booking screen** when tapped
3. **Display booking details:**
   - Customer name & phone
   - Service requested
   - Date & time
   - Location with map
   - Distance from vendor
4. **Show action buttons:**
   - Accept Booking
   - Reject Booking
5. **On Accept:** 
   - Call customer backend: `POST /api/booking/accept`
   - Generate OTP
   - Show OTP to vendor
6. **On Reject:**
   - Call customer backend: `POST /api/booking/reject`
   - Notify customer

---

## 🔄 Complete Flow Diagram

```
Customer App (Flutter)
    |
    | POST /api/user/booking/create
    ↓
Customer Backend (Node.js)
    |
    | 1. Create booking
    | 2. Find best vendor
    | 3. POST /vendor/api/new-booking
    ↓
Vendor Backend (Node.js)
    |
    | 1. Receive booking
    | 2. Send FCM to vendor app
    | 3. Return success
    ↓
Vendor App (Flutter)
    |
    | 1. Receive FCM notification
    | 2. Show booking details
    | 3. Accept/Reject
    ↓
Customer Backend
    |
    | 1. Update booking status
    | 2. Notify customer
    ↓
Customer App
    |
    | Show booking status
```

---

## ✅ Checklist for Vendor Backend

- [ ] Endpoint created: `POST /vendor/api/new-booking`
- [ ] Firebase Admin SDK initialized
- [ ] Vendor lookup by vendorId implemented
- [ ] FCM notification sending implemented
- [ ] Success response returned
- [ ] Error handling added
- [ ] Request logging added
- [ ] API deployed to Render
- [ ] URL added to customer backend .env
- [ ] Integration tested end-to-end

---

## 🚨 Common Issues & Solutions

### Issue 1: "Vendor backend not reachable"
**Solution:** Check VENDOR_BACKEND_URL in customer backend .env

### Issue 2: "Vendor not found"
**Solution:** Ensure vendorId from vendor presence matches vendor database

### Issue 3: "FCM notification not sent"
**Solution:** Verify vendor has valid FCM token in database

### Issue 4: "Timeout after 10 seconds"
**Solution:** Optimize vendor backend response time, ensure it responds within 10s

---

## 📞 Support

If you need help implementing the vendor backend endpoint:
1. Check this guide
2. Review sample code above
3. Test with provided curl command
4. Verify Firebase configuration

---

**Customer Backend is ready. Now implement vendor backend endpoint to complete the integration!**
