# 智光商工 115 週年校慶 ‧ 原生 Flutter Android 前台 App 架構與規格書
> **Zhiguang 115th Anniversary - Official Flutter Mobile Application (zhiguang_app)**

---

## 壹、 App 專案核心設定與套件依賴 (pubspec.yaml)

```yaml
name: zhiguang_app
description: "智光商工 115週年校慶園遊會 - 官方客製化紀念品原生 Android App"
publish_to: "none"
version: 1.0.0+1

environment:
  sdk: ">=3.3.0 <4.0.0"

dependencies:
  flutter:
    sdk: flutter

  # 狀態管理與路由
  provider: ^6.1.2
  flutter_hooks: ^0.20.5

  # UI / UX Pro Max 視覺動效與字體
  google_fonts: ^6.2.1
  flutter_animate: ^4.5.0
  carousel_slider: ^5.0.0
  cached_network_image: ^3.3.1
  qr_flutter: ^4.1.0
  mobile_scanner: ^5.1.1

  # 音效與推播提醒
  audioplayers: ^6.0.0
  flutter_local_notifications: ^17.1.2

  # Firebase 核心連動
  firebase_core: ^2.30.1
  cloud_firestore: ^4.17.2
  firebase_auth: ^4.19.4

  # 網絡與應用更新
  http: ^1.2.1
  url_launcher: ^6.2.6
  package_info_plus: ^8.0.0
  open_file: ^3.3.2
  path_provider: ^2.1.3
  shared_preferences: ^2.2.3

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0

flutter:
  uses-material-design: true
  assets:
    - assets/images/
    - assets/sounds/
```

---

## 貳、 底部導航選單 (Bottom Navigation Bar) 架構

採用 **柔和粉彩與懸浮膠囊造型 (Floating Capsule Glassmorphism)**，包含四個核心分頁：

```text
┌─────────────────────────────────────────────────────────────┐
│                       手機螢幕主視圖                         │
├─────────────────────────────────────────────────────────────┤
│  [分頁 1] 首頁探索 (Explore)                                │
│   - 校慶 115 主視覺 Banner 大輪播                           │
│   - 即時最新消息卡片 (重要公告 / 優惠活動)                  │
│   - 快速捷徑：AI 生圖教學、取件規範須知                      │
├─────────────────────────────────────────────────────────────┤
│  [分頁 2] 校慶商城 (Storefront)                             │
│   - 商品分類篩選 (全部 / 杯器餐具 / 經典配件 / 文具 / 印刷) │
│   - 帆布袋、雷雕保溫杯、校慶徽章、壓克力吊飾等展示          │
│   - 多角度圖文工藝介紹、1080P 自訂圖檔即時預覽              │
├─────────────────────────────────────────────────────────────┤
│  [分頁 3] 購物袋 / 進度 (Cart & Checkout)                   │
│   - 跨平台雙向同步購物車清單                                │
│   - 即時數量增減、小計與總額計算 (tabular-nums)             │
│   - 一鍵開啟結帳抽屜（自動帶入班級學號）                    │
├─────────────────────────────────────────────────────────────┤
│  [分頁 4] 會員中心 (Member Profile)                         │
│   - 班級、學號、座號認證與唯讀安全防護                      │
│   - 我的客製訂單三軌看板（美術審核 ➔ 財務收款 ➔ 物流派送）   │
│   - 專屬快速領取 QR Code 憑證                               │
├─────────────────────────────────────────────────────────────┤
│   ╭─────────────────────────────────────────────────────╮   │
│   │  (🏠 首頁)    (🛍️ 商城)    (🛒 購物袋)    (👤 會員)   │   │
│   ╰─────────────────────────────────────────────────────╯   │
│                 [ 懸浮粉彩膠囊 BottomNavBar ]               │
└─────────────────────────────────────────────────────────────┘
```

---

## 參、 鈴聲與推播通知矩陣 (Sound & Push Milestone Matrix)

針對學生與家長最關心的金流與取件里程碑，精準配置音效，嚴禁無意義氾濫打擾：

| 事件里程碑 | 鈴聲檔案 | 鈴聲聽覺特徵 | 觸發時機與文案示範 |
| :--- | :--- | :--- | :--- |
| **① 核帳完成通知** | `coin_cash.mp3` | **清脆俐落金幣聲**（叮鈴♪） | 後台帳務組確認款項收訖核銷：<br>「💵 您的訂單已確認核帳，即將進入客製排程！」 |
| **②-A 客製圖檔審核合格** | `bell_success.mp3` | **輕快愉悅提醒短音**（叮咚～） | 美術組核驗 1080P 高清通過：<br>「✅ 您的雷雕/印刷圖檔審核合格，開始製作！」 |
| **②-B 客製圖檔退件提醒** | `alert_warning.mp3` | **柔和雙音警示音**（咚咚！） | 圖檔解析度不足或爭議：<br>「⚠️ 圖檔解析度不足，請點擊重新上傳！」 |
| **③ 紀念品製作完成可領取** | `fanfare_pickup.mp3` | **歡慶校慶專屬小喇叭音**（噠噠噠～鏘♪） | 產線工單標註完成並送達攤位：<br>「🎉 您的 115 校慶紀念品已包裝完畢，請憑 App 條碼至指定攤位領取！」 |
| **④ 校慶重要快訊發布** | `notice_chime.mp3` | **溫潤木琴叮咚聲** | 當日限量徽章加開或動線調整：<br>「📢 園遊會即時通知：限量雷雕保溫杯最後名額加開中！」 |

### 音效播放服務代碼範例 (`services/audio_notification_service.dart`)
```dart
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

enum NotificationMilestone {
  paymentConfirmed,
  qcApproved,
  qcRejected,
  productReadyForPickup,
  importantBroadcast,
}

class AudioNotificationService {
  static final AudioPlayer _player = AudioPlayer();
  static final FlutterLocalNotificationsPlugin _notificationsPlugin = FlutterLocalNotificationsPlugin();

  static Future<void> triggerMilestone(NotificationMilestone milestone, {required String title, required String body}) async {
    String soundAsset = '';
    switch (milestone) {
      case NotificationMilestone.paymentConfirmed:
        soundAsset = 'sounds/coin_cash.mp3';
        break;
      case NotificationMilestone.qcApproved:
        soundAsset = 'sounds/bell_success.mp3';
        break;
      case NotificationMilestone.qcRejected:
        soundAsset = 'sounds/alert_warning.mp3';
        break;
      case NotificationMilestone.productReadyForPickup:
        soundAsset = 'sounds/fanfare_pickup.mp3';
        break;
      case NotificationMilestone.importantBroadcast:
        soundAsset = 'sounds/notice_chime.mp3';
        break;
    }

    // 1. 播放輕量專屬音效
    await _player.play(AssetSource(soundAsset));

    // 2. 顯示系統頂部粉彩推播
    await _showLocalNotification(title: title, body: body);
  }

  static Future<void> _showLocalNotification({required String title, required String body}) async {
    const androidDetails = AndroidNotificationDetails(
      'zg115_milestone_channel',
      '校慶工單進度通知',
      channelDescription: '校慶紀念品核帳、審查與完工取件推播',
      importance: Importance.max,
      priority: Priority.high,
    );
    await _notificationsPlugin.show(
      DateTime.now().millisecond,
      title,
      body,
      const NotificationDetails(android: androidDetails),
    );
  }
}
```

---

## 肆、 內建 APK 版本自動檢查更新防呆 (In-App Update)

App 每次於啟動頁面或前景喚醒時，自動連線 Firebase 的 `app_version` 即時節點：

```text
Firebase Database / Firestore:
app_version: {
  latest_version_code: 102,
  latest_version_name: "1.0.2",
  apk_download_url: "https://leonjay990414.github.io/115-shop/assets/downloads/zg115_shop.apk",
  release_notes: "修復了購物車跨頁同步流暢度，新增客製完工取貨推播鈴聲！",
  is_force_update: false
}
```

### 可愛粉彩更新對話框設計 (`widgets/app_update_dialog.dart`)
```dart
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class AppUpdateDialog extends StatelessWidget {
  final String newVersion;
  final String releaseNotes;
  final String apkUrl;

  const AppUpdateDialog({
    super.key,
    required this.newVersion,
    required this.releaseNotes,
    required this.apkUrl,
  });

  @override
  Widget build(BuildContext context) {
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
                color: const Color(0xFFFFF1F2),
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFFFECDD3), width: 1.5),
              ),
              child: const Text('✨', style: TextStyle(fontSize: 32)),
            ),
            const SizedBox(height: 16),
            const Text(
              '發現新版本 115 校慶 App！',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFFF7597).withOpacity(0.15),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                'v$newVersion 最新發布',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFFFF7597)),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              releaseNotes,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13, color: Color(0xFF475569), height: 1.5),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    style: OutlinedButton.styleFrom(
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                      side: const BorderSide(color: Color(0xFFCBD5E1)),
                    ),
                    child: const Text('稍後再說', style: TextStyle(color: Color(0xFF64748B))),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () async {
                      final uri = Uri.parse(apkUrl);
                      if (await canLaunchUrl(uri)) {
                        await launchUrl(uri, mode: LaunchMode.externalApplication);
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFFF7597),
                      foregroundColor: Colors.white,
                      elevation: 4,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                    ),
                    child: const Text('立即更新 🚀', style: TextStyle(fontWeight: FontWeight.bold)),
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
```
