import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Attempt to initialize Firebase Admin
// Ideally, the service account path is in GOOGLE_APPLICATION_CREDENTIALS
// Or passed directly. For now, we'll try standard initialization.
// If not configured, we'll log a warning and mock the send to prevent crashes.

let firebaseInitialized = false;

try {
    if (process.env.FIREBASE_CREDENTIALS) {
        let serviceAccount = process.env.FIREBASE_CREDENTIALS;

        // Check if it looks like a JSON object
        if (serviceAccount.trim().startsWith('{')) {
            try {
                serviceAccount = JSON.parse(serviceAccount);
            } catch (e) {
                console.error('Failed to parse FIREBASE_CREDENTIALS JSON:', e.message);
            }
        }

        // If it's a string (path) or object (parsed), cert() handles it
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });

        firebaseInitialized = true;
        console.log('Firebase Admin Initialized successfully.');
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        // Fallback to standard Google Auth variable
        admin.initializeApp();
        firebaseInitialized = true;
        console.log('Firebase Admin Initialized via GOOGLE_APPLICATION_CREDENTIALS.');
    } else {
        console.warn('FIREBASE_CREDENTIALS not found in env. Notifications will be mocked.');
    }
} catch (error) {
    console.error('Error initializing Firebase Admin:', error);
}

import { Expo } from 'expo-server-sdk';
const expo = new Expo();

export const sendPushNotification = async (fcmToken, title, body, data = {}) => {
    // Check for Expo Push Token
    if (Expo.isExpoPushToken(fcmToken)) {
        console.log(`Sending Expo Push Notification to: ${fcmToken}`);
        const messages = [{
            to: fcmToken,
            sound: 'default',
            title,
            body,
            data,
        }];

        try {
            const chunks = expo.chunkPushNotifications(messages);
            for (let chunk of chunks) {
                const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                console.log('Expo Notification Ticket:', ticketChunk);
            }
            return { success: true, method: 'expo' };
        } catch (error) {
            console.error('Error sending Expo notification:', error);
            return null;
        }
    }

    if (!firebaseInitialized) {
        console.log(`[MOCK NOTIFICATION] To: ${fcmToken} | Title: ${title} | Body: ${body}`);
        return { success: true, mock: true };
    }

    if (!fcmToken) {
        console.warn('No FCM Token provided for notification');
        return;
    }

    const message = {
        notification: {
            title,
            body
        },
        android: {
            priority: 'high',
            notification: {
                channelId: 'default',
                sound: 'default',
                priority: 'high',
                defaultSound: true
            }
        },
        data,
        token: fcmToken
    };

    console.log('Attempting to send FCM message:', JSON.stringify(message, null, 2));

    try {
        const response = await admin.messaging().send(message);
        console.log('Successfully sent message:', response);
        return response;
    } catch (error) {
        console.error('Error sending message:', error);
        if (error.code) console.error('Error Code:', error.code);
        if (error.message) console.error('Error Message:', error.message);

        // Return the error so the controller can handle it (e.g., remove invalid tokens)
        return { success: false, error: error };
    }
};
