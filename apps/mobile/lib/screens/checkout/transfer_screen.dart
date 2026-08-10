import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/colors.dart';
import '../../providers/api_provider.dart';
import 'paystack_webview.dart';

class TransferScreen extends ConsumerStatefulWidget {
  final String reference;
  final String accessCode;
  final String authorizationUrl;
  final int amount; // kobo
  final String? vendorName;

  const TransferScreen({
    super.key,
    required this.reference,
    required this.accessCode,
    required this.authorizationUrl,
    required this.amount,
    this.vendorName,
  });

  @override
  ConsumerState<TransferScreen> createState() => _TransferScreenState();
}

class _TransferScreenState extends ConsumerState<TransferScreen> {
  Timer? _pollTimer;
  bool _verified = false;
  bool _webviewOpened = false;

  @override
  void initState() {
    super.initState();
    _openPaystackWebview();
    _startPolling();
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  Future<void> _openPaystackWebview() async {
    // Small delay to let the screen render first
    await Future.delayed(const Duration(milliseconds: 300));
    if (!mounted) return;

    setState(() => _webviewOpened = true);

    final result = await Navigator.of(context).push<String>(
      MaterialPageRoute(
        builder: (_) => PaystackWebView(
          authorizationUrl: widget.authorizationUrl,
          reference: widget.reference,
        ),
      ),
    );

    // Webview closed — check if payment went through
    if (mounted && !_verified) {
      _verifyOnce();
    }
  }

  void _startPolling() {
    _pollTimer = Timer.periodic(const Duration(seconds: 5), (_) async {
      if (_verified) return;
      await _verifyOnce();
    });
  }

  Future<void> _verifyOnce() async {
    try {
      final api = ref.read(apiClientProvider);
      final response = await api.get('/payments/verify/${widget.reference}');
      final status = response.data['data']?['status'];
      if (status == 'SUCCESS' && mounted) {
        setState(() => _verified = true);
        _pollTimer?.cancel();
        HapticFeedback.heavyImpact();
        await Future.delayed(const Duration(seconds: 2));
        if (mounted) context.go('/vouchers');
      }
    } catch (_) {}
  }

  String get _formattedAmount {
    final naira = widget.amount ~/ 100;
    return '₦${naira.toString().replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+$)'), (m) => '${m[1]},')}';
  }

  @override
  Widget build(BuildContext context) {
    if (_verified) return _successView();

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Waiting icon
                Container(
                  width: 72, height: 72,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.08),
                    shape: BoxShape.circle,
                  ),
                  child: const Center(
                    child: SizedBox(
                      width: 28, height: 28,
                      child: CircularProgressIndicator(strokeWidth: 3, color: AppColors.primary),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                const Text('Waiting for payment', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                const SizedBox(height: 8),
                Text(
                  'Complete the transfer of $_formattedAmount${widget.vendorName != null ? ' for ${widget.vendorName}' : ''}',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 14, color: AppColors.textSecondary, height: 1.4),
                ),
                const SizedBox(height: 32),

                // Re-open Paystack
                GestureDetector(
                  onTap: _openPaystackWebview,
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Center(
                      child: Text('Open Payment Page', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white)),
                    ),
                  ),
                ),
                const SizedBox(height: 12),

                // Cancel
                GestureDetector(
                  onTap: () => context.pop(),
                  child: const Padding(
                    padding: EdgeInsets.symmetric(vertical: 8),
                    child: Text('Cancel', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _successView() {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 80, height: 80,
              decoration: BoxDecoration(
                color: AppColors.success.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.check_circle, size: 48, color: AppColors.success),
            ),
            const SizedBox(height: 20),
            const Text('Payment Received!', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            Text('Your voucher is ready', style: TextStyle(fontSize: 14, color: AppColors.textSecondary)),
          ],
        ),
      ),
    );
  }
}
