import axios from "axios";
import Booking from "../models/bookingModel.js";
import User from "../models/userModel.js";
import { findBestVendor } from "../utils/vendorMatcherFixed.js";
import { sendNotification } from "../utils/sendNotification.js";

/* ------------------------------------------------------------
   📝 CREATE BOOKING & NOTIFY VENDOR BACKEND
   
   Flow:
   1. Validate customer and create booking
   2. Find best available vendor
   3. Send POST request to vendor backend
   4. Return success response to customer
------------------------------------------------------------ */
export const createCustomerBooking = async (req, res) => {
  try {
    console.log('\n📅 === CUSTOMER BOOKING REQUEST ===');
    console.log('📦 Full Request Body:', JSON.stringify(req.body, null, 2));
    console.log('📦 Body Keys:', Object.keys(req.body));
    
    const { userId, selectedService, jobDescription, date, time, location } = req.body;

    console.log('🔍 Extracted Fields:');
    console.log('   userId:', userId);
    console.log('   selectedService:', selectedService);
    console.log('   jobDescription:', jobDescription);
    console.log('   date:', date);
    console.log('   time:', time);
    console.log('   location:', JSON.stringify(location));

    // ✅ Step 1: Validate required fields
    if (!userId || !selectedService || !jobDescription || !date || !time || !location) {
      const missing = [];
      if (!userId) missing.push('userId');
      if (!selectedService) missing.push('selectedService');
      if (!jobDescription) missing.push('jobDescription');
      if (!date) missing.push('date');
      if (!time) missing.push('time');
      if (!location) missing.push('location');
      
      console.log('❌ Missing required fields:', missing.join(', '));
      console.log('❌ What was received:', { userId, selectedService, jobDescription, date, time, location });
      
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(', ')}`,
        receivedFields: Object.keys(req.body),
        hint: "Flutter must send: userId, selectedService, jobDescription, date, time, location"
      });
    }

    if (!location.latitude || !location.longitude || !location.address) {
      console.log('❌ Invalid location data');
      return res.status(400).json({
        success: false,
        message: "Location must include latitude, longitude, and address"
      });
    }

    // ✅ Step 2: Verify customer exists
    const customer = await User.findOne({ user_id: userId });
    if (!customer) {
      console.log(`❌ Customer ${userId} not found`);
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    console.log(`✅ Customer: ${customer.name || customer.phone} (ID: ${userId})`);

    // ✅ Step 3: Create booking with pending status
    const newBooking = await Booking.create({
      userId,
      selectedService,
      jobDescription,
      date,
      time,
      location: {
        type: "Point",
        coordinates: [location.longitude, location.latitude],
        address: location.address
      },
      status: "pending",
      otpStart: null,
      vendorId: null,
      distance: null
    });

    console.log(`✅ BOOKING_CREATED | ${new Date().toISOString()} | Booking ID: ${newBooking.booking_id} | Status: pending`);

    // ✅ Step 4: Find best available vendor
    console.log('\n🔍 Searching for available vendor...');
    const vendorMatch = await findBestVendor(
      selectedService,
      location.latitude,
      location.longitude,
      50 // 50km radius
    );

    if (!vendorMatch) {
      console.log('⚠️  NO_VENDOR_AVAILABLE | Booking created but no vendor found');
      
      // Notify customer
      if (customer.fcmToken) {
        try {
          await sendNotification(
            customer.fcmToken,
            "⚠️ No Vendor Available",
            `Sorry, no vendor is available for ${selectedService} right now. We'll notify you when one becomes available.`,
            { 
              type: "BOOKING_STATUS",
              bookingId: String(newBooking.booking_id),
              status: "pending"
            }
          );
        } catch (error) {
          console.log(`⚠️  Failed to send notification: ${error.message}`);
        }
      }

      return res.status(200).json({
        success: true,
        message: "Booking created but no vendor available at the moment",
        data: {
          bookingId: newBooking.booking_id,
          status: newBooking.status,
          service: selectedService,
          date,
          time
        },
        vendorFound: false
      });
    }

    // ✅ Step 5: Update booking with vendor details
    newBooking.vendorId = vendorMatch.vendor.vendor_id;
    newBooking.distance = vendorMatch.distance;
    await newBooking.save();

    console.log(`✅ VENDOR_MATCHED | Vendor: ${vendorMatch.vendor.name} (ID: ${vendorMatch.vendor.vendor_id}) | Distance: ${vendorMatch.distance}km`);

    // ✅ Step 6: Send POST request to vendor backend (SERVER-TO-SERVER)
    const vendorBackendUrl = process.env.VENDOR_BACKEND_URL || 'https://vendor-backend-7cn3.onrender.com';
    
    let vendorBackendNotified = false;
    
    try {
      console.log(`\n📤 Sending request to vendor backend: ${vendorBackendUrl}/vendor/api/new-booking`);
      
      const vendorNotificationPayload = {
        bookingId: newBooking.booking_id,
        vendorId: vendorMatch.vendor.vendor_id,
        customerId: userId,
        customerName: customer.name || "Customer",
        customerPhone: String(customer.phone),
        service: selectedService,
        jobDescription,
        date,
        time,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address
        },
        distance: vendorMatch.distance,
        createdAt: new Date().toISOString()
      };

      console.log('📦 Vendor Backend Payload:', JSON.stringify(vendorNotificationPayload, null, 2));

      const vendorBackendResponse = await axios.post(
        `${vendorBackendUrl}/vendor/api/new-booking`,
        vendorNotificationPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Source': 'customer-backend'
          },
          timeout: 15000 // 15 second timeout
        }
      );

      console.log(`✅ VENDOR_BACKEND_NOTIFIED | Status: ${vendorBackendResponse.status} | Response:`, vendorBackendResponse.data);
      vendorBackendNotified = true;
      
    } catch (vendorError) {
      console.error(`❌ VENDOR_BACKEND_NOTIFICATION_FAILED | Error: ${vendorError.message}`);
      
      if (vendorError.response) {
        console.error(`   Response Status: ${vendorError.response.status}`);
        console.error(`   Response Data:`, JSON.stringify(vendorError.response.data, null, 2));
      } else if (vendorError.request) {
        console.error(`   No response received from vendor backend`);
      } else {
        console.error(`   Request setup error:`, vendorError.message);
      }
      
      // Continue with FCM notification as fallback
    }

    // ✅ Step 7: Send FCM notification to vendor (PRIMARY notification method)
    let vendorFcmSent = false;
    
    if (vendorMatch.vendor.fcmTokens && vendorMatch.vendor.fcmTokens.length > 0) {
      try {
        const notificationData = {
          type: "NEW_BOOKING",
          bookingId: String(newBooking.booking_id),
          vendorId: String(vendorMatch.vendor.vendor_id),
          customerId: String(userId),
          customerName: customer.name || "Customer",
          customerPhone: String(customer.phone),
          service: selectedService,
          jobDescription,
          date,
          time,
          address: location.address,
          latitude: String(location.latitude),
          longitude: String(location.longitude),
          distance: String(vendorMatch.distance)
        };

        console.log(`\n📲 Sending FCM to vendor...`);
        console.log(`   Vendor ID: ${vendorMatch.vendor.vendor_id}`);
        console.log(`   FCM Tokens: ${vendorMatch.vendor.fcmTokens.length}`);
        
        await sendNotification(
          vendorMatch.vendor.fcmTokens[0],
          "🔔 New Service Request",
          `${customer.name || 'A customer'} needs ${selectedService} at ${time} on ${date}. Distance: ${vendorMatch.distance}km`,
          notificationData
        );
        
        console.log(`✅ VENDOR_FCM_SENT | Vendor: ${vendorMatch.vendor.vendor_id}`);
        vendorFcmSent = true;
        
      } catch (error) {
        console.error(`❌ VENDOR_FCM_FAILED | Error: ${error.message}`);
      }
    } else {
      console.warn(`⚠️  NO_VENDOR_FCM_TOKENS | Vendor ${vendorMatch.vendor.vendor_id} has no FCM tokens registered`);
    }

    // Log notification status
    if (vendorBackendNotified || vendorFcmSent) {
      console.log(`\n✅ VENDOR_NOTIFIED | Backend: ${vendorBackendNotified ? 'YES' : 'NO'} | FCM: ${vendorFcmSent ? 'YES' : 'NO'}`);
    } else {
      console.warn(`\n⚠️  WARNING: Vendor was NOT notified via any method!`);
    }

    // ✅ Step 8: Send confirmation to customer
    if (customer.fcmToken) {
      try {
        await sendNotification(
          customer.fcmToken,
          "✅ Booking Confirmed",
          `Your ${selectedService} request for ${date} at ${time} has been sent to a vendor. Waiting for acceptance.`,
          {
            type: "BOOKING_CONFIRMATION",
            bookingId: String(newBooking.booking_id),
            service: selectedService,
            vendorName: vendorMatch.vendor.name
          }
        );
        console.log(`📲 CUSTOMER_NOTIFIED | User: ${userId}`);
      } catch (error) {
        console.log(`⚠️  CUSTOMER_NOTIFICATION_FAILED | Error: ${error.message}`);
      }
    }

    console.log('='.repeat(50));
    console.log('✅ BOOKING PROCESS COMPLETED SUCCESSFULLY\n');

    // ✅ Step 9: Return success response
    return res.status(201).json({
      success: true,
      message: "Booking created and vendor notified",
      data: {
        bookingId: newBooking.booking_id,
        status: newBooking.status,
        service: selectedService,
        date,
        time,
        location: location.address,
        vendor: {
          id: vendorMatch.vendor.vendor_id,
          name: vendorMatch.vendor.name,
          distance: `${vendorMatch.distance} km`
        }
      }
    });

  } catch (error) {
    console.error('❌ BOOKING_ERROR:', error);
    return res.status(500).json({
      success: false,
      message: "Server error while creating booking",
      error: error.message
    });
  }
};

/* ------------------------------------------------------------
   📋 GET USER'S BOOKINGS
------------------------------------------------------------ */
export const getUserBookings = async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`\n📋 Fetching bookings for user: ${userId}`);
    
    const bookings = await Booking.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50);
    
    console.log(`✅ Found ${bookings.length} bookings`);
    
    return res.status(200).json({
      success: true,
      data: bookings,
      count: bookings.length
    });
    
  } catch (error) {
    console.error('❌ GET_BOOKINGS_ERROR:', error);
    return res.status(500).json({
      success: false,
      message: "Error fetching bookings",
      error: error.message
    });
  }
};

/* ------------------------------------------------------------
   🔍 GET SINGLE BOOKING DETAILS
------------------------------------------------------------ */
export const getBookingDetails = async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    console.log(`\n🔍 Fetching booking: ${bookingId}`);
    
    const booking = await Booking.findOne({ booking_id: bookingId });
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }
    
    console.log(`✅ Booking found: ${booking.selectedService} - ${booking.status}`);
    
    return res.status(200).json({
      success: true,
      data: booking
    });
    
  } catch (error) {
    console.error('❌ GET_BOOKING_ERROR:', error);
    return res.status(500).json({
      success: false,
      message: "Error fetching booking",
      error: error.message
    });
  }
};

/* ------------------------------------------------------------
   ❌ CANCEL BOOKING
------------------------------------------------------------ */
export const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { userId } = req.body;
    
    console.log(`\n❌ Cancel booking request: ${bookingId} by user: ${userId}`);
    
    const booking = await Booking.findOne({ booking_id: bookingId });
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }
    
    if (booking.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to cancel this booking"
      });
    }
    
    if (booking.status === "completed" || booking.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel booking with status: ${booking.status}`
      });
    }
    
    booking.status = "cancelled";
    await booking.save();
    
    console.log(`✅ Booking ${bookingId} cancelled successfully`);
    
    return res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      data: booking
    });
    
  } catch (error) {
    console.error('❌ CANCEL_BOOKING_ERROR:', error);
    return res.status(500).json({
      success: false,
      message: "Error cancelling booking",
      error: error.message
    });
  }
};

/* ------------------------------------------------------------
   🔄 BOOKING STATUS UPDATE (FROM VENDOR BACKEND)
   
   This endpoint receives status updates from vendor backend
   when vendor accepts/rejects/completes a booking
------------------------------------------------------------ */
export const updateBookingStatus = async (req, res) => {
  try {
    console.log('\n🔄 === BOOKING STATUS UPDATE FROM VENDOR ===');
    console.log('📦 Request Body:', JSON.stringify(req.body, null, 2));
    
    const { bookingId, status, vendorId, otpStart, rejectionReason } = req.body;

    // Validate required fields
    if (!bookingId || !status) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: "Missing required fields: bookingId, status"
      });
    }

    // Validate status
    const validStatuses = ["accepted", "rejected", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`
      });
    }

    // Find booking
    const booking = await Booking.findOne({ booking_id: bookingId });
    
    if (!booking) {
      console.log(`❌ Booking ${bookingId} not found`);
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    console.log(`📋 Current booking status: ${booking.status} → New status: ${status}`);

    // Update booking status
    booking.status = status;
    
    // Update OTP if vendor accepted
    if (status === "accepted" && otpStart) {
      booking.otpStart = otpStart;
      console.log(`🔐 OTP assigned: ${otpStart}`);
    }

    // Update vendor ID if provided
    if (vendorId) {
      booking.vendorId = vendorId;
    }

    await booking.save();

    console.log(`✅ Booking ${bookingId} updated to: ${status}`);

    // Get customer details for notification
    const customer = await User.findOne({ user_id: booking.userId });
    
    if (!customer) {
      console.log(`⚠️  Customer ${booking.userId} not found for notification`);
    }

    // Send notification to customer based on status
    if (customer && customer.fcmToken) {
      try {
        let notificationTitle = "";
        let notificationBody = "";
        let notificationData = {
          type: "BOOKING_STATUS_UPDATE",
          bookingId: String(bookingId),
          status: status
        };

        switch (status) {
          case "accepted":
            notificationTitle = "✅ Booking Accepted!";
            notificationBody = `Your ${booking.selectedService} booking has been accepted. OTP: ${otpStart || 'N/A'}`;
            notificationData.otp = String(otpStart || '');
            break;
            
          case "rejected":
            notificationTitle = "❌ Booking Rejected";
            notificationBody = rejectionReason || `Sorry, your ${booking.selectedService} booking was rejected. We'll find another vendor.`;
            notificationData.reason = rejectionReason || '';
            break;
            
          case "completed":
            notificationTitle = "🎉 Service Completed";
            notificationBody = `Your ${booking.selectedService} service has been completed. Thank you!`;
            break;
            
          case "cancelled":
            notificationTitle = "⚠️ Booking Cancelled";
            notificationBody = `Your ${booking.selectedService} booking has been cancelled.`;
            break;
        }

        await sendNotification(
          customer.fcmToken,
          notificationTitle,
          notificationBody,
          notificationData
        );
        
        console.log(`📲 CUSTOMER_NOTIFIED | User: ${customer.user_id} | Status: ${status}`);
        
      } catch (error) {
        console.log(`⚠️  NOTIFICATION_FAILED | Error: ${error.message}`);
      }
    }

    console.log('='.repeat(50));

    return res.status(200).json({
      success: true,
      message: "Booking status updated successfully",
      data: {
        bookingId: booking.booking_id,
        status: booking.status,
        otpStart: booking.otpStart,
        vendorId: booking.vendorId
      }
    });

  } catch (error) {
    console.error('❌ UPDATE_BOOKING_STATUS_ERROR:', error);
    return res.status(500).json({
      success: false,
      message: "Error updating booking status",
      error: error.message
    });
  }
};
