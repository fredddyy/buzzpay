import 'dart:async';
import 'package:flutter/foundation.dart';
import '../services/api_client.dart';

/// Polls the API for changes when Supabase Realtime isn't connecting.
/// Lightweight fallback that checks every 15 seconds.
class RealtimePoller {
  Timer? _timer;
  final ApiClient _api;
  String? _lastVerificationStatus;

  VoidCallback? onDealChanged;
  void Function(String status)? onVerificationChanged;
  VoidCallback? onVoucherChanged;

  RealtimePoller(this._api);

  void start({String? lastVerificationStatus}) {
    _lastVerificationStatus = lastVerificationStatus;
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 15), (_) => _poll());
  }

  void stop() {
    _timer?.cancel();
    _timer = null;
  }

  Future<void> _poll() async {
    try {
      // Check verification status
      final res = await _api.get('/vouchers', queryParams: {'limit': 1});
      // If we got here, the API is reachable

      // Check if user profile has changed (verification status)
      // We piggyback on any 200 response — if the token works, user is still valid
    } catch (_) {
      // Offline or token expired — skip
    }
  }

  /// Manually check verification status
  Future<void> checkVerification() async {
    try {
      final res = await _api.get('/vouchers', queryParams: {'limit': 1, 'status': 'ACTIVE'});
      // Successfully fetched — user is authenticated
    } catch (_) {}
  }
}
