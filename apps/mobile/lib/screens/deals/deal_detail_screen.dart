import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
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

  @override
  void initState() {
    super.initState();
    _loadDeal();
  }

  Future<void> _loadDeal() async {
    if (useMockData) {
      final all = [...mockDeals, ...mockHappyHour];
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
      setState(() => _loading = false);
    }
  }

  void _handlePay(Deal deal) {
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
      context.push('/checkout/${deal.id}');
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_deal == null) {
      return Scaffold(appBar: AppBar(), body: const Center(child: Text('Deal not found')));
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
                          ? CachedNetworkImage(
                              imageUrl: deal.imageUrl!,
                              fit: BoxFit.cover,
                            )
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
                      const SizedBox(height: 20),

                      // ──── ICON-LED ATTRIBUTES ────
                      GestureDetector(
                        onTap: () => context.push('/vendor/${deal.vendorId}'),
                        child: _attribute(Icons.storefront_outlined, deal.vendorName, deal.vendorAddress ?? 'Pickup at vendor'),
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
                    deal.isSoldOut ? 'Sold Out' : 'Pay ${deal.formattedStudentPrice}',
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
