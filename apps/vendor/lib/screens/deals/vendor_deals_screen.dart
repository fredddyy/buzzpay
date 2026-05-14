import 'package:flutter/material.dart';
import '../../core/theme/colors.dart';

class VendorDealsScreen extends StatefulWidget {
  const VendorDealsScreen({super.key});

  @override
  State<VendorDealsScreen> createState() => _VendorDealsScreenState();
}

class _VendorDealsScreenState extends State<VendorDealsScreen> {
  final _deals = [
    _Deal(id: '1', title: 'Jollof Rice + Chicken Combo', category: 'FOOD', price: 1800, stock: 8, total: 50, active: true, slot: 'Lunch'),
    _Deal(id: '2', title: 'Shawarma Special', category: 'FOOD', price: 1500, stock: 5, total: 40, active: true, slot: 'All Day'),
    _Deal(id: '3', title: 'Amala + Ewedu Combo', category: 'FOOD', price: 1200, stock: 0, total: 15, active: false, slot: 'Lunch'),
    _Deal(id: '4', title: 'Suya Platter', category: 'FOOD', price: 1000, stock: 9, total: 20, active: true, slot: 'Night'),
    _Deal(id: '5', title: '1GB Data Bundle', category: 'SUBS', price: 350, stock: 100, total: 100, active: true, slot: 'All Day'),
  ];

  void _toggleDeal(String id) {
    setState(() {
      final i = _deals.indexWhere((d) => d.id == id);
      if (i >= 0) _deals[i] = _deals[i].copyWith(active: !_deals[i].active);
    });
  }

  // Stock only decreases via QR scan — no manual decrement

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: VColors.base,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
              child: Row(
                children: [
                  const Text('My Deals', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: VColors.text)),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(color: VColors.successSurface, borderRadius: BorderRadius.circular(20)),
                    child: Text('${_deals.where((d) => d.active).length} active',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: VColors.success)),
                  ),
                ],
              ),
            ),
            // List
            Expanded(
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                itemCount: _deals.length,
                separatorBuilder: (_, __) => const SizedBox(height: 10),
                itemBuilder: (_, i) {
                  final d = _deals[i];
                  return Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: VColors.surface,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: VColors.border),
                    ),
                    child: Row(
                      children: [
                        // Info
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(d.title,
                                        style: TextStyle(
                                          fontSize: 14, fontWeight: FontWeight.w600,
                                          color: d.active ? VColors.text : VColors.textMuted,
                                        ),
                                        maxLines: 1, overflow: TextOverflow.ellipsis),
                                  ),
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(color: VColors.surfaceLight, borderRadius: BorderRadius.circular(6)),
                                    child: Text(d.slot, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w600, color: VColors.textMuted)),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              // Price + stock
                              Row(
                                children: [
                                  Text('₦${d.price.toStringAsFixed(0)}',
                                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: VColors.primary)),
                                  const SizedBox(width: 12),
                                  // Stock indicator
                                  // Stock (read-only — only decrements via QR scan)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: d.stock <= 5 ? VColors.warningSurface : VColors.surfaceLight,
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Text('${d.stock}/${d.total} left',
                                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600,
                                            color: d.stock <= 5 ? VColors.warning : VColors.textSecondary)),
                                  ),
                                  // Stock bar
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: ClipRRect(
                                      borderRadius: BorderRadius.circular(3),
                                      child: LinearProgressIndicator(
                                        value: d.total > 0 ? d.stock / d.total : 0,
                                        minHeight: 4,
                                        backgroundColor: VColors.surfaceHover,
                                        valueColor: AlwaysStoppedAnimation(
                                            d.stock / d.total < 0.2 ? VColors.error : VColors.primary),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        // Toggle
                        GestureDetector(
                          onTap: () => _toggleDeal(d.id),
                          child: Container(
                            width: 44,
                            height: 26,
                            decoration: BoxDecoration(
                              color: d.active ? VColors.success : VColors.surfaceHover,
                              borderRadius: BorderRadius.circular(13),
                            ),
                            child: AnimatedAlign(
                              duration: const Duration(milliseconds: 200),
                              alignment: d.active ? Alignment.centerRight : Alignment.centerLeft,
                              child: Container(
                                width: 20, height: 20,
                                margin: const EdgeInsets.symmetric(horizontal: 3),
                                decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Deal {
  final String id, title, category, slot;
  final double price;
  int stock;
  final int total;
  bool active;

  _Deal({required this.id, required this.title, required this.category, required this.price,
    required this.stock, required this.total, required this.active, required this.slot});

  _Deal copyWith({bool? active, int? stock}) => _Deal(
    id: id, title: title, category: category, price: price,
    stock: stock ?? this.stock, total: total, active: active ?? this.active, slot: slot,
  );
}
