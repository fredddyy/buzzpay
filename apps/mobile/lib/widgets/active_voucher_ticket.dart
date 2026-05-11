import 'package:flutter/material.dart';
import '../core/theme/colors.dart';
import '../models/voucher.dart';

class ActiveVoucherTicket extends StatelessWidget {
  final Voucher voucher;
  final VoidCallback onTap;

  const ActiveVoucherTicket({
    super.key,
    required this.voucher,
    required this.onTap,
  });

  String _timeLeft() {
    final diff = voucher.expiresAt.difference(DateTime.now());
    if (diff.isNegative) return 'Expired';
    if (diff.inHours > 0) return '${diff.inHours}h left';
    return '${diff.inMinutes}m left';
  }

  @override
  Widget build(BuildContext context) {
    final isUrgent = voucher.timeRemaining.inHours < 2;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 180,
        height: 150,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border.withValues(alpha: 0.3), width: 1),
          boxShadow: [
            BoxShadow(
              color: AppColors.shadow.withValues(alpha: 0.05),
              blurRadius: 20,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Label — vendor name (light, small)
            Text(
              voucher.deal.vendorName,
              style: const TextStyle(
                fontSize: 11,
                color: AppColors.textTertiary,
                fontWeight: FontWeight.w400,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 8),
            // Hero — deal title (bold, large)
            Expanded(
              child: Text(
                voucher.deal.title,
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  color: AppColors.text,
                  height: 1.25,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            // Footer — time pill left, QR icon right
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: isUrgent
                        ? AppColors.danger.withValues(alpha: 0.1)
                        : AppColors.primary.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    _timeLeft(),
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: isUrgent ? AppColors.danger : AppColors.primary,
                    ),
                  ),
                ),
                const Spacer(),
                Image.asset('assets/icons/qr_code.png', width: 22, height: 22),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
