import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/colors.dart';

class AppShell extends StatelessWidget {
  final Widget child;

  const AppShell({super.key, required this.child});

  int _currentIndex(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    if (location == '/search') return 1;
    if (location == '/vouchers') return 2;
    if (location == '/profile') return 3;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final currentIndex = _currentIndex(context);
    final bottomPadding = MediaQuery.of(context).padding.bottom;

    return Scaffold(
      body: Stack(
        children: [
          // Page content
          child,

          // Floating nav bar
          Positioned(
            left: 20,
            right: 20,
            bottom: bottomPadding + 12,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(28),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
                child: Container(
                  height: 64,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.92),
                    borderRadius: BorderRadius.circular(28),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.6)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.08),
                        blurRadius: 24,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _navItem(
                        context: context, index: 0, current: currentIndex,
                        icon: const Icon(Icons.home_outlined, size: 22, color: AppColors.textTertiary),
                        activeIcon: const Icon(Icons.home_rounded, size: 22, color: AppColors.primary),
                        label: 'Home', route: '/',
                      ),
                      _navItem(
                        context: context, index: 1, current: currentIndex,
                        icon: const Icon(Icons.search_rounded, size: 22, color: AppColors.textTertiary),
                        activeIcon: const Icon(Icons.search_rounded, size: 22, color: AppColors.primary),
                        label: 'Search', route: '/search',
                      ),
                      _navItem(
                        context: context, index: 2, current: currentIndex,
                        icon: const Icon(Icons.confirmation_number_outlined, size: 22, color: AppColors.textTertiary),
                        activeIcon: const Icon(Icons.confirmation_number, size: 22, color: AppColors.primary),
                        label: 'Vouchers', route: '/vouchers',
                      ),
                      _navItem(
                        context: context, index: 3, current: currentIndex,
                        icon: const Icon(Icons.person_outline, size: 22, color: AppColors.textTertiary),
                        activeIcon: const Icon(Icons.person, size: 22, color: AppColors.primary),
                        label: 'Me', route: '/profile',
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _navItem({
    required BuildContext context,
    required int index,
    required int current,
    required Widget icon,
    required Widget activeIcon,
    required String label,
    required String route,
  }) {
    final isActive = index == current;

    return GestureDetector(
      onTap: () => context.go(route),
      behavior: HitTestBehavior.opaque,
      child: SizedBox(
        width: 72,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            isActive ? activeIcon : icon,
            const SizedBox(height: 4),
            if (isActive)
              Container(
                width: 5,
                height: 5,
                decoration: const BoxDecoration(
                  color: AppColors.primary,
                  shape: BoxShape.circle,
                ),
              )
            else
              Text(
                label,
                style: const TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w500,
                  color: AppColors.textTertiary,
                ),
              ),
          ],
        ),
      ),
    );
  }
}
