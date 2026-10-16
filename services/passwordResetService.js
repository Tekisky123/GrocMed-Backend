import crypto from 'crypto';
import bcrypt from 'bcrypt';
import Customer from '../model/customerModel.js';
import DeliveryPartner from '../model/deliveryPartnerModel.js';
import PasswordResetOtp from '../model/passwordResetOtpModel.js';
import { sendWhatsAppMessage } from '../utils/whatsappService.js';

/**
 * Normalizes phone number to 10 digits (removing country codes/spaces)
 */
const normalizePhone = (input) => {
    if (!input) return '';
    const digits = input.toString().replace(/\D/g, '');
    if (digits.length > 10 && digits.startsWith('91')) {
        return digits.slice(-10);
    }
    return digits.slice(-10);
};

/**
 * Masks phone number for display (e.g. ******3210)
 */
const maskPhone = (phone) => {
    if (!phone || phone.length < 4) return '******';
    return '*'.repeat(phone.length - 4) + phone.slice(-4);
};

/**
 * Generates a cryptographically secure 6-digit numeric OTP
 */
const generateNumericOtp = () => {
    return Math.floor(100000 + crypto.randomInt(0, 900000)).toString();
};

/**
 * Request OTP for password reset
 * @param {string} identifier - Phone number or email
 * @param {'customer' | 'delivery_partner'} role
 */
export const sendPasswordResetOtpService = async ({ identifier, role }) => {
    if (!identifier) {
        throw new Error('Phone number or email is required');
    }

    const isEmail = identifier.toString().includes('@');
    let user = null;

    if (role === 'customer') {
        if (isEmail) {
            user = await Customer.findOne({ email: identifier.trim().toLowerCase() });
        } else {
            const cleanPhone = normalizePhone(identifier);
            user = await Customer.findOne({ phone: cleanPhone });
        }
    } else if (role === 'delivery_partner') {
        if (isEmail) {
            user = await DeliveryPartner.findOne({ email: identifier.trim().toLowerCase() });
        } else {
            const cleanPhone = normalizePhone(identifier);
            user = await DeliveryPartner.findOne({ phone: cleanPhone });
        }
    } else {
        throw new Error('Invalid user role specified');
    }

    if (!user) {
        throw new Error(`No account found matching "${identifier}". Please check and try again.`);
    }

    if (!user.isActive) {
        throw new Error('Your account is currently inactive. Please contact customer support.');
    }

    const phone = normalizePhone(user.phone);
    if (!phone || phone.length !== 10) {
        throw new Error('A valid registered phone number is required on your profile to receive WhatsApp OTP.');
    }

    // Check existing OTP record
    const existingOtpRecord = await PasswordResetOtp.findOne({ phone, role });

    let sendCount = 1;
    let otpRecord;
    const now = new Date();

    if (existingOtpRecord) {
        // Enforce the 2-time OTP send limit rule
        if (existingOtpRecord.sendCount >= 2) {
            const waitMinutes = Math.max(1, Math.ceil((existingOtpRecord.expiresAt - now) / 60000));
            throw new Error(`Maximum OTP limit reached (2 attempts). Please wait ${waitMinutes} minute(s) before requesting again or contact support.`);
        }

        // Second and final attempt
        sendCount = existingOtpRecord.sendCount + 1;
        const newOtp = generateNumericOtp();

        existingOtpRecord.otp = newOtp;
        existingOtpRecord.sendCount = sendCount;
        existingOtpRecord.isVerified = false;
        existingOtpRecord.resetToken = null;
        existingOtpRecord.expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
        otpRecord = await existingOtpRecord.save();
    } else {
        // First attempt
        const newOtp = generateNumericOtp();
        otpRecord = new PasswordResetOtp({
            phone,
            role,
            userId: user._id,
            otp: newOtp,
            sendCount: 1,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes validity
        });
        await otpRecord.save();
    }

    const campaignName = process.env.AISENSY_CAMPAIGN_PASSWORD_CHANGE_OTP || 'password_change_otp';
    console.log(`[PASSWORD RESET] Generated OTP ${otpRecord.otp} for ${role} (${phone}). Send count: ${sendCount}/2. Campaign: "${campaignName}"`);

    // Dispatch WhatsApp template message
    let whatsappResult = { success: false, error: null };
    try {
        whatsappResult = await sendWhatsAppMessage(
            phone,
            user.name || 'User',
            campaignName,
            [otpRecord.otp]
        );
        console.log(`[PASSWORD RESET] WhatsApp dispatch result:`, whatsappResult);
    } catch (sendErr) {
        console.error(`[PASSWORD RESET] Failed to deliver WhatsApp OTP:`, sendErr.message);
        whatsappResult = { success: false, error: sendErr.message };
    }

    const isDevOrAiSensyIssue = !whatsappResult.success || process.env.NODE_ENV === 'development';
    let messageText = `OTP sent to your registered WhatsApp number ending in ${phone.slice(-4)}.`;

    if (!whatsappResult.success && whatsappResult.error?.message === 'No Plan active on assistant!') {
        console.warn(`[PASSWORD RESET ALERT] AiSensy account subscription/plan is inactive ('No Plan active on assistant!').`);
        messageText = `OTP generated! (Note: AiSensy plan is currently inactive. Test OTP: ${otpRecord.otp})`;
    }

    return {
        success: true,
        message: messageText,
        phone,
        maskedPhone: maskPhone(phone),
        sendCount,
        maxAttempts: 2,
        attemptsLeft: Math.max(0, 2 - sendCount),
        ...(isDevOrAiSensyIssue ? { devOtp: otpRecord.otp } : {}),
    };
};

/**
 * Verify received OTP
 * @param {string} phone
 * @param {string} otp
 * @param {'customer' | 'delivery_partner'} role
 */
export const verifyPasswordResetOtpService = async ({ phone, otp, role }) => {
    if (!phone || !otp) {
        throw new Error('Phone number and OTP code are required');
    }

    const cleanPhone = normalizePhone(phone);
    const cleanOtp = otp.toString().trim();

    const record = await PasswordResetOtp.findOne({ phone: cleanPhone, role });
    if (!record) {
        throw new Error('No active OTP request found for this phone number. Please request a new OTP.');
    }

    if (new Date() > record.expiresAt) {
        await PasswordResetOtp.deleteOne({ _id: record._id });
        throw new Error('The OTP has expired. Please request a new OTP.');
    }

    if (record.otp !== cleanOtp) {
        throw new Error('Invalid OTP code. Please enter the correct code sent to your WhatsApp.');
    }

    // Generate single-use reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    record.isVerified = true;
    record.resetToken = resetToken;
    await record.save();

    return {
        success: true,
        message: 'OTP verified successfully.',
        resetToken,
        phone: cleanPhone,
    };
};

/**
 * Reset password using the verified resetToken
 * @param {string} phone
 * @param {string} resetToken
 * @param {string} newPassword
 * @param {'customer' | 'delivery_partner'} role
 */
export const resetPasswordWithTokenService = async ({ phone, resetToken, newPassword, role }) => {
    if (!phone || !resetToken || !newPassword) {
        throw new Error('Phone, reset token, and new password are required');
    }

    if (newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters long');
    }

    const cleanPhone = normalizePhone(phone);

    const record = await PasswordResetOtp.findOne({
        phone: cleanPhone,
        role,
        resetToken,
        isVerified: true,
    });

    if (!record) {
        throw new Error('Password reset session has expired or is invalid. Please request a new OTP.');
    }

    if (new Date() > record.expiresAt) {
        await PasswordResetOtp.deleteOne({ _id: record._id });
        throw new Error('Password reset session has expired. Please request a new OTP.');
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    if (role === 'customer') {
        const customer = await Customer.findByIdAndUpdate(record.userId, { password: hashedPassword });
        if (!customer) {
            throw new Error('Customer account not found');
        }
    } else if (role === 'delivery_partner') {
        const partner = await DeliveryPartner.findByIdAndUpdate(record.userId, { password: hashedPassword });
        if (!partner) {
            throw new Error('Delivery partner account not found');
        }
    }

    // Clean up OTP session so token cannot be used again
    await PasswordResetOtp.deleteOne({ _id: record._id });

    return {
        success: true,
        message: 'Password reset successfully. You can now login with your new password.',
    };
};
