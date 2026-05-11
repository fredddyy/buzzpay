import 'package:flutter/material.dart';
import 'colors.dart';

class AppShadows {
  AppShadows._();

  static List<BoxShadow> get soft => [
        BoxShadow(
          color: AppColors.shadow.withValues(alpha: 0.04),
          blurRadius: 8,
          offset: const Offset(0, 2),
        ),
      ];

  static List<BoxShadow> get medium => [
        BoxShadow(
          color: AppColors.shadow.withValues(alpha: 0.06),
          blurRadius: 12,
          offset: const Offset(0, 4),
        ),
      ];

  static List<BoxShadow> get card => [
        BoxShadow(
          color: AppColors.shadow.withValues(alpha: 0.04),
          blurRadius: 8,
          offset: const Offset(0, 2),
        ),
      ];

  static List<BoxShadow> get neumorphic => [
        BoxShadow(
          color: Colors.white.withValues(alpha: 0.8),
          blurRadius: 6,
          offset: const Offset(-2, -2),
        ),
        BoxShadow(
          color: AppColors.shadow.withValues(alpha: 0.05),
          blurRadius: 6,
          offset: const Offset(2, 2),
        ),
      ];
}
