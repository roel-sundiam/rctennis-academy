const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { createReceipt, getReceipts, getReport, recordServiceChargePayment, deleteReceipt } = require('../controllers/payment-receipt.controller');

router.get('/report',          auth, getReport);                   // Admin: summary report
router.get('/',                auth, getReceipts);                 // Admin: list receipts
router.post('/',               auth, createReceipt);              // Admin: create receipt
router.post('/sc-payments',    auth, recordServiceChargePayment); // Admin: pay service charge
router.delete('/:id',          auth, deleteReceipt);              // Admin: delete receipt

module.exports = router;
