package online.qeymat.widget

import android.content.Context
import android.graphics.Bitmap
import android.view.View
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.LocalContext
import androidx.glance.LocalSize
import androidx.glance.action.ActionParameters
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.appWidgetBackground
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.ContentScale
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.height
import androidx.glance.layout.width
import online.qeymat.core.data.MarketRepository
import online.qeymat.core.data.SettingsStore
import online.qeymat.core.model.format.Fa
import org.koin.core.component.KoinComponent
import org.koin.core.component.inject

private fun openApp(context: Context) =
    context.packageManager.getLaunchIntentForPackage(context.packageName)?.let { actionStartActivity(it) }

private fun GlanceModifier.openAppOnClick(context: Context): GlanceModifier =
    openApp(context)?.let { clickable(it) } ?: this

/** دکمه‌ی تازه‌سازی ویجت */
class RefreshAction : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        WidgetScheduler.refreshNow(context)
    }
}

/** اندازه‌ی ویجت به پیکسل؛ پیش از اندازه‌گیری لانچر، اندازه‌ی پیش‌فرض */
@Composable
private fun pixelSize(fallbackWidth: Float, fallbackHeight: Float): Pair<Int, Int> {
    val size = LocalSize.current
    val density = LocalContext.current.resources.displayMetrics.density
    val width = size.width.value.takeIf { it > 1f } ?: fallbackWidth
    val height = size.height.value.takeIf { it > 1f } ?: fallbackHeight
    return (width * density).toInt() to (height * density).toInt()
}

/**
 * تصویر ویجت + ناحیه‌ی لمس «تازه‌سازی» روی ساعت (گوشه‌ی بالا-چپ تصویر).
 * جهت چیدمان RemoteViews از زبان گوشی می‌آید، پس گوشه‌ی چپ را خودمان پیدا می‌کنیم.
 */
@Composable
private fun WidgetFrame(bitmap: Bitmap, description: String) {
    val context = LocalContext.current
    val rtl = context.resources.configuration.layoutDirection == View.LAYOUT_DIRECTION_RTL
    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .appWidgetBackground()
            .cornerRadius(22.dp)
            .openAppOnClick(context),
        contentAlignment = Alignment(if (rtl) Alignment.Horizontal.End else Alignment.Horizontal.Start, Alignment.Vertical.Top),
    ) {
        Image(
            provider = ImageProvider(bitmap),
            contentDescription = description,
            contentScale = ContentScale.FillBounds,
            modifier = GlanceModifier.fillMaxSize(),
        )
        Box(
            modifier = GlanceModifier
                .width(84.dp)
                .height(40.dp)
                .clickable(actionRunCallback<RefreshAction>()),
        ) {}
    }
}

// ---------------------------------------------------------------------------
// ویجت فهرست منتخب
// ---------------------------------------------------------------------------

/**
 * ارزهای منتخب کاربر (همان ترتیب صفحه‌ی اول اپ). تعداد ردیف‌ها با
 * اندازه‌ی ویجت تغییر می‌کند.
 */
class PricesWidget : GlanceAppWidget(), KoinComponent {
    private val market: MarketRepository by inject()
    private val settings: SettingsStore by inject()

    override val sizeMode: SizeMode = SizeMode.Exact

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val snapshot = market.loadCached()
        val prefs = settings.current()
        val symbols = prefs.widgetSymbols.ifEmpty { prefs.favorites }
        val bySymbol = snapshot?.assets.orEmpty().associateBy { it.symbol }
        val assets = symbols.mapNotNull { bySymbol[it] }.take(6)
        val dark = WidgetArt.isDark(context, prefs.themeMode)

        provideContent {
            val (width, height) = pixelSize(250f, 180f)
            val bitmap = WidgetArt.prices(LocalContext.current, assets, snapshot?.updatedAt, width, height, dark)
            WidgetFrame(bitmap, assets.joinToString("، ") { "${it.nameFa} ${Fa.short(it.sell, it.isUsd)}" })
        }
    }
}

class PricesWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = PricesWidget()

    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        WidgetScheduler.schedule(context)
        WidgetScheduler.refreshNow(context)
    }
}

// ---------------------------------------------------------------------------
// ویجت دلار
// ---------------------------------------------------------------------------

class DollarWidget : GlanceAppWidget(), KoinComponent {
    private val market: MarketRepository by inject()
    private val settings: SettingsStore by inject()

    override val sizeMode: SizeMode = SizeMode.Exact

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val snapshot = market.loadCached()
        val usd = snapshot?.assets?.firstOrNull { it.symbol == "USD" }
        val series = SparklineStore.read(context)?.points?.map { it.value }.orEmpty()
        val dark = WidgetArt.isDark(context, settings.current().themeMode)
        provideContent {
            val (width, height) = pixelSize(160f, 160f)
            val bitmap = WidgetArt.dollar(LocalContext.current, usd, series, snapshot?.updatedAt, width, height, dark)
            WidgetFrame(bitmap, usd?.let { "دلار آمریکا ${Fa.price(it.sell)} تومان" } ?: "دلار آمریکا")
        }
    }
}

class DollarWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = DollarWidget()

    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        WidgetScheduler.schedule(context)
        WidgetScheduler.refreshNow(context)
    }
}
