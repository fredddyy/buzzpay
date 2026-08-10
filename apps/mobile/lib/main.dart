import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'core/theme/app_theme.dart';
import 'core/router/app_router.dart';
import 'core/mock_data.dart';
import 'core/services/push_service.dart';
import 'core/services/supabase_client.dart';
import 'providers/cart_provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Firebase first — required before anything else
  await Firebase.initializeApp();

  // Clear stale voucher cache on fresh start
  final prefs = await SharedPreferences.getInstance();
  await prefs.remove('cached_vouchers');
  await prefs.remove('cached_vouchers_at');

  // Initialize push notifications (non-blocking)
  try {
    await PushService().initialize();
  } catch (_) {}

  if (!useMockData && SupabaseConfig.isConfigured) {
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
    // Load cart from storage on first build
    ref.read(cartProvider.notifier).loadFromStorage();
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'BuzzPay',
      theme: AppTheme.light,
      routerConfig: router,
      debugShowCheckedModeBanner: false,
    );
  }
}
