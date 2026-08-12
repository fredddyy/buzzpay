import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/mock_data.dart';
import '../../core/theme/colors.dart';
import '../../providers/api_provider.dart';
import '../../providers/auth_provider.dart';

class SignupScreen extends ConsumerStatefulWidget {
  final String phone;
  const SignupScreen({super.key, required this.phone});

  @override
  ConsumerState<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends ConsumerState<SignupScreen> {
  final _nameController = TextEditingController();
  final _referralController = TextEditingController();
  String _selectedCampus = 'UNILAG - Akoka';
  String _phone = '';
  bool _loading = false;
  String? _error;

  static const _campuses = [
    'UNILAG - Akoka',
    'YABATECH - Yaba',
    'LASU - Ojo',
    'FUTA - Akure',
  ];

  @override
  void initState() {
    super.initState();
    _phone = widget.phone;
    // Fallback: read from SharedPreferences if extra was lost during router rebuild
    if (_phone.isEmpty) {
      SharedPreferences.getInstance().then((prefs) {
        final saved = prefs.getString('verified_phone') ?? '';
        if (saved.isNotEmpty && mounted) setState(() => _phone = saved);
      });
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_nameController.text.trim().length < 2) return;
    setState(() { _loading = true; _error = null; });

    if (useMockData) {
      await Future.delayed(const Duration(milliseconds: 300));
      if (mounted) {
        ref.read(authProvider.notifier).setAuthenticated(
          name: _nameController.text.trim(),
          id: 'mock_user',
        );
        setState(() => _loading = false);
        context.go('/');
      }
      return;
    }

    try {
      final api = ref.read(apiClientProvider);
      final response = await api.post('/auth/phone/complete-signup', data: {
        'phone': _phone,
        'fullName': _nameController.text.trim(),
        'university': _selectedCampus.split(' - ').first,
        if (_referralController.text.trim().isNotEmpty)
          'referralCode': _referralController.text.trim().toUpperCase(),
      });

      final data = response.data['data'];
      final tokens = data['tokens'];
      final user = data['user'];
      await api.saveTokens(tokens['accessToken'], tokens['refreshToken']);

      if (mounted) {
        ref.read(authProvider.notifier).setAuthenticated(
          name: user['fullName'] ?? _nameController.text.trim(),
          id: user['id'],
          email: user['email'],
        );
        setState(() => _loading = false);
        context.go('/');
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = 'Signup failed. Try again.';
        });
      }
    }
  }

  InputDecoration _softInput(String hint, {IconData? icon}) {
    return InputDecoration(
      hintText: hint,
      prefixIcon: icon != null ? Icon(icon, size: 20, color: AppColors.textTertiary) : null,
      filled: true,
      fillColor: const Color(0xFFF9F8FF),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.card,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: Column(
            children: [
              const Spacer(flex: 2),

              // 3D icon
              Image.asset('assets/icons/user_3d.png', width: 72, height: 72),
              const SizedBox(height: 20),

              const Text('Almost there!',
                  style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800)),
              const SizedBox(height: 6),
              Text('Tell us your name and campus\nso we can show you the best deals.',
                  style: TextStyle(fontSize: 14, color: AppColors.textSecondary, height: 1.4),
                  textAlign: TextAlign.center),

              const Spacer(flex: 1),

              // Name
              TextField(
                controller: _nameController,
                textCapitalization: TextCapitalization.words,
                decoration: _softInput('Full name', icon: Icons.person_outline),
              ),
              const SizedBox(height: 14),

              // Campus
              DropdownButtonFormField<String>(
                value: _selectedCampus,
                decoration: _softInput('Campus', icon: Icons.school_outlined),
                items: _campuses.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                onChanged: (v) => setState(() => _selectedCampus = v ?? _campuses.first),
              ),

              // Referral code (optional)
              const SizedBox(height: 16),
              TextField(
                controller: _referralController,
                textCapitalization: TextCapitalization.characters,
                decoration: _softInput('Referral code (optional)', icon: Icons.card_giftcard),
              ),
              const SizedBox(height: 4),
              Text('Have a friend\'s code? Enter it for a bonus!',
                style: TextStyle(fontSize: 11, color: AppColors.textTertiary)),

              if (_error != null) ...[
                const SizedBox(height: 10),
                Text(_error!, style: const TextStyle(color: AppColors.danger, fontSize: 13)),
              ],

              const SizedBox(height: 28),

              // CTA
              SizedBox(
                width: double.infinity,
                height: 54,
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(30),
                    boxShadow: [BoxShadow(color: AppColors.primary.withValues(alpha: 0.3), blurRadius: 16, offset: const Offset(0, 6))],
                  ),
                  child: ElevatedButton(
                    onPressed: _loading ? null : _submit,
                    style: ElevatedButton.styleFrom(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30))),
                    child: _loading
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('Continue', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  ),
                ),
              ),

              const Spacer(flex: 2),
            ],
          ),
        ),
      ),
    );
  }
}
