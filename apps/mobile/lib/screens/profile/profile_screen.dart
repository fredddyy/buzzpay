import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/theme/colors.dart';
import '../../models/loyalty.dart';
import '../../providers/api_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/vouchers_provider.dart';
import '../../widgets/loyalty_sticker_row.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  int _totalSaved = 0;
  int _totalSpent = 0;
  int _dealCount = 0;
  String? _favoriteVendor;
  String? _referralCode;
  int _referralCount = 0;
  int _untilReward = 3;
  int _currentStreak = 0;
  int _longestStreak = 0;
  List<LoyaltyCard> _loyaltyCards = [];

  @override
  void initState() {
    super.initState();
    _loadSavings();
    _loadReferral();
    _loadStreak();
    _loadLoyalty();
  }

  Future<void> _loadStreak() async {
    try {
      final api = ref.read(apiClientProvider);
      final response = await api.get('/users/streak');
      final data = response.data['data'];
      if (mounted && data != null) {
        setState(() {
          _currentStreak = data['currentStreak'] as int? ?? 0;
          _longestStreak = data['longestStreak'] as int? ?? 0;
        });
      }
    } catch (_) {}
  }

  Future<void> _loadLoyalty() async {
    try {
      final api = ref.read(apiClientProvider);
      final response = await api.get('/users/loyalty');
      final List<dynamic> items = response.data['data'] as List<dynamic>? ?? [];
      if (mounted) {
        setState(() {
          _loyaltyCards = items.map((e) => LoyaltyCard.fromJson(e as Map<String, dynamic>)).toList();
        });
      }
    } catch (_) {}
  }

  Future<void> _loadReferral() async {
    try {
      final api = ref.read(apiClientProvider);
      final response = await api.get('/referral/my-code');
      final data = response.data['data'];
      if (mounted && data != null) {
        setState(() {
          _referralCode = data['code'] as String?;
          _referralCount = data['referralCount'] as int? ?? 0;
          _untilReward = data['untilReward'] as int? ?? 3;
        });
      }
    } catch (_) {}
  }

  Future<void> _loadSavings() async {
    try {
      final api = ref.read(apiClientProvider);
      final response = await api.get('/users/savings');
      final data = response.data['data'];
      if (mounted) {
        setState(() {
          _totalSaved = data['totalSaved'] as int? ?? 0;
          _totalSpent = data['totalSpent'] as int? ?? 0;
          _dealCount = data['dealCount'] as int? ?? 0;
          _favoriteVendor = (data['favoriteVendor'] as Map<String, dynamic>?)?['name'] as String?;
        });
      }
    } catch (_) {}
  }

  void _shareSavings() {
    final saved = _totalSaved ~/ 100;
    final deals = _dealCount;
    SharePlus.instance.share(
      ShareParams(
        text: '🎓 I\'ve saved ₦$saved on $deals deals with BuzzPay!\n\n'
            '${_favoriteVendor != null ? 'My go-to: $_favoriteVendor 🔥\n\n' : ''}'
            'Stop paying full price on campus — download BuzzPay 📲 https://buzzpay.ng',
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final user = auth.user;
    final isVerified = user?.isVerified == true;
    final firstName = (user?.fullName ?? 'Student').split(' ').first;

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
                    Text(user?.university ?? 'University of Lagos',
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

                    // Stats — real savings data
                    Row(
                      children: [
                        Expanded(
                          child: _statCard(
                            label: 'Total Saved',
                            value: '₦${(_totalSaved ~/ 100).toString().replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+$)'), (m) => '${m[1]},')}',
                            asset: 'assets/icons/coins_3d.png',
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _statCard(
                            label: 'Deals Claimed',
                            value: '$_dealCount',
                            asset: 'assets/icons/flame_3d.png',
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _streakCard(),
                        ),
                      ],
                    ),
                    if (_totalSaved > 0) ...[
                      const SizedBox(height: 12),
                      GestureDetector(
                        onTap: _shareSavings,
                        child: Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          decoration: BoxDecoration(
                            color: AppColors.success.withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.share, size: 16, color: AppColors.success),
                              const SizedBox(width: 8),
                              Text('Share your savings', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.success)),
                            ],
                          ),
                        ),
                      ),
                    ],
                    if (_favoriteVendor != null) ...[
                      const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: AppColors.card,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: AppColors.border.withValues(alpha: 0.3)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 28, height: 28,
                              decoration: BoxDecoration(
                                color: AppColors.primary.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Center(
                                child: Text(_favoriteVendor![0], style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppColors.primary)),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text('$_favoriteVendor', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                            const SizedBox(width: 6),
                            const Text('🔥', style: TextStyle(fontSize: 12)),
                            const SizedBox(width: 4),
                            Text('Go-to vendor', style: TextStyle(fontSize: 11, color: AppColors.textTertiary)),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),

              // ──── BELOW HEADER ────
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                child: Column(
                  children: [
                    const SizedBox(height: 12),

                    // Referral card
                    GestureDetector(
                      onTap: () => SharePlus.instance.share(ShareParams(
                        text: 'Get a FREE meal on BuzzPay! 🍔🔥\n\nUse my code ${_referralCode ?? "BUZZPAY"} when you sign up.\nInvite 3 friends and YOU get a free meal too!\n\n📲 https://buzzpay.ng',
                      )),
                      child: Container(
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
                          Image.asset('assets/icons/gift_3d.png', width: 36, height: 36,
                            errorBuilder: (_, __, ___) => const Text('🎁', style: TextStyle(fontSize: 28))),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Invite 3 friends, get FREE meal',
                                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                                const SizedBox(height: 4),
                                if (_referralCode != null)
                                  Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: AppColors.primary.withValues(alpha: 0.1),
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Text(_referralCode!, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, letterSpacing: 2, color: AppColors.primary)),
                                      ),
                                      const SizedBox(width: 8),
                                      Text('$_referralCount/3 · ${_untilReward == 0 ? "🎉 Reward ready!" : "$_untilReward more"}',
                                        style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                                    ],
                                  )
                                else
                                  const Text('Tap to share your code',
                                      style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                              ],
                            ),
                          ),
                          const Icon(Icons.chevron_right, size: 20, color: AppColors.textTertiary),
                        ],
                      ),
                    ),
                    ),

                    const SizedBox(height: 20),

                    // ──── LOYALTY STAMPS ────
                    if (_loyaltyCards.isNotEmpty) ...[
                      Row(
                        children: [
                          const Text('Loyalty Cards',
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                          const Spacer(),
                          Text('${_loyaltyCards.length} vendor${_loyaltyCards.length == 1 ? '' : 's'}',
                              style: const TextStyle(fontSize: 12, color: AppColors.textTertiary)),
                        ],
                      ),
                      const SizedBox(height: 12),
                      for (final card in _loyaltyCards) ...[
                        LoyaltyCardWidget(card: card),
                        const SizedBox(height: 12),
                      ],
                      const SizedBox(height: 8),
                    ],

                    // Menu
                    _menuItem(Icons.receipt_long_outlined, 'Purchase History',
                        onTap: () => context.go('/vouchers')),
                    _menuItem(Icons.notifications_none, 'Notifications',
                        onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: const Text('Notifications coming soon!'), behavior: SnackBarBehavior.floating,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))))),
                    _menuItem(Icons.headset_mic_outlined, 'Help & Support',
                        onTap: () => launchUrl(Uri.parse('https://wa.me/2349045701943?text=Hi%20BuzzPay%20support'))),
                    _menuItem(Icons.info_outline, 'About BuzzPay',
                        onTap: () => showAboutDialog(
                          context: context,
                          applicationName: 'BuzzPay',
                          applicationVersion: '1.0.0',
                          children: [const Text('Student deals, instantly. Pay less because you\'re a student.')],
                        )),
                    _menuItem(Icons.shield_outlined, 'Privacy & Terms',
                        onTap: () => launchUrl(Uri.parse('https://buzzpay.ng/privacy'))),

                    const SizedBox(height: 24),

                    // Footer
                    GestureDetector(
                      onTap: () async {
                        await ref.read(authProvider.notifier).logout();
                        if (context.mounted) context.go('/login');
                      },
                      child: const Text('Log Out',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: AppColors.textTertiary)),
                    ),
                    const SizedBox(height: 6),
                    const Text('BuzzPay v1.0.0',
                        style: TextStyle(fontSize: 10, color: AppColors.textTertiary)),
                    const SizedBox(height: 120),
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

  Widget _streakCard() {
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
          const Text('🔥', style: TextStyle(fontSize: 24)),
          const SizedBox(height: 10),
          Text('$_currentStreak',
              style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w800, color: AppColors.text)),
          const SizedBox(height: 2),
          const Text('Day streak',
              style: TextStyle(fontSize: 12, color: AppColors.textTertiary, fontWeight: FontWeight.w400)),
          if (_longestStreak > 0) ...[
            const SizedBox(height: 4),
            Text('Best: $_longestStreak',
                style: const TextStyle(fontSize: 10, color: AppColors.textTertiary)),
          ],
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
