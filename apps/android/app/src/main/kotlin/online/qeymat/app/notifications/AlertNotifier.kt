package online.qeymat.app.notifications

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit
import online.qeymat.app.R
import online.qeymat.core.data.AccountRepository
import online.qeymat.core.data.SessionStore
import online.qeymat.core.data.SettingsStore
import online.qeymat.core.model.PriceAlert
import online.qeymat.core.model.format.Fa
import online.qeymat.core.model.format.Jalali
import org.koin.core.component.KoinComponent
import org.koin.core.component.inject

/**
 * اعلان هشدار قیمت روی اندروید.
 *
 * سرور خودش عبور قیمت از هدف را تشخیص می‌دهد (و برای مشترکان پلاس پیامک
 * می‌فرستد). اپ هر ۱۵ دقیقه هشدارهای اجراشده‌ی تازه را می‌گیرد و اعلان
 * نشان می‌دهد — بدون وابستگی به سرویس‌های گوگل که در ایران پایدار نیست.
 */
object AlertNotifier {
    private const val CHANNEL = "price_alerts"

    fun createChannel(context: Context) {
        if (Build.VERSION.SDK_INT < 26) return
        val channel = NotificationChannel(
            CHANNEL,
            context.getString(R.string.alerts_channel),
            NotificationManager.IMPORTANCE_HIGH,
        ).apply { description = context.getString(R.string.alerts_channel_description) }
        context.getSystemService(NotificationManager::class.java)?.createNotificationChannel(channel)
    }

    fun notify(context: Context, alert: PriceAlert) {
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) return

        val usd = alert.unit == "USD"
        val unit = Fa.unit(usd)
        val direction = if (alert.direction == "ABOVE") "بالاتر از" else "پایین‌تر از"
        val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
        val pending = launch?.let {
            PendingIntent.getActivity(
                context,
                alert.id.hashCode(),
                it,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
        }

        val notification = NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_qeymat)
            .setColor(0xFF58D6A4.toInt())
            .setContentTitle("${alert.nameFa} $direction ${Fa.price(alert.threshold, usd)} $unit")
            .setContentText(alert.current?.let { "قیمت فعلی ${Fa.price(it, usd)} $unit" } ?: "هشدار قیمت شما اجرا شد")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_RECOMMENDATION)
            .setAutoCancel(true)
            .apply { if (pending != null) setContentIntent(pending) }
            .build()

        runCatching { NotificationManagerCompat.from(context).notify(alert.id.hashCode(), notification) }
    }
}

object AlertScheduler {
    fun schedule(context: Context) {
        val request = PeriodicWorkRequestBuilder<AlertSyncWorker>(15, TimeUnit.MINUTES)
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .build()
        WorkManager.getInstance(context).enqueueUniquePeriodicWork("alert-sync", ExistingPeriodicWorkPolicy.KEEP, request)
    }
}

class AlertSyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params), KoinComponent {
    private val sessionStore: SessionStore by inject()
    private val account: AccountRepository by inject()
    private val settings: SettingsStore by inject()

    override suspend fun doWork(): Result {
        sessionStore.load() ?: return Result.success()
        if (!settings.current().notifications) return Result.success()

        val response = account.alerts().getOrElse { return Result.retry() }
        val fired = response.alerts.filter { it.firedAt != null }
        val seen = settings.seenAlerts()
        val cutoff = System.currentTimeMillis() - 2 * 24 * 60 * 60 * 1000L

        for (alert in fired) {
            if (alert.id in seen) continue
            val at = Jalali.parseIso(alert.firedAt) ?: continue
            if (at >= cutoff) AlertNotifier.notify(applicationContext, alert)
        }
        settings.setSeenAlerts(seen + fired.map { it.id })
        return Result.success()
    }
}
