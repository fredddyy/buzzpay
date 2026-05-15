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
    if (name.length <= 12) return name;
    final words = name.split(' ');
    if (words.length >= 2) {
      final short = '${words[0]} ${words[1]}';
      if (short.length > 12) return words[0];
      return short;
    }
    return '${name.substring(0, 10)}...';
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: SizedBox(
        width: 80,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Avatar — no border, soft shadow, larger
            Stack(
              children: [
                Container(
                  width: 68,
                  height: 68,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppColors.card,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.06),
                        blurRadius: 12,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: ClipOval(
                    child: _imageUrl != null
                        ? CachedNetworkImage(
                            imageUrl: _imageUrl!,
                            fit: BoxFit.cover,
                            placeholder: (_, __) => _fallbackAvatar(),
                            errorWidget: (_, __, ___) => _fallbackAvatar(),
                          )
                        : _fallbackAvatar(),
                  ),
                ),
                // Fire badge — bottom right
                Positioned(
                  bottom: 0,
                  right: 0,
                  child: Container(
                    width: 20,
                    height: 20,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                      boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 4)],
                    ),
                    child: const Center(child: Text('🔥', style: TextStyle(fontSize: 10))),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            // Vendor name — bold, centered
            Text(
              _shortName,
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: AppColors.text,
                height: 1.2,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _fallbackAvatar() {
    return Container(
      color: AppColors.primary.withValues(alpha: 0.06),
      child: Center(
        child: Text(
          _name.isNotEmpty ? _name[0] : '?',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.w800,
            color: AppColors.primary.withValues(alpha: 0.6),
          ),
        ),
      ),
    );
  }
}
