import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/theme/colors.dart';
import '../../core/api_client.dart';
import '../../core/supabase_config.dart';

class VendorDealsScreen extends StatefulWidget {
  const VendorDealsScreen({super.key});

  @override
  State<VendorDealsScreen> createState() => _VendorDealsScreenState();
}

class _VendorDealsScreenState extends State<VendorDealsScreen> {
  final _api = VendorApiClient();
  List<Map<String, dynamic>> _deals = [];
  bool _loading = true;
  RealtimeChannel? _channel;

  @override
  void initState() {
    super.initState();
    _load();
    _subscribeRealtime();
  }

  void _subscribeRealtime() {
    if (!SupabaseConfig.isConfigured) return;
    _channel = Supabase.instance.client.channel('deals');
    _channel!.onBroadcast(event: 'deal_change', callback: (_) => _load());
    _channel!.subscribe();
  }

  @override
  void dispose() {
    _channel?.unsubscribe();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await _api.get('/vendor/my-deals');
      _deals = List<Map<String, dynamic>>.from(res.data['data'] ?? []);
    } catch (_) {
      _deals = [];
    }
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    final active = _deals.where((d) => d['isActive'] == true).length;

    return Scaffold(
      backgroundColor: VColors.base,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
              child: Row(
                children: [
                  const Text('My Deals', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: VColors.text)),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(color: VColors.successSurface, borderRadius: BorderRadius.circular(20)),
                    child: Text('$active active',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: VColors.success)),
                  ),
                ],
              ),
            ),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator(color: VColors.primary))
                  : _deals.isEmpty
                      ? const Center(child: Text('No deals yet', style: TextStyle(color: VColors.textMuted)))
                      : RefreshIndicator(
                          onRefresh: _load,
                          child: ListView.separated(
                            padding: const EdgeInsets.symmetric(horizontal: 20),
                            itemCount: _deals.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 10),
                            itemBuilder: (_, i) => _dealRow(_deals[i]),
                          ),
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _dealRow(Map<String, dynamic> d) {
    final price = (d['studentPrice'] as int?) ?? 0;
    final stock = (d['remainingQty'] as int?) ?? 0;
    final total = (d['totalQuantity'] as int?) ?? 1;
    final isActive = d['isActive'] == true;
    final section = d['featuredSection'] as String?;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: VColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: VColors.border),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(d['title'] ?? '',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600,
                            color: isActive ? VColors.text : VColors.textMuted),
                          maxLines: 1, overflow: TextOverflow.ellipsis),
                    ),
                    if (section != null) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(color: VColors.surfaceLight, borderRadius: BorderRadius.circular(6)),
                        child: Text(section, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w600, color: VColors.textMuted)),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Text('₦${(price / 100).toStringAsFixed(0)}',
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: VColors.primary)),
                    const SizedBox(width: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: stock <= 5 ? VColors.warningSurface : VColors.surfaceLight,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text('$stock/$total left',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600,
                              color: stock <= 5 ? VColors.warning : VColors.textSecondary)),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(3),
                        child: LinearProgressIndicator(
                          value: total > 0 ? stock / total : 0,
                          minHeight: 4,
                          backgroundColor: VColors.surfaceHover,
                          valueColor: AlwaysStoppedAnimation(
                              stock / total < 0.2 ? VColors.error : VColors.primary),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: isActive ? VColors.successSurface : VColors.surfaceHover,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(isActive ? 'Active' : 'Off',
                style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600,
                    color: isActive ? VColors.success : VColors.textMuted)),
          ),
        ],
      ),
    );
  }
}
