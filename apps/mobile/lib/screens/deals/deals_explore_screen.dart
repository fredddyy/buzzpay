import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../core/theme/colors.dart';
import '../../models/deal.dart';
import '../../providers/deals_provider.dart';
import '../../widgets/deal_card.dart';
import '../../widgets/trending_circle.dart';
import '../../providers/auth_provider.dart';

enum SortMode { newest, priceLow, priceHigh, discount, endingSoon }

class DealsExploreScreen extends ConsumerStatefulWidget {
  final String? initialCategory;
  final String mode; // 'all', 'hot', 'vendors'
  const DealsExploreScreen({super.key, this.initialCategory, this.mode = 'all'});

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

  String get _title => switch (widget.mode) {
    'vendors' => 'Campus Plugs',
    'hot' => 'Flash Deals',
    _ => 'Explore',
  };

  @override
  void initState() {
    super.initState();
    _category = widget.initialCategory;
    if (widget.mode == 'hot') _sort = SortMode.endingSoon;
    Future.microtask(() {
      ref.read(dealsProvider.notifier).loadDeals(refresh: true);
      ref.read(dealsProvider.notifier).loadTrendingVendors();
      ref.read(dealsProvider.notifier).loadHappyHour();
      ref.read(dealsProvider.notifier).loadUpcoming();
      ref.read(dealsProvider.notifier).loadCollections();
      ref.read(dealsProvider.notifier).loadFeatured();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<Deal> _filtered(List<Deal> deals) {
    var result = deals.toList();

    // Mode-specific filtering
    if (widget.mode == 'hot') {
      result = result.where((d) => d.isFeatured || d.dailyStart != null).toList();
    }

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
                  Text(_title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
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
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide(color: AppColors.border.withValues(alpha: 0.5))),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14),
                          borderSide: BorderSide(color: AppColors.border.withValues(alpha: 0.3))),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14),
                          borderSide: const BorderSide(color: AppColors.primary, width: 1.5)),
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

            // ── Categories (hidden in vendor mode) ──
            if (widget.mode != 'vendors') Padding(
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

            // ── Sort dropdown (hidden by default, not in vendor mode) ──
            if (_showSort && widget.mode != 'vendors')
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

            // ── Content ──
            Expanded(
              child: widget.mode == 'vendors'
                  ? _vendorsList(deals)
                  : deals.isLoading && deals.deals.isEmpty
                      ? const Center(child: CircularProgressIndicator())
                      : filtered.isEmpty
                          ? _emptyState()
                          : CustomScrollView(
                          slivers: [
                            // ── Trending Vendors ──
                            if (deals.trendingVendors.isNotEmpty && _category == null && _search.isEmpty) ...[
                              SliverToBoxAdapter(
                                child: Padding(
                                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 10),
                                  child: Text('Trending at UNILAG', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                                ),
                              ),
                              SliverToBoxAdapter(
                                child: SizedBox(
                                  height: 100,
                                  child: ListView.separated(
                                    scrollDirection: Axis.horizontal,
                                    padding: const EdgeInsets.symmetric(horizontal: 20),
                                    itemCount: deals.trendingVendors.length,
                                    separatorBuilder: (_, __) => const SizedBox(width: 6),
                                    itemBuilder: (_, i) {
                                      final vendor = deals.trendingVendors[i];
                                      return TrendingCircle(
                                        vendor: vendor,
                                        isNew: i < 2,
                                        onTap: () => context.push('/vendor/${vendor.id}'),
                                      );
                                    },
                                  ),
                                ),
                              ),
                              const SliverToBoxAdapter(child: SizedBox(height: 16)),
                            ],

                            // ── Happy Hour / Live Deals ──
                            if (deals.happyHour.isNotEmpty && _category == null && _search.isEmpty) ...[
                              SliverToBoxAdapter(
                                child: Padding(
                                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 10),
                                  child: Row(
                                    children: [
                                      Text('Live Deals', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                                      const SizedBox(width: 8),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: AppColors.primary.withValues(alpha: 0.15),
                                          borderRadius: BorderRadius.circular(20),
                                        ),
                                        child: Text('Live now', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.primary)),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              SliverToBoxAdapter(
                                child: SizedBox(
                                  height: 140,
                                  child: ListView.separated(
                                    scrollDirection: Axis.horizontal,
                                    padding: const EdgeInsets.symmetric(horizontal: 20),
                                    itemCount: deals.happyHour.length,
                                    separatorBuilder: (_, __) => const SizedBox(width: 10),
                                    itemBuilder: (_, i) {
                                      final deal = deals.happyHour[i];
                                      return _liveDealCard(deal);
                                    },
                                  ),
                                ),
                              ),
                              const SliverToBoxAdapter(child: SizedBox(height: 16)),
                            ],

                            // ── Dropping Soon ──
                            if (deals.upcoming.isNotEmpty && _category == null && _search.isEmpty) ...[
                              SliverToBoxAdapter(
                                child: Padding(
                                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 10),
                                  child: Text('Dropping Soon', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                                ),
                              ),
                              SliverToBoxAdapter(
                                child: SizedBox(
                                  height: 90,
                                  child: ListView.separated(
                                    scrollDirection: Axis.horizontal,
                                    padding: const EdgeInsets.symmetric(horizontal: 20),
                                    itemCount: deals.upcoming.length,
                                    separatorBuilder: (_, __) => const SizedBox(width: 10),
                                    itemBuilder: (_, i) {
                                      final deal = deals.upcoming[i];
                                      return _droppingSoonChip(deal);
                                    },
                                  ),
                                ),
                              ),
                              const SliverToBoxAdapter(child: SizedBox(height: 16)),
                            ],

                            // ── Hot in Akoka (Featured) ──
                            if (deals.featured.isNotEmpty && _category == null && _search.isEmpty) ...[
                              SliverToBoxAdapter(
                                child: Padding(
                                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 10),
                                  child: Row(
                                    children: [
                                      const Text('Hot in Akoka', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                                      const Spacer(),
                                      Text('See all >', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.primary)),
                                    ],
                                  ),
                                ),
                              ),
                              SliverToBoxAdapter(
                                child: SizedBox(
                                  height: 420,
                                  child: ListView.separated(
                                    scrollDirection: Axis.horizontal,
                                    padding: const EdgeInsets.symmetric(horizontal: 20),
                                    itemCount: deals.featured.length,
                                    separatorBuilder: (_, __) => const SizedBox(width: 12),
                                    itemBuilder: (context, index) {
                                      final deal = deals.featured[index];
                                      final authState = ref.watch(authProvider);
                                      final isVerified = authState.user?.isVerified ?? false;
                                      return SizedBox(
                                        width: MediaQuery.of(context).size.width * 0.55,
                                        child: DealCard(
                                          deal: deal,
                                          isVerified: isVerified,
                                          onTap: () => context.push('/deal/${deal.id}'),
                                        ),
                                      );
                                    },
                                  ),
                                ),
                              ),
                              const SliverToBoxAdapter(child: SizedBox(height: 20)),
                            ],

                            // ── Collections (Best Sellers, Data & Streaming, etc.) ──
                            if (deals.collections.isNotEmpty && _category == null && _search.isEmpty) ...[
                              ...deals.collections.expand((col) => [
                                SliverToBoxAdapter(
                                  child: Padding(
                                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 10),
                                    child: Row(
                                      children: [
                                        Text(col.title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                                        const Spacer(),
                                        Text('See all >', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.primary)),
                                      ],
                                    ),
                                  ),
                                ),
                                SliverToBoxAdapter(
                                  child: SizedBox(
                                    height: 140,
                                    child: ListView.separated(
                                      scrollDirection: Axis.horizontal,
                                      padding: const EdgeInsets.symmetric(horizontal: 20),
                                      itemCount: col.deals.length,
                                      separatorBuilder: (_, __) => const SizedBox(width: 10),
                                      itemBuilder: (context, index) {
                                        final deal = col.deals[index];
                                        return GestureDetector(
                                          onTap: () => context.push('/deal/${deal.id}'),
                                          child: Container(
                                            width: 180,
                                            decoration: BoxDecoration(
                                              color: AppColors.card,
                                              borderRadius: BorderRadius.circular(16),
                                              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 2))],
                                            ),
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                ClipRRect(
                                                  borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                                                  child: Container(height: 75, width: 180, color: AppColors.background,
                                                    child: const Center(child: Icon(Icons.restaurant, color: AppColors.textTertiary))),
                                                ),
                                                Padding(
                                                  padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
                                                  child: Column(
                                                    crossAxisAlignment: CrossAxisAlignment.start,
                                                    children: [
                                                      Text(deal.title, maxLines: 1, overflow: TextOverflow.ellipsis,
                                                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                                                      const SizedBox(height: 2),
                                                      Row(
                                                        children: [
                                                          Text(deal.formattedStudentPrice,
                                                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: AppColors.primary)),
                                                          const SizedBox(width: 4),
                                                          Flexible(
                                                            child: Text(deal.vendorName, maxLines: 1, overflow: TextOverflow.ellipsis,
                                                              style: TextStyle(fontSize: 10, color: AppColors.textTertiary)),
                                                          ),
                                                        ],
                                                      ),
                                                    ],
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        );
                                      },
                                    ),
                                  ),
                                ),
                                const SliverToBoxAdapter(child: SizedBox(height: 20)),
                              ]),
                            ],

                            // ── Section divider before grid ──
                            SliverToBoxAdapter(
                              child: Padding(
                                padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
                                child: Text('All Deals', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                              ),
                            ),

                            // ── Deals Grid ──
                            SliverPadding(
                              padding: const EdgeInsets.fromLTRB(20, 4, 20, 80),
                              sliver: SliverGrid(
                                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                  crossAxisCount: 2,
                                  crossAxisSpacing: 12,
                                  mainAxisSpacing: 12,
                                  childAspectRatio: 0.68,
                                ),
                                delegate: SliverChildBuilderDelegate(
                                  (context, index) => _dealTile(filtered[index]),
                                  childCount: filtered.length,
                                ),
                              ),
                            ),
                          ],
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
                // Single discount badge — rounded to match card
                if (deal.discountPercent > 0)
                  Positioned(
                    top: 8, left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(14)),
                      child: Text('-${deal.discountPercent}%', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Colors.white)),
                    ),
                  ),
                // Frosted glass closed overlay — stronger blur
                if (isClosed)
                  Positioned.fill(
                    child: ClipRRect(
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
                      child: BackdropFilter(
                        filter: ImageFilter.blur(sigmaX: 6, sigmaY: 6),
                        child: Container(
                          color: Colors.white.withValues(alpha: 0.5),
                          alignment: Alignment.center,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.95),
                              borderRadius: BorderRadius.circular(14),
                              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 8)],
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
                    // Vendor name — small, readable contrast
                    Text(deal.vendorName, maxLines: 1, overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
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
                          padding: const EdgeInsets.only(bottom: 2),
                          child: Text(deal.formattedOriginalPrice,
                            style: TextStyle(fontSize: 9, color: AppColors.textTertiary, decoration: TextDecoration.lineThrough)),
                        ),
                      ],
                    ),
                    // Stock progress bar + fire icon when low
                    if (deal.totalQuantity > 0) ...[
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          Expanded(
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(2),
                              child: LinearProgressIndicator(
                                value: deal.remainingQty / deal.totalQuantity,
                                minHeight: 2.5,
                                backgroundColor: AppColors.border.withValues(alpha: 0.3),
                                valueColor: AlwaysStoppedAnimation(
                                  deal.remainingQty <= 5 ? AppColors.danger : AppColors.primary.withValues(alpha: 0.4),
                                ),
                              ),
                            ),
                          ),
                          if (deal.remainingQty <= 5) ...[
                            const SizedBox(width: 4),
                            const Text('🔥', style: TextStyle(fontSize: 9)),
                            Text(' ${deal.remainingQty}', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: AppColors.danger)),
                          ],
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _vendorsList(DealsState deals) {
    // Build unique vendors from deals
    final vendorMap = <String, ({String name, String? logo, int dealCount, bool isOpen, String opensAt})>{};
    for (final d in deals.deals) {
      if (_search.isNotEmpty && !d.vendorName.toLowerCase().contains(_search.toLowerCase())) continue;
      vendorMap.putIfAbsent(d.vendorId, () => (
        name: d.vendorName,
        logo: d.vendorLogo,
        dealCount: 0,
        isOpen: d.vendorIsOpen,
        opensAt: d.vendorOpensAt,
      ));
      vendorMap[d.vendorId] = (
        name: vendorMap[d.vendorId]!.name,
        logo: vendorMap[d.vendorId]!.logo,
        dealCount: vendorMap[d.vendorId]!.dealCount + 1,
        isOpen: vendorMap[d.vendorId]!.isOpen,
        opensAt: vendorMap[d.vendorId]!.opensAt,
      );
    }
    final vendors = vendorMap.entries.toList();

    if (vendors.isEmpty) return _emptyState();

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 80),
      itemCount: vendors.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (_, i) {
        final e = vendors[i];
        final v = e.value;
        return GestureDetector(
          onTap: () => context.push('/vendor/${e.key}'),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 8, offset: const Offset(0, 2))],
            ),
            child: Row(
              children: [
                Container(
                  width: 48, height: 48,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Center(
                    child: Text(v.name[0], style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.primary)),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(v.name, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 3),
                      Row(
                        children: [
                          Container(
                            width: 6, height: 6,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: v.isOpen ? AppColors.success : AppColors.textTertiary,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            v.isOpen ? 'Open now' : 'Opens at ${v.opensAt}',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: v.isOpen ? AppColors.success : AppColors.textTertiary),
                          ),
                          const SizedBox(width: 10),
                          Text('${v.dealCount} deal${v.dealCount != 1 ? 's' : ''}',
                            style: TextStyle(fontSize: 11, color: AppColors.textTertiary)),
                        ],
                      ),
                    ],
                  ),
                ),
                Icon(Icons.chevron_right, size: 20, color: AppColors.textTertiary),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _liveDealCard(Deal deal) {
    return GestureDetector(
      onTap: () => context.push('/deal/${deal.id}'),
      child: Container(
        width: 200,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.primary.withValues(alpha: 0.15)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 32, height: 32,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Center(child: Icon(Icons.restaurant, size: 16, color: AppColors.primary)),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(deal.vendorName, maxLines: 1, overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(deal.title, maxLines: 2, overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, height: 1.2)),
            const Spacer(),
            Row(
              children: [
                Text(deal.formattedStudentPrice,
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.primary)),
                const SizedBox(width: 6),
                Text(deal.formattedOriginalPrice,
                  style: TextStyle(fontSize: 10, color: AppColors.textTertiary, decoration: TextDecoration.lineThrough)),
                const Spacer(),
                if (deal.minutesRemaining > 0)
                  Text('${deal.minutesRemaining}m left',
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.danger)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _droppingSoonChip(Deal deal) {
    final dropTime = deal.dailyStart ?? '';
    return GestureDetector(
      onTap: () => context.push('/deal/${deal.id}'),
      child: Container(
        width: 180,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(deal.title, maxLines: 1, overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            Text(deal.vendorName,
              style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
            const Spacer(),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFFFA726).withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                dropTime.isNotEmpty ? 'Drops at $dropTime' : 'Dropping soon',
                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFFF57C00)),
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
