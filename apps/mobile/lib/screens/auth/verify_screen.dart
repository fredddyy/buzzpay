import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/theme/colors.dart';
import '../../models/user.dart';
import '../../providers/auth_provider.dart';

class VerifyScreen extends ConsumerStatefulWidget {
  const VerifyScreen({super.key});

  @override
  ConsumerState<VerifyScreen> createState() => _VerifyScreenState();
}

class _VerifyScreenState extends ConsumerState<VerifyScreen> {
  int _step = 0;
  int _method = -1;
  final _emailController = TextEditingController();
  final _otpController = TextEditingController();
  bool _loading = false;
  File? _pickedFile;

  @override
  void dispose() {
    _emailController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  void _selectMethod(int method) {
    setState(() { _method = method; _step = method == 0 ? 1 : 2; });
  }

  void _sendOtp() {
    if (_emailController.text.isEmpty) return;
    setState(() => _loading = true);
    Future.delayed(const Duration(seconds: 1), () {
      if (mounted) setState(() { _loading = false; _step = 3; });
    });
  }

  void _verifyOtp() {
    if (_otpController.text.length < 4) return;
    setState(() => _loading = true);
    Future.delayed(const Duration(seconds: 1), () {
      if (mounted) setState(() { _loading = false; _step = 4; });
    });
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => Container(
        decoration: const BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt, color: AppColors.primary),
              title: const Text('Take Photo'),
              onTap: () => Navigator.pop(context, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library, color: AppColors.primary),
              title: const Text('Choose from Gallery'),
              onTap: () => Navigator.pop(context, ImageSource.gallery),
            ),
          ],
        ),
      ),
    );

    if (source == null) return;

    final picked = await picker.pickImage(source: source, maxWidth: 1200, imageQuality: 85);
    if (picked == null) return;

    setState(() {
      _pickedFile = File(picked.path);
    });
  }

  void _submitUpload() {
    if (_pickedFile == null) return;
    setState(() => _loading = true);
    // TODO: Upload to Cloudinary + submit to API for admin review
    Future.delayed(const Duration(milliseconds: 1500), () {
      if (mounted) setState(() { _loading = false; _step = 5; });
    });
  }

  InputDecoration _softInput(String hint, {IconData? icon}) {
    return InputDecoration(
      hintText: hint,
      prefixIcon: icon != null ? Icon(icon, size: 20, color: AppColors.textTertiary) : null,
      filled: true,
      fillColor: AppColors.background,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: AppColors.primary, width: 1.5)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.card,
      body: Column(
        children: [
          // ──── HEADER — gradient with overlapping illustration ────
          Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                width: double.infinity,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      AppColors.primary,
                      AppColors.primary.withValues(alpha: 0.75),
                    ],
                  ),
                  borderRadius: const BorderRadius.vertical(bottom: Radius.circular(32)),
                ),
                child: SafeArea(
                  bottom: false,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(24, 12, 24, 44),
                    child: Column(
                      children: [
                        // Animated progress bar
                        ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: TweenAnimationBuilder<double>(
                            tween: Tween(begin: 0, end: _step == 0 ? 0.2 : _step == 4 ? 1.0 : (_step / 4)),
                            duration: const Duration(milliseconds: 400),
                            curve: Curves.easeInOut,
                            builder: (_, value, __) => LinearProgressIndicator(
                              value: value,
                              minHeight: 4,
                              backgroundColor: Colors.white.withValues(alpha: 0.2),
                              valueColor: const AlwaysStoppedAnimation<Color>(Colors.white),
                            ),
                          ),
                        ),
                        const SizedBox(height: 24),
                        Text(
                          _step == 4 ? 'You\'re Verified!' : 'Unlock Student Deals',
                          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Colors.white),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          _step == 4
                              ? 'Welcome to the BuzzPay family'
                              : 'Join 5,000+ UNILAG students saving daily',
                          style: TextStyle(fontSize: 13, color: Colors.white.withValues(alpha: 0.75)),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              // 3D illustration — overlaps into white body
              Positioned(
                bottom: -28,
                left: 0,
                right: 0,
                child: Center(
                  child: Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      color: AppColors.card,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primary.withValues(alpha: 0.15),
                          blurRadius: 16,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: _step == 4
                        ? Padding(
                            padding: const EdgeInsets.all(10),
                            child: Image.asset('assets/icons/shield_3d.png'),
                          )
                        : Padding(
                            padding: const EdgeInsets.all(12),
                            child: Image.asset('assets/icons/ticket_3d.png'),
                          ),
                  ),
                ),
              ),
            ],
          ),

          // ──── CONTENT ────
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(24, 38, 24, 32),
              child: _buildStepContent(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStepContent() {
    return switch (_step) {
      0 => _buildMethodPicker(),
      1 => _buildEmailInput(),
      2 => _buildUpload(),
      3 => _buildOtpInput(),
      4 => _buildSuccess(),
      5 => _buildPendingReview(),
      _ => const SizedBox(),
    };
  }

  Widget _buildMethodPicker() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('How would you like to verify?',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
        const SizedBox(height: 4),
        const Text('Choose the method that works best for you.',
            style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
        const SizedBox(height: 24),
        _methodCard(
          customIcon: Image.asset('assets/icons/email_3d.png', width: 28, height: 28),
          iconColor: AppColors.primary,
          iconBg: AppColors.primary.withValues(alpha: 0.06),
          title: 'University Email',
          subtitle: 'Verify instantly with your .edu.ng email',
          badge: 'Fastest',
          highlighted: true,
          onTap: () => _selectMethod(0),
        ),
        const SizedBox(height: 12),
        _methodCard(
          customIcon: Image.asset('assets/icons/handcard_3d.png', width: 28, height: 28),
          iconColor: const Color(0xFF3B82F6),
          iconBg: const Color(0xFF3B82F6).withValues(alpha: 0.06),
          title: 'Student ID Card',
          subtitle: 'Upload a photo of your student ID',
          onTap: () => _selectMethod(1),
        ),
        const SizedBox(height: 12),
        _methodCard(
          customIcon: Image.asset('assets/icons/letter_3d.png', width: 28, height: 28),
          iconColor: const Color(0xFFD97706),
          iconBg: const Color(0xFFD97706).withValues(alpha: 0.06),
          title: 'Admission Letter',
          subtitle: 'For freshers who haven\'t received their ID',
          onTap: () => _selectMethod(2),
        ),
        const SizedBox(height: 28),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.lock_outline, size: 13, color: AppColors.textTertiary),
            const SizedBox(width: 4),
            Text('We only confirm you\'re a student. We never share your data.',
                style: TextStyle(fontSize: 10, color: AppColors.textTertiary)),
          ],
        ),
        const SizedBox(height: 20),
        // Skip — browse as guest
        GestureDetector(
          onTap: () {
            ref.read(authProvider.notifier).setAuthenticated(
              name: ref.read(authProvider).user?.fullName ?? 'Student',
            );
            context.go('/');
          },
          child: Text(
            'Skip for now — browse as guest',
            style: TextStyle(
              fontSize: 13,
              color: AppColors.textTertiary,
              decoration: TextDecoration.underline,
              decorationColor: AppColors.textTertiary.withValues(alpha: 0.4),
            ),
          ),
        ),
      ],
    );
  }

  Widget _methodCard({
    IconData? icon,
    Widget? customIcon,
    required Color iconColor,
    required Color iconBg,
    required String title,
    required String subtitle,
    String? badge,
    bool highlighted = false,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: EdgeInsets.all(highlighted ? 20 : 16),
        decoration: BoxDecoration(
          color: highlighted ? AppColors.primary.withValues(alpha: 0.04) : AppColors.card,
          borderRadius: BorderRadius.circular(18),
          // No borders — shadows only
          boxShadow: [
            BoxShadow(
              color: highlighted
                  ? AppColors.primary.withValues(alpha: 0.1)
                  : AppColors.shadow.withValues(alpha: 0.05),
              blurRadius: highlighted ? 20 : 14,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: highlighted ? 48 : 44,
              height: highlighted ? 48 : 44,
              decoration: BoxDecoration(
                color: iconBg,
                borderRadius: BorderRadius.circular(14),
              ),
              child: customIcon ?? Icon(icon, size: 22, color: iconColor),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(title,
                          style: TextStyle(
                            fontSize: highlighted ? 16 : 15,
                            fontWeight: FontWeight.w800,
                            color: AppColors.text,
                          )),
                      if (badge != null) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppColors.primary,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(badge,
                              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.white)),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(subtitle,
                      style: TextStyle(fontSize: 12, color: AppColors.textTertiary)),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, size: 20, color: AppColors.textTertiary),
          ],
        ),
      ),
    );
  }

  Widget _buildEmailInput() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _backButton(),
        const SizedBox(height: 20),
        const Text('Enter your school email',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
        const SizedBox(height: 6),
        const Text('We\'ll send a code to confirm you\'re a student.',
            style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
        const SizedBox(height: 24),
        TextField(
          controller: _emailController,
          keyboardType: TextInputType.emailAddress,
          decoration: _softInput('you@unilag.edu.ng', icon: Icons.email_outlined),
        ),
        const SizedBox(height: 24),
        _primaryButton(label: 'Send Verification Code', loading: _loading, onTap: _sendOtp),
      ],
    );
  }

  Widget _buildUpload() {
    final isIdCard = _method == 1;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _backButton(),
        const SizedBox(height: 20),
        Text(isIdCard ? 'Upload your Student ID' : 'Upload your Admission Letter',
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
        const SizedBox(height: 6),
        Text(isIdCard
                ? 'Take a clear photo of the front of your student ID card.'
                : 'Upload a photo or PDF of your admission letter.',
            style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
        const SizedBox(height: 28),
        // Upload area — shows picker or preview
        GestureDetector(
          onTap: _pickImage,
          child: Container(
            width: double.infinity,
            height: 180,
            decoration: BoxDecoration(
              color: AppColors.background,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.primary.withValues(alpha: 0.15), width: 1.5),
            ),
            clipBehavior: Clip.antiAlias,
            child: _pickedFile != null
                ? Stack(
                    fit: StackFit.expand,
                    children: [
                      Image.file(_pickedFile!, fit: BoxFit.cover),
                      Positioned(
                        bottom: 8, right: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.6),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: const Text('Tap to change', style: TextStyle(fontSize: 11, color: Colors.white)),
                        ),
                      ),
                    ],
                  )
                : Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 52, height: 52,
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.08),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.cloud_upload_outlined, size: 26, color: AppColors.primary),
                      ),
                      const SizedBox(height: 12),
                      const Text('Tap to upload', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                      const SizedBox(height: 4),
                      Text(isIdCard ? 'JPG, PNG — Max 5MB' : 'JPG, PNG, PDF — Max 10MB',
                          style: const TextStyle(fontSize: 12, color: AppColors.textTertiary)),
                    ],
                  ),
          ),
        ),
        const SizedBox(height: 20),
        // Submit button — only enabled when file is picked
        if (_pickedFile != null)
          _primaryButton(
            label: 'Submit for Review',
            loading: _loading,
            onTap: _submitUpload,
          ),
        if (_pickedFile != null) const SizedBox(height: 12),
        Text('Your document will be reviewed within 24 hours.',
            style: TextStyle(fontSize: 11, color: AppColors.textTertiary), textAlign: TextAlign.center),
      ],
    );
  }

  Widget _buildOtpInput() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _backButton(),
        const SizedBox(height: 20),
        const Text('Enter verification code',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
        const SizedBox(height: 6),
        Text('We sent a 6-digit code to ${_emailController.text}',
            style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
        const SizedBox(height: 28),
        TextField(
          controller: _otpController,
          keyboardType: TextInputType.number,
          maxLength: 6,
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800, letterSpacing: 8),
          decoration: InputDecoration(
            hintText: '------',
            counterText: '',
            filled: true,
            fillColor: AppColors.background,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16),
                borderSide: const BorderSide(color: AppColors.primary, width: 1.5)),
          ),
        ),
        const SizedBox(height: 24),
        _primaryButton(label: 'Verify', loading: _loading, onTap: _verifyOtp),
        const SizedBox(height: 16),
        Center(
          child: GestureDetector(
            onTap: () {},
            child: Text('Didn\'t receive the code? Resend',
                style: TextStyle(fontSize: 13, color: AppColors.primary, fontWeight: FontWeight.w500)),
          ),
        ),
      ],
    );
  }

  Widget _buildSuccess() {
    return Column(
      children: [
        const SizedBox(height: 20),
        Container(
          width: 88, height: 88,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: AppColors.primary.withValues(alpha: 0.15),
                blurRadius: 24,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Image.asset('assets/icons/checkmark_3d.png'),
        ),
        const SizedBox(height: 20),
        const Text('Verification Successful!',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
        const SizedBox(height: 8),
        const Text('You now have access to exclusive deals\nat UNILAG, YabaTech, and more.',
            style: TextStyle(fontSize: 14, color: AppColors.textSecondary, height: 1.5),
            textAlign: TextAlign.center),
        const SizedBox(height: 32),
        SizedBox(
          width: double.infinity, height: 52,
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(30),
              boxShadow: [BoxShadow(color: AppColors.primary.withValues(alpha: 0.3), blurRadius: 16, offset: const Offset(0, 6))],
            ),
            child: ElevatedButton(
              onPressed: () {
                ref.read(authProvider.notifier).setAuthenticated(
              name: ref.read(authProvider).user?.fullName ?? 'Student',
            );
                context.go('/');
              },
              style: ElevatedButton.styleFrom(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30))),
              child: const Text('Start Saving', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPendingReview() {
    return Column(
      children: [
        const SizedBox(height: 20),
        Image.asset('assets/icons/hourglass_3d.png', width: 72, height: 72),
        const SizedBox(height: 20),
        const Text('Under Review',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
        const SizedBox(height: 8),
        const Text(
            'We\'re reviewing your document.\nThis usually takes less than 24 hours.',
            style: TextStyle(fontSize: 14, color: AppColors.textSecondary, height: 1.5),
            textAlign: TextAlign.center),
        const SizedBox(height: 8),
        const Text(
            'You\'ll get a notification once approved.',
            style: TextStyle(fontSize: 12, color: AppColors.textTertiary),
            textAlign: TextAlign.center),
        const SizedBox(height: 32),
        SizedBox(
          width: double.infinity,
          height: 52,
          child: OutlinedButton(
            onPressed: () => context.go('/'),
            style: OutlinedButton.styleFrom(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
              side: const BorderSide(color: AppColors.border),
            ),
            child: const Text('Browse Deals While You Wait',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: AppColors.text)),
          ),
        ),
      ],
    );
  }

  Widget _backButton() {
    return GestureDetector(
      onTap: () => setState(() => _step = 0),
      child: Row(
        children: [
          const Icon(Icons.arrow_back, size: 20, color: AppColors.textSecondary),
          const SizedBox(width: 4),
          Text('Back', style: TextStyle(fontSize: 13, color: AppColors.textSecondary, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  Widget _primaryButton({required String label, required bool loading, required VoidCallback onTap}) {
    return SizedBox(
      width: double.infinity, height: 52,
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(30),
          boxShadow: [BoxShadow(color: AppColors.primary.withValues(alpha: 0.3), blurRadius: 16, offset: const Offset(0, 6))],
        ),
        child: ElevatedButton(
          onPressed: loading ? null : onTap,
          style: ElevatedButton.styleFrom(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30))),
          child: loading
              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : Text(label, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
        ),
      ),
    );
  }
}
