# 📱 Flutter Frontend Requirements - Customer Booking System

## 🎯 Overview
Your Flutter app needs to integrate with the new booking system to create service requests, receive notifications, and track booking status.

---

## 📦 Required Packages

Add to `pubspec.yaml`:
```yaml
dependencies:
  http: ^1.1.0                    # API calls
  firebase_messaging: ^14.7.9     # Push notifications
  geolocator: ^10.1.0            # Location services
  geocoding: ^2.1.1              # Address from coordinates
  provider: ^6.1.1               # State management (if not already added)
```

---

## 🔐 1. FCM Token Management (ALREADY SHOULD EXIST)

### Ensure FCM Token is Sent During Registration

**File:** `lib/services/auth_service.dart` (or wherever you handle registration)

```dart
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class AuthService {
  static const String baseUrl = 'https://your-backend.onrender.com/api';
  
  Future<Map<String, dynamic>> register(String phone) async {
    // Get FCM token BEFORE calling API
    String? fcmToken = await FirebaseMessaging.instance.getToken();
    
    final response = await http.post(
      Uri.parse('$baseUrl/user/register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'phone': phone,
        'fcmToken': fcmToken,  // ⚠️ CRITICAL: Include this!
      }),
    );
    
    return jsonDecode(response.body);
  }
}
```

---

## 📍 2. Location Services Setup

### Get User's Current Location with Address

**File:** `lib/services/location_service.dart`

```dart
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';

class LocationService {
  
  // Request location permissions
  Future<bool> requestPermission() async {
    LocationPermission permission = await Geolocator.checkPermission();
    
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    
    return permission == LocationPermission.always || 
           permission == LocationPermission.whileInUse;
  }
  
  // Get current position with address
  Future<Map<String, dynamic>?> getCurrentLocationWithAddress() async {
    try {
      // Check/request permission
      bool hasPermission = await requestPermission();
      if (!hasPermission) {
        throw Exception('Location permission denied');
      }
      
      // Get coordinates
      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      
      // Get address from coordinates
      List<Placemark> placemarks = await placemarkFromCoordinates(
        position.latitude,
        position.longitude,
      );
      
      if (placemarks.isEmpty) {
        throw Exception('Could not get address');
      }
      
      Placemark place = placemarks[0];
      
      // Clean and format address
      String address = _buildCleanAddress(place);
      
      return {
        'latitude': position.latitude,
        'longitude': position.longitude,
        'address': address,
      };
      
    } catch (e) {
      print('Error getting location: $e');
      return null;
    }
  }
  
  // Build clean address string
  String _buildCleanAddress(Placemark place) {
    List<String> parts = [];
    
    if (place.street != null && place.street!.isNotEmpty) {
      parts.add(place.street!);
    }
    if (place.subLocality != null && place.subLocality!.isNotEmpty) {
      parts.add(place.subLocality!);
    }
    if (place.locality != null && place.locality!.isNotEmpty) {
      parts.add(place.locality!);
    }
    if (place.postalCode != null && place.postalCode!.isNotEmpty) {
      parts.add(place.postalCode!);
    }
    
    return parts.join(', ');
  }
}
```

---

## 📅 3. Booking API Service

### Create Booking Service for API Calls

**File:** `lib/services/booking_service.dart`

```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

class BookingService {
  static const String baseUrl = 'https://your-backend.onrender.com/api/booking';
  
  // Create a new booking
  Future<Map<String, dynamic>> createBooking({
    required int userId,
    required String selectedService,
    required String jobDescription,
    required String date,
    required String time,
    required double latitude,
    required double longitude,
    required String address,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/create'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'userId': userId,
          'selectedService': selectedService,
          'jobDescription': jobDescription,
          'date': date,
          'time': time,
          'location': {
            'latitude': latitude,
            'longitude': longitude,
            'address': address,
          },
        }),
      );
      
      if (response.statusCode == 201 || response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to create booking: ${response.body}');
      }
    } catch (e) {
      print('Error creating booking: $e');
      rethrow;
    }
  }
  
  // Get user's bookings
  Future<List<dynamic>> getUserBookings(int userId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/user/$userId'),
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['data'] ?? [];
      } else {
        throw Exception('Failed to get bookings');
      }
    } catch (e) {
      print('Error getting bookings: $e');
      return [];
    }
  }
  
  // Get booking history with optional status filter
  Future<List<dynamic>> getBookingHistory(int userId, {String? status}) async {
    try {
      String url = '$baseUrl/history/$userId';
      if (status != null) {
        url += '?status=$status';
      }
      
      final response = await http.get(Uri.parse(url));
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['data'] ?? [];
      } else {
        throw Exception('Failed to get history');
      }
    } catch (e) {
      print('Error getting history: $e');
      return [];
    }
  }
}
```

---

## 🔔 4. FCM Notification Handling

### Handle Booking Notifications

**File:** `lib/services/notification_service.dart`

```dart
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';

class NotificationService {
  final FirebaseMessaging _fcm = FirebaseMessaging.instance;
  
  // Initialize FCM
  Future<void> initialize() async {
    // Request permission
    NotificationSettings settings = await _fcm.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    
    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      print('User granted permission');
      
      // Get token
      String? token = await _fcm.getToken();
      print('FCM Token: $token');
      
      // Setup handlers
      _setupForegroundHandler();
      _setupBackgroundHandler();
    }
  }
  
  // Handle foreground notifications
  void _setupForegroundHandler() {
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      print('Foreground message received: ${message.data}');
      
      String? type = message.data['type'];
      
      if (type == 'BOOKING_CONFIRMATION') {
        _handleBookingConfirmation(message.data);
      } else if (type == 'BOOKING_STATUS_UPDATE') {
        _handleBookingStatusUpdate(message.data);
      } else if (type == 'otp') {
        _handleOTPNotification(message.data);
      }
      
      // Show in-app notification
      _showNotification(
        message.notification?.title ?? 'Notification',
        message.notification?.body ?? '',
      );
    });
  }
  
  // Setup background handler (must be top-level function)
  static Future<void> backgroundHandler(RemoteMessage message) async {
    print('Background message: ${message.data}');
  }
  
  void _setupBackgroundHandler() {
    FirebaseMessaging.onBackgroundMessage(backgroundHandler);
    
    // Handle notification tap (app opened from notification)
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      print('Notification tapped: ${message.data}');
      _handleNotificationTap(message.data);
    });
  }
  
  // Handle booking confirmation
  void _handleBookingConfirmation(Map<String, dynamic> data) {
    String bookingId = data['bookingId'] ?? '';
    String vendorName = data['vendorName'] ?? 'Vendor';
    
    print('Booking $bookingId confirmed with $vendorName');
    // Update UI, show dialog, etc.
  }
  
  // Handle booking status update
  void _handleBookingStatusUpdate(Map<String, dynamic> data) {
    String bookingId = data['bookingId'] ?? '';
    String status = data['status'] ?? '';
    String? otp = data['otp'];
    
    print('Booking $bookingId status: $status');
    
    if (status == 'accepted' && otp != null) {
      print('⚠️ IMPORTANT: Your service OTP is $otp');
      // Show prominent dialog with OTP
      _showOTPDialog(otp, bookingId);
    } else if (status == 'rejected') {
      print('Booking $bookingId was rejected');
      // Show rejection message
    } else if (status == 'completed') {
      print('Service completed for booking $bookingId');
      // Show completion message, request rating
    }
  }
  
  // Handle OTP notification
  void _handleOTPNotification(Map<String, dynamic> data) {
    String otp = data['otp'] ?? '';
    print('Login OTP received: $otp');
  }
  
  // Show in-app notification
  void _showNotification(String title, String body) {
    // Implement using SnackBar, Toast, or custom overlay
    print('Notification: $title - $body');
  }
  
  // Show OTP dialog
  void _showOTPDialog(String otp, String bookingId) {
    // Implement dialog to show OTP prominently
    print('Show OTP Dialog: $otp for booking $bookingId');
  }
  
  // Handle notification tap
  void _handleNotificationTap(Map<String, dynamic> data) {
    String? type = data['type'];
    
    if (type == 'BOOKING_STATUS_UPDATE' || type == 'BOOKING_CONFIRMATION') {
      String? bookingId = data['bookingId'];
      // Navigate to booking details screen
      print('Navigate to booking: $bookingId');
    }
  }
}
```

---

## 🎨 5. Booking Creation UI

### Create Booking Screen

**File:** `lib/screens/create_booking_screen.dart`

```dart
import 'package:flutter/material.dart';
import '../services/booking_service.dart';
import '../services/location_service.dart';

class CreateBookingScreen extends StatefulWidget {
  final int userId;
  
  const CreateBookingScreen({required this.userId});
  
  @override
  _CreateBookingScreenState createState() => _CreateBookingScreenState();
}

class _CreateBookingScreenState extends State<CreateBookingScreen> {
  final BookingService _bookingService = BookingService();
  final LocationService _locationService = LocationService();
  
  final _formKey = GlobalKey<FormState>();
  
  String? selectedService;
  final TextEditingController _jobDescController = TextEditingController();
  DateTime? selectedDate;
  TimeOfDay? selectedTime;
  Map<String, dynamic>? currentLocation;
  bool isLoading = false;
  
  final List<String> services = [
    'Plumber',
    'Electrician',
    'Carpenter',
    'Painter',
    'Cleaner',
    'Catering',
    'Event Decoration',
  ];
  
  @override
  void initState() {
    super.initState();
    _getCurrentLocation();
  }
  
  Future<void> _getCurrentLocation() async {
    setState(() => isLoading = true);
    
    final location = await _locationService.getCurrentLocationWithAddress();
    
    setState(() {
      currentLocation = location;
      isLoading = false;
    });
    
    if (location == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to get location. Please enable location services.')),
      );
    }
  }
  
  Future<void> _createBooking() async {
    if (!_formKey.currentState!.validate()) return;
    
    if (currentLocation == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Location not available. Please try again.')),
      );
      return;
    }
    
    setState(() => isLoading = true);
    
    try {
      final result = await _bookingService.createBooking(
        userId: widget.userId,
        selectedService: selectedService!,
        jobDescription: _jobDescController.text,
        date: '${selectedDate!.year}-${selectedDate!.month.toString().padLeft(2, '0')}-${selectedDate!.day.toString().padLeft(2, '0')}',
        time: '${selectedTime!.hour}:${selectedTime!.minute.toString().padLeft(2, '0')}',
        latitude: currentLocation!['latitude'],
        longitude: currentLocation!['longitude'],
        address: currentLocation!['address'],
      );
      
      if (result['success'] == true) {
        // Show success dialog
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            title: Text('✅ Booking Created'),
            content: Text(
              result['vendorFound'] == true
                  ? 'Your booking has been sent to ${result['vendor']?['name'] ?? 'a vendor'}. Distance: ${result['vendor']?['distance']}km'
                  : 'Booking created! No vendor available right now, but we\'ll notify you when one becomes available.',
            ),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.pop(context);
                  Navigator.pop(context); // Go back to previous screen
                },
                child: Text('OK'),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    } finally {
      setState(() => isLoading = false);
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Book Service')),
      body: isLoading
          ? Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Service Selection
                    DropdownButtonFormField<String>(
                      value: selectedService,
                      decoration: InputDecoration(labelText: 'Select Service'),
                      items: services.map((service) {
                        return DropdownMenuItem(
                          value: service,
                          child: Text(service),
                        );
                      }).toList(),
                      onChanged: (value) => setState(() => selectedService = value),
                      validator: (value) => value == null ? 'Please select a service' : null,
                    ),
                    SizedBox(height: 16),
                    
                    // Job Description
                    TextFormField(
                      controller: _jobDescController,
                      decoration: InputDecoration(labelText: 'Job Description'),
                      maxLines: 3,
                      validator: (value) => value?.isEmpty ?? true ? 'Please describe the job' : null,
                    ),
                    SizedBox(height: 16),
                    
                    // Date Picker
                    ListTile(
                      title: Text('Date: ${selectedDate?.toString().split(' ')[0] ?? 'Not selected'}'),
                      trailing: Icon(Icons.calendar_today),
                      onTap: () async {
                        final date = await showDatePicker(
                          context: context,
                          initialDate: DateTime.now(),
                          firstDate: DateTime.now(),
                          lastDate: DateTime.now().add(Duration(days: 30)),
                        );
                        if (date != null) setState(() => selectedDate = date);
                      },
                    ),
                    
                    // Time Picker
                    ListTile(
                      title: Text('Time: ${selectedTime?.format(context) ?? 'Not selected'}'),
                      trailing: Icon(Icons.access_time),
                      onTap: () async {
                        final time = await showTimePicker(
                          context: context,
                          initialTime: TimeOfDay.now(),
                        );
                        if (time != null) setState(() => selectedTime = time);
                      },
                    ),
                    SizedBox(height: 16),
                    
                    // Location Display
                    Card(
                      child: Padding(
                        padding: EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Service Location:', style: TextStyle(fontWeight: FontWeight.bold)),
                            SizedBox(height: 8),
                            Text(currentLocation?['address'] ?? 'Getting location...'),
                            SizedBox(height: 8),
                            TextButton.icon(
                              icon: Icon(Icons.refresh),
                              label: Text('Refresh Location'),
                              onPressed: _getCurrentLocation,
                            ),
                          ],
                        ),
                      ),
                    ),
                    SizedBox(height: 24),
                    
                    // Submit Button
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: (selectedService != null && 
                                   selectedDate != null && 
                                   selectedTime != null && 
                                   currentLocation != null)
                            ? _createBooking
                            : null,
                        child: Padding(
                          padding: EdgeInsets.all(16),
                          child: Text('Create Booking', style: TextStyle(fontSize: 16)),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
```

---

## 📋 6. Booking List UI

### Display User's Bookings

**File:** `lib/screens/bookings_list_screen.dart`

```dart
import 'package:flutter/material.dart';
import '../services/booking_service.dart';

class BookingsListScreen extends StatefulWidget {
  final int userId;
  
  const BookingsListScreen({required this.userId});
  
  @override
  _BookingsListScreenState createState() => _BookingsListScreenState();
}

class _BookingsListScreenState extends State<BookingsListScreen> {
  final BookingService _bookingService = BookingService();
  List<dynamic> bookings = [];
  bool isLoading = true;
  
  @override
  void initState() {
    super.initState();
    _loadBookings();
  }
  
  Future<void> _loadBookings() async {
    setState(() => isLoading = true);
    
    final data = await _bookingService.getUserBookings(widget.userId);
    
    setState(() {
      bookings = data;
      isLoading = false;
    });
  }
  
  Color _getStatusColor(String status) {
    switch (status) {
      case 'pending':
        return Colors.orange;
      case 'accepted':
        return Colors.blue;
      case 'completed':
        return Colors.green;
      case 'rejected':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('My Bookings')),
      body: isLoading
          ? Center(child: CircularProgressIndicator())
          : bookings.isEmpty
              ? Center(child: Text('No bookings yet'))
              : RefreshIndicator(
                  onRefresh: _loadBookings,
                  child: ListView.builder(
                    itemCount: bookings.length,
                    itemBuilder: (context, index) {
                      final booking = bookings[index];
                      return Card(
                        margin: EdgeInsets.all(8),
                        child: ListTile(
                          title: Text(booking['selectedService'] ?? 'Service'),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Date: ${booking['date']} at ${booking['time']}'),
                              Text('Status: ${booking['status']}'),
                              if (booking['vendor'] != null)
                                Text('Vendor: ${booking['vendor']['name'] ?? 'Assigned'}'),
                              if (booking['otpStart'] != null)
                                Text('OTP: ${booking['otpStart']}', 
                                     style: TextStyle(fontWeight: FontWeight.bold, color: Colors.red)),
                            ],
                          ),
                          trailing: Container(
                            padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: _getStatusColor(booking['status']),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              booking['status'].toUpperCase(),
                              style: TextStyle(color: Colors.white, fontSize: 10),
                            ),
                          ),
                          isThreeLine: true,
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
```

---

## ✅ CHECKLIST FOR FRONTEND IMPLEMENTATION

### 1. FCM Setup
- [ ] Ensure `fcmToken` is sent during user registration
- [ ] Implement token refresh listener
- [ ] Handle foreground notifications
- [ ] Handle background notifications
- [ ] Handle notification tap navigation

### 2. Location Services
- [ ] Request location permissions
- [ ] Get current coordinates
- [ ] Get address from coordinates
- [ ] Clean and format address string
- [ ] Handle location errors gracefully

### 3. Booking Creation
- [ ] Service selection dropdown
- [ ] Job description input
- [ ] Date picker
- [ ] Time picker
- [ ] Location display with refresh
- [ ] Form validation
- [ ] API call to create booking
- [ ] Handle success/error responses
- [ ] Show booking confirmation

### 4. Booking List
- [ ] Fetch user's bookings
- [ ] Display booking cards
- [ ] Show booking status with colors
- [ ] Display vendor info (when available)
- [ ] Show OTP prominently (when accepted)
- [ ] Pull to refresh
- [ ] Handle empty state

### 5. Notifications UI
- [ ] Show OTP in prominent dialog
- [ ] Display booking status updates
- [ ] Navigate to booking details on tap
- [ ] Show vendor acceptance notification
- [ ] Show completion notification

---

## 🎯 KEY INTEGRATION POINTS

### When Customer Books Service:
1. Get current location with address
2. Fill booking form
3. Call `POST /api/booking/create`
4. Show confirmation
5. Navigate to bookings list

### When Vendor Accepts:
1. Receive FCM notification with OTP
2. Show OTP dialog prominently
3. Update booking in local list
4. Customer should note/save OTP

### When Service is Completed:
1. Receive completion notification
2. Update booking status
3. Optionally show rating dialog

---

## 🚀 TESTING STEPS

1. **Test FCM Token:**
   - Register new user
   - Check backend logs for FCM token
   - Verify token is saved in database

2. **Test Location:**
   - Open booking screen
   - Verify location is fetched
   - Check address format

3. **Test Booking Creation:**
   - Fill all fields
   - Submit booking
   - Check backend logs for vendor matching
   - Verify FCM notification received

4. **Test Notifications:**
   - Have vendor accept booking
   - Verify OTP notification received
   - Check OTP is displayed prominently

---

## 📝 NOTES

- Replace `https://your-backend.onrender.com` with your actual Render URL
- Test on real devices (not simulator) for FCM
- Location permissions must be granted
- Service names must match exactly with backend
- OTP is only generated after vendor accepts

---

**Frontend implementation is straightforward - just API calls and FCM handling! 🎉**
