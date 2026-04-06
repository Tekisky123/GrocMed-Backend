import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure logs directory exists
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

const logFile = path.join(logDir, 'operations.log');

export const sysLog = (category, message) => {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${category.toUpperCase()}] ${message}\n`;
    
    // Console output for quick dev loop
    console.log(formattedMessage.trim());

    // File stream for operational auditing
    fs.appendFile(logFile, formattedMessage, (err) => {
        if (err) console.error('Failed to write to generic log:', err);
    });
};
