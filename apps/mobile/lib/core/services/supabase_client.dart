import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseConfig {
  static const String url = 'https://gbhoekuodlbjgczajgrw.supabase.co';
  static const String anonKey = 'sb_publishable_SLsfOk9rCcMmDAZDbcDIeA_zdYWt19G';
  static bool get isConfigured => url.isNotEmpty && anonKey.isNotEmpty;
}

/// Listens for all real-time events relevant to the student app.
class RealtimeDeals {
  RealtimeChannel? _dealsChannel;
  RealtimeChannel? _studentChannel;

  VoidCallback? onDealChanged;
  VoidCallback? onStockChanged;
  VoidCallback? onVoucherChanged;
  void Function(String status)? onVerificationChanged;

  void subscribe({String? studentUserId}) {
    if (!SupabaseConfig.isConfigured) return;
    final client = Supabase.instance.client;

    // Deal changes (create/update/toggle/feature) + stock changes
    _dealsChannel = client.channel('deals');
    _dealsChannel!
        .onBroadcast(event: 'deal_change', callback: (payload) {
          debugPrint('[Realtime] Deal changed: $payload');
          onDealChanged?.call();
        })
        .onBroadcast(event: 'stock_change', callback: (payload) {
          debugPrint('[Realtime] Stock changed: $payload');
          onStockChanged?.call();
        })
        .subscribe();

    // Student-specific: voucher updates, verification status
    if (studentUserId != null) {
      _studentChannel = client.channel('student:$studentUserId');
      _studentChannel!
          .onBroadcast(event: 'voucher_update', callback: (payload) {
            debugPrint('[Realtime] Voucher updated: $payload');
            onVoucherChanged?.call();
          })
          .onBroadcast(event: 'verification_change', callback: (payload) {
            debugPrint('[Realtime] Verification changed: $payload');
            final status = payload['status'] as String? ?? '';
            onVerificationChanged?.call(status);
          })
          .subscribe();
    }
  }

  void dispose() {
    _dealsChannel?.unsubscribe();
    _studentChannel?.unsubscribe();
    _dealsChannel = null;
    _studentChannel = null;
  }
}
