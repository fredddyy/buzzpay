import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/mock_data.dart';
import '../../core/theme/colors.dart';
import '../../providers/api_provider.dart';

class PhoneScreen extends ConsumerStatefulWidget {
  const PhoneScreen({super.key});

  @override
  ConsumerState<PhoneScreen> createState() => _PhoneScreenState();
}

class _PhoneScreenState extends ConsumerState<PhoneScreen> {
  final _controller = TextEditingController();
  bool _loading = false;
  String? _error;

  Future<void> _sendOtp() async {
    final phone = _controller.text.trim();
    if (phone.length < 10) {
      setState(() => _error = 'Enter a valid phone number');
      return;
    }
    setState(() { _loading = true; _error = null; });
    final fullPhone = phone.startsWith('+') ? phone
        : phone.startsWith('0') ? '+234${phone.substring(1)}'
        : '+234$phone';

    if (useMockData) {
      await Future.delayed(const Duration(seconds: 1));
      if (mounted) { setState(() => _loading = false); context.push('/otp', extra: fullPhone); }
      return;
    }
    try {
      final api = ref.read(apiClientProvider);
      final res = await api.post('/auth/phone/send-otp', data: {'phone': phone});
      final devOtp = res.data['data']?['otp'] as String?;
      if (mounted) { setState(() => _loading = false); context.push('/otp', extra: {'phone': fullPhone, 'otp': devOtp}); }
    } catch (e) {
      setState(() { _loading = false; _error = 'Failed to send OTP. Try again.'; });
    }
  }

  @override
  void dispose() { _controller.dispose(); super.dispose(); }

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

              // 3D star — large, behind-text feel
              Stack(
                alignment: Alignment.center,
                children: [
                  // Faint purple glow circle
                  Container(
                    width: 140,
                    height: 140,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: RadialGradient(
                        colors: [
                          AppColors.primary.withValues(alpha: 0.08),
                          AppColors.primary.withValues(alpha: 0.02),
                          Colors.transparent,
                        ],
                      ),
                    ),
                  ),
                  Image.asset('assets/icons/star_3d.png', width: 80, height: 80),
                ],
              ),
              const SizedBox(height: 24),

              // Title
              const Text('BuzzPay',
                  style: TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: AppColors.primary)),
              const SizedBox(height: 8),
              const Text('Enter your phone number to\nget started.',
                  style: TextStyle(fontSize: 15, color: AppColors.textSecondary, height: 1.4),
                  textAlign: TextAlign.center),

              const Spacer(flex: 1),

              // Phone input — single rounded pill
              Container(
                height: 58,
                decoration: BoxDecoration(
                  color: const Color(0xFFF4F3F9),
                  borderRadius: BorderRadius.circular(30),
                ),
                child: Row(
                  children: [
                    const Padding(
                      padding: EdgeInsets.only(left: 20),
                      child: Row(
                        children: [
                          Text('🇳🇬', style: TextStyle(fontSize: 18)),
                          SizedBox(width: 4),
                          Text('+234', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
                        ],
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextField(
                        controller: _controller,
                        keyboardType: TextInputType.phone,
                        inputFormatters: [
                          FilteringTextInputFormatter.digitsOnly,
                          LengthLimitingTextInputFormatter(10),
                        ],
                        style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600, letterSpacing: 1.5),
                        decoration: const InputDecoration(
                          hintText: '801 234 5678',
                          hintStyle: TextStyle(color: AppColors.textTertiary, fontWeight: FontWeight.w400, letterSpacing: 1.5),
                          border: InputBorder.none,
                          contentPadding: EdgeInsets.symmetric(vertical: 16),
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                  ],
                ),
              ),

              if (_error != null) ...[
                const SizedBox(height: 10),
                Text(_error!, style: const TextStyle(color: AppColors.danger, fontSize: 12)),
              ],

              const SizedBox(height: 20),

              // CTA — "Let's Go"
              SizedBox(
                width: double.infinity,
                height: 54,
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(30),
                    boxShadow: [BoxShadow(color: AppColors.primary.withValues(alpha: 0.3), blurRadius: 16, offset: const Offset(0, 6))],
                  ),
                  child: ElevatedButton(
                    onPressed: _loading ? null : _sendOtp,
                    style: ElevatedButton.styleFrom(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30))),
                    child: _loading
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text("Let's Go", style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Returning users — same flow
              Text(
                'New or returning — just enter your number',
                style: TextStyle(fontSize: 13, color: AppColors.textTertiary),
              ),

              const Spacer(flex: 2),

              // Trust signal at bottom
              Column(
                children: [
                  Image.asset('assets/icons/lock_3d.png', width: 40, height: 40),
                  const SizedBox(height: 8),
                  const Text("We'll send a verification code via SMS.",
                      style: TextStyle(fontSize: 12, color: AppColors.textTertiary)),
                ],
              ),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
