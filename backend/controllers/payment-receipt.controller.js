const PaymentReceipt = require('../models/PaymentReceipt');
const ServiceChargePayment = require('../models/ServiceChargePayment');

const SERVICE_CHARGE_RATE = 0.02; // 2%

async function generateReceiptNumber() {
  const year = new Date().getFullYear();
  const count = await PaymentReceipt.countDocuments();
  const seq = String(count + 1).padStart(4, '0');
  return `RCT-${year}-${seq}`;
}

async function createReceipt(req, res, next) {
  try {
    const { playerName, reason, paymentDate, paymentMethod, paymentReference, baseAmount, notes } = req.body;

    if (!playerName || !reason || !paymentDate || !paymentMethod || baseAmount == null) {
      return res.status(400).json({ message: 'Player name, reason, payment date, payment method, and amount are required.' });
    }

    const base = Number(baseAmount);
    if (isNaN(base) || base <= 0) {
      return res.status(400).json({ message: 'baseAmount must be a positive number.' });
    }

    const serviceCharge = Math.round(base * SERVICE_CHARGE_RATE * 100) / 100;
    const totalAmount   = Math.round((base + serviceCharge) * 100) / 100;
    const receiptNumber = await generateReceiptNumber();

    const receipt = new PaymentReceipt({
      receiptNumber,
      playerName,
      reason,
      paymentDate:      new Date(paymentDate),
      paymentMethod,
      paymentReference: paymentReference || null,
      baseAmount:       base,
      serviceCharge,
      totalAmount,
      issuedBy:         req.admin.username,
      notes:            notes || null,
    });

    await receipt.save();
    res.status(201).json(receipt);
  } catch (err) {
    next(err);
  }
}

async function getReceipts(req, res, next) {
  try {
    const { from, to, paymentMethod, reason } = req.query;
    const filter = {};

    if (from || to) {
      filter.paymentDate = {};
      if (from) filter.paymentDate.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        filter.paymentDate.$lte = toDate;
      }
    }

    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (reason) filter.reason = reason;

    const receipts = await PaymentReceipt.find(filter).sort({ paymentDate: -1, createdAt: -1 });
    res.json(receipts);
  } catch (err) {
    next(err);
  }
}

async function getReport(req, res, next) {
  try {
    const { from, to } = req.query;
    const matchStage = {};

    if (from || to) {
      matchStage.paymentDate = {};
      if (from) matchStage.paymentDate.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        matchStage.paymentDate.$lte = toDate;
      }
    }

    const [summary] = await PaymentReceipt.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalReceipts:      { $sum: 1 },
          totalBaseAmount:    { $sum: '$baseAmount' },
          totalServiceCharge: { $sum: '$serviceCharge' },
          totalAmount:        { $sum: '$totalAmount' },
        },
      },
    ]);

    const byMethod = await PaymentReceipt.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id:                '$paymentMethod',
          count:              { $sum: 1 },
          totalBaseAmount:    { $sum: '$baseAmount' },
          totalServiceCharge: { $sum: '$serviceCharge' },
          totalAmount:        { $sum: '$totalAmount' },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    const byReason = await PaymentReceipt.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id:                '$reason',
          count:              { $sum: 1 },
          totalBaseAmount:    { $sum: '$baseAmount' },
          totalServiceCharge: { $sum: '$serviceCharge' },
          totalAmount:        { $sum: '$totalAmount' },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    // SC settlement is always ALL-TIME — independent of the date filter above
    const [allTimeSc] = await PaymentReceipt.aggregate([
      {
        $group: {
          _id:                null,
          totalServiceCharge: { $sum: '$serviceCharge' },
        },
      },
    ]);
    const totalScOwed = Math.round((allTimeSc?.totalServiceCharge ?? 0) * 100) / 100;

    const scPayments  = await ServiceChargePayment.find().sort({ paidAt: -1 });
    const totalScPaid = Math.round(scPayments.reduce((sum, p) => sum + p.amount, 0) * 100) / 100;
    const scBalance   = Math.round((totalScOwed - totalScPaid) * 100) / 100;

    res.json({
      summary: summary || {
        totalReceipts: 0,
        totalBaseAmount: 0,
        totalServiceCharge: 0,
        totalAmount: 0,
      },
      byMethod,
      byReason,
      serviceChargeRate: SERVICE_CHARGE_RATE,
      scLedger: {
        totalOwed:  totalScOwed,
        totalPaid:  totalScPaid,
        balance:    scBalance,
        payments:   scPayments,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function recordServiceChargePayment(req, res, next) {
  try {
    const { amount, paidAt, paidTo, paymentMethod, accountNumber, referenceNumber, notes } = req.body;
    const payAmount = Math.round(Number(amount) * 100) / 100;

    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({ message: 'Payment amount must be a positive number.' });
    }
    if (!paidTo || !paymentMethod) {
      return res.status(400).json({ message: 'Paid To and Payment Method are required.' });
    }

    const payment = new ServiceChargePayment({
      amount:          payAmount,
      paidAt:          paidAt ? new Date(paidAt) : new Date(),
      paidBy:          req.admin.username,
      paidTo,
      paymentMethod,
      accountNumber:   accountNumber || null,
      referenceNumber: referenceNumber || null,
      notes:           notes || null,
    });

    await payment.save();
    res.status(201).json(payment);
  } catch (err) {
    next(err);
  }
}

async function deleteReceipt(req, res, next) {
  try {
    const receipt = await PaymentReceipt.findByIdAndDelete(req.params.id);
    if (!receipt) return res.status(404).json({ message: 'Receipt not found.' });
    res.json({ message: 'Receipt deleted.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { createReceipt, getReceipts, getReport, recordServiceChargePayment, deleteReceipt };
