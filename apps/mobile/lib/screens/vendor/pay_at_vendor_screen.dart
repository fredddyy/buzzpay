import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../core/theme/colors.dart';
import '../../providers/api_provider.dart';

class PayAtVendorScreen extends ConsumerStatefulWidget {
  final String vendorId;
  final String vendorName;
  final double discountPercent; // e.g. 10.0

  const PayAtVendorScreen({
    super.key,
    required this.vendorId,
    required this.vendorName,
    required this.discountPercent,
  });

  @override
  ConsumerState<PayAtVendorScreen> createState() => _PayAtVendorScreenState();
}

class _PayAtVendorScreenState extends ConsumerState<PayAtVendorScreen> {
  final _amountController = TextEditingController();
  bool _paying = false;
  bool _success = false;
  int _originalAmount = 0;
  int _discountAmount = 0;
  int _studentPays = 0;
  String? _error;

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  String _formatNaira(int kobo) => '₦${(kobo / 100).toStringAsFixed(0).replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+$)'), (m) => '${m[1]},')}';

  void _calculateDiscount() {
    final input = _amountController.text.replaceAll(',', '').replaceAll('₦', '').trim();
    if (input.isEmpty) {
      setState(() { _originalAmount = 0; _discountAmount = 0; _studentPays = 0; });
      return;
    }
    final naira = int.tryParse(input) ?? 0;
    final kobo = naira * 100;
    final discount = (kobo * widget.discountPercent / 100).round();
    setState(() {
      _originalAmount = kobo;
      _discountAmount = discount;
      _studentPays = kobo - discount;
    });
  }

  Future<void> _pay() async {
    if (_studentPays < 10000) {
      setState(() => _error = 'Minimum amount is ₦100');
      return;
    }

    setState(() { _paying = true; _error = null; });

    try {
      final api = ref.read(apiClientProvider);
      final response = await api.post('/payments/vendor-direct', data: {
        'vendorId': widget.vendorId,
        'amount': _originalAmount,
      });
      final data = response.data['data'];
      final authUrl = data['authorizationUrl'] as String;
      final reference = data['reference'] as String;

      if (!mounted) return;

      // Open Paystack webview
      final result = await Navigator.of(context).push<bool>(
        MaterialPageRoute(
          builder: (_) => _PaystackWebview(url: authUrl, reference: reference),
        ),
      );

      if (result == true && mounted) {
        // Confirm payment
        final confirmRes = await api.post('/payments/vendor-direct/confirm', data: { 'reference': reference });
        final confirmData = confirmRes.data['data'];
        if (confirmData['status'] == 'confirmed' || confirmData['status'] == 'already_confirmed') {
          HapticFeedback.heavyImpact();
          setState(() { _success = true; _paying = false; });
        } else {
          setState(() { _paying = false; _error = 'Payment pending — check back shortly'; });
        }
      } else {
        setState(() { _paying = false; });
      }
    } catch (e) {
      setState(() {
        _paying = false;
        _error = 'Payment failed. Try again.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_success) return _buildSuccessScreen();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Pay at Vendor'),
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.text,
        elevation: 0,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Vendor info
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.card,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 48, height: 48,
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Center(child: Text(widget.vendorName[0],
                        style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.primary))),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(widget.vendorName, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                          const SizedBox(height: 2),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFF059669).withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text('${widget.discountPercent.round()}% student discount',
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF059669))),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),

              // Amount input
              const Text('Enter order amount', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
              const SizedBox(height: 4),
              Text('Type the total your vendor told you', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
              const SizedBox(height: 12),

              TextField(
                controller: _amountController,
                keyboardType: TextInputType.number,
                onChanged: (_) => _calculateDiscount(),
                style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w800),
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                decoration: InputDecoration(
                  prefixText: '₦ ',
                  prefixStyle: TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: AppColors.textTertiary),
                  hintText: '0',
                  hintStyle: TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: AppColors.border),
                  border: InputBorder.none,
                ),
              ),

              const SizedBox(height: 20),

              // Breakdown
              if (_originalAmount > 0) ...[
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF059669).withValues(alpha: 0.05),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFF059669).withValues(alpha: 0.15)),
                  ),
                  child: Column(
                    children: [
                      _breakdownRow('Order total', _formatNaira(_originalAmount)),
                      const SizedBox(height: 8),
                      _breakdownRow('Student discount (${widget.discountPercent.round()}%)', '- ${_formatNaira(_discountAmount)}',
                        valueColor: const Color(0xFF059669)),
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 8),
                        child: Divider(height: 1),
                      ),
                      _breakdownRow('You pay', _formatNaira(_studentPays), isBold: true),
                    ],
                  ),
                ),
              ],

              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(_error!, style: const TextStyle(fontSize: 12, color: Color(0xFFEF4444))),
              ],

              const Spacer(),

              // Pay button
              SizedBox(
                width: double.infinity, height: 54,
                child: ElevatedButton(
                  onPressed: _paying || _studentPays < 10000 ? null : _pay,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    disabledBackgroundColor: AppColors.primary.withValues(alpha: 0.3),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    elevation: 0,
                  ),
                  child: _paying
                    ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                    : Text(
                        _studentPays > 0 ? 'Pay ${_formatNaira(_studentPays)}' : 'Enter amount',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white),
                      ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _breakdownRow(String label, String value, {bool isBold = false, Color? valueColor}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(fontSize: 13,
          fontWeight: isBold ? FontWeight.w700 : FontWeight.w400,
          color: isBold ? AppColors.text : AppColors.textSecondary)),
        Text(value, style: TextStyle(fontSize: 14,
          fontWeight: isBold ? FontWeight.w800 : FontWeight.w500,
          color: valueColor ?? (isBold ? AppColors.text : AppColors.textSecondary))),
      ],
    );
  }

  Widget _buildSuccessScreen() {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Big checkmark
              Container(
                width: 80, height: 80,
                decoration: BoxDecoration(
                  color: const Color(0xFF059669).withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.check_rounded, size: 48, color: Color(0xFF059669)),
              ),
              const SizedBox(height: 20),
              const Text('Payment Successful!', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              Text('Show this screen to ${widget.vendorName}',
                style: TextStyle(fontSize: 14, color: AppColors.textSecondary)),

              const SizedBox(height: 32),

              // Amount card — LARGE, vendor sees this
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: AppColors.card,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.border.withValues(alpha: 0.3)),
                ),
                child: Column(
                  children: [
                    Text('ORDER VALUE', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600,
                      color: AppColors.textTertiary, letterSpacing: 1.5)),
                    const SizedBox(height: 8),
                    Text(_formatNaira(_originalAmount),
                      style: const TextStyle(fontSize: 40, fontWeight: FontWeight.w800)),
                    const SizedBox(height: 4),
                    Text('Paid ${_formatNaira(_studentPays)} (${widget.discountPercent.round()}% off)',
                      style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                    const SizedBox(height: 12),
                    Text(widget.vendorName, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.primary)),
                  ],
                ),
              ),

              const SizedBox(height: 32),

              SizedBox(
                width: double.infinity, height: 50,
                child: ElevatedButton(
                  onPressed: () => context.go('/'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: const Text('Done', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// Simple Paystack webview
class _PaystackWebview extends StatelessWidget {
  final String url;
  final String reference;
  const _PaystackWebview({required this.url, required this.reference});

  @override
  Widget build(BuildContext context) {
    final controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(NavigationDelegate(
        onNavigationRequest: (request) {
          if (request.url.contains('callback') || request.url.contains('success') || request.url.contains('close')) {
            Navigator.of(context).pop(true);
            return NavigationDecision.prevent;
          }
          return NavigationDecision.navigate;
        },
      ))
      ..loadRequest(Uri.parse(url));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Complete Payment'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.of(context).pop(false),
        ),
      ),
      body: WebViewWidget(controller: controller),
    );
  }
}
