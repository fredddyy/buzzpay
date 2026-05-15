import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/colors.dart';
import '../../core/api_client.dart';

class VendorProfileScreen extends StatefulWidget {
  const VendorProfileScreen({super.key});

  @override
  State<VendorProfileScreen> createState() => _VendorProfileScreenState();
}

class _VendorProfileScreenState extends State<VendorProfileScreen> {
  final _api = VendorApiClient();
  Map<String, dynamic>? _profile;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await _api.get('/auth/me');
      _profile = res.data['data'] as Map<String, dynamic>?;
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: VColors.base,
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: VColors.primary))
            : ListView(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 100),
                children: [
                  const SizedBox(height: 20),
                  // Avatar
                  Center(
                    child: Container(
                      width: 80, height: 80,
                      decoration: BoxDecoration(
                        color: VColors.primary.withValues(alpha: 0.1),
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: Text(
                          (_profile?['fullName'] as String? ?? 'V')[0],
                          style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: VColors.primary),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Center(
                    child: Text(_profile?['fullName'] ?? 'Vendor',
                        style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: VColors.text)),
                  ),
                  const SizedBox(height: 4),
                  Center(
                    child: Text(_profile?['email'] ?? '',
                        style: const TextStyle(fontSize: 13, color: VColors.textMuted)),
                  ),
                  const SizedBox(height: 6),
                  Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                      decoration: BoxDecoration(
                        color: VColors.successSurface,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Text('Verified Vendor', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: VColors.success)),
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Menu items
                  _menuItem(Icons.store_outlined, 'Business Details', () {}),
                  _menuItem(Icons.account_balance_outlined, 'Bank & Payouts', () {}),
                  _menuItem(Icons.qr_code, 'QR Sticker', () {}),
                  _menuItem(Icons.notifications_outlined, 'Notifications', () {}),
                  _menuItem(Icons.help_outline, 'Help & Support', () {}),
                  const SizedBox(height: 24),

                  // Logout
                  GestureDetector(
                    onTap: () async {
                      await _api.clearTokens();
                      if (mounted) context.go('/login');
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      decoration: BoxDecoration(
                        color: VColors.error.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: VColors.error.withValues(alpha: 0.2)),
                      ),
                      child: const Center(
                        child: Text('Log Out', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: VColors.error)),
                      ),
                    ),
                  ),
                ],
              ),
      ),
    );
  }

  Widget _menuItem(IconData icon, String title, VoidCallback onTap) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: VColors.surface,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: VColors.border),
          ),
          child: Row(
            children: [
              Icon(icon, size: 20, color: VColors.textSecondary),
              const SizedBox(width: 14),
              Expanded(child: Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: VColors.text))),
              const Icon(Icons.chevron_right, size: 18, color: VColors.textMuted),
            ],
          ),
        ),
      ),
    );
  }
}
