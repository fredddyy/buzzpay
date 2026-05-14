import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/colors.dart';
import '../../core/mock_data.dart';
import '../../providers/api_provider.dart';
import '../../providers/auth_provider.dart';

/// Stage 1: Auth — Single smart input (phone default, auto-detects email)
/// Flow: Login → OTP → Campus → KYC → Home
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _controller = TextEditingController();
  bool _loading = false;
  String? _error;

  bool get _isEmail => _controller.text.contains('@');
  bool get _isValid {
    final t = _controller.text.trim();
    if (_isEmail) return t.contains('@') && t.contains('.');
    return t.length >= 10;
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _devLogin() async {
    setState(() { _loading = true; _error = null; });
    try {
      await ref.read(authProvider.notifier).login(
        email: 'student@unilag.edu.ng',
        password: 'student123456',
      );
      if (mounted) {
        setState(() => _loading = false);
        context.go('/');
      }
    } catch (e) {
      if (mounted) {
        setState(() { _loading = false; _error = 'Dev login failed. Is the API running?'; });
      }
    }
  }

  Future<void> _continue() async {
    final input = _controller.text.trim();
    if (input.isEmpty) {
      setState(() => _error = 'Enter your phone number or email');
      return;
    }
    if (!_isValid) {
      setState(() => _error = _isEmail ? 'Enter a valid email' : 'Enter a valid phone number');
      return;
    }

    setState(() { _loading = true; _error = null; });

    if (useMockData) {
      await Future.delayed(const Duration(milliseconds: 500));
      if (!mounted) return;
      setState(() => _loading = false);
      context.push('/otp', extra: {
        'phone': !_isEmail ? input : null,
        'email': _isEmail ? input : null,
        'input': input,
        'method': _isEmail ? 'email' : 'phone',
        'otp': '123456', // mock dev code
      });
      return;
    }

    try {
      final api = ref.read(apiClientProvider);
      final response = await api.post('/auth/phone/send-otp', data: {
        'phone': input,
      });

      if (!mounted) return;
      setState(() => _loading = false);

      final data = response.data['data'];
      context.push('/otp', extra: {
        'phone': !_isEmail ? input : null,
        'email': _isEmail ? input : null,
        'input': input,
        'method': _isEmail ? 'email' : 'phone',
        'otp': data?['otp']?.toString(), // dev mode returns OTP
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'Failed to send code. Check your number and try again.';
      });
    }
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

              // 3D hero
              Container(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.12),
                      blurRadius: 32,
                      offset: const Offset(0, 12),
                    ),
                  ],
                ),
                child: Image.asset('assets/icons/gradcap_3d.png', width: 88, height: 88),
              ),
              const SizedBox(height: 28),

              // Brand
              Text('BuzzPay',
                  style: TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: AppColors.primary)),
              const SizedBox(height: 8),
              Text('Pay less because you\'re a student.',
                  style: TextStyle(fontSize: 15, color: AppColors.textSecondary, height: 1.4),
                  textAlign: TextAlign.center),

              const Spacer(flex: 1),

              // Smart input
              TextField(
                controller: _controller,
                keyboardType: TextInputType.emailAddress,
                onChanged: (_) => setState(() => _error = null),
                decoration: InputDecoration(
                  hintText: 'Phone number or email',
                  prefixIcon: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 200),
                    child: Icon(
                      _isEmail ? Icons.email_outlined : Icons.phone_outlined,
                      key: ValueKey(_isEmail),
                      size: 20,
                      color: AppColors.textTertiary,
                    ),
                  ),
                  filled: true,
                  fillColor: AppColors.background,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16),
                      borderSide: const BorderSide(color: AppColors.primary, width: 1.5)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
                ),
              ),
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  _isEmail
                      ? 'We\'ll send a verification code to your email.'
                      : 'We\'ll send a one-time code via SMS.',
                  style: TextStyle(fontSize: 12, color: AppColors.textTertiary),
                ),
              ),

              if (_error != null) ...[
                const SizedBox(height: 10),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: AppColors.danger.withValues(alpha: 0.06),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.info_outline, size: 16, color: AppColors.danger),
                      const SizedBox(width: 8),
                      Expanded(child: Text(_error!, style: const TextStyle(color: AppColors.danger, fontSize: 13))),
                    ],
                  ),
                ),
              ],

              const SizedBox(height: 24),

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
                    onPressed: _loading ? null : _continue,
                    style: ElevatedButton.styleFrom(
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                    ),
                    child: _loading
                        ? const SizedBox(width: 20, height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('Continue', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Dev login — bypasses OTP for testing
              TextButton(
                onPressed: _loading ? null : _devLogin,
                child: Text(
                  'Dev Login (student@unilag.edu.ng)',
                  style: TextStyle(fontSize: 12, color: AppColors.textTertiary),
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
