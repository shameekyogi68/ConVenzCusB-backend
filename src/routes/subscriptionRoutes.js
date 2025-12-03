import express from "express";
import {
  createPlan,
  getActivePlans,
  purchaseSubscription,
  getUserSubscription
} from "../controllers/subscriptionController.js";

const router = express.Router();

/* ------------------------------------------
   💳 SUBSCRIPTION ROUTES
------------------------------------------- */
router.post("/plans", createPlan);
router.get("/plans", getActivePlans);
router.post("/purchase", purchaseSubscription);
router.get("/user/:userId", getUserSubscription);

export default router;
