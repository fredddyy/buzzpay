import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/cart_item.dart';
import '../models/deal.dart';
import 'api_provider.dart';

class CartState {
  final List<CartItem> items;
  final bool isCheckingOut;
  final String? error;

  const CartState({
    this.items = const [],
    this.isCheckingOut = false,
    this.error,
  });

  List<String> get vendorIds =>
      items.map((i) => i.vendorId).toSet().toList();

  List<CartItem> itemsForVendor(String vendorId) =>
      items.where((i) => i.vendorId == vendorId).toList();

  int totalForVendor(String vendorId) =>
      itemsForVendor(vendorId).fold(0, (sum, i) => sum + i.subtotal);

  int get grandTotal => items.fold(0, (sum, i) => sum + i.subtotal);
  int get totalItems => items.fold(0, (sum, i) => sum + i.quantity);
  bool get isEmpty => items.isEmpty;

  CartItem? findDeal(String dealId) {
    final matches = items.where((i) => i.dealId == dealId);
    return matches.isEmpty ? null : matches.first;
  }

  CartState copyWith({
    List<CartItem>? items,
    bool? isCheckingOut,
    String? error,
  }) => CartState(
    items: items ?? this.items,
    isCheckingOut: isCheckingOut ?? this.isCheckingOut,
    error: error,
  );
}

class CartNotifier extends Notifier<CartState> {
  static const _storageKey = 'cart_items';

  @override
  CartState build() => const CartState();

  void addItem(Deal deal, {int quantity = 1}) {
    final existing = state.findDeal(deal.id);
    if (existing != null) {
      final newQty = (existing.quantity + quantity).clamp(1, deal.maxPerUser);
      updateQuantity(deal.id, newQty);
      return;
    }

    final item = CartItem(
      dealId: deal.id,
      vendorId: deal.vendorId,
      vendorName: deal.vendorName,
      dealTitle: deal.title,
      imageUrl: deal.imageUrl,
      studentPrice: deal.studentPrice,
      originalPrice: deal.originalPrice,
      maxPerUser: deal.maxPerUser,
      quantity: quantity,
    );

    state = state.copyWith(items: [...state.items, item]);
    _persist();
  }

  void removeItem(String dealId) {
    state = state.copyWith(
      items: state.items.where((i) => i.dealId != dealId).toList(),
    );
    _persist();
  }

  void updateQuantity(String dealId, int newQty) {
    if (newQty <= 0) {
      removeItem(dealId);
      return;
    }
    state = state.copyWith(
      items: state.items.map((i) {
        if (i.dealId == dealId) {
          return CartItem(
            dealId: i.dealId,
            vendorId: i.vendorId,
            vendorName: i.vendorName,
            dealTitle: i.dealTitle,
            imageUrl: i.imageUrl,
            studentPrice: i.studentPrice,
            originalPrice: i.originalPrice,
            maxPerUser: i.maxPerUser,
            quantity: newQty.clamp(1, i.maxPerUser),
          );
        }
        return i;
      }).toList(),
    );
    _persist();
  }

  void clearVendorItems(String vendorId) {
    state = state.copyWith(
      items: state.items.where((i) => i.vendorId != vendorId).toList(),
    );
    _persist();
  }

  void clearAll() {
    state = state.copyWith(items: []);
    _persist();
  }

  Future<Map<String, dynamic>?> checkout(String vendorId) async {
    state = state.copyWith(isCheckingOut: true, error: null);
    try {
      final api = ref.read(apiClientProvider);
      final vendorItems = state.itemsForVendor(vendorId);
      if (vendorItems.isEmpty) throw Exception('No items for this vendor');

      final response = await api.post('/payments/cart-checkout', data: {
        'vendorId': vendorId,
        'items': vendorItems.map((i) =>
          {'dealId': i.dealId, 'quantity': i.quantity}
        ).toList(),
      });

      state = state.copyWith(isCheckingOut: false);
      return response.data['data'] as Map<String, dynamic>;
    } catch (e) {
      debugPrint('Cart checkout error: $e');
      state = state.copyWith(
        isCheckingOut: false,
        error: 'Checkout failed. Please try again.',
      );
      return null;
    }
  }

  Future<void> refreshStock() async {
    if (state.isEmpty) return;
    try {
      final api = ref.read(apiClientProvider);
      final dealIds = state.items.map((i) => i.dealId).toList();
      final response = await api.post('/deals/stock-check', data: {
        'dealIds': dealIds,
      });
      final stockData = (response.data['data'] as List)
          .cast<Map<String, dynamic>>();

      final stockMap = {
        for (final s in stockData) s['dealId'] as String: s
      };

      // Remove items that are no longer available
      final updated = state.items.where((item) {
        final stock = stockMap[item.dealId];
        if (stock == null) return false;
        return stock['isActive'] == true && (stock['remainingQty'] as int) > 0;
      }).toList();

      if (updated.length != state.items.length) {
        state = state.copyWith(items: updated);
        _persist();
      }
    } catch (e) {
      debugPrint('Stock refresh error: $e');
    }
  }

  Future<void> loadFromStorage() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final json = prefs.getString(_storageKey);
      if (json == null) return;
      final list = (jsonDecode(json) as List)
          .map((e) => CartItem.fromJson(e as Map<String, dynamic>))
          .toList();
      state = state.copyWith(items: list);
    } catch (e) {
      debugPrint('Cart load error: $e');
    }
  }

  Future<void> _persist() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final json = jsonEncode(state.items.map((i) => i.toJson()).toList());
      await prefs.setString(_storageKey, json);
    } catch (e) {
      debugPrint('Cart persist error: $e');
    }
  }
}

final cartProvider = NotifierProvider<CartNotifier, CartState>(
  CartNotifier.new,
);
