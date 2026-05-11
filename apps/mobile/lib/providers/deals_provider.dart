import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/mock_data.dart';
import '../models/deal.dart';
import 'api_provider.dart';

class DealsState {
  final List<Deal> deals;
  final List<Deal> featured;
  final List<Deal> happyHour;
  final bool isLoading;
  final String? error;
  final int page;
  final int totalPages;
  final String? category;

  const DealsState({
    this.deals = const [],
    this.featured = const [],
    this.happyHour = const [],
    this.isLoading = false,
    this.error,
    this.page = 1,
    this.totalPages = 1,
    this.category,
  });

  DealsState copyWith({
    List<Deal>? deals,
    List<Deal>? featured,
    List<Deal>? happyHour,
    bool? isLoading,
    String? error,
    int? page,
    int? totalPages,
    String? category,
  }) =>
      DealsState(
        deals: deals ?? this.deals,
        featured: featured ?? this.featured,
        happyHour: happyHour ?? this.happyHour,
        isLoading: isLoading ?? this.isLoading,
        error: error,
        page: page ?? this.page,
        totalPages: totalPages ?? this.totalPages,
        category: category ?? this.category,
      );
}

class DealsNotifier extends Notifier<DealsState> {
  @override
  DealsState build() => const DealsState();

  Future<void> loadDeals({String? category, bool refresh = false}) async {
    if (state.isLoading) return;

    state = state.copyWith(
      isLoading: true,
      error: null,
      category: category,
      page: refresh ? 1 : state.page,
    );

    if (useMockData) {
      await Future.delayed(const Duration(milliseconds: 300));
      var deals = mockDeals;
      if (category != null) {
        deals = deals.where((d) => d.category == category).toList();
      }
      state = state.copyWith(
        deals: deals,
        isLoading: false,
        page: 1,
        totalPages: 1,
      );
      return;
    }

    try {
      final api = ref.read(apiClientProvider);
      final params = <String, dynamic>{
        'page': refresh ? 1 : state.page,
        'limit': 20,
      };
      if (category != null) params['category'] = category;

      final response = await api.get('/deals', queryParams: params);
      final data = response.data['data'];
      final deals =
          (data['deals'] as List).map((d) => Deal.fromJson(d)).toList();

      state = state.copyWith(
        deals: refresh ? deals : [...state.deals, ...deals],
        isLoading: false,
        page: data['page'] as int,
        totalPages: data['totalPages'] as int,
      );
    } catch (e) {
      debugPrint('loadDeals error: $e');
      state = state.copyWith(isLoading: false, error: 'Failed to load deals');
    }
  }

  Future<void> loadFeatured() async {
    if (useMockData) {
      state = state.copyWith(featured: mockFeatured);
      return;
    }
    try {
      final api = ref.read(apiClientProvider);
      final response = await api.get('/deals/featured');
      final deals = (response.data['data'] as List)
          .map((d) => Deal.fromJson(d))
          .toList();
      state = state.copyWith(featured: deals);
    } catch (e) {
      debugPrint('loadFeatured error: $e');
    }
  }

  Future<void> loadHappyHour() async {
    if (useMockData) {
      state = state.copyWith(happyHour: mockHappyHour);
      return;
    }
    try {
      final api = ref.read(apiClientProvider);
      final response = await api.get('/deals/happy-hour');
      final deals = (response.data['data'] as List)
          .map((d) => Deal.fromJson(d))
          .toList();
      state = state.copyWith(happyHour: deals);
    } catch (e) {
      debugPrint('loadHappyHour error: $e');
    }
  }

  Future<void> loadMore() async {
    if (state.page >= state.totalPages || state.isLoading) return;
    state = state.copyWith(page: state.page + 1);
    await loadDeals(category: state.category);
  }

  void setCategory(String? category) {
    loadDeals(category: category, refresh: true);
  }
}

final dealsProvider = NotifierProvider<DealsNotifier, DealsState>(
  DealsNotifier.new,
);
