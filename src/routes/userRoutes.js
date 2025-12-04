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
import Booking from "../models/bookingModel.js";

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
   📅 BOOKING ROUTES
------------------------------------------- */
// CREATE BOOKING
router.post("/booking/create", async (req, res) => {
  try {
    console.log("📥 Booking Create Request:", req.body);

    const { userId, selectedService, selectedDate, selectedTime, userLocation, jobDescription } = req.body;

    if (!userId || !selectedService || !selectedDate || !selectedTime || !userLocation) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const newBooking = await Booking.create({
      userId,
      selectedService,
      selectedDate,
      selectedTime,
      userLocation,
      jobDescription,
      status: "pending",
    });

    return res.status(201).json({
      message: "Booking created successfully",
      booking: newBooking,
    });

  } catch (error) {
    console.error("❌ Booking Create Error:", error);
    return res.status(500).json({ message: "Server error", error });
  }
});

/* ------------------------------------------
   💳 SUBSCRIPTION ROUTES
------------------------------------------- */
router.post("/create-plans", createDefaultPlans);
router.get("/plans/all", getPlansByType);
router.get("/plans", getAllPlans);
router.get("/plans/:id", getPlanById);

export default router;
