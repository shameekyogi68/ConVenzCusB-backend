import mongoose from "mongoose";
import AutoIncrementFactory from "mongoose-sequence";

const AutoIncrement = AutoIncrementFactory(mongoose);

/* ------------------------------------------
   📅 BOOKING SCHEMA
------------------------------------------- */
const bookingSchema = new mongoose.Schema(
  {
    // Assuming userId refers to the custom 'user_id' (Number) from your User model
    userId: {
      type: Number,
      required: true,
      ref: "User" // Optional: Logic ref for population if using custom ID
    },

    // Assuming vendorId is also a user (vendor) with a custom Number ID
    vendorId: {
      type: Number,
      required: true,
      ref: "User"
    },

    // Assuming servicesId refers to a Service model (Number ID)
    servicesId: {
      type: Number,
      required: true,
    },

    price: {
      type: Number,
      required: true,
    },

    bookingStatus: {
      type: String,
      enum: ["pending", "accepted", "completed", "cancelled"],
      default: "pending",
    },
  },
  {
    collection: "Booking",
    timestamps: {
      createdAt: "booking_createdAt",
      updatedAt: "booking_modifiedAt",
    },
  }
);

// Auto-increment booking_id
bookingSchema.plugin(AutoIncrement, {
  id: "booking_seq",
  inc_field: "booking_id",
});

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;
