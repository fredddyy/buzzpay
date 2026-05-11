import 'package:flutter/material.dart';
import '../core/theme/colors.dart';
import '../models/loyalty.dart';

/// Compact sticker row — 3D stars for filled, circular indents for empty.
class LoyaltyStickerRow extends StatelessWidget {
  final LoyaltyCard card;
  final bool compact;

  const LoyaltyStickerRow({super.key, required this.card, this.compact = false});

  @override
  Widget build(BuildContext context) {
    if (card.isComplete) return _rewardReady();

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (int i = 0; i < card.target; i++) ...[
          if (i > 0) SizedBox(width: compact ? 5 : 8),
          _stamp(filled: i < card.stamps, size: compact ? 22 : 30),
        ],
        SizedBox(width: compact ? 6 : 10),
        Text(
          '${card.stamps}/${card.target}',
          style: TextStyle(
            fontSize: compact ? 10 : 12,
            fontWeight: FontWeight.w700,
            color: AppColors.primary.withValues(alpha: 0.6),
          ),
        ),
      ],
    );
  }

  Widget _stamp({required bool filled, required double size}) {
    if (filled) {
      // 3D purple star with soft shadow
      // 3D star with purple glow behind it
      return Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          boxShadow: [
            // Soft glow behind star
            BoxShadow(
              color: AppColors.primary.withValues(alpha: 0.25),
              blurRadius: 10,
              spreadRadius: 1,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Image.asset('assets/icons/star_3d.png', width: size, height: size),
      );
    }

    // Empty — circular recessed pocket
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        // Gradient to simulate inner shadow / recessed indent
        gradient: const RadialGradient(
          center: Alignment(0, -0.3),
          radius: 0.8,
          colors: [Color(0xFFE8E6F0), Color(0xFFF3F2F8)],
        ),
        border: Border.all(color: const Color(0xFFDDDBE8), width: 1),
        boxShadow: [
          // Outer subtle shadow for depth
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 1,
            offset: const Offset(0, 1),
          ),
        ],
      ),
    );
  }

  Widget _rewardReady() {
    return Container(
      padding: EdgeInsets.symmetric(
          horizontal: compact ? 8 : 12, vertical: compact ? 4 : 6),
      decoration: BoxDecoration(
        color: AppColors.success.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Image.asset('assets/icons/gift_3d.png', width: compact ? 14 : 18, height: compact ? 14 : 18),
          SizedBox(width: compact ? 4 : 6),
          Text(
            compact ? 'Free!' : 'Reward ready!',
            style: TextStyle(
              fontSize: compact ? 10 : 12,
              fontWeight: FontWeight.w700,
              color: AppColors.success,
            ),
          ),
        ],
      ),
    );
  }
}

/// Full loyalty card for vendor profile — premium sticker book feel.
class LoyaltyCardWidget extends StatelessWidget {
  final LoyaltyCard card;
  final VoidCallback? onClaim;

  const LoyaltyCardWidget({super.key, required this.card, this.onClaim});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFFF9F8FF), // very faint purple tint
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.08)),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.05),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          // Header — 3D gift + vendor name
          Row(
            children: [
              Image.asset('assets/icons/gift_3d.png', width: 28, height: 28),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${card.vendorName} Loyalty',
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                    Text('Buy ${card.target} → Get 1 Free',
                        style: TextStyle(fontSize: 11, color: AppColors.textTertiary)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Sticker row — centered
          Center(child: LoyaltyStickerRow(card: card)),

          const SizedBox(height: 16),

          // Hook text or claim button
          card.isComplete
              ? GestureDetector(
                  onTap: onClaim,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    decoration: BoxDecoration(
                      color: AppColors.success,
                      borderRadius: BorderRadius.circular(30),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.success.withValues(alpha: 0.2),
                          blurRadius: 18,
                          spreadRadius: 1,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Image.asset('assets/icons/gift_3d.png', width: 18, height: 18),
                        const SizedBox(width: 8),
                        const Text('Claim Free Meal',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white)),
                      ],
                    ),
                  ),
                )
              : Text.rich(
                  TextSpan(
                    text: 'Only ',
                    style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                    children: [
                      TextSpan(
                        text: '${card.remaining} more',
                        style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.primary),
                      ),
                      const TextSpan(text: ' for a free meal! '),
                      const TextSpan(text: '🍲', style: TextStyle(fontSize: 16)),
                    ],
                  ),
                  textAlign: TextAlign.center,
                ),
        ],
      ),
    );
  }
}
