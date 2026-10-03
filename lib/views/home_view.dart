import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Tab 0: 首頁探索 (HomeView) - 校慶大輪播、即時最新消息、規範捷徑
class HomeView extends StatelessWidget {
  final VoidCallback onNavigateToShop;

  const HomeView({super.key, required this.onNavigateToShop});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('智光商工 115 週年校慶 ‧ 探索'),
        actions: [
          IconButton(
            icon: const Text('🔔', style: TextStyle(fontSize: 20)),
            onPressed: () {},
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. 主視覺 Hero 輪播卡片
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFFFF1F2), Color(0xFFFEF3C7), Color(0xFFEDF5FF)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: AppTheme.borderPastel, width: 1.5),
                boxShadow: AppTheme.softShadow,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: const Text(
                      '✨ 115th Anniversary Special Edition',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.accentRose,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    '專屬紀念，一鍵客製珍藏',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                      color: AppTheme.textDark,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    '【校慶限定客製預購】本商城為校慶紀念限定預購，客製化商品將於校慶前統一製作完畢，請於校慶當日憑第一聯單據至現場專屬攤位取貨。',
                    style: TextStyle(fontSize: 13, color: AppTheme.textMuted, height: 1.6),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: onNavigateToShop,
                    child: const Text('🛍️ 前往校慶商城選購 ➔'),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // 2. 最新公告專區 (重要公告 / 優惠活動)
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  '📢 最新消息與活動快訊',
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900),
                ),
                TextButton(
                  onPressed: () {},
                  child: const Text('查看全部', style: TextStyle(color: AppTheme.primaryPink)),
                ),
              ],
            ),
            const SizedBox(height: 8),

            _buildNewsCard(
              tag: '重要公告',
              tagColor: Colors.rose,
              date: '2026-10-01',
              title: '🎉 115校慶園遊會客製專案預購正式開跑！',
              content: '引進專業熱轉印與高解析噴繪技術，支援帆布袋、保溫杯、胸章等，歡迎全校師生選購！',
            ),
            const SizedBox(height: 12),
            _buildNewsCard(
              tag: '優惠活動',
              tagColor: Colors.orange,
              date: '2026-10-02',
              title: '💡 零基礎設計！使用 AI 咒語一鍵生成專屬紀念商品圖檔',
              content: '提供日系、毛線、幾何等風格模板，3分鐘輕鬆完成獨一無二的客製化設計。',
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNewsCard({
    required String tag,
    required MaterialColor tagColor,
    required String date,
    required String title,
    required String content,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFF1F5F9)),
        boxShadow: AppTheme.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: tagColor.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  tag,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: tagColor.shade700,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(date, style: const TextStyle(fontSize: 12, color: AppTheme.textMuted)),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            title,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppTheme.textDark),
          ),
          const SizedBox(height: 4),
          Text(
            content,
            style: const TextStyle(fontSize: 13, color: AppTheme.textMuted, height: 1.5),
          ),
        ],
      ),
    );
  }
}
