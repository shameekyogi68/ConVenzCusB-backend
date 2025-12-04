import Booking from "../models/bookingModel.js";
import User from "../models/userModel.js";
import { sendNotification } from "../utils/sendNotification.js";

/* ------------------------------------------------------------
   🔄 EXTERNAL VENDOR UPDATE CALLBACK
   
   Receives vendor assignment updates from external vendor server
   Updates booking with vendor details and status
------------------------------------------------------------ */
export const receiveVendorUpdate = async (req, res) => {
  try {
    console.log('\n🔔 ========================================');
    console.log('🔔 EXTERNAL VENDOR UPDATE RECEIVED');
    console.log('🔔 Timestamp:', new Date().toISOString());
    console.log('🔔 Request Body:', JSON.stringify(req.body, null, 2));
    console.log('🔔 ========================================');

    // ✅ Step 1: Validate authentication
    const vendorSecret = req.headers['x-vendor-secret'];
    const expectedSecret = process.env.VENDOR_SECRET || 'vendor-secret-key-2024';

    if (!vendorSecret || vendorSecret !== expectedSecret) {
      console.error('❌ UNAUTHORIZED: Invalid or missing x-vendor-secret header');
      return res.status(401).json({
        ok: false,
        error: 'Unauthorized',
        details: 'Invalid or missing x-vendor-secret header'
      });
    }

    // ✅ Step 2: Extract and validate required fields
    const {
      vendorId,
      vendorName,
      vendorPhone,
      vendorAddress,
      serviceType,
      assignedOrderId,
      status
    } = req.body;

    // Validate all required fields
    const missingFields = [];
    if (!vendorId) missingFields.push('vendorId');
    if (!vendorName) missingFields.push('vendorName');
    if (!vendorPhone) missingFields.push('vendorPhone');
    if (!vendorAddress) missingFields.push('vendorAddress');
    if (!serviceType) missingFields.push('serviceType');
    if (!assignedOrderId) missingFields.push('assignedOrderId');
    if (!status) missingFields.push('status');

    if (missingFields.length > 0) {
      console.error('❌ VALIDATION_FAILED: Missing required fields:', missingFields);
      return res.status(400).json({
        ok: false,
        error: 'Missing required fields',
        details: `Required fields missing: ${missingFields.join(', ')}`
      });
    }

    // Validate status value
    const validStatuses = ['accepted', 'rejected', 'enroute', 'completed', 'cancelled'];
    if (!validStatuses.includes(status.toLowerCase())) {
      console.error('❌ VALIDATION_FAILED: Invalid status value:', status);
      return res.status(400).json({
        ok: false,
        error: 'Invalid status',
        details: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    // ✅ Step 3: Find the booking by assignedOrderId (booking_id)
    const booking = await Booking.findOne({ booking_id: parseInt(assignedOrderId) });

    if (!booking) {
      console.error('❌ BOOKING_NOT_FOUND: assignedOrderId:', assignedOrderId);
      return res.status(404).json({
        ok: false,
        error: 'Booking not found',
        details: `No booking found with ID: ${assignedOrderId}`
      });
    }

    console.log(`✅ BOOKING_FOUND | Booking ID: ${booking.booking_id} | Current Status: ${booking.status}`);

    // ✅ Step 4: Update booking with vendor details
    const oldStatus = booking.status;
    
    // Store external vendor details in a new field
    booking.externalVendor = {
      vendorId: String(vendorId),
      vendorName: String(vendorName),
      vendorPhone: String(vendorPhone),
      vendorAddress: String(vendorAddress),
      serviceType: String(serviceType),
      assignedAt: new Date(),
      lastUpdated: new Date()
    };

    // Update booking status
    booking.status = status.toLowerCase();
    
    await booking.save();

    console.log(`✅ BOOKING_UPDATED | Booking ID: ${booking.booking_id}`);
    console.log(`   Status: ${oldStatus} → ${booking.status}`);
    console.log(`   External Vendor: ${vendorName} (${vendorId})`);

    // ✅ Step 5: Send notification to customer
    try {
      const customer = await User.findOne({ user_id: booking.userId });
      
      if (customer && customer.fcmToken) {
        let notificationTitle = '';
        let notificationBody = '';
        
        switch (status.toLowerCase()) {
          case 'accepted':
            notificationTitle = '✅ Vendor Assigned!';
            notificationBody = `${vendorName} has accepted your ${booking.selectedService} request.`;
            break;
          case 'rejected':
            notificationTitle = '❌ Vendor Declined';
            notificationBody = `Unfortunately, the vendor couldn't accept your request. We're finding another vendor.`;
            break;
          case 'enroute':
            notificationTitle = '🚗 Vendor On The Way';
            notificationBody = `${vendorName} is heading to your location.`;
            break;
          case 'completed':
            notificationTitle = '🎉 Service Completed';
            notificationBody = `Your ${booking.selectedService} service has been completed by ${vendorName}.`;
            break;
          case 'cancelled':
            notificationTitle = '⚠️ Service Cancelled';
            notificationBody = `Your ${booking.selectedService} service has been cancelled.`;
            break;
          default:
            notificationTitle = '📢 Booking Update';
            notificationBody = `Your booking status has been updated to: ${status}`;
        }

        await sendNotification(
          customer.fcmToken,
          notificationTitle,
          notificationBody,
          {
            type: 'VENDOR_UPDATE',
            bookingId: String(booking.booking_id),
            status: booking.status,
            vendorName: vendorName,
            vendorPhone: vendorPhone
          }
        );

        console.log(`📲 CUSTOMER_NOTIFIED | User ID: ${customer.user_id} | Status: ${status}`);
      } else {
        console.log(`⚠️  Customer FCM token not found for user ${booking.userId}`);
      }
    } catch (notifError) {
      console.error('⚠️  NOTIFICATION_FAILED:', notifError.message);
      // Continue even if notification fails
    }

    console.log('✅ ========================================');
    console.log('✅ VENDOR UPDATE PROCESSED SUCCESSFULLY');
    console.log('✅ ========================================\n');

    // ✅ Step 6: Return success response
    return res.status(200).json({
      ok: true,
      message: 'Vendor update received',
      data: {
        bookingId: booking.booking_id,
        status: booking.status,
        vendorName: vendorName,
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ ========================================');
    console.error('❌ EXTERNAL VENDOR UPDATE ERROR');
    console.error('❌ Error:', error.message);
    console.error('❌ Stack:', error.stack);
    console.error('❌ ========================================\n');

    return res.status(500).json({
      ok: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};
