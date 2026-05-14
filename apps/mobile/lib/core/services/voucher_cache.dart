import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../../models/voucher.dart';

/// Caches active vouchers locally for offline QR display.
/// Students can show their QR even without network connectivity.
class VoucherCache {
  static const _key = 'cached_vouchers';
  static const _timestampKey = 'cached_vouchers_at';

  /// Save vouchers to local storage
  static Future<void> cacheVouchers(List<Voucher> vouchers) async {
    final prefs = await SharedPreferences.getInstance();
    final activeVouchers = vouchers.where((v) => v.isActive).toList();
    final json = jsonEncode(activeVouchers.map((v) => v.toJson()).toList());
    await prefs.setString(_key, json);
    await prefs.setInt(_timestampKey, DateTime.now().millisecondsSinceEpoch);
  }

  /// Load vouchers from local cache (for offline use)
  static Future<List<Voucher>> loadCachedVouchers() async {
    final prefs = await SharedPreferences.getInstance();
    final json = prefs.getString(_key);
    if (json == null) return [];

    try {
      final list = jsonDecode(json) as List;
      return list
          .map((v) => Voucher.fromJson(v as Map<String, dynamic>))
          .where((v) => v.isActive) // filter out any that expired since caching
          .toList();
    } catch (_) {
      return [];
    }
  }

  /// Check if cache exists and is recent (within 24 hours)
  static Future<bool> hasFreshCache() async {
    final prefs = await SharedPreferences.getInstance();
    final timestamp = prefs.getInt(_timestampKey);
    if (timestamp == null) return false;
    final age = DateTime.now().millisecondsSinceEpoch - timestamp;
    return age < 24 * 60 * 60 * 1000; // 24 hours
  }

  /// Clear cache (e.g., on logout)
  static Future<void> clearCache() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_key);
    await prefs.remove(_timestampKey);
  }
}
