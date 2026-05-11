import 'dart:async';
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../core/theme/colors.dart';
import '../models/deal.dart';

class HappyHourCard extends StatefulWidget {
  final Deal deal;
  final VoidCallback onTap;

  const HappyHourCard({super.key, required this.deal, required this.onTap});

  @override
  State<HappyHourCard> createState() => _HappyHourCardState();
}

class _HappyHourCardState extends State<HappyHourCard> {
  late Timer _timer;
  late Duration _remaining;

  @override
  void initState() {
    super.initState();
    _remaining = widget.deal.expiresAt.difference(DateTime.now());
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      setState(() {
        _remaining = widget.deal.expiresAt.difference(DateTime.now());
        if (_remaining.isNegative) _timer.cancel();
      });
    });
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  String _formatCountdown(Duration d) {
    if (d.isNegative) return '00:00';
    final m = d.inMinutes.toString().padLeft(2, '0');
    final s = (d.inSeconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  double get _progress {
    // Assume max 60 min, show progress bar shrinking
    final totalSeconds = 60 * 60.0;
    final remainingSeconds = _remaining.inSeconds.clamp(0, totalSeconds.toInt());
    return remainingSeconds / totalSeconds;
  }

  @override
  Widget build(BuildContext context) {
    final deal = widget.deal;
    final isExpired = _remaining.isNegative;
    final isUrgent = _remaining.inMinutes < 10;

    return GestureDetector(
      onTap: isExpired ? null : widget.onTap,
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: AppColors.border.withValues(alpha: 0.4),
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: AppColors.shadow.withValues(alpha: 0.04),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image with progress bar — desaturated when expired
            SizedBox(
              height: 125,
              width: double.infinity,
              child: _wrapDesaturate(
                enabled: isExpired,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    deal.imageUrl != null
                        ? CachedNetworkImage(
                            imageUrl: deal.imageUrl!,
                            fit: BoxFit.cover,
                            placeholder: (_, __) => Container(color: const Color(0xFFF5F5F5)),
                            errorWidget: (_, __, ___) => Container(color: const Color(0xFFF5F5F5)),
                          )
                        : Container(
                            color: const Color(0xFFF5F5F5),
                            child: const Center(
                            child: Icon(Icons.fastfood, size: 36, color: AppColors.textTertiary),
                          ),
                        ),
                  // Subtle gradient at bottom
                  Positioned(
                    bottom: 0,
                    left: 0,
                    right: 0,
                    child: Container(
                      height: 40,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.transparent,
                            Colors.black.withValues(alpha: 0.25),
                          ],
                        ),
                      ),
                    ),
                  ),
                  // Discount pill
                  Positioned(
                    top: 10,
                    left: 10,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        '-${deal.discountPercent}%',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                  // Stock — bottom right on image
                  if (deal.isLowStock)
                    Positioned(
                      bottom: 10,
                      right: 10,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.55),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          '${deal.remainingQty} left',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  // Progress bar — top edge, shrinks as time runs out
                  Positioned(
                    top: 0,
                    left: 0,
                    right: 0,
                    child: LinearProgressIndicator(
                      value: _progress,
                      minHeight: 3,
                      backgroundColor: Colors.transparent,
                      valueColor: AlwaysStoppedAnimation<Color>(
                        isUrgent ? AppColors.danger : AppColors.primary,
                      ),
                    ),
                  ),
                  ],
                ),
              ),
            ),
            // Content — with avatar overlap from image
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Left — deal info
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Avatar + vendor name + verified
                        Row(
                          children: [
                            // 28px circular avatar
                            Container(
                              width: 28,
                              height: 28,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(color: Colors.white, width: 2),
                                color: AppColors.primary.withValues(alpha: 0.1),
                              ),
                              child: ClipOval(
                                child: deal.vendorLogo != null
                                    ? CachedNetworkImage(
                                        imageUrl: deal.vendorLogo!,
                                        fit: BoxFit.cover,
                                      )
                                    : Center(
                                        child: Text(
                                          deal.vendorName.substring(0, 1),
                                          style: const TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w700,
                                            color: AppColors.primary,
                                          ),
                                        ),
                                      ),
                              ),
                            ),
                            const SizedBox(width: 6),
                            Flexible(
                              child: Text(
                                deal.vendorName,
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: AppColors.textSecondary,
                                  fontWeight: FontWeight.w500,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(width: 3),
                            const Icon(Icons.verified, size: 13, color: AppColors.success),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          deal.title,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: AppColors.text,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 6),
                        // Timer line — clean, inline
                        Row(
                          children: [
                            Image.asset('assets/icons/flame_3d.png',
                                width: 14, height: 14),
                            const SizedBox(width: 4),
                            Text(
                              'Ends in ',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w400,
                                color: isUrgent
                                    ? AppColors.danger
                                    : AppColors.textSecondary,
                              ),
                            ),
                            Text(
                              _formatCountdown(_remaining),
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w800,
                                color: isUrgent
                                    ? AppColors.danger
                                    : AppColors.text,
                                fontFamily: 'monospace',
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  // Right — price + CTA stacked
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        deal.formattedOriginalPrice,
                        style: TextStyle(
                          fontSize: 12,
                          color: AppColors.textTertiary,
                          decoration: TextDecoration.lineThrough,
                          fontWeight: FontWeight.w400,
                        ),
                      ),
                      Text(
                        deal.formattedStudentPrice,
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: AppColors.primary,
                        ),
                      ),
                      const SizedBox(height: 8),
                      ElevatedButton(
                        onPressed: isExpired ? null : widget.onTap,
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 20, vertical: 10),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(30),
                          ),
                        ),
                        child: Text(
                          isExpired ? 'Expired' : 'Pay',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _wrapDesaturate({required bool enabled, required Widget child}) {
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
}
