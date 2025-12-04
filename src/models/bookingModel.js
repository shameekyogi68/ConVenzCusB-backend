import mongoose from "mongoose";
import AutoIncrementFactory from "mongoose-sequence";

const AutoIncrement = AutoIncrementFactory(mongoose);

/* ------------------------------------------
   📅 BOOKING SCHEMA
------------------------------------------- */
const bookingSchema = new mongoose.Schema(
  {
    // Customer who created the booking
    userId: {
      type: Number,
      required: true,
      ref: "User"
    },

    // Vendor assigned to the booking
    vendorId: {
      type: Number,
      default: null,
      ref: "Vendor"
    },

    // Service requested
    selectedService: {
      type: String,
      required: true,
    },

    // Job description/details
    jobDescription: {
      type: String,
      required: true,
    },

    // Scheduled date
    date: {
      type: String,
      required: true,
    },

    // Scheduled time
    time: {
      type: String,
      required: true,
    },

    // Booking location
    location: {
      type: { type: String, default: "Point" },
      coordinates: { type: [Number], required: true }, // [longitude, latitude]
      address: { type: String, required: true },
    },

    // Booking status
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "completed", "cancelled"],
      default: "pending",
    },

    // OTP for verification (null until vendor accepts)
    otpStart: {
      type: Number,
      default: null,
    },

    // Distance from vendor to customer (in km)
    distance: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true }
);

// Enable geospatial queries on booking location
bookingSchema.index({ location: "2dsphere" });

// Auto-increment booking_id
bookingSchema.plugin(AutoIncrement, {
  id: "booking_seq",
  inc_field: "booking_id",
});

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;
