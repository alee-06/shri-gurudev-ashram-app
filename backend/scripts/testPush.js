const { Expo } = require("expo-server-sdk");

const expo = new Expo();

const pushToken = "INSERT TOKEN HERE";

async function sendTestPush() {
  if (!Expo.isExpoPushToken(pushToken)) {
    console.error("Invalid Expo Push Token");
    return;
  }

  const messages = [
    {
      to: pushToken,
      sound: "default",
      title: "Test Notification",
      body: "Push notifications are working 🎉",
      data: { source: "manual-test" },
    },
  ];

  try {
    const chunks = expo.chunkPushNotifications(messages);

    for (const chunk of chunks) {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      console.log("Tickets:", tickets);
    }

    console.log("Notification sent successfully");
  } catch (error) {
    console.error("Failed to send notification:", error);
  }
}

sendTestPush();
