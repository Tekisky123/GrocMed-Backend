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
        const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        firebaseInitialized = true;
        console.log('Firebase Admin Initialized successfully.');
    } else {
        console.warn('FIREBASE_CREDENTIALS not found in env. Notifications will be mocked.');
    }
} catch (error) {
    console.error('Error initializing Firebase Admin:', error);
}

export const sendPushNotification = async (fcmToken, title, body, data = {}) => {
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
        data,
        token: fcmToken
    };

    try {
        const response = await admin.messaging().send(message);
        console.log('Successfully sent message:', response);
        return response;
    } catch (error) {
        console.error('Error sending message:', error);
        // We generally don't want to throw here to avoid breaking the order update flow
        return null;
    }
};
