import 'package:flutter/material.dart';
import 'theme/app_theme.dart';
import 'widgets/bottom_nav_bar.dart';
import 'services/update_service.dart';
import 'views/home_view.dart';
import 'views/shop_view.dart';
import 'views/cart_view.dart';
import 'views/profile_view.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ZhiguangApp());
}

class ZhiguangApp extends StatelessWidget {
  const ZhiguangApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '智光商工 115校慶園遊會',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: const MainNavigationShell(),
    );
  }
}

class MainNavigationShell extends StatefulWidget {
  const MainNavigationShell({super.key});

  @override
  State<MainNavigationShell> createState() => _MainNavigationShellState();
}

class _MainNavigationShellState extends State<MainNavigationShell> {
  int _currentIndex = 0;
  final List<CartItemModel> _cartItems = [];

  @override
  void initState() {
    super.initState();
    // 啟動時自動比對 Firestore app_version 檢查新版 APK
    WidgetsBinding.instance.addPostFrameCallback((_) {
      UpdateService.checkForUpdates(context);
    });
  }

  void _handleAddToCart(ProductModel product, int quantity, String engravingText) {
    setState(() {
      final existingIndex = _cartItems.indexWhere(
        (item) => item.product.code == product.code && item.engravingText == engravingText,
      );
      if (existingIndex >= 0) {
        _cartItems[existingIndex].quantity += quantity;
      } else {
        _cartItems.add(
          CartItemModel(
            product: product,
            quantity: quantity,
            engravingText: engravingText,
          ),
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final views = [
      HomeView(onNavigateToShop: () => setState(() => _currentIndex = 1)),
      ShopView(onAddToCart: _handleAddToCart),
      CartView(
        cartItems: _cartItems,
        onOrderSuccess: () => setState(() => _currentIndex = 3),
      ),
      const ProfileView(),
    ];

    return Scaffold(
      body: views[_currentIndex],
      bottomNavigationBar: FloatingCapsuleNavBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
      ),
    );
  }
}
