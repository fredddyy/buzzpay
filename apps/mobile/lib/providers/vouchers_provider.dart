import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/mock_data.dart';
import '../models/voucher.dart';
import 'api_provider.dart';

class VouchersState {
  final List<Voucher> vouchers;
  final bool isLoading;
  final String? error;
  final String? statusFilter;

  const VouchersState({
    this.vouchers = const [],
    this.isLoading = false,
    this.error,
    this.statusFilter,
  });

  VouchersState copyWith({
    List<Voucher>? vouchers,
    bool? isLoading,
    String? error,
    String? statusFilter,
  }) =>
      VouchersState(
        vouchers: vouchers ?? this.vouchers,
        isLoading: isLoading ?? this.isLoading,
        error: error,
        statusFilter: statusFilter ?? this.statusFilter,
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

      state = state.copyWith(vouchers: vouchers, isLoading: false);
    } catch (_) {
      state =
          state.copyWith(isLoading: false, error: 'Failed to load vouchers');
    }
  }

  void setFilter(String? status) {
    loadVouchers(status: status);
  }
}

final vouchersProvider = NotifierProvider<VouchersNotifier, VouchersState>(
  VouchersNotifier.new,
);
