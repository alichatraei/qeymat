package online.qeymat.app

import androidx.work.Configuration
import androidx.work.WorkManager

/** Robolectric ارائه‌دهنده‌ی androidx.startup را اجرا نمی‌کند؛ WorkManager را خودمان راه می‌اندازیم */
class TestQeymatApplication : QeymatApplication() {
    override fun onCreate() {
        WorkManager.initialize(this, Configuration.Builder().build())
        super.onCreate()
    }
}
