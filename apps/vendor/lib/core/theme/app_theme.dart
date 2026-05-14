import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'colors.dart';

class VTheme {
  VTheme._();

  static ThemeData get dark => ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: VColors.base,
        colorScheme: const ColorScheme.dark(
          primary: VColors.primary,
          surface: VColors.surface,
          error: VColors.error,
        ),
        textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme).copyWith(
          headlineLarge: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.w700, color: VColors.text),
          headlineMedium: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w600, color: VColors.text),
          titleLarge: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600, color: VColors.text),
          titleMedium: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: VColors.text),
          bodyLarge: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w400, color: VColors.text),
          bodyMedium: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w400, color: VColors.textSecondary),
          bodySmall: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w400, color: VColors.textMuted),
          labelLarge: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: VColors.text),
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: VColors.surface,
          foregroundColor: VColors.text,
          elevation: 0,
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: VColors.primary,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          ),
        ),
        bottomNavigationBarTheme: const BottomNavigationBarThemeData(
          backgroundColor: VColors.surface,
          selectedItemColor: VColors.primary,
          unselectedItemColor: VColors.textMuted,
        ),
      );
}
