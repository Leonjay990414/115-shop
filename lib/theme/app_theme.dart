import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// 智光商工 115 週年校慶 ‧ UI/UX Pro Max 淺色粉彩高質感主題系統
class AppTheme {
  // 核心粉彩調色盤
  static const Color primaryPink = Color(0xFFFF7597); // 櫻花柔粉
  static const Color primaryPinkLight = Color(0xFFFFF0F3);
  static const Color morningCream = Color(0xFFFFFDF9); // 晨曦奶油白 (背景)
  static const Color skyBlue = Color(0xFFEDF5FF); // 晴空淡藍 (副背景)
  static const Color mintGreen = Color(0xFFE6F9F0); // 薄荷粉綠 (成功)
  static const Color peachYellow = Color(0xFFFEF3C7); // 奶油蜜糖 (提醒)
  static const Color accentRose = Color(0xFFE11D48); // 重點紅
  static const Color textDark = Color(0xFF0F172A); // 墨黑主文字
  static const Color textMuted = Color(0xFF64748B); // 霧灰次要字
  static const Color borderPastel = Color(0xFFFECDD3); // 柔粉細框

  // 柔和微擴散陰影
  static List<BoxShadow> softShadow = [
    BoxShadow(
      color: primaryPink.withOpacity(0.08),
      blurRadius: 16,
      offset: const Offset(0, 4),
      spreadRadius: 2,
    ),
  ];

  static List<BoxShadow> cardShadow = [
    BoxShadow(
      color: Colors.black.withOpacity(0.04),
      blurRadius: 14,
      offset: const Offset(0, 4),
      spreadRadius: 1,
    ),
  ];

  static ThemeData get lightTheme {
    final textTheme = GoogleFonts.notoSansTcTextTheme();

    return ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: morningCream,
      colorScheme: ColorScheme.light(
        primary: primaryPink,
        secondary: accentRose,
        surface: Colors.white,
        background: morningCream,
        error: const Color(0xFFEF4444),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: morningCream.withOpacity(0.95),
        elevation: 0,
        centerTitle: true,
        scrolledUnderElevation: 0,
        titleTextStyle: GoogleFonts.zenMaruGothic(
          color: textDark,
          fontSize: 18,
          fontWeight: FontWeight.w900,
        ),
        iconTheme: const IconThemeData(color: textDark),
      ),
      cardTheme: CardTheme(
        color: Colors.white,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0xFFF1F5F9), width: 1.2),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryPink,
          foregroundColor: Colors.white,
          elevation: 2,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(999),
          ),
          textStyle: GoogleFonts.notoSansTc(
            fontSize: 14,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFFF8FAFC),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: primaryPink, width: 1.8),
        ),
      ),
      textTheme: textTheme.copyWith(
        titleLarge: GoogleFonts.zenMaruGothic(
          fontSize: 22,
          fontWeight: FontWeight.w900,
          color: textDark,
        ),
        titleMedium: GoogleFonts.zenMaruGothic(
          fontSize: 16,
          fontWeight: FontWeight.w800,
          color: textDark,
        ),
        bodyMedium: GoogleFonts.notoSansTc(
          fontSize: 14,
          color: textDark,
        ),
        bodySmall: GoogleFonts.notoSansTc(
          fontSize: 12,
          color: textMuted,
        ),
      ),
    );
  }
}
