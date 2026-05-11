import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../core/theme/colors.dart';
import '../../models/voucher.dart';
import '../../providers/vouchers_provider.dart';

class VouchersScreen extends ConsumerStatefulWidget {
  const VouchersScreen({super.key});

  @override
  ConsumerState<VouchersScreen> createState() => _VouchersScreenState();
}

class _VouchersScreenState extends ConsumerState<VouchersScreen> {
  int _selectedTab = 0;

  @override
  void initState() {
    super.initState();
    Future.microtask(() => _loadTab());
  }

  void _loadTab() {
    if (_selectedTab == 0) {
      ref.read(vouchersProvider.notifier).loadVouchers(status: 'ACTIVE');
    } else {
      ref.read(vouchersProvider.notifier).loadVouchers();
    }
  }

  int get _totalSavings {
    final active = ref.read(vouchersProvider).vouchers.where((v) => v.isActive || v.isRedeemed);
    // Rough savings estimate from student price
    return active.fold(0, (sum, v) => sum + (v.deal.studentPrice ~/ 5));
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(vouchersProvider);
    final vouchers = _selectedTab == 0
        ? state.vouchers.where((v) => v.isActive).toList()
        : state.vouchers.where((v) => v.isRedeemed || v.isExpired).toList();
    final activeCount = state.vouchers.where((v) => v.isActive).length;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
              child: Text(
                'My Vouchers',
                style: Theme.of(context).textTheme.headlineLarge,
              ),
            ),

            // Floating segmented toggle
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Container(
                height: 46,
                padding: const EdgeInsets.all(3),
                decoration: BoxDecoration(
                  color: AppColors.divider,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Row(
                  children: [
                    _tab('Active', 0, activeCount),
                    _tab('History', 1, null),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 14),

            // Banner — contextual per tab
            if (_selectedTab == 0 && activeCount > 0)
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 14),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0FDFA),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFCCFBF1)),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          'You\'ve saved ₦${(_totalSavings / 100).toInt().toString().replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')} this week!',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF0D9488),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Image.asset('assets/icons/confetti_3d.png', width: 28, height: 28),
                    ],
                  ),
                ),
              ),
            if (_selectedTab == 1 && vouchers.isNotEmpty)
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 14),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.05),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.primary.withValues(alpha: 0.1)),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          'You\'ve redeemed ${vouchers.where((v) => v.isRedeemed).length} voucher${vouchers.where((v) => v.isRedeemed).length != 1 ? 's' : ''} this month!',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Image.asset('assets/icons/food_3d.png', width: 24, height: 24),
                    ],
                  ),
                ),
              ),

            // List
            Expanded(
              child: state.isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : vouchers.isEmpty
                      ? _emptyState()
                      : RefreshIndicator(
                          onRefresh: () async => _loadTab(),
                          child: ListView.separated(
                            padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                            itemCount: vouchers.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 12),
                            itemBuilder: (context, index) {
                              final voucher = vouchers[index];
                              return _VoucherCard(
                                voucher: voucher,
                                onTap: () {
                                  if (voucher.isActive) {
                                    _showRedemptionSheet(context, voucher);
                                  } else {
                                    context.push('/voucher/${voucher.id}');
                                  }
                                },
                              );
                            },
                          ),
                        ),
            ),
          ],
        ),
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
      builder: (_) => _RedemptionSheet(voucher: voucher),
    );
  }

  Widget _tab(String label, int index, int? count) {
    final isSelected = _selectedTab == index;
    return Expanded(
      child: GestureDetector(
        onTap: () {
          setState(() => _selectedTab = index);
          _loadTab();
        },
        child: Container(
          decoration: BoxDecoration(
            color: isSelected ? AppColors.card : Colors.transparent,
            borderRadius: BorderRadius.circular(11),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: AppColors.shadow.withValues(alpha: 0.06),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ]
                : null,
          ),
          child: Center(
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: isSelected ? AppColors.text : AppColors.textTertiary,
                  ),
                ),
                if (count != null && count > 0) ...[
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '$count',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _emptyState() {
    final isActive = _selectedTab == 0;
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Large 3D asset with floating shadow
            Container(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    blurRadius: 24,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: isActive
                  ? Image.asset('assets/icons/ticket_3d.png', width: 80, height: 80)
                  : Image.asset('assets/icons/hourglass_3d.png', width: 72, height: 72),
            ),
            const SizedBox(height: 28),
            Text(
              isActive ? 'Your voucher pocket is empty' : 'No savings history yet',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              isActive
                  ? 'Grab a deal and your first voucher will appear here.'
                  : 'Your savings journey starts here. Once you redeem a voucher, it\'ll appear in your history!',
              style: const TextStyle(color: AppColors.textSecondary, fontSize: 13, height: 1.5),
              textAlign: TextAlign.center,
            ),
            if (isActive) ...[
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(30),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withValues(alpha: 0.25),
                        blurRadius: 16,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: ElevatedButton(
                    onPressed: () => context.go('/'),
                    style: ElevatedButton.styleFrom(
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                    ),
                    child: const Text('Explore Deals',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Clean full-width voucher card — no ticket punch, just shadow + white
class _VoucherCard extends StatefulWidget {
  final Voucher voucher;
  final VoidCallback onTap;

  const _VoucherCard({required this.voucher, required this.onTap});

  @override
  State<_VoucherCard> createState() => _VoucherCardState();
}

class _VoucherCardState extends State<_VoucherCard> {
  late Timer _timer;
  late Duration _remaining;

  @override
  void initState() {
    super.initState();
    _remaining = widget.voucher.expiresAt.difference(DateTime.now());
    _timer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted) {
        setState(() => _remaining = widget.voucher.expiresAt.difference(DateTime.now()));
      }
    });
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  String _formatTime(Duration d) {
    if (d.isNegative) return 'Expired';
    if (d.inHours > 0) return '${d.inHours}h ${d.inMinutes % 60}m';
    return '${d.inMinutes}m';
  }

  String _formatDate(DateTime dt) {
    final now = DateTime.now();
    final diff = now.difference(dt);
    if (diff.inDays == 0) return 'Today';
    if (diff.inDays == 1) return 'Yesterday';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${dt.day} ${months[dt.month - 1]}';
  }

  @override
  Widget build(BuildContext context) {
    final v = widget.voucher;
    final isActive = v.isActive;
    final isExpired = v.isExpired;
    final isRedeemed = v.isRedeemed;

    return GestureDetector(
      onTap: widget.onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: AppColors.shadow.withValues(alpha: 0.05),
              blurRadius: 20,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            // Left — vendor avatar
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isActive
                    ? AppColors.primary.withValues(alpha: 0.08)
                    : AppColors.divider,
              ),
              child: Center(
                child: Text(
                  v.deal.vendorName.substring(0, 1),
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: isActive ? AppColors.primary : AppColors.textTertiary,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 14),
            // Center — vendor label + deal title + status
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Vendor — light label
                  Text(
                    v.deal.vendorName,
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.textTertiary,
                      fontWeight: FontWeight.w400,
                    ),
                  ),
                  const SizedBox(height: 3),
                  // Deal title — bold hero
                  Text(
                    v.deal.title,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: isActive ? AppColors.text : AppColors.textSecondary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 6),
                  // Status pill
                  if (isActive)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: _remaining.inHours < 2
                            ? AppColors.danger.withValues(alpha: 0.08)
                            : AppColors.primary.withValues(alpha: 0.06),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        '⏳ ${_formatTime(_remaining)} left',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: _remaining.inHours < 2 ? AppColors.danger : AppColors.primary,
                        ),
                      ),
                    )
                  else if (isRedeemed)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppColors.success.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.check_circle, size: 12, color: AppColors.success),
                          const SizedBox(width: 3),
                          Text(
                            'Redeemed',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.success),
                          ),
                        ],
                      ),
                    )
                  else if (isExpired)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppColors.divider,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Text(
                        'Expired',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textSecondary),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            // Right — context-sensitive
            if (isActive)
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Center(
                  child: Image.asset('assets/icons/qr_code.png', width: 22, height: 22),
                ),
              )
            else
              // Date + report icon for history
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    _formatDate(v.createdAt),
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.textTertiary,
                      fontWeight: FontWeight.w400,
                    ),
                  ),
                  if (isExpired) ...[
                    const SizedBox(height: 4),
                    GestureDetector(
                      onTap: () {},
                      child: Icon(
                        Icons.flag_outlined,
                        size: 18,
                        color: AppColors.textTertiary,
                      ),
                    ),
                  ],
                ],
              ),
          ],
        ),
      ),
    );
  }
}

/// Bottom sheet for quick voucher redemption
/// Premium ticket-shaped voucher redemption sheet
class _RedemptionSheet extends StatefulWidget {
  final Voucher voucher;

  const _RedemptionSheet({required this.voucher});

  @override
  State<_RedemptionSheet> createState() => _RedemptionSheetState();
}

class _RedemptionSheetState extends State<_RedemptionSheet>
    with SingleTickerProviderStateMixin {
  late Timer _timer;
  late Duration _remaining;
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _remaining = widget.voucher.expiresAt.difference(DateTime.now());
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _remaining = widget.voucher.expiresAt.difference(DateTime.now()));
    });
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _timer.cancel();
    _pulseController.dispose();
    super.dispose();
  }

  String _formatCountdown(Duration d) {
    if (d.isNegative) return '00:00';
    final h = d.inHours.toString().padLeft(2, '0');
    final m = (d.inMinutes % 60).toString().padLeft(2, '0');
    final s = (d.inSeconds % 60).toString().padLeft(2, '0');
    return '$h:$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    final v = widget.voucher;

    return Container(
      height: MediaQuery.of(context).size.height * 0.9,
      decoration: const BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        children: [
          // Grabber
          const SizedBox(height: 12),
          Container(width: 40, height: 4,
              decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2))),
          const SizedBox(height: 16),

          // Scrollable ticket content
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                children: [
                  // ──── THE TICKET (SVG) ────
                  Stack(
                    children: [
                      // SVG stretches to match content
                      Positioned.fill(
                        child: FittedBox(
                          fit: BoxFit.fill,
                          child: SvgPicture.asset(
                            'assets/icons/ticket_shape.svg',
                            width: 934,
                            height: 1358,
                          ),
                        ),
                      ),
                      // Content on top
                      Padding(
                        padding: const EdgeInsets.fromLTRB(28, 28, 28, 24),
                      child: Column(
                        children: [
                          // ── TOP: Product hero ──
                          Text(v.deal.title,
                              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                              textAlign: TextAlign.center),
                          const SizedBox(height: 4),
                          Text(v.deal.formattedPrice,
                              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.primary)),

                          const SizedBox(height: 16),

                          // Timer with pulse animation
                          AnimatedBuilder(
                            animation: _pulseController,
                            builder: (_, __) => Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                              decoration: BoxDecoration(
                                color: AppColors.success.withValues(
                                    alpha: 0.06 + (_pulseController.value * 0.04)),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Container(
                                    width: 8, height: 8,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: AppColors.success.withValues(
                                          alpha: 0.5 + (_pulseController.value * 0.5)),
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Text('Active · ${_formatCountdown(_remaining)}',
                                      style: const TextStyle(
                                        fontSize: 13, fontWeight: FontWeight.w700,
                                        color: AppColors.success, fontFamily: 'monospace',
                                      )),
                                ],
                              ),
                            ),
                          ),

                          const SizedBox(height: 24),

                          // ── QR CODE — hero ──
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: QrImageView(
                              data: v.qrData,
                              version: QrVersions.auto,
                              size: 180,
                              backgroundColor: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 10),
                          const Text('Show this to the vendor',
                              style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),

                          const SizedBox(height: 20),

                          const SizedBox(height: 18),

                          // ── BOTTOM STUB: Code + Vendor ──
                          // Redemption code — big and bold
                          const Text('REDEMPTION CODE',
                              style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600,
                                  color: AppColors.textTertiary, letterSpacing: 1.5)),
                          const SizedBox(height: 6),
                          GestureDetector(
                            onTap: () {
                              Clipboard.setData(ClipboardData(text: v.code));
                              ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                                content: const Text('Code copied!'),
                                duration: const Duration(seconds: 1),
                                behavior: SnackBarBehavior.floating,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ));
                            },
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(v.code,
                                    style: const TextStyle(
                                      fontSize: 28, fontWeight: FontWeight.w800,
                                      letterSpacing: 4, color: AppColors.primary,
                                      fontFamily: 'monospace',
                                    )),
                                const SizedBox(width: 8),
                                const Icon(Icons.copy, size: 16, color: AppColors.textTertiary),
                              ],
                            ),
                          ),
                          const SizedBox(height: 14),

                          // Vendor branding + verified
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Container(
                                width: 28, height: 28,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: AppColors.primary.withValues(alpha: 0.08),
                                ),
                                child: Center(
                                  child: Text(v.deal.vendorName.substring(0, 1),
                                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: AppColors.primary)),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(v.deal.vendorName,
                                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.textSecondary)),
                              const SizedBox(width: 4),
                              Image.asset('assets/icons/checkmark_3d.png', width: 16, height: 16),
                            ],
                          ),
                        ],
                      ),
                    ),
                    ],
                  ),

                  const SizedBox(height: 20),

                  // Instructions — minimal
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      _stepDot('1', 'Show screen'),
                      _stepArrow(),
                      _stepDot('2', 'Vendor scans'),
                      _stepArrow(),
                      _stepDot('3', 'Enjoy!'),
                    ],
                  ),

                  const SizedBox(height: 24),

                  // Done button
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(30),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primary.withValues(alpha: 0.25),
                            blurRadius: 16,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: ElevatedButton(
                        onPressed: () => Navigator.of(context).pop(),
                        style: ElevatedButton.styleFrom(
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                        ),
                        child: const Text('Done',
                            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
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

  Widget _stepDot(String num, String label) {
    return Column(
      children: [
        Container(
          width: 28, height: 28,
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.08),
            shape: BoxShape.circle,
          ),
          child: Center(child: Text(num,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.primary))),
        ),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textTertiary)),
      ],
    );
  }

  Widget _stepArrow() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Icon(Icons.chevron_right, size: 16, color: AppColors.textTertiary),
    );
  }
}

/// Dashed horizontal line for the "tear" effect
/// Ticket card with side notches and purple shadow — sizes to content
class _TicketCardPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final fill = Paint()..color = Colors.white;
    final shadow = Paint()
      ..color = const Color(0xFF6C4FFF).withValues(alpha: 0.07)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 20);

    final rrect = RRect.fromRectAndRadius(
      Rect.fromLTWH(0, 0, size.width, size.height),
      const Radius.circular(24),
    );

    final path = Path()..addRRect(rrect);

    // Side notches at ~62% height (where the tear line is)
    const notchRadius = 16.0;
    final notchY = size.height * 0.6;
    path.addOval(Rect.fromCircle(center: Offset(0, notchY), radius: notchRadius));
    path.addOval(Rect.fromCircle(center: Offset(size.width, notchY), radius: notchRadius));
    path.fillType = PathFillType.evenOdd;

    canvas.drawPath(path, shadow);
    canvas.drawPath(path, fill);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _DashedLinePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.border
      ..strokeWidth = 1;
    const dashW = 6.0;
    const gapW = 4.0;
    double x = 0;
    while (x < size.width) {
      canvas.drawLine(Offset(x, 0), Offset((x + dashW).clamp(0, size.width), 0), paint);
      x += dashW + gapW;
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
