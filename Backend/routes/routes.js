const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");

router.post("/initiate", paymentController.initiatePayment);
router.get("/verify", paymentController.verifyPayment);
router.get("/success", paymentController.successPayment);
router.get("/failure", paymentController.failurePayment);

module.exports = router;
