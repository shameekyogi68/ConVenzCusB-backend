# 📅 Customer Booking System Documentation

## Overview
Complete booking system with automatic vendor matching, distance calculation, OTP generation, and Firebase push notifications.

---

## 📊 Database Collections

### 1. **vendors**
```javascript
{
  vendor_id: Number (auto-increment),
  phone: Number (unique, required),
  name: String,
  email: String,
  selectedServices: [String], // Array of services offered
  location: {
    type: "Point",
    coordinates: [longitude, latitude]
  },
  address: String,
  fcmTokens: [String], // Multiple device tokens
  rating: Number (0-5),
  totalBookings: Number,
  completedBookings: Number,
  subscription: ObjectId (ref: Subscription)
}
```

### 2. **vendorpresences**
```javascript
{
  vendorId: Number (unique, ref: Vendor),
  online: Boolean,
  lastSeen: Date,
  currentLocation: {
    type: "Point",
    coordinates: [longitude, latitude]
  },
  currentAddress: String
}
```

### 3. **bookings** (Updated)
```javascript
{
  booking_id: Number (auto-increment),
  userId: Number (ref: User),
  vendorId: Number (ref: Vendor),
  selectedService: String,
  jobDescription: String,
  date: String,
  time: String,
  location: {
    type: "Point",
    coordinates: [longitude, latitude],
    address: String
  },
  status: "pending" | "accepted" | "rejected" | "completed" | "cancelled",
  otpStart: Number (4-digit, null until accepted),
  distance: Number (km),
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔌 API Endpoints

### 1. **Create Booking**
```
POST /api/booking/create
```

**Request Body:**
```json
{
  "userId": 1,
  "selectedService": "Plumber",
  "jobDescription": "Fix leaking pipe in kitchen",
  "date": "2025-12-05",
  "time": "10:00 AM",
  "location": {
    "latitude": 12.9716,
    "longitude": 77.5946,
    "address": "123 Main Street, Bangalore"
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Booking created and vendor notified",
  "bookingId": 42,
  "vendorFound": true,
  "vendor": {
    "id": 15,
    "name": "John's Plumbing",
    "distance": 2.5
  },
  "data": { /* Full booking object */ }
}
```

**Response (No Vendor Available):**
```json
{
  "success": true,
  "message": "Booking created but no vendor available at the moment",
  "bookingId": 42,
  "vendorFound": false,
  "data": { /* Full booking object */ }
}
```

---

### 2. **Update Booking Status** (Vendor Action)
```
PATCH /api/booking/update-status
```

**Request Body:**
```json
{
  "bookingId": 42,
  "vendorId": 15,
  "status": "accepted"  // "accepted" | "rejected" | "completed"
}
```

**Response (Accepted):**
```json
{
  "success": true,
  "message": "Booking accepted successfully",
  "otp": 1234,
  "data": { /* Full booking object with OTP */ }
}
```

**Response (Completed):**
```json
{
  "success": true,
  "message": "Booking completed successfully",
  "data": { /* Full booking object */ }
}
```

---

### 3. **Get User Bookings**
```
GET /api/booking/user/:userId
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "booking_id": 42,
      "userId": 1,
      "vendorId": 15,
      "selectedService": "Plumber",
      "status": "accepted",
      "otpStart": 1234,
      "vendor": {
        "id": 15,
        "name": "John's Plumbing",
        "phone": 9876543210,
        "rating": 4.5
      }
    }
  ]
}
```

---

### 4. **Get Vendor Bookings**
```
GET /api/booking/vendor/:vendorId
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "booking_id": 42,
      "selectedService": "Plumber",
      "status": "accepted",
      "customer": {
        "id": 1,
        "name": "Jane Doe",
        "phone": 9123456789
      }
    }
  ]
}
```

---

### 5. **Get Booking History**
```
GET /api/booking/history/:userId?status=completed
```

**Query Parameters:**
- `status` (optional): Filter by status (pending, accepted, rejected, completed, cancelled)

---

## 🔔 Firebase Push Notifications

### 1. **New Booking Request** (to Vendor)
```json
{
  "notification": {
    "title": "🔔 New Service Request",
    "body": "Jane Doe needs Plumber at 10:00 AM on 2025-12-05. Distance: 2.5km"
  },
  "data": {
    "type": "NEW_BOOKING",
    "bookingId": "42",
    "vendorId": "15",
    "userId": "1",
    "service": "Plumber",
    "date": "2025-12-05",
    "time": "10:00 AM",
    "address": "123 Main Street, Bangalore",
    "distance": "2.5",
    "customerName": "Jane Doe",
    "customerPhone": "9123456789"
  }
}
```

### 2. **Booking Confirmed** (to Customer)
```json
{
  "notification": {
    "title": "✅ Booking Confirmed",
    "body": "Your Plumber request has been sent to John's Plumbing. Waiting for vendor acceptance."
  },
  "data": {
    "type": "BOOKING_CONFIRMATION",
    "bookingId": "42",
    "vendorName": "John's Plumbing",
    "service": "Plumber"
  }
}
```

### 3. **Booking Accepted** (to Customer)
```json
{
  "notification": {
    "title": "✅ Booking Accepted!",
    "body": "John's Plumbing accepted your Plumber request. Your service OTP is 1234"
  },
  "data": {
    "type": "BOOKING_STATUS_UPDATE",
    "bookingId": "42",
    "status": "accepted",
    "otp": "1234",
    "vendorName": "John's Plumbing",
    "service": "Plumber",
    "date": "2025-12-05",
    "time": "10:00 AM"
  }
}
```

### 4. **Booking Rejected** (to Customer)
```json
{
  "notification": {
    "title": "❌ Booking Declined",
    "body": "John's Plumbing declined your Plumber request. We'll find you another vendor."
  },
  "data": {
    "type": "BOOKING_STATUS_UPDATE",
    "bookingId": "42",
    "status": "rejected",
    "service": "Plumber"
  }
}
```

### 5. **Booking Completed** (to Customer)
```json
{
  "notification": {
    "title": "🎉 Service Completed!",
    "body": "Your Plumber service has been completed by John's Plumbing. Thank you!"
  },
  "data": {
    "type": "BOOKING_STATUS_UPDATE",
    "bookingId": "42",
    "status": "completed",
    "service": "Plumber"
  }
}
```

---

## 🔧 System Logic

### Booking Creation Flow

1. **Customer submits booking request**
   - userId, selectedService, jobDescription, date, time, location

2. **System creates booking with status="pending"**
   - Saves to database with null vendorId and otpStart

3. **Vendor matching algorithm runs**
   - Finds online vendors (vendorpresences.online = true)
   - Filters by selectedServices matching request
   - Calculates distance from customer location
   - Filters vendors within 50km
   - Sorts by: distance → rating → experience
   - Selects best match

4. **System assigns vendor to booking**
   - Updates booking with vendorId and distance
   - Sends FCM notification to vendor (all fcmTokens)
   - Sends confirmation FCM to customer

5. **Customer receives booking confirmation**

---

### Vendor Response Flow

#### Scenario A: Vendor Accepts

1. **Vendor sends PATCH /api/booking/update-status**
   - bookingId, vendorId, status="accepted"

2. **System generates 4-digit OTP**
   - Random number 1000-9999
   - Saves to booking.otpStart

3. **System sends FCM notifications**
   - Customer: "Booking accepted! Your OTP is 1234"
   - Vendor: "Booking confirmed! Customer OTP: 1234"

4. **Customer receives OTP for service verification**

#### Scenario B: Vendor Rejects

1. **Vendor sends status="rejected"**

2. **System notifies customer**
   - FCM: "Vendor declined. Finding another vendor."

3. **System can re-run vendor matching** (optional feature)

#### Scenario C: Service Completed

1. **Vendor sends status="completed"**

2. **System updates vendor stats**
   - Increments totalBookings and completedBookings

3. **System sends completion notification to customer**

---

## 📏 Distance Calculation

Uses **Haversine formula** to calculate great-circle distance:

```javascript
import { calculateDistance } from "./utils/distanceCalculator.js";

const distance = calculateDistance(
  customerLat, customerLon,
  vendorLat, vendorLon
);
// Returns distance in kilometers (rounded to 2 decimals)
```

---

## 🎯 Vendor Matching Algorithm

### Priority Order:
1. **Distance** (primary): Closest vendors preferred
2. **Rating** (secondary): Higher-rated vendors if distance is similar (< 2km difference)
3. **Experience** (tertiary): More completed bookings if rating is similar

### Filters:
- Vendor must be **online** (vendorpresences.online = true)
- Vendor must offer the **selectedService**
- Vendor must be within **50km** (configurable)

---

## 🔐 Security Features

1. **Vendor Authorization**: Only assigned vendor can update booking status
2. **OTP Verification**: 4-digit OTP generated only after vendor accepts
3. **FCM Token Management**: Multiple tokens per vendor for multiple devices
4. **Invalid Token Cleanup**: Automatic removal of expired/invalid tokens

---

## 📊 Vendor Statistics

Auto-updated on booking completion:
- `totalBookings`: Increments on any booking assignment
- `completedBookings`: Increments only on status="completed"
- Used in vendor matching algorithm to prioritize experienced vendors

---

## 🚀 Testing

### Create Test Vendor:
```javascript
POST /api/vendor/create
{
  "phone": 9876543210,
  "name": "John's Plumbing",
  "selectedServices": ["Plumber", "Electrician"],
  "location": { "latitude": 12.9716, "longitude": 77.5946 },
  "fcmTokens": ["fcm_token_here"]
}
```

### Set Vendor Online:
```javascript
POST /api/vendor/presence/update
{
  "vendorId": 15,
  "online": true,
  "currentLocation": { "latitude": 12.9716, "longitude": 77.5946 }
}
```

### Create Test Booking:
```javascript
POST /api/booking/create
{
  "userId": 1,
  "selectedService": "Plumber",
  "jobDescription": "Fix leak",
  "date": "2025-12-05",
  "time": "10:00 AM",
  "location": {
    "latitude": 12.9800,
    "longitude": 77.6000,
    "address": "Test Address"
  }
}
```

---

## ⚠️ Important Notes

1. **No Harm to Existing Systems**: All existing OTP, user auth, and presence systems remain untouched
2. **FCM Required**: Vendor must have fcmTokens array for notifications
3. **Location Required**: Both customer and vendor need valid coordinates
4. **Service Matching**: selectedService must match exactly (case-sensitive)
5. **Distance Limit**: Default 50km, can be adjusted in vendorMatcher.js

---

## 📝 Error Handling

All endpoints include comprehensive error handling with detailed logs:
- ✅ Success operations logged with timestamps
- ❌ Errors logged with full context
- ⚠️ Warnings for non-critical issues (e.g., no FCM token)
- 📲 FCM notification success/failure tracking

---

## 🎉 Features Implemented

✅ Complete booking creation with vendor matching  
✅ Distance calculation using Haversine formula  
✅ Vendor matching algorithm with priority sorting  
✅ FCM push notifications at every stage  
✅ OTP generation on booking acceptance  
✅ Status updates (accepted, rejected, completed)  
✅ Vendor statistics auto-update  
✅ Multiple FCM tokens per vendor  
✅ Comprehensive error handling and logging  
✅ No changes to existing OTP/auth systems  

---

**Backend is production-ready! 🚀**
