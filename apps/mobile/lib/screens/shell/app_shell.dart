import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/colors.dart';

class AppShell extends StatelessWidget {
  final Widget child;

  const AppShell({super.key, required this.child});

  int _currentIndex(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    if (location == '/vouchers') return 1;
    if (location == '/profile') return 2;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final currentIndex = _currentIndex(context);
    final bottomPadding = MediaQuery.of(context).padding.bottom;

    return Scaffold(
      body: child,
      extendBody: true,
      bottomNavigationBar: Padding(
        padding: EdgeInsets.fromLTRB(16, 0, 16, bottomPadding + 12),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(28),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
            child: Container(
              height: 64,
              decoration: BoxDecoration(
                color: AppColors.card.withValues(alpha: 0.85),
                borderRadius: BorderRadius.circular(28),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primary.withValues(alpha: 0.06),
                    blurRadius: 24,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _navItem(
                    context: context,
                    index: 0,
                    current: currentIndex,
                    icon: Image.asset('assets/icons/deals_outline.png', width: 22, height: 22),
                    activeIcon: Image.asset('assets/icons/deals_filled.png', width: 22, height: 22),
                    label: 'Deals',
                    route: '/',
                  ),
                  _navItem(
                    context: context,
                    index: 1,
                    current: currentIndex,
                    icon: Image.asset('assets/icons/ticket_outline.png', width: 22, height: 22),
                    activeIcon: Image.asset('assets/icons/ticket_filled.png', width: 22, height: 22),
                    label: 'Vouchers',
                    route: '/vouchers',
                  ),
                  _navItem(
                    context: context,
                    index: 2,
                    current: currentIndex,
                    icon: const Icon(Icons.person_outline, size: 22, color: AppColors.textTertiary),
                    activeIcon: const Icon(Icons.person, size: 22, color: AppColors.primary),
                    label: 'Profile',
                    route: '/profile',
                  ),
                ],
              ),
            ),
          ),
        ),
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
            // Dot indicator for active
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
