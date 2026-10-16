import {
    sendPasswordResetOtpService,
    verifyPasswordResetOtpService,
    resetPasswordWithTokenService,
} from '../services/passwordResetService.js';

export const sendResetOtpController = (role) => async (req, res) => {
    try {
        const { identifier, phone, email } = req.body;
        const targetIdentifier = identifier || phone || email;

        const result = await sendPasswordResetOtpService({
            identifier: targetIdentifier,
            role,
        });

        res.status(200).json(result);
    } catch (error) {
        console.error(`[passwordResetController.sendResetOtp] Error:`, error.message);
        const isRateLimit = error.message.includes('Maximum OTP limit reached');
        res.status(isRateLimit ? 429 : 400).json({
            success: false,
            message: error.message,
        });
    }
};

export const verifyResetOtpController = (role) => async (req, res) => {
    try {
        const { phone, otp } = req.body;

        const result = await verifyPasswordResetOtpService({
            phone,
            otp,
            role,
        });

        res.status(200).json(result);
    } catch (error) {
        console.error(`[passwordResetController.verifyResetOtp] Error:`, error.message);
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};

export const resetPasswordController = (role) => async (req, res) => {
    try {
        const { phone, resetToken, newPassword } = req.body;

        const result = await resetPasswordWithTokenService({
            phone,
            resetToken,
            newPassword,
            role,
        });

        res.status(200).json(result);
    } catch (error) {
        console.error(`[passwordResetController.resetPassword] Error:`, error.message);
        res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
