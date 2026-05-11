import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../../core/mock_data.dart';
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

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      ref.read(dealsProvider.notifier).loadDeals(refresh: true);
      ref.read(dealsProvider.notifier).loadFeatured();
      ref.read(dealsProvider.notifier).loadHappyHour();
      ref.read(vouchersProvider.notifier).loadVouchers(status: 'ACTIVE');
    });
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

              // ──── LOYALTY PROGRESS (above happy hour) ────
              if (mockLoyaltyCards.any((lc) => lc.stamps > 0 && !lc.isComplete))
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                    child: LoyaltyCardWidget(
                      card: mockLoyaltyCards.firstWhere((lc) => lc.stamps > 0 && !lc.isComplete),
                    ),
                  ),
                ),

              // ──── 3. HAPPY HOUR ────
              if (deals.happyHour.isNotEmpty) ...[
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 0),
                    child: Row(
                      children: [
                        Image.asset('assets/icons/flame_3d.png',
                            width: 22, height: 22),
                        const SizedBox(width: 6),
                        Text(
                          'Happy Hour',
                          style: Theme.of(context).textTheme.headlineSmall,
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: AppColors.primary.withValues(alpha: 0.2),
                            ),
                          ),
                          child: Text(
                            'Ending soon',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: AppColors.primaryDark,
                            ),
                          ),
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
                      itemCount: deals.happyHour.length,
                      itemBuilder: (context, index) {
                        final deal = deals.happyHour[index];
                        return Padding(
                          padding: const EdgeInsets.only(right: 12),
                          child: HappyHourCard(
                            deal: deal,
                            onTap: () => context.push('/deal/${deal.id}'),
                          ),
                        );
                      },
                    ),
                  ),
                ),
                const SliverToBoxAdapter(child: SizedBox(height: 24)),
              ],

              // ──── 4. TRENDING AT UNILAG ────
              if (deals.featured.isNotEmpty && _selectedCategory == null) ...[
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: _sectionHeader(
                      context,
                      title: 'Trending at UNILAG',
                      seeAll: true,
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
                      itemCount: deals.featured.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 6),
                      itemBuilder: (context, index) {
                        final deal = deals.featured[index];
                        return TrendingCircle(
                          deal: deal,
                          isNew: index < 2,
                          onTap: () => context.push('/vendor/${deal.vendorId}'),
                        );
                      },
                    ),
                  ),
                ),
                const SliverToBoxAdapter(child: SizedBox(height: 24)),
              ],

              // ──── 5. MAIN FEED ────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: _sectionHeader(
                    context,
                    title: _selectedCategory != null ? 'Results' : 'Hot in Akoka',
                    seeAll: true,
                  ),
                ),
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 14)),

              if (deals.isLoading && deals.deals.isEmpty)
                const SliverFillRemaining(
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (deals.deals.isEmpty)
                SliverFillRemaining(
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.search_off, size: 48, color: AppColors.textTertiary),
                        const SizedBox(height: 12),
                        Text('No deals found',
                            style: Theme.of(context).textTheme.titleMedium),
                      ],
                    ),
                  ),
                )
              else
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
                      childCount: deals.deals.length,
                    ),
                  ),
                ),

              const SliverToBoxAdapter(child: SizedBox(height: 32)),
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

  void _showRedemptionSheet(BuildContext context, Voucher voucher) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useRootNavigator: true,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black.withValues(alpha: 0.6),
      transitionAnimationController: AnimationController(
        vsync: Navigator.of(context),
        duration: const Duration(milliseconds: 300),
      ),
      builder: (_) => _HomeRedemptionSheet(voucher: voucher),
    );
  }

  Widget _sectionHeader(
    BuildContext context, {
    IconData? icon,
    required String title,
    String? trailing,
    bool seeAll = false,
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
        if (seeAll) ...[
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
      ],
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
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.search_off, size: 48, color: AppColors.textTertiary),
                            const SizedBox(height: 12),
                            Text('No deals found',
                                style: Theme.of(context).textTheme.titleMedium),
                            const SizedBox(height: 4),
                            Text('Try a different search',
                                style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                          ],
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
