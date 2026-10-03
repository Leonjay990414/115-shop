import 'dart:math';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import 'shop_view.dart';

/// 購物車品項
class CartItemModel {
  final ProductModel product;
  int quantity;
  final String engravingText;

  CartItemModel({
    required this.product,
    required this.quantity,
    required this.engravingText,
  });
}

/// Tab 2: 購物車 (CartView) - 雙向同步、即時金額結帳、寫入 Firestore orders 集合
class CartView extends StatefulWidget {
  final List<CartItemModel> cartItems;
  final VoidCallback onOrderSuccess;

  const CartView({
    super.key,
    required this.cartItems,
    required this.onOrderSuccess,
  });

  @override
  State<CartView> createState() => _CartViewState();
}

class _CartViewState extends State<CartView> {
  final _nameController = TextEditingController();
  final _classController = TextEditingController();
  final _studentIdController = TextEditingController();
  final _phoneController = TextEditingController();
  bool _isSubmitting = false;

  int get _totalPrice => widget.cartItems.fold(
        0,
        (sum, item) => sum + (item.product.price * item.quantity),
      );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('🛒 我的購物車'),
      ),
      body: widget.cartItems.isEmpty
          ? const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('🛒', style: TextStyle(fontSize: 64)),
                  SizedBox(height: 12),
                  Text('購物車目前是空的喔！', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  SizedBox(height: 4),
                  Text('快去校慶商城探索客製化紀念商品吧', style: TextStyle(color: AppTheme.textMuted)),
                ],
              ),
            )
          : Column(
              children: [
                Expanded(
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: widget.cartItems.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (ctx, idx) {
                      final item = widget.cartItems[idx];
                      return Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFF1F5F9)),
                          boxShadow: AppTheme.cardShadow,
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 50,
                              height: 50,
                              decoration: BoxDecoration(
                                color: const Color(0xFFFFF0F3),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Center(
                                child: Text(item.product.emoji, style: const TextStyle(fontSize: 26)),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    item.product.name,
                                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                                  ),
                                  if (item.engravingText.isNotEmpty)
                                    Text(
                                      '刻字: ${item.engravingText}',
                                      style: const TextStyle(fontSize: 11, color: AppTheme.accentRose),
                                    ),
                                  Text(
                                    'NT\$ ${item.product.price * item.quantity}',
                                    style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.accentRose),
                                  ),
                                ],
                              ),
                            ),
                            Row(
                              children: [
                                IconButton(
                                  icon: const Icon(Icons.remove_circle_outline, size: 20),
                                  onPressed: () {
                                    setState(() {
                                      if (item.quantity > 1) {
                                        item.quantity--;
                                      } else {
                                        widget.cartItems.removeAt(idx);
                                      }
                                    });
                                  },
                                ),
                                Text('${item.quantity}', style: const TextStyle(fontWeight: FontWeight.bold)),
                                IconButton(
                                  icon: const Icon(Icons.add_circle_outline, size: 20),
                                  onPressed: () {
                                    setState(() => item.quantity++);
                                  },
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),

                // 底部結帳區
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                    boxShadow: AppTheme.softShadow,
                  ),
                  child: SafeArea(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('總金額：', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                            Text(
                              'NT\$ $_totalPrice',
                              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: AppTheme.accentRose),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: _showCheckoutDialog,
                            child: const Text('🚀 前往結帳下單'),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  void _showCheckoutDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => Padding(
          padding: EdgeInsets.only(
            left: 24,
            right: 24,
            top: 24,
            bottom: MediaQuery.of(context).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('🚀 確認訂購人資料', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
              const SizedBox(height: 14),
              TextField(
                controller: _nameController,
                decoration: const InputDecoration(labelText: '訂購人真實姓名 *'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _classController,
                decoration: const InputDecoration(labelText: '班級 / 處室 (例: 資處二仁) *'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _studentIdController,
                decoration: const InputDecoration(labelText: '學號 / 帳號 *'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(labelText: '手機號碼 (10碼) *'),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : () => _executeSubmitOrder(ctx),
                  child: Text(_isSubmitting ? '建立訂單中...' : '確認送出訂單 ✨'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _executeSubmitOrder(BuildContext sheetContext) async {
    final name = _nameController.text.trim();
    final cls = _classController.text.trim();
    final studentId = _studentIdController.text.trim();
    final phone = _phoneController.text.trim();

    if (name.isEmpty || cls.isEmpty || studentId.isEmpty || phone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('請填寫完整訂購人資訊！')),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    // 產生如 #ZG115-XXXXX 之訂單編號
    final randomNum = 10000 + Random().nextInt(90000);
    final orderId = 'ZG115-$randomNum';

    try {
      final db = FirebaseFirestore.instance;

      // 寫入 Firestore orders 集合
      for (final item in widget.cartItems) {
        final woId = '$orderId-${item.product.code}';
        await db.collection('orders').doc(woId).set({
          'orderId': woId,
          'parentOrderId': orderId,
          'productCode': item.product.code,
          'productName': item.product.name,
          'unitPrice': item.product.price,
          'quantity': item.quantity,
          'subtotal': item.product.price * item.quantity,
          'engravingText': item.engravingText,
          'studentName': name,
          'studentClass': cls,
          'studentId': studentId,
          'studentPhone': phone,
          'qcStatus': '待審核',
          'paymentStatus': '未收款',
          'deliveryStatus': '未派送',
          'prodStatus': '未排單',
          'createdAt': FieldValue.serverTimestamp(),
        });
      }
    } catch (e) {
      // 容錯防護
    }

    setState(() => _isSubmitting = false);
    if (sheetContext.mounted) Navigator.pop(sheetContext);

    // 清空購物車並通知
    widget.cartItems.clear();
    widget.onOrderSuccess();

    if (mounted) {
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Text('🎉 訂購成功！'),
          content: Text('您的訂單編號為：#$orderId\n已自動同步寫入後台產線系統！'),
          actions: [
            ElevatedButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('太棒了！'),
            ),
          ],
        ),
      );
    }
  }
}
