import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseConfig {
  static const String url = 'https://gbhoekuodlbjgczajgrw.supabase.co';
  static const String anonKey = 'sb_publishable_SLsfOk9rCcMmDAZDbcDIeA_zdYWt19G';
  static bool get isConfigured => false; // Disabled until Supabase project is set up
}

class RealtimeDeals {
  RealtimeChannel? _channel;

  VoidCallback? onDealChanged;
  VoidCallback? onStockChanged;
  VoidCallback? onVoucherChanged;
  void Function(String status)? onVerificationChanged;

  void subscribe({String? studentUserId}) {
    if (!SupabaseConfig.isConfigured) return;

    try {
      final client = Supabase.instance.client;
      debugPrint('[Realtime] Subscribing...');

      _channel = client.channel('deals',
        opts: const RealtimeChannelConfig(self: true),
      );

      _channel!.onBroadcast(event: 'deal_change', callback: (payload) {
        debugPrint('[Realtime] deal_change: $payload');
        onDealChanged?.call();
      });

      _channel!.onBroadcast(event: 'stock_change', callback: (payload) {
        debugPrint('[Realtime] stock_change: $payload');
        onStockChanged?.call();
      });

      _channel!.onBroadcast(event: 'verification_change', callback: (payload) {
        debugPrint('[Realtime] verification_change: $payload');
        final inner = payload['payload'] as Map<String, dynamic>? ?? payload;
        final status = inner['status'] as String? ?? payload['status'] as String? ?? '';
        debugPrint('[Realtime] extracted status: $status');
        onVerificationChanged?.call(status);
      });

      _channel!.onBroadcast(event: 'voucher_update', callback: (payload) {
        debugPrint('[Realtime] voucher_update: $payload');
        onVoucherChanged?.call();
      });

      _channel!.subscribe((status, error) {
        debugPrint('[Realtime] channel → $status ${error ?? ""}');

        // Self-test: send a broadcast to verify round-trip works
        if (status == RealtimeSubscribeStatus.subscribed) {
          debugPrint('[Realtime] Sending self-test...');
          _channel!.sendBroadcastMessage(
            event: 'deal_change',
            payload: {'test': 'self', 'timestamp': DateTime.now().toIso8601String()},
          );
        }
      });
    } catch (e) {
      debugPrint('[Realtime] Error: $e');
    }
  }

  void dispose() {
    _channel?.unsubscribe();
    _channel = null;
  }
}
