import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
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
import '../../screens/checkout/checkout_screen.dart';
import '../../screens/vouchers/voucher_detail_screen.dart';
import '../../screens/vouchers/vouchers_screen.dart';
import '../../screens/profile/profile_screen.dart';
import '../../screens/vendor/vendor_profile_screen.dart';
import '../../screens/shell/app_shell.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      if (useMockData) return null;
      final isAuth = authState.status == AuthStatus.authenticated;
      final loc = state.matchedLocation;
      final isAuthRoute = loc == '/login' || loc == '/signup' || loc == '/onboarding' || loc == '/phone' || loc.startsWith('/otp') || loc == '/verify';

      if (!isAuth && !isAuthRoute) return '/onboarding';
      if (isAuth && isAuthRoute) return '/';
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
        builder: (context, state) => const SignupScreen(),
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
        path: '/deal/:id',
        builder: (context, state) =>
            DealDetailScreen(dealId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/checkout/:dealId',
        builder: (context, state) =>
            CheckoutScreen(dealId: state.pathParameters['dealId']!),
      ),
      GoRoute(
        path: '/vendor/:id',
        builder: (context, state) =>
            VendorProfileScreen(vendorId: state.pathParameters['id']!),
      ),
    ],
  );
});
