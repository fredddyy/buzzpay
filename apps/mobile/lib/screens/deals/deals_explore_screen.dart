import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../core/theme/colors.dart';
import '../../models/deal.dart';
import '../../providers/deals_provider.dart';

enum SortMode { newest, priceLow, priceHigh, discount, endingSoon }

class DealsExploreScreen extends ConsumerStatefulWidget {
  final String? initialCategory;
  const DealsExploreScreen({super.key, this.initialCategory});

  @override
  ConsumerState<DealsExploreScreen> createState() => _DealsExploreScreenState();
}

class _DealsExploreScreenState extends ConsumerState<DealsExploreScreen> {
  String? _category;
  SortMode _sort = SortMode.newest;
  bool _showSort = false;
  final _searchController = TextEditingController();
  String _search = '';

  static const _categories = [
    (null, 'All'),
    ('FOOD', 'Food'),
    ('DRINKS', 'Drinks'),
    ('SUBSCRIPTIONS', 'Subs'),
    ('TRANSPORT', 'Transport'),
    ('SHOPPING', 'Shopping'),
    ('LIFESTYLE', 'Lifestyle'),
  ];

  static const _sortLabels = {
    SortMode.newest: 'Newest',
    SortMode.priceLow: 'Price: Low',
    SortMode.priceHigh: 'Price: High',
    SortMode.discount: 'Best Deal',
    SortMode.endingSoon: 'Ending Soon',
  };

  @override
  void initState() {
    super.initState();
    _category = widget.initialCategory;
    Future.microtask(() {
      ref.read(dealsProvider.notifier).loadDeals(refresh: true);
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<Deal> _filtered(List<Deal> deals) {
    var result = deals.toList();
    if (_category != null) result = result.where((d) => d.category == _category).toList();
    if (_search.isNotEmpty) {
      final q = _search.toLowerCase();
      result = result.where((d) =>
          d.title.toLowerCase().contains(q) ||
          d.vendorName.toLowerCase().contains(q) ||
          d.tags.any((t) => t.contains(q))).toList();
    }
    switch (_sort) {
      case SortMode.newest: result.sort((a, b) => b.startsAt.compareTo(a.startsAt));
      case SortMode.priceLow: result.sort((a, b) => a.studentPrice.compareTo(b.studentPrice));
      case SortMode.priceHigh: result.sort((a, b) => b.studentPrice.compareTo(a.studentPrice));
      case SortMode.discount: result.sort((a, b) => b.discountPercent.compareTo(a.discountPercent));
      case SortMode.endingSoon: result.sort((a, b) => a.minutesRemaining.compareTo(b.minutesRemaining));
    }
    return result;
  }

  @override
  Widget build(BuildContext context) {
    final deals = ref.watch(dealsProvider);
    final filtered = _filtered(deals.deals);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // ── Header ──
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
              child: Row(
                children: [
                  GestureDetector(
                    onTap: () => context.pop(),
                    child: const Icon(Icons.arrow_back, size: 22),
                  ),
                  const SizedBox(width: 12),
                  const Text('Explore', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                  const Spacer(),
                  Text('${filtered.length}', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.primary)),
                  Text(' deals', style: TextStyle(fontSize: 12, color: AppColors.textTertiary)),
                ],
              ),
            ),

            // ── Search + Filter button ──
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _searchController,
                      onChanged: (v) => setState(() => _search = v),
                      decoration: InputDecoration(
                        hintText: 'Search...',
                        hintStyle: TextStyle(fontSize: 13, color: AppColors.textTertiary),
                        prefixIcon: const Icon(Icons.search, size: 20, color: AppColors.textTertiary),
                        filled: true,
                        fillColor: AppColors.card,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
                        contentPadding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  GestureDetector(
                    onTap: () => setState(() => _showSort = !_showSort),
                    child: Container(
                      width: 44, height: 44,
                      decoration: BoxDecoration(
                        color: _showSort ? AppColors.primary.withValues(alpha: 0.1) : AppColors.card,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: _showSort ? AppColors.primary : Colors.transparent),
                      ),
                      child: Icon(Icons.tune, size: 20, color: _showSort ? AppColors.primary : AppColors.textTertiary),
                    ),
                  ),
                ],
              ),
            ),

            // ── Categories ──
            Padding(
              padding: const EdgeInsets.fromLTRB(0, 12, 0, 0),
              child: SizedBox(
                height: 34,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  itemCount: _categories.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 6),
                  itemBuilder: (_, i) {
                    final (val, label) = _categories[i];
                    final active = val == _category;
                    return GestureDetector(
                      onTap: () => setState(() => _category = val),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14),
                        decoration: BoxDecoration(
                          color: active ? AppColors.primary : AppColors.card,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        alignment: Alignment.center,
                        child: Text(label, style: TextStyle(
                          fontSize: 12, fontWeight: FontWeight.w600,
                          color: active ? Colors.white : AppColors.textSecondary,
                        )),
                      ),
                    );
                  },
                ),
              ),
            ),

            // ── Sort dropdown (hidden by default) ──
            if (_showSort)
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
                child: Wrap(
                  spacing: 6, runSpacing: 6,
                  children: SortMode.values.map((mode) {
                    final active = mode == _sort;
                    return GestureDetector(
                      onTap: () => setState(() { _sort = mode; _showSort = false; }),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: active ? AppColors.primary : AppColors.card,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(_sortLabels[mode]!, style: TextStyle(
                          fontSize: 11, fontWeight: FontWeight.w600,
                          color: active ? Colors.white : AppColors.textTertiary,
                        )),
                      ),
                    );
                  }).toList(),
                ),
              ),

            const SizedBox(height: 10),

            // ── Grid ──
            Expanded(
              child: deals.isLoading && deals.deals.isEmpty
                  ? const Center(child: CircularProgressIndicator())
                  : filtered.isEmpty
                      ? _emptyState()
                      : GridView.builder(
                          padding: const EdgeInsets.fromLTRB(20, 4, 20, 80),
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            crossAxisSpacing: 12,
                            mainAxisSpacing: 12,
                            childAspectRatio: 0.68,
                          ),
                          itemCount: filtered.length,
                          itemBuilder: (context, index) => _dealTile(filtered[index]),
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _dealTile(Deal deal) {
    final isClosed = !deal.vendorIsOpen;

    return GestureDetector(
      onTap: () => context.push('/deal/${deal.id}'),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(18),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 10, offset: const Offset(0, 3))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image with single badge
            Stack(
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
                  child: deal.imageUrl != null
                      ? CachedNetworkImage(
                          imageUrl: deal.imageUrl!, height: 110, width: double.infinity, fit: BoxFit.cover,
                          placeholder: (_, __) => Container(height: 110, color: AppColors.background),
                          errorWidget: (_, __, ___) => Container(height: 110, color: AppColors.background),
                        )
                      : Container(height: 110, color: AppColors.background,
                          child: const Center(child: Icon(Icons.restaurant, color: AppColors.textTertiary))),
                ),
                // Single discount badge
                if (deal.discountPercent > 0)
                  Positioned(
                    top: 8, left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                      decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(10)),
                      child: Text('-${deal.discountPercent}%', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Colors.white)),
                    ),
                  ),
                // Frosted glass closed overlay
                if (isClosed)
                  Positioned.fill(
                    child: ClipRRect(
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
                      child: BackdropFilter(
                        filter: ImageFilter.blur(sigmaX: 3, sigmaY: 3),
                        child: Container(
                          color: Colors.white.withValues(alpha: 0.4),
                          alignment: Alignment.center,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.9),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text('Opens at ${deal.vendorOpensAt}',
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.text)),
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),

            // Info — clean hierarchy
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Vendor name — small, muted
                    Text(deal.vendorName, maxLines: 1, overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.w500, color: AppColors.textTertiary)),
                    const SizedBox(height: 3),
                    // Deal name — bold, clear
                    Text(deal.title, maxLines: 2, overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, height: 1.2)),
                    const Spacer(),
                    // Price — hero element
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(deal.formattedStudentPrice,
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.primary)),
                        const SizedBox(width: 4),
                        Padding(
                          padding: const EdgeInsets.only(bottom: 1),
                          child: Text(deal.formattedOriginalPrice,
                            style: TextStyle(fontSize: 10, color: AppColors.textTertiary, decoration: TextDecoration.lineThrough)),
                        ),
                      ],
                    ),
                    // Subtle stock indicator
                    if (deal.remainingQty <= 10)
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Text('Only ${deal.remainingQty} left',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.danger)),
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _emptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.search_off_rounded, size: 56, color: AppColors.textTertiary.withValues(alpha: 0.3)),
            const SizedBox(height: 16),
            const Text('No deals match', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
            const SizedBox(height: 6),
            Text('Try a different filter or search', style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
            const SizedBox(height: 20),
            GestureDetector(
              onTap: () => setState(() { _category = null; _search = ''; _searchController.clear(); _sort = SortMode.newest; }),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text('Show me what\'s trending', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.primary)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
