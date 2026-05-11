import 'package:flutter/material.dart';
import '../core/theme/colors.dart';

/// Styled price with small ₦ symbol and proper hierarchy.
/// Student price: bold, purple, large.
/// Original price: light gray, smaller, thin strikethrough.
class PriceDisplay extends StatelessWidget {
  final int studentPriceKobo;
  final int originalPriceKobo;
  final double studentFontSize;
  final double originalFontSize;

  const PriceDisplay({
    super.key,
    required this.studentPriceKobo,
    required this.originalPriceKobo,
    this.studentFontSize = 16,
    this.originalFontSize = 12,
  });

  @override
  Widget build(BuildContext context) {
    final studentNum = (studentPriceKobo / 100).toInt().toString().replaceAllMapped(
        RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]},');
    final originalNum = (originalPriceKobo / 100).toInt().toString().replaceAllMapped(
        RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]},');

    return Row(
      crossAxisAlignment: CrossAxisAlignment.baseline,
      textBaseline: TextBaseline.alphabetic,
      children: [
        // Student price — ₦ smaller than number
        Text.rich(
          TextSpan(
            children: [
              TextSpan(
                text: '₦',
                style: TextStyle(
                  fontSize: studentFontSize * 0.75,
                  fontWeight: FontWeight.w800,
                  color: AppColors.primary,
                ),
              ),
              TextSpan(
                text: studentNum,
                style: TextStyle(
                  fontSize: studentFontSize,
                  fontWeight: FontWeight.w800,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 6),
        // Original price — lighter, thinner strike
        Text.rich(
          TextSpan(
            children: [
              TextSpan(
                text: '₦$originalNum',
                style: TextStyle(
                  fontSize: originalFontSize,
                  fontWeight: FontWeight.w400,
                  color: AppColors.textTertiary.withValues(alpha: 0.6),
                  decoration: TextDecoration.lineThrough,
                  decorationColor: AppColors.textTertiary.withValues(alpha: 0.35),
                  decorationThickness: 1,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
