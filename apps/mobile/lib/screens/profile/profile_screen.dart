import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/colors.dart';
import '../../providers/auth_provider.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    final user = auth.user;
    final isVerified = user?.isVerified == true;
    final firstName = user?.fullName.split(' ').first ?? 'Student';

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            children: [
              // ──── HEADER ────
              Container(
                width: double.infinity,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      AppColors.primary.withValues(alpha: 0.08),
                      AppColors.background,
                    ],
                  ),
                ),
                padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
                child: Column(
                  children: [
                    // Avatar with 3D border + verified badge
                    Stack(
                      clipBehavior: Clip.none,
                      children: [
                        Container(
                          width: 80,
                          height: 80,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: AppColors.primary.withValues(alpha: 0.08),
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.primary.withValues(alpha: 0.12),
                                blurRadius: 20,
                                offset: const Offset(0, 6),
                              ),
                            ],
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(8),
                            child: Image.asset('assets/icons/user_3d.png'),
                          ),
                        ),
                        // Verified badge floating on avatar edge
                        if (isVerified)
                          Positioned(
                            bottom: -2,
                            right: -2,
                            child: Container(
                              width: 26,
                              height: 26,
                              decoration: BoxDecoration(
                                color: AppColors.card,
                                shape: BoxShape.circle,
                                boxShadow: [
                                  BoxShadow(
                                    color: AppColors.shadow.withValues(alpha: 0.1),
                                    blurRadius: 6,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: Padding(
                                padding: const EdgeInsets.all(3),
                                child: Image.asset('assets/icons/checkmark_3d.png'),
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // Name
                    Text(firstName,
                        style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
                    const SizedBox(height: 2),
                    Text('University of Lagos',
                        style: TextStyle(fontSize: 13, color: AppColors.textTertiary)),

                    if (!isVerified) ...[
                      const SizedBox(height: 10),
                      GestureDetector(
                        onTap: () => context.push('/verify'),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFEF3C7),
                            borderRadius: BorderRadius.circular(30),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.schedule, size: 14, color: Color(0xFFD97706)),
                              SizedBox(width: 5),
                              Text('Verify now',
                                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFFD97706))),
                            ],
                          ),
                        ),
                      ),
                    ],

                    const SizedBox(height: 20),

                    // Stats — floating cards with 3D accents
                    Row(
                      children: [
                        Expanded(
                          child: _statCard(
                            label: 'Total Saved',
                            value: '₦4,500',
                            asset: 'assets/icons/coins_3d.png',
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _statCard(
                            label: 'Deals Claimed',
                            value: '5',
                            asset: 'assets/icons/flame_3d.png',
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // ──── BELOW HEADER ────
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                child: Column(
                  children: [
                    const SizedBox(height: 12),

                    // Invite — gradient gift card
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [
                            AppColors.primary.withValues(alpha: 0.08),
                            const Color(0xFF0D9488).withValues(alpha: 0.06),
                          ],
                        ),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.primary.withValues(alpha: 0.1)),
                      ),
                      child: Row(
                        children: [
                          Image.asset('assets/icons/gift_3d.png', width: 36, height: 36),
                          const SizedBox(width: 14),
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Invite a friend',
                                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                                SizedBox(height: 2),
                                Text('You both get ₦200 off your next deal',
                                    style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                              ],
                            ),
                          ),
                          const Icon(Icons.chevron_right, size: 20, color: AppColors.textTertiary),
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),

                    // Menu — borderless, more breathing room
                    _menuItem(Icons.receipt_long_outlined, 'Purchase History',
                        onTap: () => context.go('/vouchers')),
                    _menuItem(Icons.notifications_none, 'Notifications', onTap: () {}),
                    _menuItem(Icons.headset_mic_outlined, 'Help & Support', onTap: () {}),
                    _menuItem(Icons.info_outline, 'About BuzzPay', onTap: () {}),
                    _menuItem(Icons.shield_outlined, 'Privacy & Terms', onTap: () {}),

                    const SizedBox(height: 24),

                    // Footer
                    GestureDetector(
                      onTap: () => ref.read(authProvider.notifier).logout(),
                      child: const Text('Log Out',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.textTertiary)),
                    ),
                    const SizedBox(height: 6),
                    const Text('BuzzPay v1.0.0',
                        style: TextStyle(fontSize: 10, color: AppColors.textTertiary)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _statCard({required String label, required String value, required String asset}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.08)),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.06),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Image.asset(asset, width: 24, height: 24),
          const SizedBox(height: 10),
          Text(value,
              style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w800, color: AppColors.text)),
          const SizedBox(height: 2),
          Text(label,
              style: const TextStyle(fontSize: 12, color: AppColors.textTertiary, fontWeight: FontWeight.w400)),
        ],
      ),
    );
  }

  Widget _menuItem(IconData icon, String label, {required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 16),
        child: Row(
          children: [
            // Duotone icon background
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.06),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, size: 18, color: AppColors.primary),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Text(label,
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500)),
            ),
            const Icon(Icons.chevron_right, size: 20, color: AppColors.textTertiary),
          ],
        ),
      ),
    );
  }
}
