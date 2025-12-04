import express from "express";
import {
  registerUser,
  verifyOtp,
  updateUserDetails,
  updateVendorLocation,
  createDefaultPlans,
  getAllPlans,
  getPlansByType,
  getPlanById,
  getUserProfile,
  updateUserProfile,
} from "../controllers/userController.js";
import { updateFcmToken } from "../controllers/notificationController.js";
import {
  createCustomerBooking,
  getUserBookings,
  getBookingDetails,
  cancelBooking,
  updateBookingStatus
} from "../controllers/customerBookingController.js";
import {
  checkUserBlocked,
  blockUser,
  unblockUser,
  checkBlockStatus
} from "../middlewares/checkBlocked.js";

const router = express.Router();

/* ------------------------------------------
   👤 USER ROUTES
   NOTE: Register and OTP verification do NOT have blocking middleware
   because blocking is checked AFTER user logs in
------------------------------------------- */
router.post("/register", registerUser); // No blocking check - allow registration
router.post("/user/register", registerUser); // Alias for Flutter app compatibility
router.post("/verify-otp", checkUserBlocked, verifyOtp); // Check block status during login
router.post("/user/verify-otp", checkUserBlocked, verifyOtp); // Alias for Flutter app compatibility
router.post("/update-user", checkUserBlocked, updateUserDetails);
router.post("/update-location", checkUserBlocked, updateVendorLocation);
router.post("/update-fcm-token", checkUserBlocked, updateFcmToken);

router.get("/profile/:userId", checkUserBlocked, getUserProfile);
router.post("/profile/:userId", checkUserBlocked, updateUserProfile);

// Profile aliases for Flutter
router.get("/user/profile/:userId", checkUserBlocked, getUserProfile);
router.post("/user/profile/:userId", checkUserBlocked, updateUserProfile);

/* ------------------------------------------
   📅 BOOKING ROUTES (Customer Side)
   NOTE: Specific routes MUST come before parameterized routes
------------------------------------------- */
// Status update from vendor backend (no blocking check - comes from vendor)
router.post("/booking/status-update", updateBookingStatus);

// Create booking - MUST come before :bookingId route
router.post("/booking/create", checkUserBlocked, createCustomerBooking);
router.post("/user/booking/create", checkUserBlocked, createCustomerBooking); // Alias

// Get all user bookings
router.get("/bookings/:userId", checkUserBlocked, getUserBookings);
router.get("/user/bookings/:userId", checkUserBlocked, getUserBookings); // Alias

// Cancel booking
router.post("/booking/:bookingId/cancel", checkUserBlocked, cancelBooking);
router.post("/user/booking/:bookingId/cancel", checkUserBlocked, cancelBooking); // Alias

// Get single booking details - MUST come last (catches any bookingId)
router.get("/booking/:bookingId", getBookingDetails);
router.get("/user/booking/:bookingId", getBookingDetails); // Alias

/* ------------------------------------------
   🔒 ADMIN ROUTES - User Blocking
------------------------------------------- */
router.post("/admin/block-user", blockUser);
router.post("/admin/unblock-user", unblockUser);
router.get("/admin/check-status/:userId", checkBlockStatus);

/* ------------------------------------------
   💳 SUBSCRIPTION ROUTES
------------------------------------------- */
router.post("/create-plans", createDefaultPlans);
router.get("/plans/all", getPlansByType);
router.get("/plans", getAllPlans);
router.get("/plans/:id", getPlanById);

export default router;
