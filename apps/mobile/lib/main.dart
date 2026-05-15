import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'core/theme/app_theme.dart';
import 'core/router/app_router.dart';
import 'core/services/supabase_client.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Clear stale voucher cache on fresh start
  final prefs = await SharedPreferences.getInstance();
  await prefs.remove('cached_vouchers');
  await prefs.remove('cached_vouchers_at');

  if (SupabaseConfig.isConfigured) {
    await Supabase.initialize(
      url: SupabaseConfig.url,
      anonKey: SupabaseConfig.anonKey,
    );
  }

  runApp(const ProviderScope(child: BuzzPayApp()));
}

class BuzzPayApp extends ConsumerWidget {
  const BuzzPayApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'BuzzPay',
      theme: AppTheme.light,
      routerConfig: router,
      debugShowCheckedModeBanner: false,
    );
  }
}
