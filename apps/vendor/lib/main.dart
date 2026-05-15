import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'core/theme/app_theme.dart';
import 'core/api_client.dart';
import 'core/supabase_config.dart';
import 'screens/scanner/scanner_screen.dart';
import 'screens/deals/vendor_deals_screen.dart';
import 'screens/payouts/payouts_screen.dart';
import 'screens/profile/vendor_profile_screen.dart';
import 'screens/auth/vendor_login_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);

  if (SupabaseConfig.isConfigured) {
    await Supabase.initialize(
      url: SupabaseConfig.url,
      anonKey: SupabaseConfig.anonKey,
    );
  }

  runApp(const ProviderScope(child: VendorApp()));
}

final _router = GoRouter(
  initialLocation: '/login',
  redirect: (context, state) async {
    final loggedIn = await VendorApiClient().hasTokens();
    final onLogin = state.matchedLocation == '/login';

    if (!loggedIn && !onLogin) return '/login';
    if (loggedIn && onLogin) return '/scanner';
    return null;
  },
  routes: [
    GoRoute(path: '/login', builder: (_, __) => const VendorLoginScreen()),
    ShellRoute(
      builder: (_, state, child) => _VendorShell(child: child),
      routes: [
        GoRoute(path: '/scanner', builder: (_, __) => const ScannerScreen()),
        GoRoute(path: '/deals', builder: (_, __) => const VendorDealsScreen()),
        GoRoute(path: '/payouts', builder: (_, __) => const PayoutsScreen()),
        GoRoute(path: '/profile', builder: (_, __) => const VendorProfileScreen()),
      ],
    ),
  ],
);

class VendorApp extends StatelessWidget {
  const VendorApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'BuzzPay Vendor',
      theme: VTheme.dark,
      routerConfig: _router,
      debugShowCheckedModeBanner: false,
    );
  }
}

class _VendorShell extends StatelessWidget {
  final Widget child;
  const _VendorShell({required this.child});

  @override
  Widget build(BuildContext context) {
    final loc = GoRouterState.of(context).matchedLocation;
    final idx = loc == '/deals' ? 1 : loc == '/payouts' ? 2 : loc == '/profile' ? 3 : 0;

    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: idx,
        onDestinationSelected: (i) {
          context.go(['/scanner', '/deals', '/payouts', '/profile'][i]);
        },
        height: 64,
        backgroundColor: const Color(0xFF161819),
        indicatorColor: const Color(0xFF6C4FFF).withValues(alpha: 0.12),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.qr_code_scanner), label: 'Scanner'),
          NavigationDestination(icon: Icon(Icons.restaurant_menu), label: 'Deals'),
          NavigationDestination(icon: Icon(Icons.account_balance_wallet), label: 'Payouts'),
          NavigationDestination(icon: Icon(Icons.person_outline), label: 'Profile'),
        ],
      ),
    );
  }
}
