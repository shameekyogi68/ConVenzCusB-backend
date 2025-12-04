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
  cancelBooking
} from "../controllers/customerBookingController.js";

const router = express.Router();

/* ------------------------------------------
   👤 USER ROUTES
------------------------------------------- */
router.post("/register", registerUser);
router.post("/verify-otp", verifyOtp);
router.post("/update-user", updateUserDetails);
router.post("/update-location", updateVendorLocation);
router.post("/update-fcm-token", updateFcmToken);

router.get("/profile/:userId", getUserProfile);
router.post("/profile/:userId", updateUserProfile);

/* ------------------------------------------
   📅 BOOKING ROUTES (Customer Side)
------------------------------------------- */
router.post("/booking/create", createCustomerBooking);
router.get("/bookings/:userId", getUserBookings);
router.get("/booking/:bookingId", getBookingDetails);
router.post("/booking/:bookingId/cancel", cancelBooking);

/* ------------------------------------------
   💳 SUBSCRIPTION ROUTES
------------------------------------------- */
router.post("/create-plans", createDefaultPlans);
router.get("/plans/all", getPlansByType);
router.get("/plans", getAllPlans);
router.get("/plans/:id", getPlanById);

export default router;
