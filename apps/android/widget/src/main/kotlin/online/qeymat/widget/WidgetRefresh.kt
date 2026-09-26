package online.qeymat.widget

import android.content.Context
import androidx.glance.appwidget.updateAll
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import java.io.File
import java.util.concurrent.TimeUnit
import online.qeymat.core.data.MarketRepository
import online.qeymat.core.model.ChartRange
import online.qeymat.core.model.HistorySeries
import online.qeymat.core.network.QeymatJson
import org.koin.core.component.KoinComponent
import org.koin.core.component.inject

/** به‌روزرسانی همه‌ی ویجت‌های «قیمت» */
object QeymatWidgets {
    suspend fun updateAll(context: Context) {
        runCatching { PricesWidget().updateAll(context) }
        runCatching { DollarWidget().updateAll(context) }
    }
}

object WidgetScheduler {
    private const val PERIODIC = "widget-refresh"
    private const val NOW = "widget-refresh-now"

    /** هر ۱۵ دقیقه (کمترین فاصله‌ی مجاز اندروید) وقتی اینترنت هست */
    fun schedule(context: Context) {
        val request = PeriodicWorkRequestBuilder<WidgetRefreshWorker>(15, TimeUnit.MINUTES)
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .build()
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(PERIODIC, ExistingPeriodicWorkPolicy.KEEP, request)
    }

    fun refreshNow(context: Context) {
        val request = OneTimeWorkRequestBuilder<WidgetRefreshWorker>()
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .build()
        WorkManager.getInstance(context).enqueueUniqueWork(NOW, ExistingWorkPolicy.REPLACE, request)
    }
}

/** نمودار یک‌هفته‌ی دلار برای ویجت دلار — روی دیسک تا ویجت بدون شبکه هم کامل باشد */
object SparklineStore {
    private fun file(context: Context) = File(context.filesDir, "widget_usd_week.json")

    fun save(context: Context, series: HistorySeries) {
        runCatching { file(context).writeText(QeymatJson.encodeToString(HistorySeries.serializer(), series)) }
    }

    fun read(context: Context): HistorySeries? = runCatching {
        file(context).takeIf { it.exists() }?.readText()?.let { QeymatJson.decodeFromString(HistorySeries.serializer(), it) }
    }.getOrNull()
}

class WidgetRefreshWorker(
    context: Context,
    params: WorkerParameters,
) : CoroutineWorker(context, params), KoinComponent {
    private val market: MarketRepository by inject()

    override suspend fun doWork(): Result {
        val snapshot = market.refresh()
        market.history("USD", ChartRange.WEEK).onSuccess { SparklineStore.save(applicationContext, it) }
        QeymatWidgets.updateAll(applicationContext)
        return if (snapshot.isSuccess) Result.success() else Result.retry()
    }
}
