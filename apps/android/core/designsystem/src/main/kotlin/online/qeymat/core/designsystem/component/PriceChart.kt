package online.qeymat.core.designsystem.component

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.abs
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.log10
import kotlin.math.pow
import online.qeymat.core.designsystem.Q
import online.qeymat.core.designsystem.Vazirmatn
import online.qeymat.core.model.HistorySeries
import online.qeymat.core.model.format.Fa
import online.qeymat.core.model.format.Jalali

data class ChartPoint(val time: Long, val value: Double)

fun HistorySeries.toChartPoints(): List<ChartPoint> =
    points.mapNotNull { point -> Jalali.parseIso(point.at)?.let { ChartPoint(it, point.value) } }
        .sortedBy { it.time }

/** تیک‌های قیمت با گام یکسان و گرد (۱، ۲، ۲٫۵، ۵ × ۱۰ⁿ) — همان منطق نمودار وب */
fun niceTicks(min: Double, max: Double, count: Int = 4): List<Double> {
    var lo = min
    var hi = max
    if (lo == hi) {
        val pad = abs(lo) * 0.01 + 1
        lo -= pad
        hi += pad
    }
    fun nice(value: Double, round: Boolean): Double {
        val exponent = floor(log10(value))
        val fraction = value / 10.0.pow(exponent)
        val niceFraction = if (round) {
            when {
                fraction < 1.5 -> 1.0
                fraction < 2.25 -> 2.0
                fraction < 3.5 -> 2.5
                fraction < 7.5 -> 5.0
                else -> 10.0
            }
        } else {
            when {
                fraction <= 1 -> 1.0
                fraction <= 2 -> 2.0
                fraction <= 2.5 -> 2.5
                fraction <= 5 -> 5.0
                else -> 10.0
            }
        }
        return niceFraction * 10.0.pow(exponent)
    }
    val step = nice(nice(hi - lo, false) / (count - 1), true)
    val start = floor(lo / step) * step
    val end = ceil(hi / step) * step
    val ticks = mutableListOf<Double>()
    var value = start
    while (value <= end + step / 2) {
        ticks += value
        value += step
    }
    return ticks
}

/**
 * نمودار قیمت با محور زمانی واقعی (قدیمی‌ترین چپ، تازه‌ترین راست — مثل نمودار وب).
 *
 * - `showGrid`: خطوط راهنمای قیمت با گام یکسان و برچسب سمت راست
 * - برچسب‌های تاریخ پنج نقطه‌ی هم‌فاصله‌ی زمانی‌اند و به تقویم شمسی
 * - لمس و کشیدن، قیمت و تاریخ هر نقطه را نشان می‌دهد
 */
@Composable
fun PriceChart(
    points: List<ChartPoint>,
    interval: String,
    modifier: Modifier = Modifier,
    height: Dp = 96.dp,
    usd: Boolean = false,
    area: Boolean = true,
    showGrid: Boolean = false,
    showAxis: Boolean = true,
) {
    var selected by remember(points) { mutableStateOf<Int?>(null) }
    val measurer = rememberTextMeasurer()

    if (points.size < 2) {
        Box(modifier.fillMaxWidth().height(height)) {
            Text(
                "تاریخچه‌ای برای این بازه نیست",
                color = Q.Muted,
                fontSize = 11.sp,
                modifier = Modifier.padding(top = height / 2 - 8.dp).fillMaxWidth(),
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            )
        }
        return
    }

    val up = points.last().value >= points.first().value
    val color = Q.trend(up)
    val t0 = points.first().time
    val span = (points.last().time - t0).coerceAtLeast(1L)
    val values = points.map { it.value }
    val ticks = remember(points) { niceTicks(values.min(), values.max()) }
    val lo = if (showGrid) ticks.first() else values.min()
    val hi = if (showGrid) ticks.last() else values.max()
    val range = (hi - lo).takeIf { it > 0 } ?: 1.0
    val gridLabelStyle = TextStyle(fontFamily = Vazirmatn, fontSize = 9.5.sp, color = Q.Muted)

    // نمودار همیشه چپ‌به‌راست است، حتی داخل صفحه‌ی راست‌به‌چپ
    CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
        Column(modifier.fillMaxWidth()) {
            val info = selected?.let { points.getOrNull(it) }
            Row(Modifier.fillMaxWidth().height(18.dp), horizontalArrangement = Arrangement.End) {
                if (info != null) {
                    Text(
                        text = "${Jalali.pointLabel(info.time, interval)}  ·  ${Fa.price(info.value, usd)}",
                        color = Q.Text,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = Vazirmatn,
                        style = TextStyle(textDirection = androidx.compose.ui.text.style.TextDirection.Rtl),
                    )
                }
            }
            Canvas(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(height)
                    .pointerInput(points) {
                        fun pick(x: Float) {
                            val plotWidth = size.width - if (showGrid) 64.dp.toPx() else 0f
                            val target = t0 + ((x / plotWidth).coerceIn(0f, 1f) * span).toLong()
                            selected = points.indices.minByOrNull { abs(points[it].time - target) }
                        }
                        detectDragGestures(
                            onDragStart = { pick(it.x) },
                            onDragEnd = { selected = null },
                            onDragCancel = { selected = null },
                        ) { change, _ -> pick(change.position.x) }
                    }
                    .pointerInput(points) {
                        detectTapGestures(onPress = {
                            val plotWidth = size.width - if (showGrid) 64.dp.toPx() else 0f
                            val target = t0 + ((it.x / plotWidth).coerceIn(0f, 1f) * span).toLong()
                            selected = points.indices.minByOrNull { index -> abs(points[index].time - target) }
                            tryAwaitRelease()
                            selected = null
                        })
                    },
            ) {
                val gutter = if (showGrid) 64.dp.toPx() else 0f
                val w = size.width - gutter
                val h = size.height
                val pad = 6.dp.toPx()
                fun x(time: Long) = ((time - t0).toDouble() / span * w).toFloat()
                fun y(value: Double) = (h - pad - (value - lo) / range * (h - 2 * pad)).toFloat()

                if (showGrid) {
                    for (tick in ticks) {
                        val ty = y(tick)
                        drawLine(Q.line(0.1f), Offset(0f, ty), Offset(w, ty), strokeWidth = 1f)
                        val label = measurer.measure(Fa.short(tick, usd), gridLabelStyle)
                        drawText(label, topLeft = Offset(w + 8.dp.toPx(), ty - label.size.height / 2f))
                    }
                }

                // منحنی نرم با نقاط میانی (مثل نمونه‌ی طراحی) — از نقاط داده بیرون نمی‌زند
                val line = Path()
                points.forEachIndexed { index, point ->
                    val px = x(point.time)
                    val py = y(point.value)
                    if (index == 0) {
                        line.moveTo(px, py)
                    } else {
                        val prev = points[index - 1]
                        val qx = x(prev.time)
                        val qy = y(prev.value)
                        line.quadraticBezierTo(qx, qy, (qx + px) / 2, (qy + py) / 2)
                    }
                }
                val last = points.last()
                line.lineTo(x(last.time), y(last.value))

                if (area) {
                    val fill = Path().apply {
                        addPath(line)
                        lineTo(x(last.time), h)
                        lineTo(0f, h)
                        close()
                    }
                    drawPath(fill, Brush.verticalGradient(listOf(color.copy(alpha = 0.42f), Color.Transparent)))
                }
                drawPath(line, color, style = Stroke(width = 2.2.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round))

                val end = Offset(x(last.time), y(last.value))
                drawCircle(color.copy(alpha = 0.25f), radius = 9.dp.toPx(), center = end)
                drawCircle(color, radius = 4.5.dp.toPx(), center = end)
                drawCircle(Q.Bg, radius = 4.5.dp.toPx(), center = end, style = Stroke(2.dp.toPx()))

                selected?.let { index ->
                    val point = points[index]
                    val sx = x(point.time)
                    drawLine(
                        Q.Sub,
                        Offset(sx, 0f),
                        Offset(sx, h),
                        strokeWidth = 1.dp.toPx(),
                        pathEffect = PathEffect.dashPathEffect(floatArrayOf(6f, 6f)),
                    )
                    drawCircle(color, radius = 5.dp.toPx(), center = Offset(sx, y(point.value)))
                }
            }

            if (showAxis) {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .padding(top = 6.dp, end = if (showGrid) 64.dp else 0.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    for (i in 0..4) {
                        val time = t0 + span * i / 4
                        Text(
                            Jalali.axisLabel(time, interval, span),
                            color = Q.Muted,
                            fontSize = 9.5.sp,
                            fontFamily = Vazirmatn,
                            style = TextStyle(textDirection = androidx.compose.ui.text.style.TextDirection.Rtl),
                        )
                    }
                }
            }
        }
    }
}
