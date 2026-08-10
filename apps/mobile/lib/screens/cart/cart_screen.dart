import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/colors.dart';
import '../../models/cart_item.dart';
import '../../providers/cart_provider.dart';

class CartScreen extends ConsumerStatefulWidget {
  const CartScreen({super.key});

  @override
  ConsumerState<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends ConsumerState<CartScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(cartProvider.notifier).refreshStock());
  }

  @override
  Widget build(BuildContext context) {
    final cart = ref.watch(cartProvider);

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
                  const Text('My Cart', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                  const Spacer(),
                  if (cart.items.isNotEmpty)
                    GestureDetector(
                      onTap: () {
                        HapticFeedback.mediumImpact();
                        ref.read(cartProvider.notifier).clearAll();
                      },
                      child: Text('Clear all', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.danger)),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Content
            Expanded(
              child: cart.isEmpty
                  ? _emptyState(context)
                  : ListView(
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 100),
                      children: [
                        for (final vendorId in cart.vendorIds) ...[
                          _vendorGroup(context, cart, vendorId),
                          const SizedBox(height: 16),
                        ],
                      ],
                    ),
            ),
          ],
        ),
      ),
      // Bottom bar with grand total
      bottomSheet: cart.isEmpty ? null : Container(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
        decoration: BoxDecoration(
          color: AppColors.card,
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 16, offset: const Offset(0, -4))],
        ),
        child: Row(
          children: [
            Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${cart.totalItems} item${cart.totalItems > 1 ? 's' : ''} · ${cart.vendorIds.length} vendor${cart.vendorIds.length > 1 ? 's' : ''}',
                  style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                const SizedBox(height: 2),
                Text(CartItem.formatNaira(cart.grandTotal),
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
              ],
            ),
            const Spacer(),
            if (cart.vendorIds.length == 1)
              GestureDetector(
                onTap: () => context.push('/cart/checkout/${cart.vendorIds.first}'),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Text('Checkout', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white)),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _vendorGroup(BuildContext context, CartState cart, String vendorId) {
    final items = cart.itemsForVendor(vendorId);
    final vendorName = items.first.vendorName;
    final vendorTotal = cart.totalForVendor(vendorId);

    return Container(
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.border.withValues(alpha: 0.3)),
      ),
      child: Column(
        children: [
          // Vendor header
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
            child: Row(
              children: [
                Container(
                  width: 32, height: 32,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Center(
                    child: Text(vendorName[0], style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.primary)),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(vendorName, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Divider(height: 1, color: AppColors.border.withValues(alpha: 0.2)),

          // Items
          for (final item in items) _cartItemRow(item),

          // Vendor subtotal + checkout
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 14),
            child: Row(
              children: [
                Text('Subtotal', style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                const Spacer(),
                Text(CartItem.formatNaira(vendorTotal),
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.primary)),
              ],
            ),
          ),
          if (cart.vendorIds.length > 1)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
              child: GestureDetector(
                onTap: () => context.push('/cart/checkout/$vendorId'),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Center(
                    child: Text('Checkout ${CartItem.formatNaira(vendorTotal)}',
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white)),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _cartItemRow(CartItem item) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
      child: Row(
        children: [
          // Thumbnail
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: item.imageUrl != null
                ? Image.network(item.imageUrl!, width: 52, height: 52, fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => _placeholderThumb())
                : _placeholderThumb(),
          ),
          const SizedBox(width: 12),
          // Title + price
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item.dealTitle, maxLines: 1, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                const SizedBox(height: 2),
                Text(item.formattedUnitPrice,
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.primary)),
              ],
            ),
          ),
          const SizedBox(width: 8),
          // Qty stepper
          Container(
            decoration: BoxDecoration(
              color: AppColors.background,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                _stepperBtn(Icons.remove, () {
                  HapticFeedback.lightImpact();
                  ref.read(cartProvider.notifier).updateQuantity(item.dealId, item.quantity - 1);
                }),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  child: Text('${item.quantity}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                ),
                _stepperBtn(Icons.add, item.quantity >= item.maxPerUser ? null : () {
                  HapticFeedback.lightImpact();
                  ref.read(cartProvider.notifier).updateQuantity(item.dealId, item.quantity + 1);
                }),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _stepperBtn(IconData icon, VoidCallback? onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 30, height: 30,
        decoration: BoxDecoration(
          color: onTap == null ? Colors.transparent : AppColors.card,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon, size: 16, color: onTap == null ? AppColors.textTertiary : AppColors.text),
      ),
    );
  }

  Widget _placeholderThumb() => Container(
    width: 52, height: 52,
    decoration: BoxDecoration(
      color: AppColors.background,
      borderRadius: BorderRadius.circular(10),
    ),
    child: const Icon(Icons.restaurant, size: 22, color: AppColors.textTertiary),
  );

  Widget _emptyState(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.shopping_cart_outlined, size: 64, color: AppColors.textTertiary.withValues(alpha: 0.3)),
          const SizedBox(height: 16),
          const Text('Your cart is empty', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
          const SizedBox(height: 6),
          Text('Add deals to your cart and\ncheckout when ready', textAlign: TextAlign.center,
            style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
          const SizedBox(height: 24),
          GestureDetector(
            onTap: () => context.pop(),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              decoration: BoxDecoration(
                color: AppColors.primary,
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Text('Browse Deals', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white)),
            ),
          ),
        ],
      ),
    );
  }
}
