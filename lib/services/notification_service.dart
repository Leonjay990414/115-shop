import 'package:audioplayers/audioplayers.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// 重要事件通知里程碑列舉
enum AppMilestone {
  paymentConfirmed,     // 核帳完成 (輕脆金幣聲)
  qcApproved,           // 圖審合格 (柔和叮咚)
  qcRejected,           // 圖審退件 (雙音提醒)
  productReadyForPickup,// 製作完成可領取 (校慶歡慶專屬鈴聲)
  importantBroadcast,   // 緊急最新快訊 (柔和廣播提示音)
}

/// 音效與推播通知服務模組
class NotificationService {
  static final AudioPlayer _audioPlayer = AudioPlayer();
  static final FlutterLocalNotificationsPlugin _notificationsPlugin =
      FlutterLocalNotificationsPlugin();

  static bool _isInitialized = false;

  /// 初始化推播通道
  static Future<void> initialize() async {
    if (_isInitialized) return;

    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const initSettings = InitializationSettings(android: androidSettings);

    await _notificationsPlugin.initialize(initSettings);
    _isInitialized = true;
  }

  /// 觸發重要里程碑事件（同時播放專屬鈴聲與彈出推播）
  static Future<void> triggerMilestone(
    AppMilestone milestone, {
    required String title,
    required String body,
  }) async {
    await initialize();

    // 1. 依事件挑選鈴聲資源檔
    String soundFile = '';
    switch (milestone) {
      case AppMilestone.paymentConfirmed:
        soundFile = 'sounds/coin_cash.mp3';
        break;
      case AppMilestone.qcApproved:
        soundFile = 'sounds/bell_success.mp3';
        break;
      case AppMilestone.qcRejected:
        soundFile = 'sounds/alert_warning.mp3';
        break;
      case AppMilestone.productReadyForPickup:
        soundFile = 'sounds/fanfare_pickup.mp3';
        break;
      case AppMilestone.importantBroadcast:
        soundFile = 'sounds/notice_chime.mp3';
        break;
    }

    // 播放輕量音效 (若設備支援)
    try {
      await _audioPlayer.play(AssetSource(soundFile));
    } catch (e) {
      // 容錯防護：即使音訊檔案未就緒也不中斷 UI
    }

    // 2. 發送本機推播通知
    const androidDetails = AndroidNotificationDetails(
      'zg115_milestone_channel',
      '115校慶訂單進度通知',
      channelDescription: '包含核帳、審查、完工取貨動態通知',
      importance: Importance.max,
      priority: Priority.high,
      icon: '@mipmap/ic_launcher',
    );

    const notificationDetails = NotificationDetails(android: androidDetails);

    await _notificationsPlugin.show(
      DateTime.now().millisecond,
      title,
      body,
      notificationDetails,
    );
  }
}
