import Booking from "../models/bookingModel.js";

// ------------------------------------------------------------
// 📝 CREATE NEW BOOKING
// ------------------------------------------------------------
export const createBooking = async (req, res) => {
  try {
    console.log("➕ Creating New Booking:", req.body);
    const { userId, vendorId, servicesId, price } = req.body;

    // Validation
    if (!userId || !vendorId || !servicesId || !price) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: userId, vendorId, servicesId, or price"
      });
    }

    const newBooking = await Booking.create({
      userId,
      vendorId,
      servicesId,
      price,
      bookingStatus: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: newBooking,
    });

  } catch (error) {
    console.error("❌ Create Booking Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ------------------------------------------------------------
// 👤 GET USER BOOKINGS
// ------------------------------------------------------------
export const getUserBookings = async (req, res) => {
  try {
    const { userId } = req.params;

    const bookings = await Booking.find({ userId })
      .populate("vendorId", "name phone location")
      .populate("servicesId", "name price description");

    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });

  } catch (err) {
    console.error("❌ Get User Bookings Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ------------------------------------------------------------
// 🔄 UPDATE BOOKING STATUS
// ------------------------------------------------------------
export const updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { bookingStatus } = req.body;

    if (!bookingStatus) {
        return res.status(400).json({ success: false, message: "Status is required" });
    }

    const updated = await Booking.findByIdAndUpdate(
      bookingId,
      { bookingStatus },
      { new: true }
    );

    if (!updated) {
        return res.status(404).json({ success: false, message: "Booking not found" });
    }

    console.log(`🔄 Booking ${bookingId} updated to: ${bookingStatus}`);

    return res.status(200).json({
      success: true,
      message: "Booking status updated",
      data: updated,
    });

  } catch (err) {
    console.error("❌ Update Status Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ------------------------------------------------------------
// 🏢 GET BOOKINGS BY VENDOR
// ------------------------------------------------------------
export const getBookingsByVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const bookings = await Booking.find({ vendorId })
      .populate("userId", "name phone")
      .populate("servicesId", "name");

    if (!bookings.length) {
      return res.status(404).json({
        success: false,
        message: "No bookings found for this vendor",
      });
    }

    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });

  } catch (error) {
    console.error("❌ Get Vendor Bookings Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ------------------------------------------------------------
// 📜 BOOKING HISTORY (Filterable)
// ------------------------------------------------------------
export const getBookingHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;

    const filter = { userId };

    if (status) {
      filter.bookingStatus = status;
    }

    const bookings = await Booking.find(filter)
      .sort({ createdAt: -1 })
      .populate("vendorId", "name");

    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });

  } catch (err) {
    console.error("❌ History Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
