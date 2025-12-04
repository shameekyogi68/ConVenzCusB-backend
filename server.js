import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./src/config/db.js";
import userRoutes from "./src/routes/userRoutes.js";
import bookingRoutes from "./src/routes/bookingRoutes.js";
import subscriptionRoutes from "./src/routes/subscriptionRoutes.js";
import notificationRoutes from "./src/routes/notificationRoutes.js";

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Updated: 2025-12-04 - Blocking system working

// Middleware - CORS Configuration for Mobile Apps
app.use(cors({
  origin: '*', // Allow all origins for mobile Flutter apps
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logging Middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n📥 [${timestamp}] ${req.method} ${req.path}`);
  console.log(`   Origin: ${req.headers.origin || 'unknown'}`);
  console.log(`   User-Agent: ${req.headers['user-agent'] || 'unknown'}`);
  
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('📦 Request Body:', JSON.stringify(req.body, null, 2));
  }
  
  if (req.query && Object.keys(req.query).length > 0) {
    console.log('🔍 Query Params:', JSON.stringify(req.query, null, 2));
  }
  
  next();
});

// API Routes
app.use("/api/user", userRoutes);
app.use("/api/booking", bookingRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/notification", notificationRoutes);

// Health Check Route
app.get("/", (req, res) => {
  res.json({ 
    success: true, 
    message: "Convenz Customer Backend API",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: "/api/user/register, /api/user/verify-otp",
      profile: "/api/user/profile/:userId",
      booking: "/api/user/booking/create",
      bookings: "/api/user/bookings/:userId"
    },
    timestamp: new Date().toISOString()
  });
});

// 404 Handler
app.use((req, res) => {
  console.error(`\n❌ 404 NOT FOUND`);
  console.error(`   Method: ${req.method}`);
  console.error(`   Path: ${req.path}`);
  console.error(`   Original URL: ${req.originalUrl}`);
  console.error(`   Full URL: ${req.protocol}://${req.get('host')}${req.originalUrl}`);
  console.error(`   Body:`, JSON.stringify(req.body));
  console.error(`   Params:`, JSON.stringify(req.params));
  console.error(`   Query:`, JSON.stringify(req.query));
  console.error(`\n   📋 Available routes:`);
  console.error(`   Auth: POST /api/user/register, /api/user/verify-otp`);
  console.error(`   Profile: GET/POST /api/user/profile/:userId`);
  console.error(`   Booking: POST /api/user/booking/create`);
  console.error(`   Bookings: GET /api/user/bookings/:userId`);
  console.error(`   Booking Details: GET /api/user/booking/:bookingId`);
  
  let hint = "Check if the endpoint path is correct.";
  
  res.status(404).json({ 
    success: false, 
    message: "Route not found",
    requestedPath: req.path,
    method: req.method,
    hint: hint
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err);
  res.status(500).json({ 
    success: false, 
    message: "Internal server error",
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start Server
const PORT = process.env.PORT || 5005;
const HOST = '0.0.0.0'; // Required for Render deployment

app.listen(PORT, HOST, () => {
  console.log(`✅ SERVER_STARTED | ${new Date().toISOString()} | Port: ${PORT} | Host: ${HOST} | Env: ${process.env.NODE_ENV}`);
});
