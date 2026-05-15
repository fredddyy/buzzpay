import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../core/theme/colors.dart';
import '../../models/deal.dart';
import '../../providers/deals_provider.dart';
import '../../widgets/price_display.dart';

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
    SortMode.priceLow: 'Price ↑',
    SortMode.priceHigh: 'Price ↓',
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

    // Category
    if (_category != null) {
      result = result.where((d) => d.category == _category).toList();
    }

    // Search
    if (_search.isNotEmpty) {
      final q = _search.toLowerCase();
      result = result.where((d) =>
          d.title.toLowerCase().contains(q) ||
          d.vendorName.toLowerCase().contains(q) ||
          d.tags.any((t) => t.contains(q))).toList();
    }

    // Sort
    switch (_sort) {
      case SortMode.newest:
        result.sort((a, b) => b.startsAt.compareTo(a.startsAt));
        break;
      case SortMode.priceLow:
        result.sort((a, b) => a.studentPrice.compareTo(b.studentPrice));
        break;
      case SortMode.priceHigh:
        result.sort((a, b) => b.studentPrice.compareTo(a.studentPrice));
        break;
      case SortMode.discount:
        result.sort((a, b) => b.discountPercent.compareTo(a.discountPercent));
        break;
      case SortMode.endingSoon:
        result.sort((a, b) => a.minutesRemaining.compareTo(b.minutesRemaining));
        break;
    }

    return result;
  }

  @override
  Widget build(BuildContext context) {
    final deals = ref.watch(dealsProvider);
    final filtered = _filtered(deals.deals);

    // Sub-groups
    final under1500 = filtered.where((d) => d.studentPrice <= 150000).toList();
    final featured = filtered.where((d) => d.isFeatured).toList();

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
                  const Text('Explore Deals', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                  const Spacer(),
                  Text('${filtered.length} deals', style: TextStyle(fontSize: 12, color: AppColors.textTertiary)),
                ],
              ),
            ),

            // ── Search ──
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
              child: TextField(
                controller: _searchController,
                onChanged: (v) => setState(() => _search = v),
                decoration: InputDecoration(
                  hintText: 'Search deals, vendors, tags...',
                  hintStyle: TextStyle(fontSize: 13, color: AppColors.textTertiary),
                  prefixIcon: const Icon(Icons.search, size: 20, color: AppColors.textTertiary),
                  filled: true,
                  fillColor: AppColors.card,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
                  contentPadding: const EdgeInsets.symmetric(vertical: 12),
                ),
              ),
            ),

            // ── Categories ──
            Padding(
              padding: const EdgeInsets.fromLTRB(0, 12, 0, 0),
              child: SizedBox(
                height: 36,
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

            // ── Sort pills ──
            Padding(
              padding: const EdgeInsets.fromLTRB(0, 10, 0, 8),
              child: SizedBox(
                height: 30,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  itemCount: SortMode.values.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 6),
                  itemBuilder: (_, i) {
                    final mode = SortMode.values[i];
                    final active = mode == _sort;
                    return GestureDetector(
                      onTap: () => setState(() => _sort = mode),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        decoration: BoxDecoration(
                          color: active ? AppColors.primary.withValues(alpha: 0.1) : Colors.transparent,
                          borderRadius: BorderRadius.circular(15),
                          border: Border.all(
                            color: active ? AppColors.primary : AppColors.border,
                          ),
                        ),
                        alignment: Alignment.center,
                        child: Text(_sortLabels[mode]!, style: TextStyle(
                          fontSize: 11, fontWeight: FontWeight.w600,
                          color: active ? AppColors.primary : AppColors.textTertiary,
                        )),
                      ),
                    );
                  },
                ),
              ),
            ),

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
                            crossAxisSpacing: 10,
                            mainAxisSpacing: 10,
                            childAspectRatio: 0.72,
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
          borderRadius: BorderRadius.circular(16),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 2))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image
            Stack(
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                  child: deal.imageUrl != null
                      ? CachedNetworkImage(
                          imageUrl: deal.imageUrl!, height: 100, width: double.infinity, fit: BoxFit.cover,
                          placeholder: (_, __) => Container(height: 100, color: AppColors.background),
                          errorWidget: (_, __, ___) => Container(height: 100, color: AppColors.background),
                        )
                      : Container(height: 100, color: AppColors.background),
                ),
                // Discount badge
                if (deal.discountPercent > 0)
                  Positioned(
                    top: 8, left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                      decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(8)),
                      child: Text('-${deal.discountPercent}%', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Colors.white)),
                    ),
                  ),
                // Closed overlay
                if (isClosed)
                  Positioned.fill(
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.5),
                        borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                      ),
                      alignment: Alignment.center,
                      child: Text('Opens at ${deal.vendorOpensAt}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.white)),
                    ),
                  ),
                // Stock badge
                if (deal.remainingQty <= 10)
                  Positioned(
                    top: 8, right: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                      decoration: BoxDecoration(color: AppColors.danger, borderRadius: BorderRadius.circular(8)),
                      child: Text('${deal.remainingQty} left', style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: Colors.white)),
                    ),
                  ),
              ],
            ),

            // Info
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(deal.vendorName, maxLines: 1, overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 10, color: AppColors.textTertiary)),
                    const SizedBox(height: 2),
                    Text(deal.title, maxLines: 2, overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, height: 1.2)),
                    const Spacer(),
                    Row(
                      children: [
                        Text(deal.formattedStudentPrice,
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.primary)),
                        const SizedBox(width: 4),
                        Text(deal.formattedOriginalPrice,
                          style: TextStyle(fontSize: 10, color: AppColors.textTertiary, decoration: TextDecoration.lineThrough)),
                      ],
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
            Icon(Icons.search_off, size: 64, color: AppColors.textTertiary.withValues(alpha: 0.4)),
            const SizedBox(height: 16),
            const Text('No deals match', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 6),
            Text('Try a different filter or search term', style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
            const SizedBox(height: 20),
            TextButton(
              onPressed: () => setState(() { _category = null; _search = ''; _searchController.clear(); _sort = SortMode.newest; }),
              child: Text('Clear Filters', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600)),
            ),
          ],
        ),
      ),
    );
  }
}
