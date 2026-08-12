import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/colors.dart';
import '../../core/mock_data.dart';
import '../../providers/api_provider.dart';
import '../../providers/auth_provider.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _controller = TextEditingController();
  bool _loading = false;
  String? _error;

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
    if (input.length < 7) {
      setState(() => _error = 'Enter a valid phone number');
      return;
    }

    setState(() { _loading = true; _error = null; });

    final fullPhone = input.startsWith('+')
        ? input
        : input.startsWith('0')
            ? '+234${input.substring(1)}'
            : '+234$input';

    if (useMockData) {
      await Future.delayed(const Duration(milliseconds: 500));
      if (!mounted) return;
      setState(() => _loading = false);
      context.push('/otp', extra: {
        'phone': fullPhone,
        'email': null,
        'input': fullPhone,
        'method': 'phone',
        'otp': '123456',
      });
      return;
    }

    try {
      final api = ref.read(apiClientProvider);
      final response = await api.post('/auth/phone/send-otp', data: {'phone': fullPhone});
      if (!mounted) return;
      setState(() => _loading = false);
      final data = response.data['data'];
      context.push('/otp', extra: {
        'phone': fullPhone,
        'email': null,
        'input': fullPhone,
        'method': 'phone',
        'otp': data?['otp']?.toString(),
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
      backgroundColor: const Color(0xFFF4F4F8),
      body: Stack(
        children: [
          // Left blue accent bar
          Positioned(
            left: 0,
            top: 120,
            bottom: 240,
            child: Container(
              width: 5,
              decoration: BoxDecoration(
                color: AppColors.info,
                borderRadius: const BorderRadius.only(
                  topRight: Radius.circular(4),
                  bottomRight: Radius.circular(4),
                ),
              ),
            ),
          ),

          SafeArea(
            child: Column(
              children: [
                // Top bar
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'BuzzPay',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w800,
                          color: AppColors.primary,
                        ),
                      ),
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: AppColors.border, width: 1.5),
                        ),
                        child: const Icon(Icons.help_outline_rounded, size: 18, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),

                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 32),

                        // Welcome heading
                        const Text(
                          'Welcome back',
                          style: TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF111111),
                            height: 1.2,
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Log in to your account and keep the buzz\ngoing.',
                          style: TextStyle(
                            fontSize: 15,
                            color: AppColors.textSecondary,
                            height: 1.5,
                          ),
                        ),

                        const SizedBox(height: 36),

                        // Phone number label
                        const Text(
                          'Phone number',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF222222),
                          ),
                        ),
                        const SizedBox(height: 10),

                        // Phone input
                        Container(
                          height: 56,
                          decoration: BoxDecoration(
                            color: const Color(0xFFECEBF3),
                            borderRadius: BorderRadius.circular(14),
                            border: _error != null
                                ? Border.all(color: AppColors.danger, width: 1)
                                : null,
                          ),
                          child: Row(
                            children: [
                              // Flag + code
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 14),
                                child: Row(
                                  children: const [
                                    Text('🇳🇬', style: TextStyle(fontSize: 18)),
                                    SizedBox(width: 6),
                                    Text(
                                      '+234',
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w600,
                                        color: Color(0xFF333333),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              // Divider
                              Container(width: 1, height: 24, color: const Color(0xFFCCCBD8)),
                              // Number input
                              Expanded(
                                child: TextField(
                                  controller: _controller,
                                  keyboardType: TextInputType.phone,
                                  inputFormatters: [
                                    FilteringTextInputFormatter.digitsOnly,
                                    LengthLimitingTextInputFormatter(10),
                                  ],
                                  onChanged: (_) => setState(() => _error = null),
                                  style: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w500,
                                    color: Color(0xFF111111),
                                    letterSpacing: 1,
                                  ),
                                  decoration: const InputDecoration(
                                    hintText: '800 000 0000',
                                    hintStyle: TextStyle(
                                      color: Color(0xFFAAABBA),
                                      fontWeight: FontWeight.w400,
                                      letterSpacing: 1,
                                    ),
                                    border: InputBorder.none,
                                    contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 16),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(height: 8),

                        // Helper / error text
                        if (_error != null)
                          Row(
                            children: [
                              const Icon(Icons.info_outline, size: 13, color: AppColors.danger),
                              const SizedBox(width: 4),
                              Text(
                                _error!,
                                style: const TextStyle(fontSize: 12, color: AppColors.danger),
                              ),
                            ],
                          )
                        else
                          const Text(
                            "We'll send a one-time code via SMS.",
                            style: TextStyle(fontSize: 12, color: AppColors.textTertiary),
                          ),

                        const SizedBox(height: 28),

                        // Continue button
                        SizedBox(
                          width: double.infinity,
                          height: 54,
                          child: ElevatedButton(
                            onPressed: _loading ? null : _continue,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              disabledBackgroundColor: AppColors.primaryLight,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14),
                              ),
                              elevation: 0,
                            ),
                            child: _loading
                                ? const SizedBox(
                                    width: 22,
                                    height: 22,
                                    child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white),
                                  )
                                : const Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Text(
                                        'Continue',
                                        style: TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w700,
                                          color: Colors.white,
                                        ),
                                      ),
                                      SizedBox(width: 8),
                                      Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 18),
                                    ],
                                  ),
                          ),
                        ),

                        const SizedBox(height: 40),

                        // Security card
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(24),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEAE8F5),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Column(
                            children: [
                              Container(
                                width: 48,
                                height: 48,
                                decoration: BoxDecoration(
                                  color: AppColors.primary.withValues(alpha: 0.15),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(
                                  Icons.shield_rounded,
                                  color: AppColors.primary,
                                  size: 26,
                                ),
                              ),
                              const SizedBox(height: 14),
                              const Text(
                                'Secure by Design',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF111111),
                                ),
                              ),
                              const SizedBox(height: 6),
                              const Text(
                                'Your transactions are protected by\nbank-grade encryption and real-time\nmonitoring.',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 13,
                                  color: AppColors.textSecondary,
                                  height: 1.5,
                                ),
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(height: 32),

                        // Footer
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            TextButton(
                              onPressed: () {},
                              style: TextButton.styleFrom(
                                padding: EdgeInsets.zero,
                                minimumSize: Size.zero,
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              ),
                              child: const Text(
                                'Privacy Policy',
                                style: TextStyle(fontSize: 12, color: AppColors.textTertiary),
                              ),
                            ),
                            const Padding(
                              padding: EdgeInsets.symmetric(horizontal: 8),
                              child: Text('·', style: TextStyle(color: AppColors.textTertiary, fontSize: 12)),
                            ),
                            TextButton(
                              onPressed: () {},
                              style: TextButton.styleFrom(
                                padding: EdgeInsets.zero,
                                minimumSize: Size.zero,
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              ),
                              child: const Text(
                                'Terms of Service',
                                style: TextStyle(fontSize: 12, color: AppColors.textTertiary),
                              ),
                            ),
                          ],
                        ),

                        // Dev login — only visible in debug builds
                        if (kDebugMode) ...[
                          const SizedBox(height: 8),
                          Center(
                            child: TextButton(
                              onPressed: _loading ? null : _devLogin,
                              style: TextButton.styleFrom(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              ),
                              child: Text(
                                'Dev Login',
                                style: TextStyle(fontSize: 11, color: AppColors.textTertiary.withValues(alpha: 0.5)),
                              ),
                            ),
                          ),
                        ],

                        const SizedBox(height: 16),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
