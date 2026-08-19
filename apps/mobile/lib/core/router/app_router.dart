import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../mock_data.dart';
import '../../providers/auth_provider.dart';
import '../../screens/onboarding/onboarding_screen.dart';
import '../../screens/auth/phone_screen.dart';
import '../../screens/auth/otp_screen.dart';
import '../../screens/auth/login_screen.dart';
import '../../screens/auth/signup_screen.dart';
import '../../screens/auth/verify_screen.dart';
import '../../screens/home/home_screen.dart';
import '../../screens/deals/deal_detail_screen.dart';
import '../../screens/deals/deals_explore_screen.dart';
import '../../screens/checkout/checkout_screen.dart';
import '../../screens/vouchers/voucher_detail_screen.dart';
import '../../screens/vouchers/vouchers_screen.dart';
import '../../screens/profile/profile_screen.dart';
import '../../screens/vendor/vendor_profile_screen.dart';
import '../../screens/vendor/pay_at_vendor_screen.dart';
import '../../screens/cart/cart_screen.dart';
import '../../screens/cart/cart_checkout_screen.dart';
import '../../screens/search/search_screen.dart';
import '../../screens/shell/app_shell.dart';

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) async {
      final loc = state.matchedLocation;
      final isOnboarding = loc == '/onboarding';

      final prefs = await SharedPreferences.getInstance();
      final onboardingDone = prefs.getBool('onboarding_done') ?? false;

      if (!onboardingDone && !isOnboarding) return '/onboarding';

      if (useMockData) return null;

      final authState = ref.read(authProvider);
      final hasTokens = prefs.getString('access_token') != null;
      final isAuth = authState.status == AuthStatus.authenticated || hasTokens;

      // Fetch profile if tokens exist but user data is missing
      if (hasTokens && authState.user == null) {
        ref.read(authProvider.notifier).fetchProfile();
      }
      final isAuthRoute = loc == '/login' || loc == '/signup' || loc == '/verify' || isOnboarding || loc == '/phone' || loc.startsWith('/otp');

      if (!isAuth && !isAuthRoute) return '/login';
      if (isAuth && isAuthRoute && loc != '/verify') return '/';
      return null;
    },
    routes: [
      // Onboarding
      GoRoute(
        path: '/onboarding',
        builder: (context, state) => const OnboardingScreen(),
      ),

      // Auth routes
      GoRoute(
        path: '/phone',
        builder: (context, state) => const PhoneScreen(),
      ),
      GoRoute(
        path: '/otp',
        builder: (context, state) {
          final extra = state.extra;
          if (extra is Map) {
            return OtpScreen(phoneNumber: extra['phone'] as String? ?? '', devOtp: extra['otp'] as String?);
          }
          return OtpScreen(phoneNumber: extra as String? ?? '');
        },
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/verify',
        builder: (context, state) => const VerifyScreen(),
      ),
      GoRoute(
        path: '/signup',
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>? ?? {};
          return SignupScreen(phone: extra['phone'] as String? ?? '');
        },
      ),

      // Main app shell with bottom nav
      ShellRoute(
        builder: (context, state, child) => AppShell(child: child),
        routes: [
          GoRoute(
            path: '/',
            builder: (context, state) => const HomeScreen(),
          ),
          GoRoute(
            path: '/search',
            builder: (context, state) => const SearchScreen(),
          ),
          GoRoute(
            path: '/vouchers',
            builder: (context, state) => const VouchersScreen(),
          ),
          GoRoute(
            path: '/profile',
            builder: (context, state) => const ProfileScreen(),
          ),
        ],
      ),

      // Detail routes (outside shell)
      GoRoute(
        path: '/explore',
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>? ?? {};
          return DealsExploreScreen(
            initialCategory: extra['category'] as String?,
            mode: extra['mode'] as String? ?? 'all',
          );
        },
      ),
      GoRoute(
        path: '/deal/:id',
        builder: (context, state) =>
            DealDetailScreen(dealId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/checkout/:dealId',
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>? ?? {};
          return CheckoutScreen(
            dealId: state.pathParameters['dealId']!,
            qty: extra['qty'] as int? ?? 1,
          );
        },
      ),
      GoRoute(
        path: '/vendor/:id',
        builder: (context, state) =>
            VendorProfileScreen(vendorId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/vendor/:id/pay',
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>? ?? {};
          return PayAtVendorScreen(
            vendorId: state.pathParameters['id']!,
            vendorName: extra['vendorName'] as String? ?? 'Vendor',
            discountPercent: (extra['discountPercent'] as num?)?.toDouble() ?? 0,
          );
        },
      ),
      GoRoute(
        path: '/voucher/:id',
        builder: (context, state) =>
            VoucherDetailScreen(voucherId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/cart',
        builder: (context, state) => const CartScreen(),
      ),
      GoRoute(
        path: '/cart/checkout/:vendorId',
        builder: (context, state) =>
            CartCheckoutScreen(vendorId: state.pathParameters['vendorId']!),
      ),
    ],
  );
});
