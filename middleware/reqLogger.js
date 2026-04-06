import { sysLog } from '../utils/logger.js';

export const reqLogger = (req, res, next) => {
    // Only log the completion of the request to capture status
    res.on('finish', () => {
        // Exclude 200 OK /GET methods spamming logs, filter to meaningful hits (mutations or errors)
        if (req.method !== 'GET' || res.statusCode >= 400) {
            sysLog('API-TRAFFIC', `${req.method} ${req.originalUrl} | Status: ${res.statusCode} | IP: ${req.ip}`);
        }
    });
    next();
};
