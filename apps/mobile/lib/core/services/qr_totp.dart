import 'dart:convert';
import 'package:crypto/crypto.dart';

/// Client-side TOTP generator for rotating QR codes.
/// Generates the same codes as the backend, enabling offline QR display.
class QrTotp {
  static const _windowSeconds = 60;

  /// Get the current time window index
  static int _getTimeWindow([int offset = 0]) {
    return (DateTime.now().millisecondsSinceEpoch ~/ (_windowSeconds * 1000)) + offset;
  }

  /// Generate the rotating HMAC code (matches backend)
  static String _generateCode(String voucherId, String secret, [int windowOffset = 0]) {
    final window = _getTimeWindow(windowOffset);
    final key = utf8.encode(secret);
    final data = utf8.encode('$voucherId:$window');
    final hmacResult = Hmac(sha256, key).convert(data);
    return hmacResult.toString().substring(0, 16); // 16-char hex
  }

  /// Build the full QR payload (same format as backend)
  /// Format: bp://<voucherId>/<rotatingCode>/<windowTimestamp>
  static String buildPayload(String voucherId, String secret) {
    final code = _generateCode(voucherId, secret);
    final window = _getTimeWindow();
    return 'bp://$voucherId/$code/$window';
  }

  /// Seconds until the current QR code expires
  static int secondsUntilExpiry() {
    return _windowSeconds - ((DateTime.now().millisecondsSinceEpoch ~/ 1000) % _windowSeconds);
  }
}
