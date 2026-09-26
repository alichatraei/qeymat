package online.qeymat.widget

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.Shader
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextAlign
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import online.qeymat.core.data.MarketRepository
import online.qeymat.core.data.SettingsStore
import online.qeymat.core.model.Asset
import online.qeymat.core.model.format.Fa
import online.qeymat.core.model.format.Jalali
import org.koin.core.component.KoinComponent
import org.koin.core.component.inject

private val Bg = Color(0xFF0D211A)
private val Row1 = Color(0xFF12291F)
private val Gold = Color(0xFFD8B56C)
private val Mint = Color(0xFF4FD6A4)
private val Red = Color(0xFFE0655C)
private val Ink = Color(0xFFECE7DA)
private val Sub = Color(0xFF8FA89B)

private fun color(value: Color) = ColorProvider(value)

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

@Composable
private fun WidgetHeader(title: String, updatedAt: String?) {
    val time = Jalali.parseIso(updatedAt)?.let { Jalali.time(it) } ?: "—"
    Row(
        modifier = GlanceModifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = title,
            style = TextStyle(color = color(Gold), fontSize = 13.sp, fontWeight = FontWeight.Bold),
            modifier = GlanceModifier.defaultWeight(),
        )
        Text(
            text = "↻ $time",
            style = TextStyle(color = color(Sub), fontSize = 10.sp),
            modifier = GlanceModifier.clickable(actionRunCallback<RefreshAction>()),
        )
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

        provideContent { PricesContent(assets, snapshot?.updatedAt) }
    }
}

@Composable
private fun PricesContent(assets: List<Asset>, updatedAt: String?) {
    val context = LocalContext.current
    val size = LocalSize.current
    val rows = ((size.height.value - 40f) / 38f).toInt().coerceIn(1, 6)

    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .appWidgetBackground()
            .cornerRadius(22.dp)
            .background(Bg)
            .padding(horizontal = 12.dp, vertical = 10.dp)
            .openAppOnClick(context),
    ) {
        WidgetHeader("قیمت", updatedAt)
        Spacer(GlanceModifier.height(6.dp))
        if (assets.isEmpty()) {
            Text(
                "برای دیدن قیمت‌ها، اپ را یک‌بار باز کنید",
                style = TextStyle(color = color(Sub), fontSize = 11.sp),
            )
        }
        for ((index, asset) in assets.take(rows).withIndex()) {
            val up = asset.changePercent >= 0
            Row(
                modifier = GlanceModifier
                    .fillMaxWidth()
                    .cornerRadius(12.dp)
                    .background(if (index % 2 == 0) Row1 else Bg)
                    .padding(horizontal = 8.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = asset.nameFa,
                    style = TextStyle(color = color(Ink), fontSize = 12.sp, fontWeight = FontWeight.Medium),
                    modifier = GlanceModifier.defaultWeight(),
                    maxLines = 1,
                )
                Text(
                    text = Fa.percent(asset.changePercent),
                    style = TextStyle(color = color(if (up) Mint else Red), fontSize = 10.sp),
                    modifier = GlanceModifier.padding(horizontal = 6.dp),
                )
                Text(
                    text = Fa.short(asset.sell, asset.isUsd),
                    style = TextStyle(color = color(Ink), fontSize = 13.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.End),
                    maxLines = 1,
                )
            }
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

    override val sizeMode: SizeMode = SizeMode.Exact

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val snapshot = market.loadCached()
        val usd = snapshot?.assets?.firstOrNull { it.symbol == "USD" }
        val series = SparklineStore.read(context)?.points?.map { it.value }.orEmpty()
        provideContent { DollarContent(usd, series, snapshot?.updatedAt) }
    }
}

@Composable
private fun DollarContent(usd: Asset?, series: List<Double>, updatedAt: String?) {
    val context = LocalContext.current
    val size = LocalSize.current
    val up = (usd?.changePercent ?: 0.0) >= 0
    val trend = if (up) Mint else Red

    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .appWidgetBackground()
            .cornerRadius(22.dp)
            .background(Bg)
            .padding(12.dp)
            .openAppOnClick(context),
    ) {
        WidgetHeader("دلار آمریکا", updatedAt)
        Spacer(GlanceModifier.defaultWeight())
        Text(
            text = usd?.let { Fa.price(it.sell) } ?: "—",
            style = TextStyle(color = color(Ink), fontSize = 24.sp, fontWeight = FontWeight.Bold),
        )
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("تومان", style = TextStyle(color = color(Sub), fontSize = 10.sp))
            Spacer(GlanceModifier.defaultWeight())
            Text(
                text = usd?.let { (if (up) "▲ " else "▼ ") + Fa.percent(it.changePercent) } ?: "",
                style = TextStyle(color = color(trend), fontSize = 11.sp, fontWeight = FontWeight.Bold),
            )
        }
        if (series.size >= 2 && size.height.value >= 130f) {
            Spacer(GlanceModifier.height(6.dp))
            Box(modifier = GlanceModifier.fillMaxWidth().height(34.dp)) {
                Image(
                    provider = ImageProvider(sparkline(series, trend, 320, 68)),
                    contentDescription = "نمودار یک هفته",
                    modifier = GlanceModifier.fillMaxSize(),
                )
            }
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

/** نمودار کوچک با گرادیان — ویجت‌ها Canvas کامپوز ندارند، پس Bitmap می‌سازیم */
private fun sparkline(values: List<Double>, color: Color, width: Int, height: Int): Bitmap {
    val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val min = values.minOrNull() ?: 0.0
    val max = values.maxOrNull() ?: 1.0
    val range = (max - min).takeIf { it > 0 } ?: 1.0
    val pad = 4f
    fun x(i: Int) = i.toFloat() / (values.size - 1) * width
    fun y(v: Double) = (height - pad - (v - min) / range * (height - 2 * pad)).toFloat()

    val line = Path().apply {
        moveTo(x(0), y(values[0]))
        for (i in 1 until values.size) lineTo(x(i), y(values[i]))
    }
    val fill = Path(line).apply {
        lineTo(width.toFloat(), height.toFloat())
        lineTo(0f, height.toFloat())
        close()
    }
    val argb = color.toArgb()
    canvas.drawPath(fill, Paint(Paint.ANTI_ALIAS_FLAG).apply {
        shader = LinearGradient(0f, 0f, 0f, height.toFloat(), color.copy(alpha = 0.4f).toArgb(), 0, Shader.TileMode.CLAMP)
    })
    canvas.drawPath(line, Paint(Paint.ANTI_ALIAS_FLAG).apply {
        this.color = argb
        style = Paint.Style.STROKE
        strokeWidth = 4f
        strokeCap = Paint.Cap.ROUND
        strokeJoin = Paint.Join.ROUND
    })
    return bitmap
}
