import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../core/theme/colors.dart';
import '../models/deal.dart';

class TrendingCircle extends StatelessWidget {
  final Deal deal;
  final VoidCallback onTap;
  final bool isNew;

  const TrendingCircle({
    super.key,
    required this.deal,
    required this.onTap,
    this.isNew = false,
  });

  /// Truncate long vendor names for the circle row.
  /// "Mama Nkechi Kitchen" → "Mama Nkechi's"
  /// Short names stay as-is.
  String get _shortName {
    final name = deal.vendorName;
    if (name.length <= 14) return name;
    final words = name.split(' ');
    if (words.length >= 2) {
      final short = '${words[0]} ${words[1]}';
      if (short.length > 14) return '${words[0]}\'s';
      return '$short\'s';
    }
    return '${name.substring(0, 12)}…';
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: SizedBox(
        width: 76,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Circle avatar — purple ring if "new", gray ring if seen
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: isNew
                    ? const LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          AppColors.primary,
                          AppColors.primaryLight,
                        ],
                      )
                    : null,
                color: isNew ? null : AppColors.border.withValues(alpha: 0.5),
              ),
              padding: const EdgeInsets.all(2.5),
              child: Container(
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.card,
                ),
                padding: const EdgeInsets.all(2),
                child: ClipOval(
                  child: deal.imageUrl != null
                      ? CachedNetworkImage(
                          imageUrl: deal.imageUrl!,
                          fit: BoxFit.cover,
                          placeholder: (_, __) =>
                              Container(color: const Color(0xFFF5F5F5)),
                          errorWidget: (_, __, ___) => Container(
                            color: const Color(0xFFF5F5F5),
                            child: const Icon(Icons.storefront,
                                size: 20, color: AppColors.textTertiary),
                          ),
                        )
                      : Container(
                          color: const Color(0xFFF5F5F5),
                          child: const Icon(Icons.storefront,
                              size: 20, color: AppColors.textTertiary),
                        ),
                ),
              ),
            ),
            const SizedBox(height: 5),
            // Short vendor name
            Text(
              _shortName,
              style: const TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: AppColors.text,
                height: 1.2,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
            ),
            // Social proof
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('🔥 ', style: TextStyle(fontSize: 9)),
                Text(
                  '${(deal.totalQuantity - deal.remainingQty) + 80}',
                  style: const TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textSecondary,
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
