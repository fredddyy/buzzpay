import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../core/theme/colors.dart';
import '../../models/deal.dart';
import '../../providers/api_provider.dart';

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final _controller = TextEditingController();
  final _focusNode = FocusNode();
  List<Deal> _results = [];
  bool _loading = false;
  bool _searched = false;

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  Future<void> _search(String query) async {
    if (query.trim().isEmpty) {
      setState(() { _results = []; _searched = false; });
      return;
    }
    setState(() => _loading = true);
    try {
      final api = ref.read(apiClientProvider);
      final response = await api.get('/deals', queryParams: {'search': query.trim(), 'limit': 20});
      final data = response.data['data'];
      final deals = (data['deals'] as List).map((d) => Deal.fromJson(d)).toList();
      setState(() { _results = deals; _searched = true; _loading = false; });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Search bar
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
              child: TextField(
                controller: _controller,
                focusNode: _focusNode,
                onChanged: (v) {
                  if (v.length >= 2) _search(v);
                  if (v.isEmpty) setState(() { _results = []; _searched = false; });
                },
                onSubmitted: _search,
                decoration: InputDecoration(
                  hintText: 'Search deals, vendors...',
                  hintStyle: TextStyle(color: AppColors.textTertiary, fontSize: 14),
                  prefixIcon: const Icon(Icons.search, color: AppColors.textTertiary),
                  suffixIcon: _controller.text.isNotEmpty
                    ? IconButton(icon: const Icon(Icons.close, size: 20),
                        onPressed: () { _controller.clear(); setState(() { _results = []; _searched = false; }); })
                    : null,
                  filled: true,
                  fillColor: AppColors.card,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: AppColors.border)),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: AppColors.border.withValues(alpha: 0.4))),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.primary)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                ),
              ),
            ),

            // Content
            Expanded(
              child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _searched && _results.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.search_off, size: 48, color: AppColors.textTertiary),
                          const SizedBox(height: 12),
                          const Text('No results found', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                          const SizedBox(height: 4),
                          Text('Try a different search', style: TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                        ],
                      ),
                    )
                  : _searched
                    ? ListView.separated(
                        padding: const EdgeInsets.fromLTRB(20, 0, 20, 100),
                        itemCount: _results.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (context, index) {
                          final deal = _results[index];
                          return GestureDetector(
                            onTap: () => context.push('/deal/${deal.id}'),
                            child: Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: AppColors.card,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: AppColors.border.withValues(alpha: 0.3)),
                              ),
                              child: Row(
                                children: [
                                  ClipRRect(
                                    borderRadius: BorderRadius.circular(10),
                                    child: SizedBox(
                                      width: 52, height: 52,
                                      child: deal.imageUrl != null
                                        ? CachedNetworkImage(imageUrl: deal.imageUrl!, fit: BoxFit.cover)
                                        : Container(color: AppColors.border, child: const Icon(Icons.fastfood, size: 24, color: AppColors.textTertiary)),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(deal.title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600), maxLines: 1, overflow: TextOverflow.ellipsis),
                                        const SizedBox(height: 2),
                                        Text(deal.vendorName, style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                                      ],
                                    ),
                                  ),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Text(deal.formattedStudentPrice, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.primary)),
                                      Text(deal.formattedOriginalPrice, style: TextStyle(fontSize: 11, color: AppColors.textTertiary, decoration: TextDecoration.lineThrough)),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      )
                    // Default: popular searches
                    : Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Popular searches', style: Theme.of(context).textTheme.titleMedium),
                            const SizedBox(height: 12),
                            Wrap(
                              spacing: 8, runSpacing: 8,
                              children: ['Shawarma', 'Jollof Rice', 'Coffee', 'Smoothie', 'Data Bundle', 'Game Pass']
                                .map((s) => GestureDetector(
                                  onTap: () { _controller.text = s; _search(s); },
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                    decoration: BoxDecoration(
                                      color: AppColors.card,
                                      borderRadius: BorderRadius.circular(20),
                                      border: Border.all(color: AppColors.border.withValues(alpha: 0.4)),
                                    ),
                                    child: Text(s, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                                  ),
                                )).toList(),
                            ),
                          ],
                        ),
                      ),
            ),
          ],
        ),
      ),
    );
  }
}
