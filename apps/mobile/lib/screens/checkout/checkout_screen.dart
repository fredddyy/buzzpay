import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../core/mock_data.dart';
import '../../core/theme/colors.dart';
import '../../models/deal.dart';
import '../../providers/api_provider.dart';
import '../../widgets/price_display.dart';
import 'paystack_webview.dart';

class CheckoutScreen extends ConsumerStatefulWidget {
  final String dealId;

  const CheckoutScreen({super.key, required this.dealId});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  Deal? _deal;
  bool _loading = true;
  bool _paying = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadDeal();
  }

  Future<void> _loadDeal() async {
    if (useMockData) {
      final all = [...mockDeals, ...mockHappyHour];
      final match = all.where((d) => d.id == widget.dealId);
      setState(() {
        _deal = match.isNotEmpty ? match.first : null;
        _loading = false;
      });
      return;
    }
    try {
      final api = ref.read(apiClientProvider);
      final response = await api.get('/deals/${widget.dealId}');
      setState(() {
        _deal = Deal.fromJson(response.data['data']);
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Future<void> _initPayment() async {
    if (useMockData) {
      setState(() => _paying = true);
      await Future.delayed(const Duration(seconds: 1));
      if (mounted) {
        setState(() => _paying = false);
        context.go('/vouchers');
      }
      return;
    }
    setState(() { _paying = true; _error = null; });
    try {
      final api = ref.read(apiClientProvider);
      final response = await api.post('/payments/initialize', data: {'dealId': widget.dealId});
      final data = response.data['data'];
      final reference = data['reference'] as String;
      if (mounted) await _openPaystackWebView(reference, data['authorizationUrl'] as String);
    } catch (e) {
      setState(() { _paying = false; _error = 'Payment failed. Try again.'; });
    }
  }

  Future<void> _openPaystackWebView(String reference, String authUrl) async {
    final result = await Navigator.of(context).push<String>(
      MaterialPageRoute(
        builder: (_) => PaystackWebView(
          authorizationUrl: authUrl,
          reference: reference,
        ),
      ),
    );

    if (result == 'success') {
      await _verifyAndNavigate(reference);
    } else {
      setState(() => _paying = false);
    }
  }

  Future<void> _verifyAndNavigate(String reference) async {
    try {
      final api = ref.read(apiClientProvider);
      final response = await api.get('/payments/verify/$reference');
      if (response.data['data']['status'] == 'SUCCESS' && mounted) {
        final vouchersResponse = await api.get('/vouchers');
        final vouchers = vouchersResponse.data['data']['vouchers'] as List;
        if (vouchers.isNotEmpty) { context.go('/voucher/${vouchers.first['id']}'); return; }
      }
      if (mounted) context.go('/vouchers');
    } catch (_) {
      if (mounted) context.go('/vouchers');
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (_deal == null) return Scaffold(appBar: AppBar(), body: const Center(child: Text('Deal not found')));

    final deal = _deal!;

    return Scaffold(
      backgroundColor: AppColors.card,
      appBar: AppBar(
        title: const Text('Checkout'),
        backgroundColor: AppColors.card,
        elevation: 0,
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ──── PRODUCT CARD with thumbnail ────
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.card,
                      borderRadius: BorderRadius.circular(18),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primary.withValues(alpha: 0.06),
                          blurRadius: 20,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        // Product thumbnail
                        ClipRRect(
                          borderRadius: BorderRadius.circular(14),
                          child: SizedBox(
                            width: 64,
                            height: 64,
                            child: deal.imageUrl != null
                                ? CachedNetworkImage(imageUrl: deal.imageUrl!, fit: BoxFit.cover)
                                : Container(
                                    color: AppColors.background,
                                    child: const Icon(Icons.fastfood, color: AppColors.primary, size: 28),
                                  ),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(deal.title,
                                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                              const SizedBox(height: 3),
                              GestureDetector(
                                onTap: () => context.push('/vendor/${deal.vendorId}'),
                                child: Text(deal.vendorName,
                                    style: TextStyle(
                                      fontSize: 13,
                                      color: AppColors.primary.withValues(alpha: 0.7),
                                      fontWeight: FontWeight.w500,
                                    )),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  // ──── RECEIPT CARD ────
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppColors.card,
                      borderRadius: BorderRadius.circular(18),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primary.withValues(alpha: 0.05),
                          blurRadius: 20,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Price Breakdown',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                        const SizedBox(height: 18),
                        _receiptRow('Original Price', deal.formattedOriginalPrice, strike: true),
                        const SizedBox(height: 12),
                        _receiptRow('Student Price', deal.formattedStudentPrice),
                        const SizedBox(height: 12),
                        // Savings — vibrant highlight
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: const Color(0xFF16A34A).withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Center(
                            child: Text(
                              'You save ${deal.formattedSavings}',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF16A34A),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                        // Divider
                        Container(height: 1, color: AppColors.divider),
                        const SizedBox(height: 14),
                        // Total
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Total',
                                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                            PriceDisplay(
                              studentPriceKobo: deal.studentPrice,
                              originalPriceKobo: deal.originalPrice,
                              studentFontSize: 26,
                              originalFontSize: 0.01, // hide original in total
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Payment method — with card brand logos
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.card,
                      borderRadius: BorderRadius.circular(14),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.shadow.withValues(alpha: 0.04),
                          blurRadius: 12,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.credit_card, size: 20, color: AppColors.textSecondary),
                        const SizedBox(width: 10),
                        const Expanded(
                          child: Text('Card, Bank Transfer, or USSD',
                              style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                        ),
                        // Card brand logos (grayscale text as placeholder)
                        Text('VISA', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800,
                            color: AppColors.textTertiary.withValues(alpha: 0.5), letterSpacing: 0.5)),
                        const SizedBox(width: 6),
                        Text('MC', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800,
                            color: AppColors.textTertiary.withValues(alpha: 0.5), letterSpacing: 0.5)),
                        const SizedBox(width: 6),
                        Image.asset('assets/icons/shield_3d.png', width: 18, height: 18),
                      ],
                    ),
                  ),

                  if (_error != null) ...[
                    const SizedBox(height: 14),
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
                          Expanded(
                            child: Text(_error!,
                                style: const TextStyle(color: AppColors.danger, fontSize: 13, fontWeight: FontWeight.w500)),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),

          // ──── FLOATING PAY BUTTON ────
          Padding(
            padding: EdgeInsets.fromLTRB(20, 0, 20, MediaQuery.of(context).padding.bottom + 16),
            child: Column(
              children: [
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(30),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primary.withValues(alpha: 0.35),
                          blurRadius: 20,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: ElevatedButton(
                      onPressed: _paying ? null : _initPayment,
                      style: ElevatedButton.styleFrom(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                      ),
                      child: _paying
                          ? const SizedBox(width: 20, height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : Text('Confirm & Pay ${deal.formattedStudentPrice}',
                              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.lock, size: 13, color: AppColors.textTertiary),
                    const SizedBox(width: 4),
                    Text('Secured by Paystack',
                        style: TextStyle(fontSize: 11, color: AppColors.textTertiary)),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _receiptRow(String label, String value, {bool strike = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label,
            style: TextStyle(
              fontSize: 14,
              color: strike ? AppColors.textTertiary : AppColors.textSecondary,
            )),
        Text(value,
            style: TextStyle(
              fontSize: 15,
              fontWeight: strike ? FontWeight.w400 : FontWeight.w600,
              color: strike ? AppColors.textTertiary.withValues(alpha: 0.6) : AppColors.text,
              decoration: strike ? TextDecoration.lineThrough : null,
              decorationColor: AppColors.textTertiary.withValues(alpha: 0.4),
            )),
      ],
    );
  }
}
