import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/colors.dart';
import '../../models/cart_item.dart';
import '../../providers/auth_provider.dart';
import '../../providers/cart_provider.dart';
import '../../widgets/verify_gate_sheet.dart';
import '../checkout/transfer_screen.dart';

class CartCheckoutScreen extends ConsumerStatefulWidget {
  final String vendorId;
  const CartCheckoutScreen({super.key, required this.vendorId});

  @override
  ConsumerState<CartCheckoutScreen> createState() => _CartCheckoutScreenState();
}

class _CartCheckoutScreenState extends ConsumerState<CartCheckoutScreen> {
  bool _loading = false;
  String? _error;

  Future<void> _pay() async {
    // Check verification first
    final isVerified = ref.read(authProvider).user?.isVerified ?? false;
    if (!isVerified) {
      final cartItems = ref.read(cartProvider).itemsForVendor(widget.vendorId);
      final totalSavings = cartItems.fold(0, (sum, i) => sum + i.savings);
      VerifyGateSheet.show(
        context,
        dealTitle: '${cartItems.length} item${cartItems.length > 1 ? 's' : ''} in cart',
        savings: CartItem.formatNaira(totalSavings),
        studentPriceKobo: ref.read(cartProvider).totalForVendor(widget.vendorId),
        originalPriceKobo: cartItems.fold(0, (sum, i) => sum + i.originalPrice * i.quantity),
      );
      return;
    }

    setState(() { _loading = true; _error = null; });

    final result = await ref.read(cartProvider.notifier).checkout(widget.vendorId);

    if (result != null && result['reference'] != null) {
      // Capture vendor name before clearing
      final vendorItems = ref.read(cartProvider).itemsForVendor(widget.vendorId);
      final vendorName = vendorItems.isNotEmpty ? vendorItems.first.vendorName : null;

      // Clear vendor items from cart
      ref.read(cartProvider.notifier).clearVendorItems(widget.vendorId);

      if (mounted) {
        setState(() => _loading = false);
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (_) => TransferScreen(
              reference: result['reference'] as String,
              accessCode: result['accessCode'] as String,
              authorizationUrl: result['authorizationUrl'] as String,
              amount: result['totalAmount'] as int,
              vendorName: vendorName,
            ),
          ),
        );
      }
    } else {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = ref.read(cartProvider).error ?? 'Checkout failed';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = ref.watch(cartProvider);
    final items = cart.itemsForVendor(widget.vendorId);
    final total = cart.totalForVendor(widget.vendorId);
    final vendorName = items.isNotEmpty ? items.first.vendorName : 'Vendor';
    final totalSavings = items.fold(0, (sum, i) => sum + i.savings);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
              child: Row(
                children: [
                  GestureDetector(
                    onTap: () => context.pop(),
                    child: const Icon(Icons.arrow_back, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Checkout', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                        Text(vendorName, style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Items list
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                children: [
                  // Order items
                  Container(
                    decoration: BoxDecoration(
                      color: AppColors.card,
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: Column(
                      children: [
                        Padding(
                          padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
                          child: Row(
                            children: [
                              const Text('Order Summary', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                              const Spacer(),
                              Text('${items.length} item${items.length > 1 ? 's' : ''}',
                                style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                            ],
                          ),
                        ),
                        Divider(height: 1, color: AppColors.border.withValues(alpha: 0.2)),
                        for (final item in items)
                          Padding(
                            padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(item.dealTitle, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                                      if (item.quantity > 1)
                                        Text('${item.formattedUnitPrice} × ${item.quantity}',
                                          style: TextStyle(fontSize: 11, color: AppColors.textTertiary)),
                                    ],
                                  ),
                                ),
                                Text(item.formattedSubtotal,
                                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                              ],
                            ),
                          ),
                        Divider(height: 1, color: AppColors.border.withValues(alpha: 0.2)),
                        // Totals
                        Padding(
                          padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
                          child: Row(
                            children: [
                              const Text('Total', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
                              const Spacer(),
                              Text(CartItem.formatNaira(total),
                                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.primary)),
                            ],
                          ),
                        ),
                        if (totalSavings > 0)
                          Padding(
                            padding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
                            child: Row(
                              children: [
                                const Spacer(),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: AppColors.success.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text('You save ${CartItem.formatNaira(totalSavings)}',
                                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.success)),
                                ),
                              ],
                            ),
                          )
                        else
                          const SizedBox(height: 14),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Security badge
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.card,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.shield_outlined, size: 20, color: AppColors.success),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text('Secured by Paystack. Your payment info is encrypted.',
                            style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                        ),
                      ],
                    ),
                  ),

                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.danger.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.danger.withValues(alpha: 0.2)),
                      ),
                      child: Text(_error!, style: TextStyle(fontSize: 13, color: AppColors.danger)),
                    ),
                  ],
                ],
              ),
            ),

            // Pay button
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
              child: GestureDetector(
                onTap: _loading ? null : _pay,
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  decoration: BoxDecoration(
                    color: _loading ? AppColors.primary.withValues(alpha: 0.6) : AppColors.primary,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Center(
                    child: _loading
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : Text('Confirm & Pay ${CartItem.formatNaira(total)}',
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
