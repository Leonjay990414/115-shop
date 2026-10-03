import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../theme/app_theme.dart';

/// Tab 3: 會員與進度 (ProfileView) - 班級學號認證、個人訂單進度條、現場取貨 QR Code 憑證
class ProfileView extends StatefulWidget {
  const ProfileView({super.key});

  @override
  State<ProfileView> createState() => _ProfileViewState();
}

class _ProfileViewState extends State<ProfileView> {
  final _searchIdController = TextEditingController(text: '113001');
  String _activeSearchId = '113001';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('👤 會員中心與取貨進度'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 會員個人資訊卡片
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFFFF0F3), Color(0xFFEDF5FF)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppTheme.borderPastel),
                boxShadow: AppTheme.cardShadow,
              ),
              child: Row(
                children: [
                  Container(
                    width: 54,
                    height: 54,
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                    ),
                    child: const Center(
                      child: Text('🎓', style: TextStyle(fontSize: 26)),
                    ),
                  ),
                  const SizedBox(width: 14),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '王小明 同學',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: AppTheme.textDark),
                        ),
                        SizedBox(height: 2),
                        Text(
                          '智光商工 ‧ 資處二仁 (15號)',
                          style: TextStyle(fontSize: 12, color: AppTheme.textMuted),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981).withOpacity(0.15),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: const Text(
                      '已認證',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF059669)),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // 學號查詢條
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchIdController,
                    decoration: const InputDecoration(
                      hintText: '輸入學號或帳號查詢訂單',
                      isDense: true,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: () {
                    setState(() => _activeSearchId = _searchIdController.text.trim());
                  },
                  child: const Text('查詢'),
                ),
              ],
            ),

            const SizedBox(height: 20),
            const Text('📋 我的客製訂單進度與取貨憑證', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
            const SizedBox(height: 12),

            // 實時訂單串流看板 (或展示示範卡)
            _buildOrderProgressCard(
              orderId: '#ZG115-2026-8899',
              productName: '304不銹鋼雷雕保溫杯',
              statusStep: 2, // 0: 待審核, 1: 圖審通過, 2: 製作中, 3: 可取件
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOrderProgressCard({
    required String orderId,
    required String productName,
    required int statusStep,
  }) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFF1F5F9)),
        boxShadow: AppTheme.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(orderId, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: AppTheme.accentRose)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppTheme.primaryPink.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Text('正在雷雕製作中', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.primaryPink)),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text('品項：$productName', style: const TextStyle(fontSize: 13, color: AppTheme.textMuted)),

          const SizedBox(height: 16),

          // 三軌進度條指示
          Row(
            children: [
              _buildStepIndicator('圖審通過', isActive: statusStep >= 1),
              _buildStepLine(isActive: statusStep >= 2),
              _buildStepIndicator('排單製作', isActive: statusStep >= 2),
              _buildStepLine(isActive: statusStep >= 3),
              _buildStepIndicator('現場取件', isActive: statusStep >= 3),
            ],
          ),

          const SizedBox(height: 20),

          // 現場取貨 QR Code 憑證
          Center(
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppTheme.borderPastel, width: 1.5),
                  ),
                  child: QrImageView(
                    data: orderId,
                    version: QrVersions.auto,
                    size: 140.0,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  '🎟️ 校慶當天至專屬攤位出示 QR Code 即可領取',
                  style: TextStyle(fontSize: 11, color: AppTheme.textMuted, fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStepIndicator(String label, {required bool isActive}) {
    return Column(
      children: [
        Container(
          width: 22,
          height: 22,
          decoration: BoxDecoration(
            color: isActive ? AppTheme.primaryPink : const Color(0xFFE2E8F0),
            shape: BoxShape.circle,
          ),
          child: Center(
            child: Icon(
              Icons.check,
              size: 14,
              color: isActive ? Colors.white : const Color(0xFF94A3B8),
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 10,
            fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
            color: isActive ? AppTheme.textDark : AppTheme.textMuted,
          ),
        ),
      ],
    );
  }

  Widget _buildStepLine({required bool isActive}) {
    return Expanded(
      child: Container(
        height: 2,
        margin: const EdgeInsets.only(bottom: 16),
        color: isActive ? AppTheme.primaryPink : const Color(0xFFE2E8F0),
      ),
    );
  }
}
