# 🚀 Quick Reference - Customer Booking System

## 📞 Core API Calls

### 1. Create Booking (Customer)
```bash
POST https://your-backend.onrender.com/api/booking/create

{
  "userId": 1,
  "selectedService": "Plumber",
  "jobDescription": "Fix kitchen sink leak",
  "date": "2025-12-10",
  "time": "2:00 PM",
  "location": {
    "latitude": 12.9716,
    "longitude": 77.5946,
    "address": "123 Main St, Bangalore"
  }
}
```
**→ Returns:** `bookingId`, vendor details, status

---

### 2. Update Status (Vendor)
```bash
PATCH https://your-backend.onrender.com/api/booking/update-status

{
  "bookingId": 42,
  "vendorId": 15,
  "status": "accepted"  // or "rejected", "completed"
}
```
**→ Returns:** OTP (if accepted), updated booking

---

### 3. Get User Bookings
```bash
GET https://your-backend.onrender.com/api/booking/user/1
```
**→ Returns:** Array of bookings with vendor details

---

### 4. Get Vendor Bookings
```bash
GET https://your-backend.onrender.com/api/booking/vendor/15
```
**→ Returns:** Array of bookings with customer details

---

## 🔔 FCM Notification Types

| Type | To | Trigger |
|------|----|---------| 
| `NEW_BOOKING` | Vendor | Customer creates booking |
| `BOOKING_CONFIRMATION` | Customer | Vendor assigned |
| `BOOKING_STATUS_UPDATE` (accepted) | Customer | Vendor accepts |
| `BOOKING_STATUS_UPDATE` (rejected) | Customer | Vendor rejects |
| `BOOKING_STATUS_UPDATE` (completed) | Customer | Service completed |

---

## 📊 Booking Status Flow

```
pending → accepted → completed
          ↓
        rejected
```

---

## 🎯 Vendor Matching Logic

1. **Filter:** Online vendors offering the service
2. **Calculate:** Distance from customer
3. **Filter:** Within 50km radius
4. **Sort by:**
   - Distance (closest first)
   - Rating (if distance similar)
   - Experience (completed bookings)
5. **Select:** Best match

---

## 🔐 OTP Generation

- **When:** Vendor accepts booking
- **Format:** 4-digit random (1000-9999)
- **Stored in:** `booking.otpStart`
- **Sent to:** Customer via FCM

---

## 📏 Distance Calculation

Uses **Haversine formula**:
```javascript
const distance = calculateDistance(
  customerLat, customerLon,
  vendorLat, vendorLon
);
// Returns: kilometers (e.g., 2.5)
```

---

## 🗃️ Required Collections

1. **users** - Customer data
2. **vendors** - Vendor profiles + services
3. **vendorpresences** - Online status
4. **bookings** - Service requests

---

## ⚡ Quick Test Flow

1. Create vendor in MongoDB
2. Set vendor online in vendorpresences
3. Customer calls `/booking/create`
4. Vendor receives FCM notification
5. Vendor calls `/booking/update-status` with "accepted"
6. Customer receives OTP via FCM
7. Service happens...
8. Vendor calls `/booking/update-status` with "completed"
9. Customer receives completion notification

---

## 🛠️ Environment Check

Required env vars (already configured):
- ✅ `MONGODB_URI`
- ✅ `FIREBASE_SERVICE_ACCOUNT_PATH`
- ✅ `PORT` (5005)
- ✅ `NODE_ENV` (production)

---

## 📱 Flutter Integration Points

### Customer App Needs:
1. Call `/booking/create` when user books service
2. Listen for FCM notifications (OTP, status updates)
3. Display booking list from `/booking/user/:userId`

### Vendor App Needs:
1. Call `/booking/vendor/:vendorId` to see requests
2. Call `/booking/update-status` to accept/reject
3. Listen for FCM notifications (new bookings)
4. Call `/booking/update-status` with "completed" when done

---

## 🚨 Error Codes

| Code | Meaning |
|------|---------|
| 400 | Missing fields or invalid data |
| 403 | Not authorized (wrong vendor) |
| 404 | Booking/User/Vendor not found |
| 500 | Server error (check logs) |

---

## 📝 Logging Format

All operations logged with:
- ✅ Success: `BOOKING_CREATED`, `VENDOR_ASSIGNED`
- ❌ Errors: `CREATE_BOOKING_ERROR`
- ⚠️ Warnings: `NO_VENDOR_AVAILABLE`
- 📲 Notifications: `VENDOR_NOTIFIED`, `CUSTOMER_NOTIFIED`

---

## 🎉 You're All Set!

Backend deployed at: **Your Render URL**

Full docs: `BOOKING_SYSTEM_DOCS.md`

Happy coding! 🚀
