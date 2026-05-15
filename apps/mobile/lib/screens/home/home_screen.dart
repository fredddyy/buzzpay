import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../../core/mock_data.dart';
import '../../core/services/supabase_client.dart';
import '../../core/theme/colors.dart';
import '../../models/voucher.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/verify_banner.dart';
import '../../widgets/verify_gate_sheet.dart';
import '../../models/deal.dart';
import '../../providers/api_provider.dart';
import '../../providers/deals_provider.dart';
import '../../providers/vouchers_provider.dart';
import '../../widgets/deal_card.dart';
import '../../widgets/happy_hour_card.dart';
import '../../widgets/active_voucher_ticket.dart';
import '../../widgets/loyalty_sticker_row.dart';
import '../../widgets/trending_circle.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  final _categories = [
    (null, 'All'),
    ('FOOD', 'Food'),
    ('DRINKS', 'Drinks'),
    ('SUBSCRIPTIONS', 'Subs'),
    ('TRANSPORT', 'Transport'),
    ('SHOPPING', 'Shopping'),
    ('LIFESTYLE', 'Lifestyle'),
  ];

  String? _selectedCategory;
  bool _notifyEnabled = false;
  late final RealtimeDeals _realtime;
  final _scrollController = ScrollController();
  static const _feedLimit = 6; // curated home feed limit
  Timer? _debounceTimer;

  @override
  void initState() {
    super.initState();
    Future.microtask(() async {
      await ref.read(dealsProvider.notifier).loadDeals(refresh: true);
      ref.read(dealsProvider.notifier).loadFeatured();
      ref.read(dealsProvider.notifier).loadHappyHour();
      ref.read(dealsProvider.notifier).loadTrendingVendors();
      ref.read(dealsProvider.notifier).loadUpcoming();
      ref.read(dealsProvider.notifier).loadCollections();
      ref.read(vouchersProvider.notifier).loadVouchers(status: 'ACTIVE');
    });

    // Subscribe to all real-time changes
    _realtime = RealtimeDeals();
    void _debouncedRefresh() {
      _debounceTimer?.cancel();
      _debounceTimer = Timer(const Duration(seconds: 1), () {
        if (!mounted) return;
        ref.read(dealsProvider.notifier).loadDeals(refresh: true);
        ref.read(dealsProvider.notifier).loadFeatured();
        ref.read(dealsProvider.notifier).loadHappyHour();
        ref.read(dealsProvider.notifier).loadUpcoming();
        ref.read(dealsProvider.notifier).loadCollections();
        ref.read(dealsProvider.notifier).loadTrendingVendors();
      });
    }

    _realtime.onDealChanged = _debouncedRefresh;
    _realtime.onStockChanged = _debouncedRefresh;
    _realtime.onVoucherChanged = () {
      ref.read(vouchersProvider.notifier).loadVouchers(status: 'ACTIVE');
    };
    _realtime.onVerificationChanged = (status) {
      debugPrint('[Home] onVerificationChanged fired! status=$status');
      if (!mounted) return;
      if (status.isNotEmpty) {
        ref.read(authProvider.notifier).updateVerificationStatus(status);
      }
      final isApproved = status == 'APPROVED';
      showDialog(
        context: context,
        useRootNavigator: true,
        builder: (_) => AlertDialog(
          backgroundColor: AppColors.card,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                isApproved ? Icons.check_circle : Icons.info_outline,
                size: 56,
                color: isApproved ? AppColors.success : AppColors.danger,
              ),
              const SizedBox(height: 16),
              Text(
                isApproved ? 'Verified!' : 'Verification Update',
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 8),
              Text(
                isApproved
                    ? 'Your student ID has been verified! You now have access to all exclusive deals.'
                    : 'Your verification was not approved. Please resubmit your student ID.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context, rootNavigator: true).pop(),
              child: Text('OK', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700)),
            ),
          ],
        ),
      );
    };
    // Subscribe with real user ID — retry when auth state provides one
    _subscribeRealtime();
  }

  void _subscribeRealtime() {
    final userId = ref.read(authProvider).user?.id;
    debugPrint('[Home] Subscribing realtime with userId: $userId');
    _realtime.dispose(); // clean up old subscriptions
    _realtime.subscribe(studentUserId: userId);

    // If userId is still pending, retry after auth settles
    if (userId == null || userId.isEmpty || userId == 'pending') {
      Future.delayed(const Duration(seconds: 3), () {
        if (!mounted) return;
        final newId = ref.read(authProvider).user?.id;
        if (newId != null && newId != 'pending' && newId != userId) {
          debugPrint('[Home] Re-subscribing realtime with userId: $newId');
          _realtime.dispose();
          _realtime.subscribe(studentUserId: newId);
        }
      });
    }
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _scrollController.dispose();
    _realtime.dispose();
    super.dispose();
  }

  String _roundedCount(int count) {
    if (count >= 100) return '${(count ~/ 50) * 50}+';
    if (count >= 20) return '${(count ~/ 10) * 10}+';
    return '$count+';
  }

  void scrollToTop() {
    _scrollController.animateTo(0, duration: const Duration(milliseconds: 400), curve: Curves.easeOut);
  }

  @override
  Widget build(BuildContext context) {
    final deals = ref.watch(dealsProvider);
    final vouchersState = ref.watch(vouchersProvider);
    final activeVouchers = vouchersState.vouchers;
    final authState = ref.watch(authProvider);
    final isVerified = authState.user?.isVerified ?? false;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            await ref.read(dealsProvider.notifier).loadDeals(
                  category: _selectedCategory,
                  refresh: true,
                );
            await ref.read(dealsProvider.notifier).loadFeatured();
            await ref.read(dealsProvider.notifier).loadHappyHour();
            await ref.read(vouchersProvider.notifier).loadVouchers(status: 'ACTIVE');
          },
          child: CustomScrollView(
            controller: _scrollController,
            slivers: [
              // ──── HEADER ────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            'BuzzPay',
                            style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                                  color: AppColors.primary,
                                  fontWeight: FontWeight.w800,
                                ),
                          ),
                          const Spacer(),
                          GestureDetector(
                            onTap: () => _openSearch(context),
                            child: Container(
                              width: 38,
                              height: 38,
                              decoration: BoxDecoration(
                                color: AppColors.card,
                                shape: BoxShape.circle,
                                border: Border.all(color: AppColors.border.withValues(alpha: 0.4)),
                              ),
                              child: const Icon(Icons.search, size: 20, color: AppColors.text),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Pay less because you\'re a student',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: AppColors.textSecondary,
                              fontWeight: FontWeight.w400,
                            ),
                      ),
                    ],
                  ),
                ),
              ),

              // ──── VERIFY BANNER (unverified only) ────
              if (!isVerified)
                const SliverToBoxAdapter(
                  child: Padding(
                    padding: EdgeInsets.only(bottom: 16),
                    child: VerifyBanner(),
                  ),
                ),

              // ──── 1. CATEGORY PILLS ────
              SliverToBoxAdapter(
                child: SizedBox(
                  height: 42,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    itemCount: _categories.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (context, index) {
                      final (value, label) = _categories[index];
                      final isSelected = _selectedCategory == value;
                      return GestureDetector(
                        onTap: () {
                          setState(() => _selectedCategory = value);
                          ref.read(dealsProvider.notifier).setCategory(value);
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                          decoration: BoxDecoration(
                            color: isSelected ? AppColors.primary : AppColors.card,
                            borderRadius: BorderRadius.circular(30),
                            border: Border.all(
                              color: isSelected ? AppColors.primary : AppColors.border,
                              width: 1,
                            ),
                          ),
                          child: Text(
                            label,
                            style: TextStyle(
                              color: isSelected ? Colors.white : AppColors.text,
                              fontWeight: FontWeight.w700,
                              fontSize: 14,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ),

              const SliverToBoxAdapter(child: SizedBox(height: 20)),

              // ──── 2. ACTIVE VOUCHERS (conditional) ────
              if (activeVouchers.isNotEmpty) ...[
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Row(
                      children: [
                        Image.asset('assets/icons/ticket_3d.png', width: 22, height: 22),
                        const SizedBox(width: 6),
                        Text('My Active Vouchers', style: Theme.of(context).textTheme.headlineSmall),
                        const Spacer(),
                        Text(
                          '${activeVouchers.length} ticket${activeVouchers.length > 1 ? 's' : ''}',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.primary),
                        ),
                      ],
                    ),
                  ),
                ),
                const SliverToBoxAdapter(child: SizedBox(height: 12)),
                SliverToBoxAdapter(
                  child: SizedBox(
                    height: 158,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      itemCount: activeVouchers.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 12),
                      itemBuilder: (context, index) {
                        final voucher = activeVouchers[index];
                        return ActiveVoucherTicket(
                          voucher: voucher,
                          onTap: () => _showRedemptionSheet(context, voucher),
                        );
                      },
                    ),
                  ),
                ),
                const SliverToBoxAdapter(child: SizedBox(height: 24)),
              ],

              // ──── 3. ACTIVE TIME SLOTS (grouped by featuredSection) ────
              if (deals.happyHour.isNotEmpty) ...[
                ...() {
                  // Group deals by their featuredSection name
                  final grouped = <String, List<Deal>>{};
                  for (final deal in deals.happyHour) {
                    final section = deal.featuredSection ?? 'Happy Hour';
                    grouped.putIfAbsent(section, () => []).add(deal);
                  }

                  return grouped.entries.expand((entry) {
                    final sectionName = entry.key;
                    final sectionDeals = entry.value;

                    return [
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(20, 0, 20, 0),
                          child: Row(
                            children: [
                              Image.asset('assets/icons/flame_3d.png', width: 22, height: 22),
                              const SizedBox(width: 6),
                              Text(sectionName, style: Theme.of(context).textTheme.headlineSmall),
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: AppColors.primary.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
                                ),
                                child: Text('Live now', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.primaryDark)),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SliverToBoxAdapter(child: SizedBox(height: 12)),
                      SliverToBoxAdapter(
                        child: SizedBox(
                          height: 260,
                          child: PageView.builder(
                            controller: PageController(viewportFraction: 0.88),
                            itemCount: sectionDeals.length,
                            itemBuilder: (context, index) {
                              final deal = sectionDeals[index];
                              return Padding(
                                padding: const EdgeInsets.only(right: 12),
                                child: HappyHourCard(deal: deal, onTap: () => context.push('/deal/${deal.id}')),
                              );
                            },
                          ),
                        ),
                      ),
                      const SliverToBoxAdapter(child: SizedBox(height: 24)),
                    ];
                  }).toList();
                }(),
              ],

              // ──── 3b. UPCOMING RUSH (preview state deals) ────
              if (deals.upcoming.isNotEmpty && _selectedCategory == null) ...[
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: _sectionHeader(context, title: 'Dropping Soon', seeAll: true,
                      onSeeAll: () => context.push('/explore', extra: {'mode': 'hot'})),
                  ),
                ),
                const SliverToBoxAdapter(child: SizedBox(height: 12)),
                SliverToBoxAdapter(
                  child: SizedBox(
                    height: 180,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      itemCount: deals.upcoming.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 12),
                      itemBuilder: (context, index) {
                        final deal = deals.upcoming[index];
                        final dropTime = deal.dailyStart ?? '';
                        return _UpcomingCard(deal: deal, dropTime: dropTime);
                      },
                    ),
                  ),
                ),
                const SliverToBoxAdapter(child: SizedBox(height: 24)),
              ],

              // ──── 4. TRENDING VENDORS (from admin 🔥 toggle) ────
              if (deals.trendingVendors.isNotEmpty && _selectedCategory == null) ...[
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: _sectionHeader(
                      context,
                      title: 'Trending at UNILAG',
                      seeAll: true,
                      onSeeAll: () => context.push('/explore', extra: {'mode': 'vendors'}),
                    ),
                  ),
                ),
                const SliverToBoxAdapter(child: SizedBox(height: 12)),
                SliverToBoxAdapter(
                  child: SizedBox(
                    height: 110,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      itemCount: deals.trendingVendors.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 6),
                      itemBuilder: (context, index) {
                        final vendor = deals.trendingVendors[index];
                        return TrendingCircle(
                          vendor: vendor,
                          isNew: index < 2,
                          onTap: () => context.push('/vendor/${vendor.id}'),
                        );
                      },
                    ),
                  ),
                ),
                const SliverToBoxAdapter(child: SizedBox(height: 24)),
              ],

              // ──── 4b. FEATURED DEALS (horizontal cards from ⭐ in admin) ────
              if (deals.featured.isNotEmpty && _selectedCategory == null) ...[
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: _sectionHeader(context, title: 'Hot in Akoka', seeAll: true,
                      onSeeAll: () => context.push('/explore', extra: {'mode': 'hot'})),
                  ),
                ),
                const SliverToBoxAdapter(child: SizedBox(height: 12)),
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
                const SliverToBoxAdapter(child: SizedBox(height: 24)),
              ],

              // ──── 4c. COLLECTION ROWS (tag-based, e.g. "Best Wraps in Akoka") ────
              if (deals.collections.isNotEmpty && _selectedCategory == null) ...[
                ...deals.collections.expand((col) => [
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: _sectionHeader(context, title: col.title, seeAll: true),
                    ),
                  ),
                  const SliverToBoxAdapter(child: SizedBox(height: 12)),
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
                                  // Image
                                  ClipRRect(
                                    borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                                    child: deal.imageUrl != null
                                        ? Image.network(deal.imageUrl!, height: 75, width: 180, fit: BoxFit.cover,
                                            errorBuilder: (_, __, ___) => Container(height: 75, color: AppColors.background))
                                        : Container(height: 75, color: AppColors.background),
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
                                            Text(deal.vendorName, maxLines: 1, overflow: TextOverflow.ellipsis,
                                              style: TextStyle(fontSize: 10, color: AppColors.textTertiary)),
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
                  const SliverToBoxAdapter(child: SizedBox(height: 24)),
                ]),
              ],

              // ──── 5. MAIN FEED ────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: _sectionHeader(
                    context,
                    title: _selectedCategory != null ? 'Results' : 'All Deals',
                    seeAll: true,
                    onSeeAll: () => context.push('/explore', extra: {'mode': 'all', 'category': _selectedCategory}),
                  ),
                ),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 14)),

              if (deals.isLoading && deals.deals.isEmpty)
                const SliverFillRemaining(
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (deals.deals.isEmpty)
                SliverToBoxAdapter(
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(40, 32, 40, 40),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Image.asset('assets/icons/gift_3d.png', width: 72, height: 72),
                          const SizedBox(height: 20),
                          const Text('No deals yet!',
                              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                          const SizedBox(height: 6),
                          Text('New deals drop every day.\nTurn on notifications so you don\'t miss out.',
                              style: TextStyle(fontSize: 13, color: AppColors.textSecondary, height: 1.5),
                              textAlign: TextAlign.center),
                          const SizedBox(height: 20),
                          // Notify me toggle
                          GestureDetector(
                            onTap: () => setState(() => _notifyEnabled = true),
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 300),
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                              decoration: BoxDecoration(
                                color: _notifyEnabled
                                    ? AppColors.success.withValues(alpha: 0.08)
                                    : AppColors.primary.withValues(alpha: 0.06),
                                borderRadius: BorderRadius.circular(30),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    _notifyEnabled ? Icons.notifications_active : Icons.notifications_none,
                                    size: 18,
                                    color: _notifyEnabled ? AppColors.success : AppColors.primary,
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    _notifyEnabled ? 'You\'re on the list!' : 'Notify me when deals drop',
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                      color: _notifyEnabled ? AppColors.success : AppColors.primary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                )
              else ...[
                SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  sliver: SliverGrid(
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 16,
                      childAspectRatio: 0.48,
                    ),
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final deal = deals.deals[index];
                        return DealCard(
                          deal: deal,
                          isVerified: isVerified,
                          onTap: () => context.push('/deal/${deal.id}'),
                        );
                      },
                      childCount: deals.deals.length > _feedLimit ? _feedLimit : deals.deals.length,
                    ),
                  ),
                ),

                // ──── 6. FOOTER ────
                if (deals.deals.length > _feedLimit)
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 36, 20, 0),
                      child: GestureDetector(
                        onTap: () {
                          HapticFeedback.mediumImpact();
                          context.push('/explore', extra: {'mode': 'all'});
                        },
                        child: Container(
                          height: 60,
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.06),
                            borderRadius: BorderRadius.circular(20),
                            boxShadow: [BoxShadow(color: AppColors.primary.withValues(alpha: 0.06), blurRadius: 16, offset: const Offset(0, 4))],
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Image.asset('assets/icons/gift_3d.png', width: 24, height: 24,
                                errorBuilder: (_, __, ___) => const Text('🎁', style: TextStyle(fontSize: 18))),
                              const SizedBox(width: 10),
                              Text('Explore All ${_roundedCount(deals.deals.length)} Deals',
                                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.primaryDark)),
                              const SizedBox(width: 8),
                              Container(
                                width: 24, height: 24,
                                decoration: BoxDecoration(
                                  color: AppColors.primary.withValues(alpha: 0.12),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.arrow_forward_ios, size: 12, color: AppColors.primary),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  )
                else
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(40, 24, 40, 0),
                      child: Column(
                        children: [
                          Image.asset('assets/icons/checkmark_3d.png', width: 40, height: 40,
                            errorBuilder: (_, __, ___) => Icon(Icons.check_circle, size: 40, color: AppColors.success)),
                          const SizedBox(height: 8),
                          Text("You're all caught up!", style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.text)),
                          const SizedBox(height: 4),
                          Text('New deals drop every morning at 8 AM', style: TextStyle(fontSize: 12, color: AppColors.textTertiary)),
                        ],
                      ),
                    ),
                  ),
              ],

              // Bottom padding for nav bar
              const SliverToBoxAdapter(child: SizedBox(height: 120)),
            ],
          ),
        ),
      ),
    );
  }

  void _openSearch(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const _SearchOverlay(),
    );
  }

  Widget _skeletonCard() {
    return Container(
      height: 160,
      decoration: BoxDecoration(
        color: AppColors.divider.withValues(alpha: 0.4),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            height: 90,
            decoration: BoxDecoration(
              color: AppColors.divider,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(width: 80, height: 10, decoration: BoxDecoration(color: AppColors.divider, borderRadius: BorderRadius.circular(4))),
                const SizedBox(height: 6),
                Container(width: 50, height: 10, decoration: BoxDecoration(color: AppColors.divider, borderRadius: BorderRadius.circular(4))),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showRedemptionSheet(BuildContext context, Voucher voucher) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useRootNavigator: true,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black.withValues(alpha: 0.6),
      builder: (_) => _HomeRedemptionSheet(voucher: voucher),
    );
  }

  Widget _sectionHeader(
    BuildContext context, {
    IconData? icon,
    required String title,
    String? trailing,
    bool seeAll = false,
    VoidCallback? onSeeAll,
  }) {
    return Row(
      children: [
        if (icon != null) ...[
          Icon(icon, size: 20, color: AppColors.text),
          const SizedBox(width: 6),
        ],
        Text(title, style: Theme.of(context).textTheme.headlineSmall),
        const Spacer(),
        if (trailing != null)
          Text(
            trailing,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppColors.primary,
            ),
          ),
        if (seeAll)
          GestureDetector(
            onTap: onSeeAll ?? () => context.push('/explore'),
            child: Row(
              children: [
                Text(
                  'See all',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(width: 2),
                Icon(Icons.chevron_right, size: 18, color: AppColors.textSecondary),
              ],
            ),
          ),
      ],
    );
  }
}

class _UpcomingCard extends StatefulWidget {
  final Deal deal;
  final String dropTime;
  const _UpcomingCard({required this.deal, required this.dropTime});

  @override
  State<_UpcomingCard> createState() => _UpcomingCardState();
}

class _UpcomingCardState extends State<_UpcomingCard> {
  bool _reminded = false;

  @override
  Widget build(BuildContext context) {
    final deal = widget.deal;
    return GestureDetector(
      onTap: () => context.push('/deal/${deal.id}'),
      child: Container(
        width: 160,
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(18),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 12, offset: const Offset(0, 4))],
        ),
        child: Stack(
          children: [
            // Blurred food image
            ClipRRect(
              borderRadius: BorderRadius.circular(18),
              child: Stack(
                children: [
                  if (deal.imageUrl != null)
                    ImageFiltered(
                      imageFilter: ImageFilter.blur(sigmaX: 2.5, sigmaY: 2.5),
                      child: Image.network(deal.imageUrl!, height: 180, width: 160, fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Container(height: 180, width: 160, color: AppColors.primary.withValues(alpha: 0.06))),
                    )
                  else
                    Container(height: 180, width: 160, color: AppColors.primary.withValues(alpha: 0.06)),
                  Positioned.fill(
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter, end: Alignment.bottomCenter,
                          colors: [Colors.black.withValues(alpha: 0.05), Colors.black.withValues(alpha: 0.7)],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            // Bell — toggles state
            Positioned(
              top: 8, right: 8,
              child: GestureDetector(
                onTap: () {
                  HapticFeedback.heavyImpact();
                  setState(() => _reminded = !_reminded);
                  if (_reminded) {
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                      content: Row(
                        children: [
                          const Text('🔔 ', style: TextStyle(fontSize: 16)),
                          Expanded(child: Text('We\'ll remind you when ${deal.title} drops!')),
                        ],
                      ),
                      backgroundColor: AppColors.primary,
                      behavior: SnackBarBehavior.floating,
                      margin: const EdgeInsets.fromLTRB(20, 0, 20, 60),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      duration: const Duration(seconds: 2),
                    ));
                  }
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  width: 30, height: 30,
                  decoration: BoxDecoration(
                    color: _reminded ? AppColors.primary : Colors.white.withValues(alpha: 0.9),
                    shape: BoxShape.circle,
                    boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 4)],
                  ),
                  child: Center(child: Text(_reminded ? '✓' : '🔔',
                    style: TextStyle(fontSize: _reminded ? 14 : 13, color: _reminded ? Colors.white : null))),
                ),
              ),
            ),
            // Bottom info with text shadow
            Positioned(
              bottom: 0, left: 0, right: 0,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(deal.title, maxLines: 1, overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white,
                        shadows: [Shadow(color: Colors.black.withValues(alpha: 0.5), blurRadius: 4)])),
                    const SizedBox(height: 3),
                    Text(deal.vendorName,
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.w500, color: Colors.white.withValues(alpha: 0.75),
                        shadows: [Shadow(color: Colors.black.withValues(alpha: 0.4), blurRadius: 3)])),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFA726),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        widget.dropTime.isNotEmpty ? 'Drops at ${widget.dropTime}' : 'Dropping soon',
                        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Colors.white),
                      ),
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
}

class _SearchOverlay extends ConsumerStatefulWidget {
  const _SearchOverlay();

  @override
  ConsumerState<_SearchOverlay> createState() => _SearchOverlayState();
}

class _SearchOverlayState extends ConsumerState<_SearchOverlay> {
  final _controller = TextEditingController();
  final _focusNode = FocusNode();
  List<Deal> _results = [];
  bool _loading = false;
  bool _searched = false;

  @override
  void initState() {
    super.initState();
    _focusNode.requestFocus();
  }

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  Future<void> _search(String query) async {
    if (query.trim().isEmpty) {
      setState(() {
        _results = [];
        _searched = false;
      });
      return;
    }

    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final response = await api.get('/deals', queryParams: {
        'search': query.trim(),
        'limit': 20,
      });
      final data = response.data['data'];
      final deals = (data['deals'] as List).map((d) => Deal.fromJson(d)).toList();
      setState(() {
        _results = deals;
        _searched = true;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.92,
      decoration: const BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          // Handle
          const SizedBox(height: 10),
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.border,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 16),
          // Search field
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: TextField(
              controller: _controller,
              focusNode: _focusNode,
              onChanged: (v) {
                if (v.length >= 2) _search(v);
                if (v.isEmpty) setState(() { _results = []; _searched = false; });
              },
              onSubmitted: _search,
              decoration: InputDecoration(
                hintText: 'Search deals, food, vendors...',
                prefixIcon: const Icon(Icons.search, color: AppColors.textTertiary),
                suffixIcon: _controller.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.close, size: 20),
                        onPressed: () {
                          _controller.clear();
                          setState(() { _results = []; _searched = false; });
                        },
                      )
                    : null,
              ),
            ),
          ),
          const SizedBox(height: 16),
          // Results
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _searched && _results.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 40),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Image.asset('assets/icons/gift_3d.png', width: 56, height: 56),
                              const SizedBox(height: 16),
                              const Text('Nothing here yet',
                                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                              const SizedBox(height: 4),
                              Text('Try a different search or check back later',
                                  style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
                                  textAlign: TextAlign.center),
                            ],
                          ),
                        ),
                      )
                    : !_searched
                        ? Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 20),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Popular searches',
                                    style: Theme.of(context).textTheme.titleMedium),
                                const SizedBox(height: 12),
                                Wrap(
                                  spacing: 8,
                                  runSpacing: 8,
                                  children: [
                                    'Shawarma', 'Jollof Rice', 'Coffee',
                                    'Data', 'Smoothie', 'Game Pass',
                                  ].map((s) => GestureDetector(
                                    onTap: () {
                                      _controller.text = s;
                                      _search(s);
                                    },
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                      decoration: BoxDecoration(
                                        color: AppColors.card,
                                        borderRadius: BorderRadius.circular(20),
                                        border: Border.all(color: AppColors.border.withValues(alpha: 0.4)),
                                      ),
                                      child: Text(s, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                                    ),
                                  )).toList(),
                                ),
                              ],
                            ),
                          )
                        : ListView.separated(
                            padding: const EdgeInsets.symmetric(horizontal: 20),
                            itemCount: _results.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 10),
                            itemBuilder: (context, index) {
                              final deal = _results[index];
                              return _SearchResultTile(
                                deal: deal,
                                onTap: () {
                                  Navigator.of(context).pop();
                                  context.push('/deal/${deal.id}');
                                },
                              );
                            },
                          ),
          ),
        ],
      ),
    );
  }
}

class _SearchResultTile extends StatelessWidget {
  final Deal deal;
  final VoidCallback onTap;

  const _SearchResultTile({required this.deal, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border.withValues(alpha: 0.4)),
        ),
        child: Row(
          children: [
            // Image
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: SizedBox(
                width: 52,
                height: 52,
                child: deal.imageUrl != null
                    ? CachedNetworkImage(imageUrl: deal.imageUrl!, fit: BoxFit.cover)
                    : Container(
                        color: const Color(0xFFF5F5F5),
                        child: const Icon(Icons.fastfood, size: 24, color: AppColors.textTertiary),
                      ),
              ),
            ),
            const SizedBox(width: 12),
            // Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    deal.title,
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    deal.vendorName,
                    style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                  ),
                ],
              ),
            ),
            // Price
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  deal.formattedStudentPrice,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: AppColors.primary,
                  ),
                ),
                Text(
                  deal.formattedOriginalPrice,
                  style: TextStyle(
                    fontSize: 11,
                    color: AppColors.textTertiary,
                    decoration: TextDecoration.lineThrough,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Redemption sheet launched from home screen active vouchers
class _HomeRedemptionSheet extends StatefulWidget {
  final Voucher voucher;
  const _HomeRedemptionSheet({required this.voucher});

  @override
  State<_HomeRedemptionSheet> createState() => _HomeRedemptionSheetState();
}

class _HomeRedemptionSheetState extends State<_HomeRedemptionSheet>
    with SingleTickerProviderStateMixin {
  late Timer _timer;
  late Duration _remaining;
  late AnimationController _pulse;

  @override
  void initState() {
    super.initState();
    _remaining = widget.voucher.expiresAt.difference(DateTime.now());
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _remaining = widget.voucher.expiresAt.difference(DateTime.now()));
    });
    _pulse = AnimationController(vsync: this, duration: const Duration(milliseconds: 1500))
      ..repeat(reverse: true);
  }

  @override
  void dispose() {
    _timer.cancel();
    _pulse.dispose();
    super.dispose();
  }

  String _fmt(Duration d) {
    if (d.isNegative) return '00:00';
    return '${d.inHours.toString().padLeft(2, '0')}:${(d.inMinutes % 60).toString().padLeft(2, '0')}:${(d.inSeconds % 60).toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final v = widget.voucher;
    return Container(
      height: MediaQuery.of(context).size.height * 0.88,
      decoration: const BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        children: [
          const SizedBox(height: 12),
          Container(width: 40, height: 4,
              decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2))),
          const SizedBox(height: 16),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                children: [
                  // Ticket with SVG
                  Stack(
                    children: [
                      Positioned.fill(
                        child: FittedBox(
                          fit: BoxFit.fill,
                          child: SvgPicture.asset('assets/icons/ticket_shape.svg', width: 934, height: 1358),
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.fromLTRB(28, 28, 28, 24),
                        child: Column(
                          children: [
                            Text(v.deal.title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800), textAlign: TextAlign.center),
                            const SizedBox(height: 4),
                            Text(v.deal.formattedPrice, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.primary)),
                            const SizedBox(height: 14),
                            // Pulse
                            AnimatedBuilder(
                              animation: _pulse,
                              builder: (_, __) => Container(
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                                decoration: BoxDecoration(
                                  color: AppColors.success.withValues(alpha: 0.06 + (_pulse.value * 0.04)),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Container(width: 8, height: 8,
                                        decoration: BoxDecoration(shape: BoxShape.circle,
                                            color: AppColors.success.withValues(alpha: 0.5 + (_pulse.value * 0.5)))),
                                    const SizedBox(width: 6),
                                    Text('Active · ${_fmt(_remaining)}',
                                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.success, fontFamily: 'monospace')),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(height: 20),
                            // QR
                            Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
                              child: QrImageView(data: v.qrData, version: QrVersions.auto, size: 170, backgroundColor: Colors.white),
                            ),
                            const SizedBox(height: 10),
                            const Text('Show this to the vendor', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                            const SizedBox(height: 18),
                            // Code
                            const Text('REDEMPTION CODE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.textTertiary, letterSpacing: 1.5)),
                            const SizedBox(height: 6),
                            GestureDetector(
                              onTap: () {
                                Clipboard.setData(ClipboardData(text: v.code));
                                ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                                    content: const Text('Code copied!'), duration: const Duration(seconds: 1),
                                    behavior: SnackBarBehavior.floating, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))));
                              },
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(v.code, style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800, letterSpacing: 4, color: AppColors.primary, fontFamily: 'monospace')),
                                  const SizedBox(width: 8),
                                  const Icon(Icons.copy, size: 16, color: AppColors.textTertiary),
                                ],
                              ),
                            ),
                            const SizedBox(height: 14),
                            // Vendor
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Container(width: 28, height: 28,
                                    decoration: BoxDecoration(shape: BoxShape.circle, color: AppColors.primary.withValues(alpha: 0.08)),
                                    child: Center(child: Text(v.deal.vendorName.substring(0, 1),
                                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: AppColors.primary)))),
                                const SizedBox(width: 8),
                                Text(v.deal.vendorName, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.textSecondary)),
                                const SizedBox(width: 4),
                                Image.asset('assets/icons/checkmark_3d.png', width: 16, height: 16),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  // Done
                  SizedBox(
                    width: double.infinity, height: 50,
                    child: Container(
                      decoration: BoxDecoration(borderRadius: BorderRadius.circular(30),
                          boxShadow: [BoxShadow(color: AppColors.primary.withValues(alpha: 0.25), blurRadius: 16, offset: const Offset(0, 6))]),
                      child: ElevatedButton(
                          onPressed: () => Navigator.of(context).pop(),
                          style: ElevatedButton.styleFrom(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30))),
                          child: const Text('Done', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700))),
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
