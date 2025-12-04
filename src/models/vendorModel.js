import mongoose from "mongoose";
import AutoIncrementFactory from "mongoose-sequence";

const AutoIncrement = AutoIncrementFactory(mongoose);

/* ------------------------------------------
   👨‍🔧 VENDOR SCHEMA
------------------------------------------- */
const vendorSchema = new mongoose.Schema(
  {
    phone: {
      type: Number,
      required: true,
      unique: true,
    },
    name: String,
    email: String,
    
    // 🛠️ Services offered by vendor
    selectedServices: [
      {
        type: String,
        required: true,
      }
    ],

    // 📍 GeoJSON Location
    location: {
      type: { type: String, default: "Point" },
      coordinates: { type: [Number], default: [0, 0] }, // [longitude, latitude]
    },

    // 🆕 Address
    address: {
      type: String,
      default: "",
    },

    // 🔔 Firebase Cloud Messaging Tokens (array for multiple devices)
    fcmTokens: {
      type: [String],
      default: [],
    },

    // ⭐ Rating
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    // 📊 Stats
    totalBookings: {
      type: Number,
      default: 0,
    },

    completedBookings: {
      type: Number,
      default: 0,
    },

    // 🔗 Subscription reference
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      default: null,
    },
  },
  { timestamps: true }
);

// Enable Nearby Location Search
vendorSchema.index({ location: "2dsphere" });

// Auto-increment vendor_id
vendorSchema.plugin(AutoIncrement, {
  id: "vendor_seq",
  inc_field: "vendor_id",
});

const Vendor = mongoose.model("Vendor", vendorSchema);
export default Vendor;
