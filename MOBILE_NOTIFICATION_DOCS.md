# Mobile App Notification Integration Guide

## Overview
The GrocMed Backend uses Firebase Cloud Messaging (FCM) to send OS-level push notifications to customers when their order status changes.

## Prerequisites
1.  **Firebase Project:** Create a Firebase project.
2.  **Mobile App Config:** Add `google-services.json` (Android) / `GoogleService-Info.plist` (iOS) to your mobile app.
3.  **Backend Config:** The backend is already configured with `firebase-admin`.

---

## Step 1: Request Notification Permission
In your Mobile App , request permission from the user to send notifications.

**Example (React Native + Firebase Messaging):**
```javascript
import messaging from '@react-native-firebase/messaging';

async function requestUserPermission() {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    console.log('Authorization status:', authStatus);
  }
}
```

## Step 2: Get FCM Token
Once permitted, retrieve the device's FCM Token.

```javascript
async function getFCMToken() {
  const token = await messaging().getToken();
  console.log('FCM Token:', token);
  return token;
}
```

## Step 3: Send Token to Backend
**Crucial Step:** You must send this token to the backend so it can be stored with the Customer profile. Call this API **after login** or **when the token refreshes**.

**API Endpoint:** `POST /api/customer/update-fcm-token`
**Headers:** `Authorization: Bearer <CUSTOMER_TOKEN>`
**Body:**
```json
{
  "fcmToken": "dkjh342..."
}
```

## Step 4: Handle Notifications
Listen for notifications in your app.

**Foreground State:**
```javascript
messaging().onMessage(async remoteMessage => {
  Alert.alert('A new FCM message arrived!', JSON.stringify(remoteMessage));
});
```

**Background/Quit State:**
Background messages are handled by the OS tray. Tapping them should open the app. The payload contains `data: { orderId: "..." }`, which you can use to navigate the user to the specific Order Details screen.
