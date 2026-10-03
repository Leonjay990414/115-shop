import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// 商品實體模型
class ProductModel {
  final String code;
  final String name;
  final String category;
  final int price;
  final String material;
  final String desc;
  final String specDetail;
  final String emoji;

  const ProductModel({
    required this.code,
    required this.name,
    required this.category,
    required this.price,
    required this.material,
    required this.desc,
    required this.specDetail,
    required this.emoji,
  });
}

/// Tab 1: 校慶商城 (ShopView) - 分類商品網格、詳情彈窗、客製刻字即時預覽
class ShopView extends StatefulWidget {
  final Function(ProductModel, int, String) onAddToCart;

  const ShopView({super.key, required this.onAddToCart});

  @override
  State<ShopView> createState() => _ShopViewState();
}

class _ShopViewState extends State<ShopView> {
  String _selectedCategory = 'all';

  final List<ProductModel> _products = const [
    ProductModel(
      code: 'BAG',
      name: '115校慶文青帆布袋',
      category: 'accessories',
      price: 220,
      material: '12安純棉加厚耐磨帆布',
      desc: '12安精梳純棉帆布，厚磅耐磨大容量，加寬肩背帶舒適減壓。',
      specDetail: '材質：12安純棉環保帆布 / 尺寸：寬36cm x 高40cm / 附內袋。',
      emoji: '👜',
    ),
    ProductModel(
      code: 'BTL',
      name: '304不銹鋼雷雕保溫杯',
      category: 'tableware',
      price: 280,
      material: 'SUS304食品級不鏽鋼',
      desc: '雙層真空長效保溫保冰，高精度精密雷射雕刻，不掉漆高質感。',
      specDetail: '容量：500ml / 保溫效果：6~12小時 / 工藝：精密雷雕客製。',
      emoji: '☕',
    ),
    ProductModel(
      code: 'BDG',
      name: '磨砂圓形校慶徽章',
      category: 'accessories',
      price: 40,
      material: '馬口鐵+細緻磨砂霧面保護膜',
      desc: '58mm 經典磨砂質感金屬別針胸章，防刮防水防反光。',
      specDetail: '規格：58mm 圓形 / 表面：細緻霧面磨砂膜 / 背面：安全別針。',
      emoji: '✨',
    ),
    ProductModel(
      code: 'KEY',
      name: '雙層高透明壓克力吊飾',
      category: 'accessories',
      price: 65,
      material: '進口高透光壓克力+金屬D字扣',
      desc: '雙層壓克力夾層印刷夾圖不掉漆，邊緣雷射平滑切割。',
      specDetail: '尺寸：約 60 x 60 mm / 厚度：4mm 雙層夾層。',
      emoji: '🔑',
    ),
    ProductModel(
      code: 'MUG',
      name: '客製陶瓷馬克杯',
      category: 'tableware',
      price: 150,
      material: '高溫強化白瓷',
      desc: '高溫白瓷熱轉印，全彩不掉色，附防撞紙盒。',
      specDetail: '容量：350ml / 印製：全彩昇華轉印 / 包裝：專屬防撞盒。',
      emoji: '🥛',
    ),
    ProductModel(
      code: 'CST',
      name: '客製吸水陶瓷杯墊',
      category: 'tableware',
      price: 60,
      material: '天然鶯歌吸水陶瓷+EVA防滑墊',
      desc: '天然鶯歌陶瓷吸水材質，底部EVA防滑墊。',
      specDetail: '直徑：110mm / 底部：EVA止滑墊 / 印刷：高彩UV噴印。',
      emoji: '🧊',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final filtered = _selectedCategory == 'all'
        ? _products
        : _products.where((p) => p.category == _selectedCategory).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('🛍️ 校慶紀念品商城'),
      ),
      body: Column(
        children: [
          // 分類篩選膠囊列
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                _buildCategoryPill('all', '🌟 全部商品'),
                const SizedBox(width: 8),
                _buildCategoryPill('tableware', '☕ 杯器餐具'),
                const SizedBox(width: 8),
                _buildCategoryPill('accessories', '✨ 經典配件'),
              ],
            ),
          ),

          // 商品雙欄網格
          Expanded(
            child: GridView.builder(
              padding: const EdgeInsets.all(16),
              gridDelegate: const GridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 14,
                mainAxisSpacing: 14,
                childAspectRatio: 0.72,
              ),
              itemCount: filtered.length,
              itemBuilder: (ctx, idx) {
                final prod = filtered[idx];
                return _buildProductCard(prod);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryPill(String catKey, String label) {
    final isSelected = _selectedCategory == catKey;
    return GestureDetector(
      onTap: () => setState(() => _selectedCategory = catKey),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primaryPink : Colors.white,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: isSelected ? AppTheme.primaryPink : const Color(0xFFCBD5E1),
          ),
          boxShadow: isSelected ? AppTheme.softShadow : null,
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
            color: isSelected ? Colors.white : const Color(0xFF475569),
          ),
        ),
      ),
    );
  }

  Widget _buildProductCard(ProductModel prod) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFF1F5F9), width: 1.2),
        boxShadow: AppTheme.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 頂部圖示或預覽框 (點擊開啟規格彈窗)
          GestureDetector(
            onTap: () => _showSpecModal(prod),
            child: Container(
              height: 110,
              width: double.infinity,
              decoration: const BoxDecoration(
                color: Color(0xFFFFF7F9),
                borderRadius: BorderRadius.vertical(top: Radius.circular(19)),
              ),
              child: Center(
                child: Text(prod.emoji, style: const TextStyle(fontSize: 48)),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(10.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  prod.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
                ),
                const SizedBox(height: 2),
                Text(
                  prod.material,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 10, color: AppTheme.textMuted),
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'NT\$ ${prod.price}',
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w900,
                        color: AppTheme.accentRose,
                      ),
                    ),
                    ElevatedButton(
                      onPressed: () => _showCustomizeSheet(prod),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      child: const Text('客製', style: TextStyle(fontSize: 11)),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// 商品規格詳情彈窗
  void _showSpecModal(ProductModel prod) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(prod.emoji, style: const TextStyle(fontSize: 36)),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(prod.name, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900)),
                      Text('NT\$ ${prod.price}', style: const TextStyle(color: AppTheme.accentRose, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
              ],
            ),
            const Divider(height: 24),
            Text('💎 工藝材質：${prod.material}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
            const SizedBox(height: 6),
            Text('📏 規格詳情：${prod.specDetail}', style: const TextStyle(fontSize: 13, color: AppTheme.textMuted)),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  _showCustomizeSheet(prod);
                },
                child: const Text('🎨 前往客製訂購'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// 客製選購抽屜 (即時文字預覽模擬與數量選擇)
  void _showCustomizeSheet(ProductModel prod) {
    int qty = 1;
    final textController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (context, setSheetState) => Padding(
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
              Text('${prod.name}・客製選購', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900)),
              const SizedBox(height: 12),

              // 即時雷雕刻字模擬
              const Text('✍️ 雷雕 / 印刷刻字內容 (即時預覽)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
              const SizedBox(height: 6),
              TextField(
                controller: textController,
                maxLength: 20,
                onChanged: (_) => setSheetState(() {}),
                decoration: const InputDecoration(
                  hintText: '例：115智光 ‧ 王小明 或 Happy 115th!',
                  isDense: true,
                ),
              ),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('刻字預覽效果：', style: TextStyle(fontSize: 12, color: AppTheme.textMuted)),
                    Text(
                      textController.text.isEmpty ? '（尚未輸入）' : '「${textController.text}」',
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: AppTheme.accentRose),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 14),

              // 數量選擇器
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('訂購數量：', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                  Row(
                    children: [
                      IconButton(
                        onPressed: qty > 1 ? () => setSheetState(() => qty--) : null,
                        icon: const Icon(Icons.remove_circle_outline),
                      ),
                      Text('$qty', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      IconButton(
                        onPressed: qty < 20 ? () => setSheetState(() => qty++) : null,
                        icon: const Icon(Icons.add_circle_outline),
                      ),
                    ],
                  ),
                ],
              ),

              const SizedBox(height: 16),

              // 小計與加車
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('小計：NT\$ ${prod.price * qty}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: AppTheme.accentRose)),
                  ElevatedButton(
                    onPressed: () {
                      widget.onAddToCart(prod, qty, textController.text.trim());
                      Navigator.pop(ctx);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('🎉 已將 ${prod.name} 加入購物車！'),
                          backgroundColor: AppTheme.primaryPink,
                        ),
                      );
                    },
                    child: const Text('➕ 加入購物車'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
