import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../core/theme/colors.dart';
import '../../core/mock_data.dart';
import '../../models/vendor.dart';
import '../../models/deal.dart';
import '../../models/loyalty.dart';
import '../../widgets/deal_card.dart';
import '../../widgets/loyalty_sticker_row.dart';
import '../../widgets/price_display.dart';

class VendorProfileScreen extends ConsumerStatefulWidget {
  final String vendorId;

  const VendorProfileScreen({super.key, required this.vendorId});

  @override
  ConsumerState<VendorProfileScreen> createState() =>
      _VendorProfileScreenState();
}

class _VendorProfileScreenState extends ConsumerState<VendorProfileScreen>
    with SingleTickerProviderStateMixin {
  late Vendor _vendor;
  bool _isFollowed = false;
  late AnimationController _heartController;
  late Animation<double> _heartScale;

  @override
  void initState() {
    super.initState();
    _heartController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _heartScale = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 1.0, end: 1.3), weight: 40),
      TweenSequenceItem(tween: Tween(begin: 1.3, end: 0.9), weight: 30),
      TweenSequenceItem(tween: Tween(begin: 0.9, end: 1.0), weight: 30),
    ]).animate(CurvedAnimation(parent: _heartController, curve: Curves.easeOut));
    _vendor = mockVendorsMap[widget.vendorId] ?? mockVendorsMap.values.first;
    _isFollowed = _vendor.isFollowed;
  }

  @override
  void dispose() {
    _heartController.dispose();
    super.dispose();
  }

  void _toggleFollow() {
    setState(() => _isFollowed = !_isFollowed);
    if (_isFollowed) {
      _heartController.forward(from: 0);
      HapticFeedback.lightImpact();
    }
  }

  void _showRewardTicket(BuildContext context, String vendorName) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useRootNavigator: true,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black.withValues(alpha: 0.6),
      builder: (_) => _RewardTicketSheet(vendorName: vendorName),
    );
  }

  @override
  Widget build(BuildContext context) {
    final activeDeals = _vendor.deals
        .where((d) =>
            d.expiresAt.isAfter(DateTime.now()) &&
            d.expiresAt.difference(DateTime.now()).inMinutes <= 60)
        .toList();
    final allDeals =
        _vendor.deals.where((d) => d.expiresAt.isAfter(DateTime.now())).toList();

    return Scaffold(
      backgroundColor: AppColors.card,
      body: Stack(
        children: [
          CustomScrollView(
            slivers: [
              // ──── HERO + CURVED SHEET in one Stack ────
              SliverToBoxAdapter(
                child: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    // Cover image
                    SizedBox(
                      height: 280,
                      width: double.infinity,
                      child: _vendor.coverUrl != null
                          ? CachedNetworkImage(
                              imageUrl: _vendor.coverUrl!,
                              fit: BoxFit.cover,
                            )
                          : Container(color: AppColors.primary),
                    ),
                    // Top scrim
                    Positioned(
                      top: 0,
                      left: 0,
                      right: 0,
                      child: Container(
                        height: 120,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.black.withValues(alpha: 0.5),
                              Colors.transparent,
                            ],
                          ),
                        ),
                      ),
                    ),
                    // Nav icons
                    Positioned(
                      top: MediaQuery.of(context).padding.top + 8,
                      left: 16,
                      right: 16,
                      child: Row(
                        children: [
                          _navCircle(
                            icon: Icons.arrow_back,
                            onTap: () => Navigator.of(context).pop(),
                          ),
                          const Spacer(),
                          GestureDetector(
                            onTap: _toggleFollow,
                            child: AnimatedBuilder(
                              animation: _heartScale,
                              builder: (_, __) => Transform.scale(
                                scale: _heartScale.value,
                                child: Container(
                                  width: 38,
                                  height: 38,
                                  decoration: BoxDecoration(
                                    color: Colors.black.withValues(alpha: 0.35),
                                    shape: BoxShape.circle,
                                  ),
                                  child: Icon(
                                    _isFollowed ? Icons.favorite : Icons.favorite_border,
                                    color: _isFollowed ? AppColors.danger : Colors.white,
                                    size: 20,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    // Curved white sheet — overlaps image
                    Positioned(
                      top: 250,
                      left: 0,
                      right: 0,
                      child: Container(
                        height: 40,
                        decoration: const BoxDecoration(
                          color: AppColors.card,
                          borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
                        ),
                      ),
                    ),
                    // Vendor logo — on the curve boundary
                    Positioned(
                      top: 232,
                      left: 20,
                      child: Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.card,
                          border: Border.all(color: AppColors.card, width: 4),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.shadow.withValues(alpha: 0.12),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Container(
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppColors.primary.withValues(alpha: 0.1),
                          ),
                          child: Center(
                            child: Text(
                              _vendor.businessName.substring(0, 1),
                              style: const TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.w800,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // ──── CONTENT below the curved sheet ────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Vendor name + subtitle
                        Text(
                        _vendor.businessName,
                        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${_vendor.totalStudents} students · ${_vendor.businessAddress}',
                        style: const TextStyle(fontSize: 12, color: AppColors.textTertiary),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 14),
                      // Single horizontal scroll of pills
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: [
                            _pill(
                              _vendor.isOpen ? 'Open' : 'Closed',
                              color: _vendor.isOpen ? AppColors.success : AppColors.danger,
                              dot: true,
                            ),
                            _pill('⭐ ${_vendor.rating}'),
                            _pill('🕒 ${_vendor.opensAtFormatted}–${_vendor.closesAtFormatted}'),
                            ..._vendor.buzzTags.map((t) => _pill(t)),
                          ],
                        ),
                      ),
                      // Follow — inline toggle, no snackbar
                      const SizedBox(height: 14),
                      GestureDetector(
                        onTap: _toggleFollow,
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                          decoration: BoxDecoration(
                            color: _isFollowed
                                ? AppColors.primary.withValues(alpha: 0.06)
                                : Colors.transparent,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                _isFollowed ? Icons.notifications_active : Icons.notifications_none,
                                size: 16,
                                color: _isFollowed ? AppColors.primary : AppColors.textSecondary,
                              ),
                              const SizedBox(width: 5),
                              Text(
                                _isFollowed ? 'Following' : 'Follow for deal alerts',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: _isFollowed ? FontWeight.w600 : FontWeight.w500,
                                  color: _isFollowed ? AppColors.primary : AppColors.textSecondary,
                                ),
                              ),
                              if (_isFollowed) ...[
                                const SizedBox(width: 4),
                                Icon(Icons.check, size: 14, color: AppColors.primary),
                              ],
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // ──── HAPPY HOUR (hero card) ────
              if (activeDeals.isNotEmpty) ...[
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 10),
                    child: Row(
                      children: [
                        Image.asset('assets/icons/flame_3d.png', width: 18, height: 18),
                        const SizedBox(width: 6),
                        const Text('Happy Hour',
                            style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
                      ],
                    ),
                  ),
                ),
                SliverToBoxAdapter(
                  child: SizedBox(
                    height: 360,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      itemCount: activeDeals.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 12),
                      itemBuilder: (context, index) => SizedBox(
                        width: 180,
                        child: DealCard(
                          deal: activeDeals[index],
                          onTap: () => context.push('/deal/${activeDeals[index].id}'),
                        ),
                      ),
                    ),
                  ),
                ),
                const SliverToBoxAdapter(child: SizedBox(height: 24)),
              ],

              // ──── LOYALTY CARD ────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                  child: LoyaltyCardWidget(
                    card: mockLoyaltyCards.firstWhere(
                      (lc) => lc.vendorId == _vendor.id,
                      orElse: () => LoyaltyCard(id: 'new', vendorId: _vendor.id, vendorName: _vendor.businessName, stamps: 0, target: 5, rewardsUsed: 0),
                    ),
                    onClaim: () {
                      _showRewardTicket(context, _vendor.businessName);
                    },
                  ),
                ),
              ),

              // ──── MENU — flat list, no cards ────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 6),
                  child: Text('Menu',
                      style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
                ),
              ),
              ..._buildFlatMenu(context, allDeals),

              // ──── SHOP INFO — compact ────
              const SliverToBoxAdapter(child: SizedBox(height: 24)),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      Icon(Icons.directions, size: 15, color: AppColors.textSecondary),
                      const SizedBox(width: 5),
                      GestureDetector(
                        onTap: () {},
                        child: Text(
                          'Get Directions',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textSecondary,
                            decoration: TextDecoration.underline,
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          '· ${_vendor.businessAddress}',
                          style: const TextStyle(fontSize: 12, color: AppColors.textTertiary),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SliverToBoxAdapter(child: SizedBox(height: 40)),
            ],
          ),
        ],
      ),
    );
  }

  // Flat menu — grouped by category, thin separators, no boxes
  List<Widget> _buildFlatMenu(BuildContext context, List<Deal> deals) {
    final categories = <String, List<Deal>>{};
    for (final d in deals) {
      categories.putIfAbsent(d.category, () => []).add(d);
    }

    final widgets = <Widget>[];
    for (final entry in categories.entries) {
      // Category label
      widgets.add(SliverToBoxAdapter(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 6),
          child: Text(
            _categoryLabel(entry.key).toUpperCase(),
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: AppColors.textTertiary,
              letterSpacing: 1.2,
            ),
          ),
        ),
      ));
      // Items
      widgets.add(SliverPadding(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        sliver: SliverList(
          delegate: SliverChildBuilderDelegate(
            (context, index) {
              final deal = entry.value[index];
              final isLast = index == entry.value.length - 1;
              return GestureDetector(
                onTap: () => context.push('/checkout/${deal.id}'),
                child: Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      child: Row(
                        children: [
                          // Image tap → detail
                          GestureDetector(
                            onTap: () => context.push('/deal/${deal.id}'),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(10),
                              child: SizedBox(
                                width: 52,
                                height: 52,
                                child: deal.imageUrl != null
                                    ? CachedNetworkImage(
                                        imageUrl: deal.imageUrl!, fit: BoxFit.cover)
                                    : Container(
                                        color: AppColors.background,
                                        child: const Icon(Icons.fastfood,
                                            size: 22, color: AppColors.textTertiary),
                                      ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(deal.title,
                                    style: const TextStyle(
                                        fontSize: 14, fontWeight: FontWeight.w600)),
                                const SizedBox(height: 3),
                                PriceDisplay(
                                  studentPriceKobo: deal.studentPrice,
                                  originalPriceKobo: deal.originalPrice,
                                  studentFontSize: 15,
                                  originalFontSize: 11,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          // Pay button → straight to checkout
                          GestureDetector(
                            onTap: () => context.push('/checkout/${deal.id}'),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                              decoration: BoxDecoration(
                                color: AppColors.primary,
                                borderRadius: BorderRadius.circular(20),
                                boxShadow: [
                                  BoxShadow(
                                    color: AppColors.primary.withValues(alpha: 0.2),
                                    blurRadius: 8,
                                    offset: const Offset(0, 3),
                                  ),
                                ],
                              ),
                              child: Text(
                                deal.formattedStudentPrice,
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (!isLast)
                      Container(
                        margin: const EdgeInsets.only(left: 66),
                        height: 1,
                        color: AppColors.divider,
                      ),
                  ],
                ),
              );
            },
            childCount: entry.value.length,
          ),
        ),
      ));
    }
    return widgets;
  }

  Widget _navCircle({required IconData icon, Color color = Colors.white, required VoidCallback onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 38,
        height: 38,
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: 0.35),
          shape: BoxShape.circle,
        ),
        child: Icon(icon, color: color, size: 20),
      ),
    );
  }

  Widget _pill(String text, {Color? color, bool dot = false}) {
    return Container(
      margin: const EdgeInsets.only(right: 8),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color != null ? color.withValues(alpha: 0.08) : AppColors.background,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (dot) ...[
            Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(shape: BoxShape.circle, color: color),
            ),
            const SizedBox(width: 5),
          ],
          Text(
            text,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: color ?? AppColors.text,
            ),
          ),
        ],
      ),
    );
  }

  String _categoryLabel(String cat) {
    return switch (cat) {
      'FOOD' => '🍔 Food',
      'DRINKS' => '🥤 Drinks',
      'SUBSCRIPTIONS' => '📱 Subscriptions',
      'TRANSPORT' => '🚗 Transport',
      'SHOPPING' => '🛍️ Shopping',
      'LIFESTYLE' => '🎮 Lifestyle',
      _ => cat,
    };
  }
}

/// Special reward ticket — gold-tinted, "FREE" instead of price
class _RewardTicketSheet extends StatelessWidget {
  final String vendorName;

  const _RewardTicketSheet({required this.vendorName});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.75,
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
                  // Gold-tinted reward ticket using SVG shape
                  Stack(
                    children: [
                      Positioned.fill(
                        child: FittedBox(
                          fit: BoxFit.fill,
                          child: SvgPicture.asset(
                            'assets/icons/ticket_shape.svg',
                            width: 934,
                            height: 1358,
                            colorFilter: const ColorFilter.mode(Color(0xFFFFFBF0), BlendMode.srcIn),
                          ),
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.fromLTRB(28, 28, 28, 24),
                      child: Column(
                        children: [
                          // Celebration icon
                          Image.asset('assets/icons/gift_3d.png', width: 56, height: 56),
                          const SizedBox(height: 14),
                          const Text('Loyalty Reward',
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600,
                                  color: Color(0xFFD97706), letterSpacing: 1)),
                          const SizedBox(height: 6),
                          const Text('FREE MEAL',
                              style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800,
                                  color: AppColors.success)),
                          const SizedBox(height: 4),
                          Text(vendorName,
                              style: const TextStyle(fontSize: 14, color: AppColors.textSecondary)),

                          const SizedBox(height: 20),

                          // Reward code
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: const Column(
                              children: [
                                Text('REWARD CODE', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w600,
                                    color: AppColors.textTertiary, letterSpacing: 1.5)),
                                SizedBox(height: 4),
                                Text('BUZZ-FREE',
                                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800,
                                        letterSpacing: 4, color: AppColors.success, fontFamily: 'monospace')),
                              ],
                            ),
                          ),

                          const SizedBox(height: 16),

                          // Verified badge
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Container(
                                width: 24, height: 24,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: AppColors.primary.withValues(alpha: 0.08),
                                ),
                                child: Center(
                                  child: Text(vendorName.substring(0, 1),
                                      style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppColors.primary)),
                                ),
                              ),
                              const SizedBox(width: 6),
                              Text(vendorName,
                                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: AppColors.textSecondary)),
                              const SizedBox(width: 4),
                              Image.asset('assets/icons/checkmark_3d.png', width: 14, height: 14),
                            ],
                          ),
                        ],
                      ),
                    ),
                    ],
                  ),

                  const SizedBox(height: 20),

                  // Instructions
                  const Text('Show this to the vendor to claim your free meal',
                      style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
                      textAlign: TextAlign.center),

                  const SizedBox(height: 24),

                  // Done button
                  SizedBox(
                    width: double.infinity, height: 50,
                    child: Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(30),
                        boxShadow: [BoxShadow(color: AppColors.success.withValues(alpha: 0.2),
                            blurRadius: 16, offset: const Offset(0, 6))],
                      ),
                      child: ElevatedButton(
                        onPressed: () => Navigator.of(context).pop(),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.success,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                        ),
                        child: const Text('Done',
                            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white)),
                      ),
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

