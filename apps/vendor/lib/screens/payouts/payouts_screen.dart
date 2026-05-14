import 'package:flutter/material.dart';
import '../../core/theme/colors.dart';

class PayoutsScreen extends StatelessWidget {
  const PayoutsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: VColors.base,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Payouts', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: VColors.text)),
              const SizedBox(height: 4),
              const Text('Track your earnings and settlements', style: TextStyle(fontSize: 13, color: VColors.textMuted)),
              const SizedBox(height: 20),

              // Revenue cards
              Row(
                children: [
                  Expanded(child: _statCard("Today's Earnings", '₦12,400', VColors.success)),
                  const SizedBox(width: 12),
                  Expanded(child: _statCard('Pending Payout', '₦45,200', VColors.warning)),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const _ScanHistoryScreen()),
                      ),
                      child: _statCard('This Month', '₦248,500', VColors.primary),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(child: _statCard('Scans Today', '18', VColors.info)),
                ],
              ),

              const SizedBox(height: 24),

              // Settlement status
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: VColors.surface,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: VColors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Text('Next Settlement', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: VColors.text)),
                        const Spacer(),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(color: VColors.warningSurface, borderRadius: BorderRadius.circular(8)),
                          child: const Text('Processing', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: VColors.warning)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    const Text('₦45,200', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: VColors.text)),
                    const SizedBox(height: 4),
                    const Text('Expected: Tomorrow by 12:00 PM via Paystack', style: TextStyle(fontSize: 11, color: VColors.textMuted)),
                    const SizedBox(height: 12),
                    // Progress bar
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: const LinearProgressIndicator(
                        value: 0.65,
                        minHeight: 6,
                        backgroundColor: VColors.surfaceHover,
                        valueColor: AlwaysStoppedAnimation(VColors.primary),
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text('GTBank · 012****890', style: TextStyle(fontSize: 10, color: VColors.textMuted, fontFamily: 'monospace')),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Recent scans
              Row(
                children: [
                  _sectionLabel('RECENT SCANS'),
                  const Spacer(),
                  GestureDetector(
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const _ScanHistoryScreen()),
                    ),
                    child: const Text('See all', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: VColors.primary)),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              ...[
                _ScanEntry(name: 'Tunde Bakare', deal: 'Jollof Rice + Chicken', amount: 1800, time: '2 min ago'),
                _ScanEntry(name: 'Ada Obi', deal: 'Shawarma Special', amount: 1500, time: '15 min ago'),
                _ScanEntry(name: 'Chidi Nwankwo', deal: 'Suya Platter', amount: 1000, time: '1h ago'),
                _ScanEntry(name: 'Tope Bakare', deal: 'Jollof Rice + Chicken', amount: 1800, time: '2h ago'),
              ].map((s) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: VColors.surface,
                    borderRadius: BorderRadius.circular(12),
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
                            Text(s.name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: VColors.text)),
                            Text(s.deal, style: const TextStyle(fontSize: 11, color: VColors.textMuted)),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text('₦${s.amount.toStringAsFixed(0)}',
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: VColors.success, fontFamily: 'monospace')),
                          Text(s.time, style: const TextStyle(fontSize: 10, color: VColors.textMuted)),
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
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: VColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: VColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: color, fontFamily: 'monospace')),
          const SizedBox(height: 4),
          Text(label, style: const TextStyle(fontSize: 11, color: VColors.textMuted)),
        ],
      ),
    );
  }

  Widget _sectionLabel(String text) {
    return Text(text, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: VColors.textMuted, letterSpacing: 1));
  }
}

class _ScanEntry {
  final String name, deal, time;
  final double amount;
  final String? date;
  _ScanEntry({required this.name, required this.deal, required this.amount, required this.time, this.date});
}

// ──────────────────────────────────────────
// Scan History — full archive with filters
// ──────────────────────────────────────────

class _ScanHistoryScreen extends StatefulWidget {
  const _ScanHistoryScreen();

  @override
  State<_ScanHistoryScreen> createState() => _ScanHistoryScreenState();
}

class _ScanHistoryScreenState extends State<_ScanHistoryScreen> {
  String _filter = 'This Week';
  String _search = '';

  final _allScans = [
    _ScanEntry(name: 'Tunde Bakare', deal: 'Jollof Rice + Chicken', amount: 1800, time: '12:45 PM', date: 'Today'),
    _ScanEntry(name: 'Ada Obi', deal: 'Shawarma Special', amount: 1500, time: '12:30 PM', date: 'Today'),
    _ScanEntry(name: 'Chidi Nwankwo', deal: 'Suya Platter', amount: 1000, time: '11:15 AM', date: 'Today'),
    _ScanEntry(name: 'Tope Bakare', deal: 'Jollof Rice + Chicken', amount: 1800, time: '10:02 AM', date: 'Today'),
    _ScanEntry(name: 'Ngozi Eze', deal: 'Iced Coffee + Pastry', amount: 1000, time: '9:20 AM', date: 'Today'),
    _ScanEntry(name: 'Emeka Okafor', deal: 'Shawarma Special', amount: 1500, time: '3:45 PM', date: 'Yesterday'),
    _ScanEntry(name: 'Fatima Bello', deal: 'Smoothie Bowl', amount: 1200, time: '1:30 PM', date: 'Yesterday'),
    _ScanEntry(name: 'David Ade', deal: 'Jollof Rice + Chicken', amount: 1800, time: '12:10 PM', date: 'Yesterday'),
    _ScanEntry(name: 'Grace Umoh', deal: 'Suya Platter', amount: 1000, time: '11:00 AM', date: 'Mon, May 12'),
    _ScanEntry(name: 'Yusuf Hassan', deal: 'Amala + Ewedu', amount: 1200, time: '2:15 PM', date: 'Mon, May 12'),
    _ScanEntry(name: 'Blessing Ojo', deal: 'Shawarma Special', amount: 1500, time: '10:45 AM', date: 'Sun, May 11'),
  ];

  List<_ScanEntry> get _filtered {
    var list = _allScans;
    if (_search.isNotEmpty) {
      list = list.where((s) => s.name.toLowerCase().contains(_search.toLowerCase()) ||
          s.deal.toLowerCase().contains(_search.toLowerCase())).toList();
    }
    return list;
  }

  double get _totalFiltered => _filtered.fold(0, (sum, s) => sum + s.amount);

  @override
  Widget build(BuildContext context) {
    final scans = _filtered;
    // Group by date
    final grouped = <String, List<_ScanEntry>>{};
    for (final s in scans) {
      grouped.putIfAbsent(s.date ?? 'Unknown', () => []).add(s);
    }

    return Scaffold(
      backgroundColor: VColors.base,
      appBar: AppBar(
        backgroundColor: VColors.surface,
        title: const Text('Scan History', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(52),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
            child: TextField(
              onChanged: (v) => setState(() => _search = v),
              style: const TextStyle(fontSize: 13, color: VColors.text),
              decoration: InputDecoration(
                hintText: 'Search student or deal...',
                hintStyle: const TextStyle(color: VColors.textMuted, fontSize: 13),
                prefixIcon: const Icon(Icons.search, size: 18, color: VColors.textMuted),
                filled: true,
                fillColor: VColors.surfaceLight,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                contentPadding: const EdgeInsets.symmetric(vertical: 10),
                isDense: true,
              ),
            ),
          ),
        ),
      ),
      body: Column(
        children: [
          // Filter chips
          SizedBox(
            height: 44,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              children: ['Today', 'Yesterday', 'This Week', 'This Month'].map((f) {
                final active = _filter == f;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: GestureDetector(
                    onTap: () => setState(() => _filter = f),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        color: active ? VColors.primarySurface : VColors.surface,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: active ? VColors.primary.withValues(alpha: 0.3) : VColors.border),
                      ),
                      child: Text(f, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600,
                          color: active ? VColors.primary : VColors.textMuted)),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),

          // Summary bar
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: VColors.surface,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: VColors.border),
            ),
            child: Row(
              children: [
                Text('${scans.length} scans', style: const TextStyle(fontSize: 12, color: VColors.textSecondary)),
                const Spacer(),
                Text('₦${_totalFiltered.toStringAsFixed(0)}',
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: VColors.success, fontFamily: 'monospace')),
              ],
            ),
          ),

          // Grouped list
          Expanded(
            child: scans.isEmpty
                ? const Center(child: Text('No scans found', style: TextStyle(color: VColors.textMuted)))
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    itemCount: grouped.length,
                    itemBuilder: (_, gi) {
                      final date = grouped.keys.elementAt(gi);
                      final items = grouped[date]!;
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Padding(
                            padding: const EdgeInsets.only(top: 12, bottom: 8),
                            child: Text(date, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: VColors.textMuted, letterSpacing: 0.5)),
                          ),
                          ...items.map((s) => Padding(
                            padding: const EdgeInsets.only(bottom: 6),
                            child: Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: VColors.surface,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: VColors.border),
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    width: 32, height: 32,
                                    decoration: BoxDecoration(color: VColors.successSurface, borderRadius: BorderRadius.circular(8)),
                                    child: const Icon(Icons.check, size: 16, color: VColors.success),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(s.name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: VColors.text)),
                                        Text(s.deal, style: const TextStyle(fontSize: 11, color: VColors.textMuted)),
                                      ],
                                    ),
                                  ),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Text('₦${s.amount.toStringAsFixed(0)}',
                                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: VColors.success, fontFamily: 'monospace')),
                                      Text(s.time, style: const TextStyle(fontSize: 10, color: VColors.textMuted)),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          )),
                        ],
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
