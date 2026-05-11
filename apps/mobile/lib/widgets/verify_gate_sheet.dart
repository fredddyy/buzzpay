import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../core/theme/colors.dart';

class VerifyGateSheet extends StatelessWidget {
  final String dealTitle;
  final String savings;
  final int studentPriceKobo;
  final int originalPriceKobo;

  const VerifyGateSheet({
    super.key,
    required this.dealTitle,
    required this.savings,
    this.studentPriceKobo = 0,
    this.originalPriceKobo = 0,
  });

  static void show(
    BuildContext context, {
    required String dealTitle,
    required String savings,
    int studentPriceKobo = 0,
    int originalPriceKobo = 0,
  }) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      useRootNavigator: true,
      barrierColor: Colors.black.withValues(alpha: 0.65),
      builder: (_) => VerifyGateSheet(
        dealTitle: dealTitle,
        savings: savings,
        studentPriceKobo: studentPriceKobo,
        originalPriceKobo: originalPriceKobo,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      alignment: Alignment.topCenter,
      children: [
        // White sheet — with room for overlapping icon
        Container(
          margin: const EdgeInsets.only(top: 36),
          decoration: const BoxDecoration(
            color: AppColors.card,
            borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
          ),
          padding: const EdgeInsets.fromLTRB(24, 48, 24, 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Headline
              Text(
                'Unlock Your $savings Discount',
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 6),
              const Text(
                'Verify once, save on every deal.',
                style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
                textAlign: TextAlign.center,
              ),

              const SizedBox(height: 20),

              // Floating deal summary card
              if (originalPriceKobo > 0)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: AppColors.card,
                    borderRadius: BorderRadius.circular(18),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withValues(alpha: 0.06),
                        blurRadius: 20,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      Text(
                        dealTitle,
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 14),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          // Regular
                          Column(
                            children: [
                              const Text('Regular',
                                  style: TextStyle(fontSize: 10, color: AppColors.textTertiary)),
                              const SizedBox(height: 3),
                              Text(
                                _formatNaira(originalPriceKobo),
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w500,
                                  color: AppColors.textTertiary.withValues(alpha: 0.6),
                                  decoration: TextDecoration.lineThrough,
                                ),
                              ),
                            ],
                          ),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 20),
                            child: Icon(Icons.arrow_forward, size: 16, color: AppColors.textTertiary),
                          ),
                          // Student
                          Column(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: AppColors.primary.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: const Text('Student',
                                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.primary)),
                              ),
                              const SizedBox(height: 3),
                              Text(
                                _formatNaira(studentPriceKobo),
                                style: const TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.w800,
                                  color: AppColors.primary,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 7),
                        decoration: BoxDecoration(
                          color: const Color(0xFF16A34A).withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          'You save $savings',
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF16A34A)),
                        ),
                      ),
                    ],
                  ),
                ),

              const SizedBox(height: 24),

              // CTA with glow
              SizedBox(
                width: double.infinity,
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
                    onPressed: () {
                      Navigator.of(context).pop();
                      context.push('/verify');
                    },
                    style: ElevatedButton.styleFrom(
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                    ),
                    child: const Text(
                      'Verify & Unlock',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 14),

              // Maybe later — generous hit area
              GestureDetector(
                onTap: () => Navigator.of(context).pop(),
                child: const SizedBox(
                  width: double.infinity,
                  height: 44,
                  child: Center(
                    child: Text(
                      'Maybe later',
                      style: TextStyle(fontSize: 13, color: AppColors.textTertiary, fontWeight: FontWeight.w500),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),

        // 3D icon — overlaps the sheet top edge
        Positioned(
          top: 8,
          child: Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: AppColors.card,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withValues(alpha: 0.12),
                  blurRadius: 16,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Padding(
              padding: const EdgeInsets.all(10),
              child: Image.asset('assets/icons/checkmark_3d.png'),
            ),
          ),
        ),
      ],
    );
  }

  String _formatNaira(int kobo) {
    final naira = kobo ~/ 100;
    return '₦${naira.toString().replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}';
  }
}
