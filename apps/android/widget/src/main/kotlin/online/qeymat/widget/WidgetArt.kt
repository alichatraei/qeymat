package online.qeymat.widget

import android.content.Context
import android.content.res.Configuration
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import android.text.TextPaint
import android.text.TextUtils
import androidx.core.content.res.ResourcesCompat
import online.qeymat.core.data.ThemeMode
import online.qeymat.core.model.Asset
import online.qeymat.core.model.format.Fa
import online.qeymat.core.model.format.Jalali
import online.qeymat.core.designsystem.R as DesignR

/**
 * ویجت‌ها به‌صورت تصویر کشیده می‌شوند.
 *
 * RemoteViews فونت دلخواه نمی‌پذیرد و جهتش از زبان گوشی می‌آید؛ با کشیدن
 * روی Canvas، ویجت همیشه با وزیرمتن و راست‌به‌چپ است و در هر گوشی یک شکل
 * دارد. همین تابع‌ها پیش‌نمایش ویجت در تور راهنمای اپ را هم می‌سازند.
 */
object WidgetArt {
    class Colors(
        val bgTop: Int,
        val bgBottom: Int,
        val border: Int,
        val row: Int,
        val gold: Int,
        val mint: Int,
        val red: Int,
        val ink: Int,
        val sub: Int,
    )

    // پالت فاز ۲، هم‌رنگ توکن‌های دیزاین‌سیستم
    private val Dark = Colors(
        bgTop = 0xFF0D1613.toInt(), bgBottom = 0xFF070E0C.toInt(), border = 0x3331433B,
        row = 0x0FFFFFFF, gold = 0xFFEAAA40.toInt(), mint = 0xFF58D6A4.toInt(), red = 0xFFF56C70.toInt(),
        ink = 0xFFE6EEEA.toInt(), sub = 0xFFAAB8B2.toInt(),
    )
    private val Light = Colors(
        bgTop = 0xFFFFFFFF.toInt(), bgBottom = 0xFFFAFCFB.toInt(), border = 0x33CBD6D1,
        row = 0x0A07131F, gold = 0xFFB07A1C.toInt(), mint = 0xFF08764F.toInt(), red = 0xFFB8474B.toInt(),
        ink = 0xFF07131F.toInt(), sub = 0xFF505C64.toInt(),
    )

    fun isDark(context: Context, mode: ThemeMode): Boolean = when (mode) {
        ThemeMode.DARK -> true
        ThemeMode.LIGHT -> false
        ThemeMode.SYSTEM ->
            (context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
    }

    private class Fonts(context: Context) {
        val regular: Typeface = font(context, DesignR.font.vazirmatn_regular)
        val medium: Typeface = font(context, DesignR.font.vazirmatn_medium)
        val bold: Typeface = font(context, DesignR.font.vazirmatn_bold)
        val extraBold: Typeface = font(context, DesignR.font.vazirmatn_extrabold)

        private fun font(context: Context, id: Int) =
            runCatching { ResourcesCompat.getFont(context, id) }.getOrNull() ?: Typeface.DEFAULT
    }

    /** ویجت «قیمت‌های منتخب»: ابعاد به پیکسل */
    fun prices(context: Context, assets: List<Asset>, updatedAt: String?, width: Int, height: Int, dark: Boolean): Bitmap {
        val c = if (dark) Dark else Light
        val fonts = Fonts(context)
        val d = context.resources.displayMetrics.density
        val bitmap = Bitmap.createBitmap(width.coerceAtLeast(1), height.coerceAtLeast(1), Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        background(canvas, c, width, height, d)

        val pad = 14 * d
        header(canvas, c, fonts, "قیمت", updatedAt, width, pad, d)

        val top = pad + 30 * d
        val rowHeight = 38 * d
        val rows = ((height - top - pad * 0.7f) / rowHeight).toInt().coerceIn(1, 6)
        if (assets.isEmpty()) {
            val paint = text(fonts.regular, 12 * d, c.sub, Paint.Align.RIGHT)
            canvas.drawText("برای دیدن قیمت‌ها، اپ را یک‌بار باز کنید", width - pad, top + 22 * d, paint)
            return bitmap
        }
        val visible = assets.take(rows)
        // ردیف‌ها فضای باقی‌مانده را یکسان پر می‌کنند
        val step = ((height - top - pad * 0.6f) / visible.size).coerceAtMost(46 * d)
        for ((index, asset) in visible.withIndex()) {
            val y = top + index * step
            val rect = RectF(pad * 0.55f, y, width - pad * 0.55f, y + step - 4 * d)
            if (index % 2 == 0) canvas.drawRoundRect(rect, 12 * d, 12 * d, fill(c.row))
            val baseline = rect.centerY() + 5 * d

            // چپ: درصد تغییر در کپسول رنگی
            val flat = kotlin.math.abs(asset.changePercent) < 0.005
            val trend = when {
                flat -> c.sub
                asset.changePercent > 0 -> c.mint
                else -> c.red
            }
            val percent = if (flat) "۰٪" else Fa.percent(asset.changePercent).drop(1)
            val pctPaint = text(fonts.bold, 10.5f * d, trend, Paint.Align.CENTER)
            val pillWidth = pctPaint.measureText(percent) + (if (flat) 14 else 24) * d
            val pill = RectF(rect.left + 8 * d, rect.centerY() - 10 * d, rect.left + 8 * d + pillWidth, rect.centerY() + 10 * d)
            canvas.drawRoundRect(pill, 10 * d, 10 * d, fill((trend and 0x00FFFFFF) or 0x24000000))
            if (flat) {
                canvas.drawText(percent, pill.centerX(), baseline - 0.5f * d, pctPaint)
            } else {
                triangle(canvas, pill.right - 9 * d, pill.centerY(), 3.6f * d, asset.changePercent > 0, trend)
                canvas.drawText(percent, pill.centerX() - 4.5f * d, baseline - 0.5f * d, pctPaint)
            }

            // کنار کپسول: قیمت
            val price = Fa.short(asset.sell, asset.isUsd)
            val pricePaint = text(fonts.extraBold, 13.5f * d, c.ink, Paint.Align.LEFT)
            val priceX = pill.right + 8 * d
            canvas.drawText(price, priceX, baseline, pricePaint)

            // راست: نام دارایی، کوتاه‌شده اگر جا نبود
            val namePaint = text(fonts.medium, 12.5f * d, c.ink, Paint.Align.RIGHT)
            val nameRoom = rect.right - 10 * d - (priceX + pricePaint.measureText(price) + 10 * d)
            val name = TextUtils.ellipsize(asset.nameFa, namePaint, nameRoom.coerceAtLeast(0f), TextUtils.TruncateAt.END).toString()
            canvas.drawText(name, rect.right - 10 * d, baseline, namePaint)
        }
        return bitmap
    }

    /** ویجت دلار با نمودار یک هفته */
    fun dollar(context: Context, usd: Asset?, series: List<Double>, updatedAt: String?, width: Int, height: Int, dark: Boolean): Bitmap {
        val c = if (dark) Dark else Light
        val fonts = Fonts(context)
        val d = context.resources.displayMetrics.density
        val bitmap = Bitmap.createBitmap(width.coerceAtLeast(1), height.coerceAtLeast(1), Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        background(canvas, c, width, height, d)
        val pad = 14 * d
        header(canvas, c, fonts, "دلار آمریکا", updatedAt, width, pad, d)

        val up = (usd?.changePercent ?: 0.0) >= 0
        val trend = if (up) c.mint else c.red
        val showChart = series.size >= 2 && height >= 120 * d
        val priceBaseline = if (showChart) pad + 64 * d else height / 2f + 22 * d

        val price = usd?.let { Fa.price(it.sell) } ?: "—"
        val size = (if (width < 150 * d) 22 else 27) * d
        canvas.drawText(price, width - pad, priceBaseline, text(fonts.extraBold, size, c.ink, Paint.Align.RIGHT))
        canvas.drawText("تومان", width - pad, priceBaseline + 18 * d, text(fonts.regular, 10.5f * d, c.sub, Paint.Align.RIGHT))
        if (usd != null) {
            val percent = Fa.percent(usd.changePercent).drop(1)
            val paint = text(fonts.bold, 11 * d, trend, Paint.Align.LEFT)
            canvas.drawText(percent, pad + 12 * d, priceBaseline + 18 * d, paint)
            triangle(canvas, pad + 4 * d, priceBaseline + 14 * d, 3.8f * d, up, trend)
        }

        if (showChart) {
            val chartTop = priceBaseline + 30 * d
            sparkline(canvas, series, trend, RectF(pad, chartTop, width - pad, height - pad * 0.8f), d)
        }
        return bitmap
    }

    private fun background(canvas: Canvas, c: Colors, width: Int, height: Int, d: Float) {
        val rect = RectF(0.5f * d, 0.5f * d, width - 0.5f * d, height - 0.5f * d)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            shader = LinearGradient(0f, 0f, width * 0.4f, height.toFloat(), c.bgTop, c.bgBottom, Shader.TileMode.CLAMP)
        }
        canvas.drawRoundRect(rect, 22 * d, 22 * d, paint)
        canvas.drawRoundRect(rect, 22 * d, 22 * d, Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeWidth = 1 * d
            color = c.border
        })
    }

    private fun header(canvas: Canvas, c: Colors, fonts: Fonts, title: String, updatedAt: String?, width: Int, pad: Float, d: Float) {
        val baseline = pad + 13 * d
        // نقطه‌ی «زنده» کنار عنوان
        canvas.drawCircle(width - pad - 3 * d, baseline - 5 * d, 3 * d, fill(c.mint))
        canvas.drawText(title, width - pad - 11 * d, baseline, text(fonts.bold, 13.5f * d, c.gold, Paint.Align.RIGHT))
        val time = Jalali.parseIso(updatedAt)?.let { Jalali.time(it) } ?: "—"
        val timePaint = text(fonts.regular, 10.5f * d, c.sub, Paint.Align.LEFT)
        refreshIcon(canvas, pad + 6 * d, baseline - 4 * d, 5 * d, c.sub, d)
        canvas.drawText(time, pad + 16 * d, baseline, timePaint)
    }

    private fun refreshIcon(canvas: Canvas, cx: Float, cy: Float, r: Float, color: Int, d: Float) {
        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeWidth = 1.4f * d
            strokeCap = Paint.Cap.ROUND
            this.color = color
        }
        canvas.drawArc(RectF(cx - r, cy - r, cx + r, cy + r), -60f, 290f, false, paint)
        val tip = Path().apply {
            val ax = cx + r * kotlin.math.cos(Math.toRadians(-60.0)).toFloat()
            val ay = cy + r * kotlin.math.sin(Math.toRadians(-60.0)).toFloat()
            moveTo(ax - 2.6f * d, ay - 1.2f * d)
            lineTo(ax + 0.4f * d, ay + 0.2f * d)
            lineTo(ax - 0.6f * d, ay + 3.2f * d)
        }
        canvas.drawPath(tip, paint)
    }

    private fun triangle(canvas: Canvas, cx: Float, cy: Float, r: Float, up: Boolean, color: Int) {
        val path = Path().apply {
            if (up) {
                moveTo(cx, cy - r); lineTo(cx + r, cy + r * 0.7f); lineTo(cx - r, cy + r * 0.7f)
            } else {
                moveTo(cx, cy + r); lineTo(cx + r, cy - r * 0.7f); lineTo(cx - r, cy - r * 0.7f)
            }
            close()
        }
        canvas.drawPath(path, fill(color))
    }

    private fun sparkline(canvas: Canvas, values: List<Double>, color: Int, area: RectF, d: Float) {
        val min = values.min()
        val max = values.max()
        val range = (max - min).takeIf { it > 0 } ?: 1.0
        fun x(i: Int) = area.left + i.toFloat() / (values.size - 1) * area.width()
        fun y(v: Double) = (area.bottom - (v - min) / range * area.height()).toFloat()
        val line = Path().apply {
            moveTo(x(0), y(values[0]))
            for (i in 1 until values.size) lineTo(x(i), y(values[i]))
        }
        val fillPath = Path(line).apply {
            lineTo(area.right, area.bottom)
            lineTo(area.left, area.bottom)
            close()
        }
        canvas.drawPath(fillPath, Paint(Paint.ANTI_ALIAS_FLAG).apply {
            shader = LinearGradient(0f, area.top, 0f, area.bottom, (color and 0x00FFFFFF) or 0x55000000, color and 0x00FFFFFF, Shader.TileMode.CLAMP)
        })
        canvas.drawPath(line, Paint(Paint.ANTI_ALIAS_FLAG).apply {
            this.color = color
            style = Paint.Style.STROKE
            strokeWidth = 2 * d
            strokeCap = Paint.Cap.ROUND
            strokeJoin = Paint.Join.ROUND
        })
        canvas.drawCircle(x(values.lastIndex), y(values.last()), 3 * d, fill(color))
    }

    private fun fill(color: Int) = Paint(Paint.ANTI_ALIAS_FLAG).apply { this.color = color }

    private fun text(typeface: Typeface, size: Float, color: Int, align: Paint.Align) = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
        this.typeface = typeface
        textSize = size
        this.color = color
        textAlign = align
    }
}
