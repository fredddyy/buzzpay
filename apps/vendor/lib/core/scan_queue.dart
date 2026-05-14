import 'dart:async';
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_client.dart';

/// Queues failed scans locally and syncs them when connection returns.
/// Ensures no redemption is lost during Lagos campus network drops.
class ScanQueue {
  static const _key = 'pending_scans';
  static Timer? _syncTimer;
  static bool _syncing = false;

  /// Add a failed scan to the queue
  static Future<void> enqueue(String qrPayload) async {
    final prefs = await SharedPreferences.getInstance();
    final list = prefs.getStringList(_key) ?? [];
    final entry = jsonEncode({
      'qrPayload': qrPayload,
      'scannedAt': DateTime.now().toIso8601String(),
    });
    list.add(entry);
    await prefs.setStringList(_key, list);
  }

  /// Get pending scan count
  static Future<int> pendingCount() async {
    final prefs = await SharedPreferences.getInstance();
    return (prefs.getStringList(_key) ?? []).length;
  }

  /// Try to sync all queued scans with the server
  static Future<SyncResult> syncAll() async {
    if (_syncing) return SyncResult(synced: 0, failed: 0, remaining: 0);
    _syncing = true;

    final prefs = await SharedPreferences.getInstance();
    final list = prefs.getStringList(_key) ?? [];
    if (list.isEmpty) {
      _syncing = false;
      return SyncResult(synced: 0, failed: 0, remaining: 0);
    }

    final api = VendorApiClient();
    final failed = <String>[];
    int synced = 0;

    for (final entry in list) {
      try {
        final data = jsonDecode(entry) as Map<String, dynamic>;
        await api.redeemRotatingQr(data['qrPayload']);
        synced++;
      } catch (_) {
        failed.add(entry);
      }
    }

    await prefs.setStringList(_key, failed);
    _syncing = false;

    return SyncResult(synced: synced, failed: failed.length, remaining: failed.length);
  }

  /// Start periodic background sync (every 30 seconds)
  static void startBackgroundSync() {
    _syncTimer?.cancel();
    _syncTimer = Timer.periodic(const Duration(seconds: 30), (_) async {
      final count = await pendingCount();
      if (count > 0) await syncAll();
    });
  }

  /// Stop background sync
  static void stopBackgroundSync() {
    _syncTimer?.cancel();
    _syncTimer = null;
  }

  /// Clear queue (e.g., on logout)
  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_key);
  }
}

class SyncResult {
  final int synced;
  final int failed;
  final int remaining;
  SyncResult({required this.synced, required this.failed, required this.remaining});
}
