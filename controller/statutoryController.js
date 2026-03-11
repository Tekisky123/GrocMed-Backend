import Shareholder from '../model/shareholderModel.js';
import Director from '../model/directorModel.js';
import Charge from '../model/chargeModel.js';
import mongoose from 'mongoose';

// @desc    Get all active shareholders
// @route   GET /api/admin/statutory/members
// @access  Private/Admin
export const getShareholders = async (req, res, next) => {
    try {
        const members = await Shareholder.find({ status: 'Active' });

        const totalShares = members.reduce((acc, m) => acc + m.sharesHeld, 0);

        res.status(200).json({
            success: true,
            count: members.length,
            totalShares,
            data: members,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Add a new shareholder
// @route   POST /api/admin/statutory/members
// @access  Private/Admin
export const createShareholder = async (req, res, next) => {
    try {
        const member = await Shareholder.create(req.body);

        res.status(201).json({
            success: true,
            message: 'Shareholder added to statutory register successfully',
            data: member,
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Folio or PAN already exists.' });
        }
        next(error);
    }
};

// @desc    Record a share transfer between folios
// @route   POST /api/admin/statutory/transfer
// @access  Private/Admin
export const transferShares = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { fromFolio, toFolio, noOfShares } = req.body;

        const sender = await Shareholder.findOne({ folioNo: fromFolio.toUpperCase() }).session(session);
        const receiver = await Shareholder.findOne({ folioNo: toFolio.toUpperCase() }).session(session);

        if (!sender) return res.status(404).json({ success: false, message: 'Transferor Folio not found' });
        if (!receiver) return res.status(404).json({ success: false, message: 'Transferee Folio not found' });

        if (sender.sharesHeld < noOfShares) {
            return res.status(400).json({ success: false, message: 'Insufficient shares in transferor folio' });
        }

        // Deduct from sender
        sender.sharesHeld -= noOfShares;
        if (sender.sharesHeld === 0) sender.status = 'Transferred';
        await sender.save({ session });

        // Add to receiver
        receiver.sharesHeld += noOfShares;
        await receiver.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            success: true,
            message: `Successfully transferred ${noOfShares} shares from Folio ${fromFolio} to ${toFolio}`,
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        next(error);
    }
};

// @desc    Get all active directors
// @route   GET /api/admin/statutory/directors
// @access  Private/Admin
export const getDirectors = async (req, res, next) => {
    try {
        const directors = await Director.find({ status: 'Active' });
        res.status(200).json({ success: true, count: directors.length, data: directors });
    } catch (error) {
        next(error);
    }
};

// @desc    Add a new director
// @route   POST /api/admin/statutory/directors
// @access  Private/Admin
export const createDirector = async (req, res, next) => {
    try {
        const director = await Director.create(req.body);
        res.status(201).json({ success: true, message: 'Director recorded successfully', data: director });
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ success: false, message: 'DIN already exists.' });
        next(error);
    }
};

// @desc    Get all active charges/loans
// @route   GET /api/admin/statutory/charges
// @access  Private/Admin
export const getCharges = async (req, res, next) => {
    try {
        const charges = await Charge.find({ status: 'Active' });
        res.status(200).json({ success: true, count: charges.length, data: charges });
    } catch (error) {
        next(error);
    }
};

// @desc    Record a new charge
// @route   POST /api/admin/statutory/charges
// @access  Private/Admin
export const createCharge = async (req, res, next) => {
    try {
        const charge = await Charge.create(req.body);
        res.status(201).json({ success: true, message: 'Charge registered successfully', data: charge });
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ success: false, message: 'Charge ID or ROC ID already exists.' });
        next(error);
    }
};
