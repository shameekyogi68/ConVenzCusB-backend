import express from "express";
import {
  createBooking,
  getUserBookings,
  updateBookingStatus,
  getBookingsByVendor,
  getBookingHistory
} from "../controllers/bookingController.js";

const router = express.Router();

/* ------------------------------------------
   📅 BOOKING ROUTES
------------------------------------------- */
router.post("/create", createBooking);
router.get("/user/:userId", getUserBookings);
router.put("/status/:bookingId", updateBookingStatus);
router.get("/vendor/:vendorId", getBookingsByVendor);
router.get("/history/:userId", getBookingHistory);

export default router;
