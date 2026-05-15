import 'package:flutter/material.dart';
import '../../core/theme/colors.dart';
import '../../core/api_client.dart';

class PayoutsScreen extends StatefulWidget {
  const PayoutsScreen({super.key});

  @override
  State<PayoutsScreen> createState() => _PayoutsScreenState();
}

class _PayoutsScreenState extends State<PayoutsScreen> {
  final _api = VendorApiClient();
  bool _loading = true;
  int _todayEarnings = 0;
  int _monthEarnings = 0;
  int _pendingPayout = 0;
  int _scansToday = 0;
  List<Map<String, dynamic>> _recentScans = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await _api.get('/vendor/stats');
      final data = res.data['data'];
      _todayEarnings = data['todayEarnings'] ?? 0;
      _monthEarnings = data['monthEarnings'] ?? 0;
      _pendingPayout = data['pendingPayout'] ?? 0;
      _scansToday = data['scansToday'] ?? 0;
      _recentScans = List<Map<String, dynamic>>.from(data['recentScans'] ?? []);
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  String _fmt(int kobo) => '₦${(kobo / 100).toStringAsFixed(0).replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}';

  String _timeAgo(String? iso) {
    if (iso == null) return '';
    final diff = DateTime.now().difference(DateTime.parse(iso));
    if (diff.inMinutes < 1) return 'just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: VColors.base,
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: VColors.primary))
            : RefreshIndicator(
                onRefresh: _load,
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 100),
                  children: [
                    const Text('Payouts', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: VColors.text)),
                    const SizedBox(height: 4),
                    const Text('Track your earnings and settlements', style: TextStyle(fontSize: 13, color: VColors.textMuted)),
                    const SizedBox(height: 20),

                    Row(children: [
                      _statCard("Today's Earnings", _fmt(_todayEarnings), VColors.success),
                      const SizedBox(width: 10),
                      _statCard('Pending Payout', _fmt(_pendingPayout), VColors.warning),
                    ]),
                    const SizedBox(height: 10),
                    Row(children: [
                      _statCard('This Month', _fmt(_monthEarnings), VColors.primary),
                      const SizedBox(width: 10),
                      _statCard('Scans Today', '$_scansToday', VColors.info),
                    ]),
                    const SizedBox(height: 24),

                    Row(
                      children: [
                        const Text('RECENT SCANS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: VColors.textMuted, letterSpacing: 1)),
                        const Spacer(),
                        Text('See all', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: VColors.primary)),
                      ],
                    ),
                    const SizedBox(height: 12),

                    if (_recentScans.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(color: VColors.surface, borderRadius: BorderRadius.circular(14)),
                        child: const Center(child: Text('No scans yet', style: TextStyle(color: VColors.textMuted))),
                      )
                    else
                      ..._recentScans.map((scan) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: VColors.surface,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: VColors.border),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 36, height: 36,
                                decoration: BoxDecoration(color: VColors.successSurface, borderRadius: BorderRadius.circular(10)),
                                child: const Icon(Icons.check, size: 18, color: VColors.success),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(scan['studentName'] ?? '', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: VColors.text)),
                                    Text(scan['dealTitle'] ?? '', style: const TextStyle(fontSize: 11, color: VColors.textMuted)),
                                  ],
                                ),
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(_fmt((scan['amount'] as int?) ?? 0),
                                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: VColors.success)),
                                  Text(_timeAgo(scan['redeemedAt'] as String?),
                                      style: const TextStyle(fontSize: 10, color: VColors.textMuted)),
                                ],
                              ),
                            ],
                          ),
                        ),
                      )),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _statCard(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: VColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: VColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: color)),
            const SizedBox(height: 4),
            Text(label, style: const TextStyle(fontSize: 11, color: VColors.textMuted)),
          ],
        ),
      ),
    );
  }
}
