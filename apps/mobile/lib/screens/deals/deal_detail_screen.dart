import 'dart:convert';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:share_plus/share_plus.dart';
import '../../core/mock_data.dart';
import '../../core/theme/colors.dart';
import '../../models/deal.dart';
import '../../providers/api_provider.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/price_display.dart';
import '../../widgets/verify_gate_sheet.dart';

class DealDetailScreen extends ConsumerStatefulWidget {
  final String dealId;

  const DealDetailScreen({super.key, required this.dealId});

  @override
  ConsumerState<DealDetailScreen> createState() => _DealDetailScreenState();
}

class _DealDetailScreenState extends ConsumerState<DealDetailScreen> {
  Deal? _deal;
  bool _loading = true;
  bool _offline = false;
  int _qty = 1;

  @override
  void initState() {
    super.initState();
    _loadDeal();
  }

  Future<void> _loadDeal() async {
    if (useMockData) {
      final all = [...mockDeals, ...mockHappyHour, ...mockUpcoming];
      final match = all.where((d) => d.id == widget.dealId);
      setState(() {
        _deal = match.isNotEmpty ? match.first : null;
        _loading = false;
      });
      return;
    }
    try {
      final api = ref.read(apiClientProvider);
      final response = await api.get('/deals/${widget.dealId}');
      setState(() {
        _deal = Deal.fromJson(response.data['data']);
        _loading = false;
      });
    } catch (_) {
      setState(() { _loading = false; _offline = true; });
    }
  }

  void _handlePay(Deal deal) {
    // Block purchase for upcoming/dropping-soon deals
    if (deal.dealStatus == 'upcoming') {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('This deal drops at ${deal.dailyStart ?? "soon"} — set a reminder!'),
        backgroundColor: const Color(0xFFF57C00),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ));
      return;
    }

    final isVerified = ref.read(authProvider).user?.isVerified ?? false;
    if (!isVerified) {
      VerifyGateSheet.show(
        context,
        dealTitle: deal.title,
        savings: deal.formattedSavings,
        studentPriceKobo: deal.studentPrice,
        originalPriceKobo: deal.originalPrice,
      );
    } else {
      context.push('/checkout/${deal.id}', extra: {'qty': _qty});
    }
  }

  void _shareDeal(Deal deal) {
    final savings = (deal.originalPrice - deal.studentPrice) ~/ 100;
    final price = deal.studentPrice ~/ 100;
    SharePlus.instance.share(
      ShareParams(
        text: '🔥 ${deal.title} for just ₦$price (save ₦$savings!) at ${deal.vendorName}\n\n'
            'Only ${deal.remainingQty} left — grab it on BuzzPay before it\'s gone!\n\n'
            '📲 Download BuzzPay: https://buzzpay.ng',
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_deal == null) {
      return Scaffold(
        appBar: AppBar(),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(_offline ? Icons.wifi_off : Icons.search_off, size: 48, color: AppColors.textTertiary),
                const SizedBox(height: 16),
                Text(_offline ? 'You\'re offline' : 'Deal not found',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                Text(_offline ? 'Check your connection and try again' : 'This deal may have expired',
                  style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                if (_offline) ...[
                  const SizedBox(height: 20),
                  GestureDetector(
                    onTap: () { setState(() { _loading = true; _offline = false; }); _loadDeal(); },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                      decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(14)),
                      child: const Text('Retry', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white)),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      );
    }

    final deal = _deal!;
    final stockPercent = deal.totalQuantity > 0
        ? (deal.remainingQty / deal.totalQuantity).clamp(0.0, 1.0)
        : 1.0;

    return Scaffold(
      backgroundColor: AppColors.card,
      body: Stack(
        children: [
          CustomScrollView(
            slivers: [
              // ──── IMMERSIVE HERO + CURVED SHEET ────
              SliverToBoxAdapter(
                child: Stack(
                  children: [
                    // Hero image — top 40%
                    SizedBox(
                      height: 320,
                      width: double.infinity,
                      child: deal.imageUrl != null
                          ? _buildHeroImage(deal.imageUrl!)
                          : Container(
                              color: AppColors.primary.withValues(alpha: 0.1),
                              child: const Center(
                                child: Icon(Icons.fastfood, size: 64, color: AppColors.primary),
                              ),
                            ),
                    ),
                    // Top scrim
                    Positioned(
                      top: 0, left: 0, right: 0,
                      child: Container(
                        height: 120,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.black.withValues(alpha: 0.45),
                              Colors.transparent,
                            ],
                          ),
                        ),
                      ),
                    ),
                    // Glass back button
                    Positioned(
                      top: MediaQuery.of(context).padding.top + 8,
                      left: 16,
                      child: GestureDetector(
                        onTap: () => Navigator.of(context).pop(),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(20),
                          child: BackdropFilter(
                            filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                            child: Container(
                              width: 40, height: 40,
                              decoration: BoxDecoration(
                                color: Colors.black.withValues(alpha: 0.25),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.arrow_back, color: Colors.white, size: 20),
                            ),
                          ),
                        ),
                      ),
                    ),
                    // Share button
                    Positioned(
                      top: MediaQuery.of(context).padding.top + 8,
                      right: 60,
                      child: GestureDetector(
                        onTap: () => _shareDeal(deal),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(20),
                          child: BackdropFilter(
                            filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                            child: Container(
                              width: 40, height: 40,
                              decoration: BoxDecoration(
                                color: Colors.black.withValues(alpha: 0.25),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.share, color: Colors.white, size: 18),
                            ),
                          ),
                        ),
                      ),
                    ),
                    // Heart
                    Positioned(
                      top: MediaQuery.of(context).padding.top + 8,
                      right: 16,
                      child: GestureDetector(
                        onTap: () {
                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                            content: Text('Following ${deal.vendorName}!'),
                            duration: const Duration(seconds: 2),
                            behavior: SnackBarBehavior.floating,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ));
                        },
                        child: Container(
                          width: 40, height: 40,
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.25),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.favorite_border, color: Colors.white, size: 20),
                        ),
                      ),
                    ),
                    // Curved white sheet with shadow
                    Positioned(
                      top: 290, left: 0, right: 0,
                      child: Container(
                        height: 40,
                        decoration: BoxDecoration(
                          color: AppColors.card,
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.shadow.withValues(alpha: 0.08),
                              blurRadius: 12,
                              offset: const Offset(0, -4),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // ──── CONTENT ────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Title — hero, vendor removed from here (appears in attributes below)
                      Text(deal.title,
                          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
                      const SizedBox(height: 16),

                      // ──── PRICING — horizontal, on white ────
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          PriceDisplay(
                            studentPriceKobo: deal.studentPrice,
                            originalPriceKobo: deal.originalPrice,
                            studentFontSize: 28,
                            originalFontSize: 14,
                          ),
                          const SizedBox(width: 12),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: AppColors.success.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text('Save ${deal.formattedSavings}',
                                style: const TextStyle(color: AppColors.success, fontWeight: FontWeight.w700, fontSize: 12)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // ──── QUANTITY STEPPER ────
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: AppColors.background,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Row(
                          children: [
                            const Text('Quantity', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                            const Spacer(),
                            GestureDetector(
                              onTap: () { if (_qty > 1) setState(() => _qty--); },
                              child: Container(
                                width: 32, height: 32,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: _qty > 1 ? AppColors.primary.withValues(alpha: 0.1) : AppColors.border.withValues(alpha: 0.3),
                                ),
                                child: Icon(Icons.remove, size: 18, color: _qty > 1 ? AppColors.primary : AppColors.textTertiary),
                              ),
                            ),
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              child: Text('$_qty', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                            ),
                            GestureDetector(
                              onTap: () {
                                final maxQty = deal.remainingQty.clamp(1, 10);
                                if (_qty < maxQty) setState(() => _qty++);
                              },
                              child: Container(
                                width: 32, height: 32,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: _qty < deal.remainingQty.clamp(1, 10)
                                    ? AppColors.primary.withValues(alpha: 0.1) : AppColors.border.withValues(alpha: 0.3),
                                ),
                                child: Icon(Icons.add, size: 18,
                                  color: _qty < deal.remainingQty.clamp(1, 10)
                                    ? AppColors.primary : AppColors.textTertiary),
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (_qty > 1) ...[
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: AppColors.success.withValues(alpha: 0.06),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            children: [
                              Text('${_qty}x ${deal.formattedStudentPrice}',
                                style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                              const Spacer(),
                              Text('You save ${_formatNaira(deal.savings * _qty)}',
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.success)),
                            ],
                          ),
                        ),
                      ],
                      const SizedBox(height: 20),

                      // ──── ICON-LED ATTRIBUTES ────
                      GestureDetector(
                        onTap: () => context.push('/vendor/${deal.vendorId}'),
                        child: _verifiedAttribute(Icons.storefront_outlined, deal.vendorName, deal.vendorAddress ?? 'Pickup at vendor'),
                      ),
                      const SizedBox(height: 10),
                      _attribute(Icons.access_time, '${deal.vendorOpensAt.replaceAll(':00', '')} – ${deal.vendorClosesAt.replaceAll(':00', '')}',
                          deal.vendorIsOpen ? 'Open now' : 'Currently closed'),
                      const SizedBox(height: 10),
                      if (deal.isFeatured)
                        _attribute(Icons.local_fire_department, 'Best seller', '200+ students bought this'),
                      const SizedBox(height: 20),

                      // ──── STOCK PROGRESS ────
                      if (deal.isLowStock) ...[
                        Row(
                          children: [
                            Text('${deal.remainingQty} left today',
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.primary,
                                )),
                            const Spacer(),
                            Text('${deal.totalQuantity} total',
                                style: const TextStyle(fontSize: 11, color: AppColors.textTertiary)),
                          ],
                        ),
                        const SizedBox(height: 8),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(6),
                          child: LinearProgressIndicator(
                            value: stockPercent,
                            minHeight: 7,
                            backgroundColor: AppColors.divider,
                            valueColor: AlwaysStoppedAnimation<Color>(
                              stockPercent < 0.15 ? const Color(0xFFEA580C) : AppColors.primary,
                            ),
                          ),
                        ),
                        const SizedBox(height: 20),
                      ],

                      // ──── DESCRIPTION ────
                      const Text('About this deal',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 8),
                      Text(deal.description,
                          style: TextStyle(fontSize: 14, color: AppColors.textSecondary, height: 1.6)),

                      const SizedBox(height: 24),

                      // Report vendor
                      GestureDetector(
                        onTap: () {
                          showModalBottomSheet(
                            context: context,
                            backgroundColor: AppColors.card,
                            shape: const RoundedRectangleBorder(
                              borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                            ),
                            builder: (_) => Padding(
                              padding: const EdgeInsets.all(24),
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.flag_outlined, size: 32, color: AppColors.textTertiary),
                                  const SizedBox(height: 12),
                                  const Text('Report an issue',
                                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                                  const SizedBox(height: 6),
                                  Text('Is "${deal.vendorName}" saying this deal is unavailable even though the app shows stock?',
                                      style: const TextStyle(fontSize: 13, color: AppColors.textSecondary, height: 1.4),
                                      textAlign: TextAlign.center),
                                  const SizedBox(height: 20),
                                  SizedBox(
                                    width: double.infinity, height: 48,
                                    child: ElevatedButton(
                                      onPressed: () {
                                        Navigator.of(context).pop();
                                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                                          content: const Text('Report submitted. We\'ll look into it.'),
                                          behavior: SnackBarBehavior.floating,
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                        ));
                                      },
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: AppColors.danger,
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                      ),
                                      child: const Text('Report Vendor', style: TextStyle(fontWeight: FontWeight.w600)),
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  TextButton(
                                    onPressed: () => Navigator.of(context).pop(),
                                    child: const Text('Cancel', style: TextStyle(color: AppColors.textTertiary)),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                          decoration: BoxDecoration(
                            color: AppColors.background,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.shield_outlined, size: 16, color: AppColors.textSecondary),
                              const SizedBox(width: 6),
                              Text('Report an issue with this vendor',
                                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: AppColors.textSecondary)),
                            ],
                          ),
                        ),
                      ),

                      const SizedBox(height: 120),
                    ],
                  ),
                ),
              ),
            ],
          ),

          // ──── FLOATING PAY BUTTON ────
          Positioned(
            bottom: MediaQuery.of(context).padding.bottom + 16,
            left: 20, right: 20,
            child: SizedBox(
              height: 54,
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(30),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.35),
                      blurRadius: 20,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: ElevatedButton(
                  onPressed: deal.isSoldOut ? null : () => _handlePay(deal),
                  style: ElevatedButton.styleFrom(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                    padding: EdgeInsets.zero,
                  ),
                  child: Text(
                    deal.isSoldOut ? 'Sold Out' : 'Pay ${_formatNaira(deal.studentPrice * _qty)}',
                    style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeroImage(String url) {
    if (url.startsWith('data:image')) {
      try {
        final b64 = url.split(',').last;
        return Image.memory(base64Decode(b64), fit: BoxFit.cover, gaplessPlayback: true,
          errorBuilder: (_, __, ___) => Container(color: AppColors.primary.withValues(alpha: 0.1),
            child: const Center(child: Icon(Icons.fastfood, size: 64, color: AppColors.primary))));
      } catch (_) {}
    }
    return CachedNetworkImage(imageUrl: url, fit: BoxFit.cover,
      errorWidget: (_, __, ___) => Container(color: AppColors.primary.withValues(alpha: 0.1),
        child: const Center(child: Icon(Icons.fastfood, size: 64, color: AppColors.primary))));
  }

  String _formatNaira(int kobo) {
    final naira = kobo ~/ 100;
    return '₦${naira.toString().replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}';
  }

  Widget _verifiedAttribute(IconData icon, String title, String subtitle) {
    return Row(
      children: [
        Container(
          width: 36, height: 36,
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.06),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, size: 18, color: AppColors.primary),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                  const SizedBox(width: 4),
                  const Icon(Icons.verified, size: 14, color: AppColors.success),
                ],
              ),
              Text(subtitle, style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
            ],
          ),
        ),
        Icon(Icons.chevron_right, size: 18, color: AppColors.textTertiary),
      ],
    );
  }

  Widget _attribute(IconData icon, String title, String subtitle) {
    return Row(
      children: [
        Container(
          width: 36, height: 36,
          decoration: BoxDecoration(
            color: AppColors.background,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, size: 18, color: AppColors.textSecondary),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
              Text(subtitle, style: const TextStyle(fontSize: 11, color: AppColors.textTertiary)),
            ],
          ),
        ),
      ],
    );
  }
}
