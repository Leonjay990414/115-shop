import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import '../theme/app_theme.dart';

/// 內建 APK 版本自動檢查與防呆更新服務
class UpdateService {
  /// 檢查版本並在發現新版時彈出更新對話框
  static Future<void> checkForUpdates(BuildContext context) async {
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      final currentBuildNumber = int.tryParse(packageInfo.buildNumber) ?? 1;

      // 讀取 Firestore app_version 節點
      final doc = await FirebaseFirestore.instance
          .collection('app_version')
          .doc('latest')
          .get();

      if (!doc.exists) return;

      final data = doc.data()!;
      final latestBuildNumber = data['latest_build_number'] as int? ?? 1;
      final latestVersionName = data['latest_version_name'] as String? ?? '1.0.1';
      final apkUrl = data['apk_download_url'] as String? ??
          'https://leonjay990414.github.io/115-shop/assets/downloads/zg115_shop.apk';
      final releaseNotes = data['release_notes'] as String? ??
          '修復了流暢度與即時通知，新增校慶客製化專屬體驗！';

      if (latestBuildNumber > currentBuildNumber) {
        if (context.mounted) {
          showDialog(
            context: context,
            barrierDismissible: false,
            builder: (ctx) => _buildUpdateDialog(
              ctx,
              version: latestVersionName,
              notes: releaseNotes,
              downloadUrl: apkUrl,
            ),
          );
        }
      }
    } catch (e) {
      // 容錯防護，不影響主頁面開啟
    }
  }

  static Widget _buildUpdateDialog(
    BuildContext context, {
    required String version,
    required String notes,
    required String downloadUrl,
  }) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      backgroundColor: Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.primaryPinkLight,
                shape: BoxShape.circle,
                border: Border.all(color: AppTheme.borderPastel, width: 1.5),
              ),
              child: const Text('✨', style: TextStyle(fontSize: 32)),
            ),
            const SizedBox(height: 16),
            const Text(
              '發現新版本 115 校慶 App！',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w900,
                color: AppTheme.textDark,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppTheme.primaryPink.withOpacity(0.15),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                'v$version 最新釋出',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  color: AppTheme.accentRose,
                ),
              ),
            ),
            const SizedBox(height: 14),
            Text(
              notes,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 13,
                color: AppTheme.textMuted,
                height: 1.6,
              ),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    style: OutlinedButton.styleFrom(
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(999),
                      ),
                      side: const BorderSide(color: Color(0xFFCBD5E1)),
                    ),
                    child: const Text(
                      '稍後提醒',
                      style: TextStyle(color: AppTheme.textMuted),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () async {
                      final uri = Uri.parse(downloadUrl);
                      if (await canLaunchUrl(uri)) {
                        await launchUrl(uri, mode: LaunchMode.externalApplication);
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryPink,
                      foregroundColor: Colors.white,
                      elevation: 4,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(999),
                      ),
                    ),
                    child: const Text(
                      '立即更新 🚀',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            )
          ],
        ),
      ),
    );
  }
}
