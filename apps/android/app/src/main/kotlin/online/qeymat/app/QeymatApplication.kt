package online.qeymat.app

import android.app.Application
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import online.qeymat.app.notifications.AlertNotifier
import online.qeymat.app.notifications.AlertScheduler
import online.qeymat.core.data.AccountRepository
import online.qeymat.core.data.MarketRepository
import online.qeymat.core.data.SessionStore
import online.qeymat.core.data.dataModule
import online.qeymat.feature.alerts.alertsModule
import online.qeymat.feature.convert.convertModule
import online.qeymat.feature.prices.pricesModule
import online.qeymat.feature.settings.settingsModule
import online.qeymat.widget.WidgetScheduler
import org.koin.android.ext.android.get
import org.koin.android.ext.koin.androidContext
import org.koin.core.context.startKoin

/**
 * نقطه‌ی شروع اپ: ساخت گراف وابستگی، بارگذاری نشست ذخیره‌شده و
 * زمان‌بندی کارهای پس‌زمینه (به‌روزرسانی ویجت‌ها و بررسی هشدارها).
 *
 * معماری ماژول‌ها:
 *   core:model       مدل‌های API و قالب‌بندی فارسی/شمسی (Kotlin خالص)
 *   core:network     Retrofit + OkHttp
 *   core:data        مخزن‌ها، DataStore، کش اسنپ‌شات
 *   core:designsystem تم، فونت، آیکون و اجزای مشترک Compose
 *   feature:*        هر صفحه با ViewModel خودش
 *   widget           ویجت‌های صفحه‌ی اصلی با Glance
 */
open class QeymatApplication : Application() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    override fun onCreate() {
        super.onCreate()

        startKoin {
            androidContext(this@QeymatApplication)
            modules(
                dataModule(clientTag = "android/${BuildConfig.VERSION_NAME}", debug = BuildConfig.DEBUG),
                pricesModule,
                convertModule,
                alertsModule,
                settingsModule,
            )
        }

        AlertNotifier.createChannel(this)
        WidgetScheduler.schedule(this)
        AlertScheduler.schedule(this)

        scope.launch {
            get<MarketRepository>().loadCached()
            get<SessionStore>().load()
            get<AccountRepository>().refreshAccount()
        }
    }
}
