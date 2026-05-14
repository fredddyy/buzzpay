import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../core/theme/colors.dart';
import '../models/deal.dart';
import '../providers/deals_provider.dart';

class TrendingCircle extends StatelessWidget {
  final Deal? deal;
  final TrendingVendor? vendor;
  final VoidCallback onTap;
  final bool isNew;

  const TrendingCircle({
    super.key,
    this.deal,
    this.vendor,
    required this.onTap,
    this.isNew = false,
  });

  String get _name => vendor?.businessName ?? deal?.vendorName ?? '';
  String? get _imageUrl => vendor?.logoUrl ?? deal?.imageUrl;

  String get _shortName {
    final name = _name;
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
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: isNew
                    ? const LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [AppColors.primary, AppColors.primaryLight],
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
                  child: _imageUrl != null
                      ? CachedNetworkImage(
                          imageUrl: _imageUrl!,
                          fit: BoxFit.cover,
                          placeholder: (_, __) => Container(color: const Color(0xFFF5F5F5)),
                          errorWidget: (_, __, ___) => _placeholder(),
                        )
                      : _placeholder(),
                ),
              ),
            ),
            const SizedBox(height: 5),
            Text(
              _shortName,
              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.text, height: 1.2),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('🔥 ', style: TextStyle(fontSize: 9)),
                Text(
                  deal != null ? '${(deal!.totalQuantity - deal!.remainingQty) + 80}' : '',
                  style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: AppColors.textSecondary),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _placeholder() => Container(
    color: const Color(0xFFF5F5F5),
    child: Center(
      child: Text(
        _name.isNotEmpty ? _name[0] : '?',
        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.primary),
      ),
    ),
  );
}
