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
------------------------------------------- */
router.post("/register", registerUser);
router.post("/verify-otp", verifyOtp);
router.post("/update-user", checkUserBlocked, updateUserDetails);
router.post("/update-location", checkUserBlocked, updateVendorLocation);
router.post("/update-fcm-token", checkUserBlocked, updateFcmToken);

router.get("/profile/:userId", checkUserBlocked, getUserProfile);
router.post("/profile/:userId", checkUserBlocked, updateUserProfile);

/* ------------------------------------------
   📅 BOOKING ROUTES (Customer Side)
------------------------------------------- */
router.post("/booking/create", checkUserBlocked, createCustomerBooking);
router.get("/bookings/:userId", checkUserBlocked, getUserBookings);
router.get("/booking/:bookingId", getBookingDetails);
router.post("/booking/:bookingId/cancel", checkUserBlocked, cancelBooking);

// Status update from vendor backend (no blocking check - comes from vendor)
router.post("/booking/status-update", updateBookingStatus);

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
