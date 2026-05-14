import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseConfig {
  static const String url = 'https://gbhoekuodlbjgczajgrw.supabase.co';
  static const String anonKey = 'sb_publishable_SLsfOk9rCcMmDAZDbcDIeA_zdYWt19G';
  static bool get isConfigured => url.isNotEmpty && anonKey.isNotEmpty;
}

/// Listens for all real-time events relevant to the vendor app.
class RealtimeVendor {
  RealtimeChannel? _vendorChannel;
  RealtimeChannel? _dealsChannel;

  void Function(Map<String, dynamic> payload)? onSettlement;
  VoidCallback? onVendorStatusChanged;
  VoidCallback? onDealChanged;
  void Function(Map<String, dynamic> payload)? onRedemption;

  void subscribe(String vendorId) {
    if (!SupabaseConfig.isConfigured) return;
    final client = Supabase.instance.client;

    // Vendor-specific: settlements, status changes, redemptions
    _vendorChannel = client.channel('vendor:$vendorId');
    _vendorChannel!
        .onBroadcast(event: 'settlement', callback: (payload) {
          debugPrint('[Realtime] Settlement: $payload');
          onSettlement?.call(payload);
        })
        .onBroadcast(event: 'vendor_change', callback: (payload) {
          debugPrint('[Realtime] Vendor status: $payload');
          onVendorStatusChanged?.call();
        })
        .onBroadcast(event: 'redemption', callback: (payload) {
          debugPrint('[Realtime] Redemption: $payload');
          onRedemption?.call(payload);
        })
        .subscribe();

    // Deal changes (admin created/updated deals for this vendor)
    _dealsChannel = client.channel('deals');
    _dealsChannel!
        .onBroadcast(event: 'deal_change', callback: (payload) {
          debugPrint('[Realtime] Deal changed: $payload');
          onDealChanged?.call();
        })
        .onBroadcast(event: 'stock_change', callback: (payload) {
          debugPrint('[Realtime] Stock changed: $payload');
          onDealChanged?.call();
        })
        .subscribe();
  }

  void dispose() {
    _vendorChannel?.unsubscribe();
    _dealsChannel?.unsubscribe();
    _vendorChannel = null;
    _dealsChannel = null;
  }
}
