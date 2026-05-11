import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import '../core/theme/colors.dart';
import '../models/deal.dart';
import 'verify_gate_sheet.dart';
import '../models/loyalty.dart';
import 'loyalty_sticker_row.dart';
import 'price_display.dart';

class DealCard extends StatelessWidget {
  final Deal deal;
  final VoidCallback onTap;
  final bool isVerified;
  final LoyaltyCard? loyaltyCard;

  const DealCard({super.key, required this.deal, required this.onTap, this.isVerified = true, this.loyaltyCard});

  @override
  Widget build(BuildContext context) {
    final isClosed = !deal.vendorIsOpen;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(18),
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withValues(alpha: 0.06),
              blurRadius: 16,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image — grayscale when closed
            AspectRatio(
              aspectRatio: 1,
              child: _wrapGrayscale(
                enabled: isClosed,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    deal.imageUrl != null
                        ? CachedNetworkImage(
                            imageUrl: deal.imageUrl!,
                            fit: BoxFit.cover,
                            placeholder: (_, __) => _placeholder(),
                            errorWidget: (_, __, ___) => _placeholder(),
                          )
                        : _placeholder(),
                    // Gradient overlay
                    Positioned(
                      bottom: 0,
                      left: 0,
                      right: 0,
                      child: Container(
                        height: 50,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.transparent,
                              Colors.black.withValues(alpha: 0.35),
                            ],
                          ),
                        ),
                      ),
                    ),
                    // Type badge — top left (color-coded)
                    Positioned(
                      top: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: isClosed
                              ? AppColors.textSecondary
                              : _badgeColor(deal.dealType),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          _badgeText(deal),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                    // Heart (save vendor) — top right when open
                    if (!isClosed)
                      Positioned(
                        top: 8,
                        right: 8,
                        child: _AnimatedHeart(vendorName: deal.vendorName),
                      ),
                    // CLOSED overlay
                    if (isClosed)
                      Positioned(
                        top: 8,
                        right: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.7),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: const Text(
                            'CLOSED',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                    // 3D lock for unverified
                    if (!isVerified)
                      Positioned(
                        bottom: 8,
                        right: 8,
                        child: Image.asset('assets/icons/lock_3d.png', width: 28, height: 28),
                      ),
                  ],
                ),
              ),
            ),
            // Content
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Title — hero, what they're eating
                  Text(
                    deal.title,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: AppColors.text,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  // Vendor avatar + name — tappable to profile
                  GestureDetector(
                    onTap: () => GoRouter.of(context).push('/vendor/${deal.vendorId}'),
                    child: Row(
                      children: [
                        Container(
                          width: 18,
                          height: 18,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppColors.primary.withValues(alpha: 0.1),
                          ),
                          child: Center(
                            child: Text(
                              deal.vendorName.substring(0, 1),
                              style: const TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.w800,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 4),
                        Flexible(
                          child: Text(
                            deal.vendorName,
                            style: TextStyle(
                              fontSize: 11,
                              color: AppColors.primary.withValues(alpha: 0.7),
                              fontWeight: FontWeight.w500,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 6),
                  // Price — clear anchor, purple hero
                  PriceDisplay(
                    studentPriceKobo: deal.studentPrice,
                    originalPriceKobo: deal.originalPrice,
                    studentFontSize: 16,
                    originalFontSize: 11,
                  ),
                  // Loyalty sticker (if available)
                  if (loyaltyCard != null) ...[
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        const Text('⭐ Earn 1 stamp  ',
                            style: TextStyle(fontSize: 10, color: AppColors.textTertiary)),
                        LoyaltyStickerRow(card: loyaltyCard!, compact: true),
                      ],
                    ),
                  ],
                  const SizedBox(height: 8),
                  // Smart CTA — varies by deal type
                  SizedBox(
                    width: double.infinity,
                    height: 40,
                    child: _buildCta(context, deal, isClosed),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _placeholder() {
    return Container(
      color: const Color(0xFFF5F5F5),
      child: const Center(
        child: Icon(Icons.fastfood, size: 40, color: AppColors.textTertiary),
      ),
    );
  }

  Widget _wrapGrayscale({required bool enabled, required Widget child}) {
    if (!enabled) return child;
    return ColorFiltered(
      colorFilter: const ColorFilter.matrix(<double>[
        0.2126, 0.7152, 0.0722, 0, 0,
        0.2126, 0.7152, 0.0722, 0, 0,
        0.2126, 0.7152, 0.0722, 0, 0,
        0, 0, 0, 1, 0,
      ]),
      child: child,
    );
  }

  // ── Deal type visual signals ──

  Color _badgeColor(DealType type) {
    return switch (type) {
      DealType.timeWindow => AppColors.primary,   // orange
      DealType.quantityLimited => const Color(0xFFDC2626), // red
      DealType.bundle => AppColors.primary,
      DealType.firstTimer => const Color(0xFF16A34A),    // green
      DealType.scheduled => AppColors.textSecondary,
      DealType.anytime => AppColors.text,
    };
  }

  String _badgeText(Deal deal) {
    return switch (deal.dealType) {
      DealType.timeWindow => '⏰ ${_minutesLeft(deal)}',
      DealType.quantityLimited => '🔥 ${deal.remainingQty} left',
      DealType.bundle => '🎁 Bundle',
      DealType.firstTimer => '🆕 First order',
      DealType.scheduled => '🎯 Coming soon',
      DealType.anytime => '-${deal.discountPercent}%',
    };
  }

  String _minutesLeft(Deal deal) {
    final m = deal.expiresAt.difference(DateTime.now()).inMinutes;
    if (m >= 60) return '${m ~/ 60}h ${m % 60}m';
    return '${m}m left';
  }

  Widget _buildCta(BuildContext context, Deal deal, bool isClosed) {
    // Instant gate — unverified user taps Pay, sheet appears over feed
    if (!isVerified && !isClosed) {
      return Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(30),
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withValues(alpha: 0.2),
              blurRadius: 10,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: ElevatedButton(
          onPressed: () => VerifyGateSheet.show(
            context,
            dealTitle: deal.title,
            savings: deal.formattedSavings,
            studentPriceKobo: deal.studentPrice,
            originalPriceKobo: deal.originalPrice,
          ),
          style: ElevatedButton.styleFrom(
            padding: EdgeInsets.zero,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
          ),
          child: Text(
            'Pay ${deal.formattedStudentPrice}',
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
          ),
        ),
      );
    }

    if (isClosed) {
      return ElevatedButton(
        onPressed: null,
        style: ElevatedButton.styleFrom(
          padding: EdgeInsets.zero,
          backgroundColor: AppColors.border,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
        ),
        child: Text(
          'Opens at ${deal.opensAtFormatted}',
          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textSecondary),
        ),
      );
    }

    // Scheduled — ghost "Remind Me" button
    if (deal.isScheduled) {
      return OutlinedButton(
        onPressed: onTap,
        style: OutlinedButton.styleFrom(
          padding: EdgeInsets.zero,
          side: const BorderSide(color: AppColors.border),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
        ),
        child: const Text(
          'Remind Me',
          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textSecondary),
        ),
      );
    }

    // Time-window — countdown inside button
    if (deal.isTimeWindow) {
      final m = deal.expiresAt.difference(DateTime.now()).inMinutes;
      final timeStr = m >= 60 ? '${m ~/ 60}:${(m % 60).toString().padLeft(2, '0')}' : '${m}m';
      return ElevatedButton(
        onPressed: onTap,
        style: ElevatedButton.styleFrom(
          padding: EdgeInsets.zero,
          backgroundColor: AppColors.primary,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
        ),
        child: Text(
          'Pay ${deal.formattedStudentPrice} ($timeStr)',
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white),
        ),
      );
    }

    // Default — purple pay with glow
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(30),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.25),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ElevatedButton(
        onPressed: onTap,
        style: ElevatedButton.styleFrom(
          padding: EdgeInsets.zero,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
        ),
        child: Text(
          'Pay ${deal.formattedStudentPrice}',
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
        ),
      ),
    );
  }
}

/// Animated heart with scale-spring + haptic — inline stateful
class _AnimatedHeart extends StatefulWidget {
  final String vendorName;
  const _AnimatedHeart({required this.vendorName});

  @override
  State<_AnimatedHeart> createState() => _AnimatedHeartState();
}

class _AnimatedHeartState extends State<_AnimatedHeart>
    with SingleTickerProviderStateMixin {
  bool _liked = false;
  late AnimationController _controller;
  late Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 300));
    _scale = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 1.0, end: 1.3), weight: 40),
      TweenSequenceItem(tween: Tween(begin: 1.3, end: 0.9), weight: 30),
      TweenSequenceItem(tween: Tween(begin: 0.9, end: 1.0), weight: 30),
    ]).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOut));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _toggle() {
    setState(() => _liked = !_liked);
    if (_liked) {
      _controller.forward(from: 0);
      HapticFeedback.lightImpact();
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _toggle,
      child: AnimatedBuilder(
        animation: _scale,
        builder: (_, __) => Transform.scale(
          scale: _scale.value,
          child: Container(
            width: 30,
            height: 30,
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.3),
              shape: BoxShape.circle,
            ),
            child: Icon(
              _liked ? Icons.favorite : Icons.favorite_border,
              size: 16,
              color: _liked ? AppColors.danger : Colors.white,
            ),
          ),
        ),
      ),
    );
  }
}
