import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/mock_data.dart';
import '../core/services/voucher_cache.dart';
import '../models/voucher.dart';
import 'api_provider.dart';

class VouchersState {
  final List<Voucher> vouchers;
  final bool isLoading;
  final String? error;
  final String? statusFilter;
  final bool isOffline;

  const VouchersState({
    this.vouchers = const [],
    this.isLoading = false,
    this.error,
    this.statusFilter,
    this.isOffline = false,
  });

  VouchersState copyWith({
    List<Voucher>? vouchers,
    bool? isLoading,
    String? error,
    String? statusFilter,
    bool? isOffline,
  }) =>
      VouchersState(
        vouchers: vouchers ?? this.vouchers,
        isLoading: isLoading ?? this.isLoading,
        error: error,
        statusFilter: statusFilter ?? this.statusFilter,
        isOffline: isOffline ?? this.isOffline,
      );
}

class VouchersNotifier extends Notifier<VouchersState> {
  @override
  VouchersState build() => const VouchersState();

  Future<void> loadVouchers({String? status}) async {
    state = state.copyWith(isLoading: true, error: null, statusFilter: status);

    if (useMockData) {
      await Future.delayed(const Duration(milliseconds: 200));
      var vouchers = mockVouchers;
      if (status != null) {
        vouchers = vouchers.where((v) => v.status == status).toList();
      }
      state = state.copyWith(vouchers: vouchers, isLoading: false);
      return;
    }

    try {
      final api = ref.read(apiClientProvider);
      final params = <String, dynamic>{'limit': 50};
      if (status != null) params['status'] = status;

      final response = await api.get('/vouchers', queryParams: params);
      final data = response.data['data'];
      final vouchers =
          (data['vouchers'] as List).map((v) => Voucher.fromJson(v)).toList();

      // Cache active vouchers for offline use
      await VoucherCache.cacheVouchers(vouchers);

      state = state.copyWith(vouchers: vouchers, isLoading: false, isOffline: false);
    } catch (_) {
      // Try loading from cache when network fails
      final cached = await VoucherCache.loadCachedVouchers();
      if (cached.isNotEmpty) {
        var filtered = cached;
        if (status != null) {
          filtered = cached.where((v) => v.status == status).toList();
        }
        state = state.copyWith(
          vouchers: filtered,
          isLoading: false,
          isOffline: true,
          error: null,
        );
      } else {
        state = state.copyWith(
          isLoading: false,
          error: 'Failed to load vouchers',
          isOffline: true,
        );
      }
    }
  }

  void setFilter(String? status) {
    loadVouchers(status: status);
  }
}

final vouchersProvider = NotifierProvider<VouchersNotifier, VouchersState>(
  VouchersNotifier.new,
);
