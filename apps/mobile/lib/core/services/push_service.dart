import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

class PushService {
  static final PushService _instance = PushService._internal();
  factory PushService() => _instance;
  PushService._internal();

  String? _token;
  String? get token => _token;

  Future<void> initialize() async {
    final messaging = FirebaseMessaging.instance;

    // Request permission
    final settings = await messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized ||
        settings.authorizationStatus == AuthorizationStatus.provisional) {
      _token = await messaging.getToken();
      debugPrint('[FCM] Token: ${_token?.substring(0, 20)}...');

      // Listen for token refresh
      messaging.onTokenRefresh.listen((newToken) {
        _token = newToken;
        debugPrint('[FCM] Token refreshed');
      });

      // Handle foreground messages
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        debugPrint('[FCM] Foreground: ${message.notification?.title}');
      });
    } else {
      debugPrint('[FCM] Permission denied');
    }
  }
}
