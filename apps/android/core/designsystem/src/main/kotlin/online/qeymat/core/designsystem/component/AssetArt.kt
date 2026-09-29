package online.qeymat.core.designsystem.component

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.PlatformTextStyle
import androidx.compose.ui.text.TextMeasurer
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontWeight
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin
import online.qeymat.core.designsystem.Vazirmatn

/**
 * آواتار تصویری دارایی‌هایی که پرچم ندارند — همتای AssetArt.tsx سایت.
 *
 * همه‌چیز در فضای ۴۰×۴۰ واحدی کشیده و به اندازه‌ی کاشی مقیاس می‌شود؛ هیچ
 * تصویری از شبکه نمی‌آید، پس بدون اینترنت و وقتی CDNها در دسترس نیستند هم
 * درست دیده می‌شود.
 */
private typealias Art = DrawScope.(TextMeasurer) -> Unit

fun hasAssetArt(symbol: String): Boolean = symbol in ARTS

/** آواتار را روی کل ناحیه می‌کشد؛ false یعنی این نماد آواتار ندارد */
fun DrawScope.drawAssetArt(symbol: String, measurer: TextMeasurer): Boolean {
    val art = ARTS[symbol] ?: return false
    val unit = size.minDimension / 40f
    scale(unit, unit, pivot = Offset.Zero) { art(measurer) }
    return true
}

/* ---------- ابزار ---------- */

private val pathCache = HashMap<String, Path>()

/** مسیر SVG یک‌بار پارس و نگه داشته می‌شود */
private fun svg(d: String): Path = pathCache.getOrPut(d) { PathParser().parsePathString(d).toPath() }

private fun DrawScope.background(color: Color) = drawRect(color, size = Size(40f, 40f))

private fun DrawScope.label(
    measurer: TextMeasurer,
    text: String,
    cx: Float,
    cy: Float,
    units: Float,
    color: Color,
) {
    // اندازه‌ی قلم به واحد فضای ۴۰تایی؛ مقیاس بیرونی آن را به اندازه‌ی کاشی می‌برد
    val layout = measurer.measure(
        AnnotatedString(text),
        style = TextStyle(
            fontFamily = Vazirmatn,
            fontWeight = FontWeight.ExtraBold,
            fontSize = units.toSp(),
            color = color,
            platformStyle = PlatformTextStyle(includeFontPadding = false),
        ),
        softWrap = false,
        maxLines = 1,
    )
    drawText(layout, topLeft = Offset(cx - layout.size.width / 2f, cy - layout.size.height / 2f))
}

private fun roundStroke(width: Float) = Stroke(width = width, cap = StrokeCap.Round, join = StrokeJoin.Round)

private val GoldTop = Color(0xFFFFE58A)
private val GoldMid = Color(0xFFE9B730)
private val GoldLow = Color(0xFFB7841B)
private val Cream = Color(0xFFFFF4D6)

private fun gold(top: Float, bottom: Float) =
    Brush.verticalGradient(0f to GoldTop, 0.55f to GoldMid, 1f to GoldLow, startY = top, endY = bottom)

/* ---------- طلا ---------- */

private class Metal(val top: Color, val mid: Color, val low: Color, val bg: Color, val ink: Color)

private val GoldMetal = Metal(GoldTop, GoldMid, GoldLow, Cream, Color(0xFF7A5410))
private val SilverMetal = Metal(Color(0xFFF8FAFC), Color(0xFFC7CDD6), Color(0xFF8A94A3), Color(0xFFEEF2F6), Color(0xFF3F4854))
private val CopperMetal = Metal(Color(0xFFF6B98A), Color(0xFFC8753C), Color(0xFF8E4A1E), Color(0xFFFCEBDD), Color(0xFF5A2C0E))

/** شمش با برچسب (عیار یا نماد) */
private fun bar(text: String, metal: Metal = GoldMetal): Art = { measurer ->
    background(metal.bg)
    drawPath(
        svg("M11 14h18l5 13H6z"),
        Brush.verticalGradient(0f to metal.top, 0.55f to metal.mid, 1f to metal.low, startY = 14f, endY = 27f),
    )
    drawPath(svg("M11 14h18l-2 3H13z"), Color.White.copy(alpha = 0.35f))
    drawRect(metal.low, topLeft = Offset(6f, 27f), size = Size(28f, 2.5f))
    label(measurer, text, 20f, 22f, 8.5f, metal.ink)
}

/** سکه با لبه‌ی دندانه‌دار؛ اندازه‌ی سکه با وزنش کوچک می‌شود */
private fun coin(text: String, radius: Float = 15f, fontSize: Float = 7.5f): Art = { measurer ->
    background(Cream)
    val center = Offset(20f, 20f)
    drawCircle(gold(20f - radius, 20f + radius), radius = radius, center = center)
    drawCircle(GoldLow, radius = radius, center = center, style = Stroke(1f))
    drawCircle(
        Color(0xFF9A6C12).copy(alpha = 0.7f),
        radius = radius - 2.4f,
        center = center,
        style = Stroke(0.7f, pathEffect = PathEffect.dashPathEffect(floatArrayOf(1f, 1.2f))),
    )
    drawOval(
        Color.White.copy(alpha = 0.35f),
        topLeft = Offset(20f - radius * 0.7f, 20f - radius * 0.63f),
        size = Size(radius * 0.7f, radius * 0.36f),
    )
    label(measurer, text, 20f, 20.5f, fontSize, Color(0xFF6B4A0C))
}

/** طلای آبشده: قطعه‌ی ریخته‌شده‌ی نامنظم با وجه‌های براق */
private val molten: Art = {
    background(Cream)
    drawOval(GoldLow.copy(alpha = 0.25f), topLeft = Offset(8f, 28f), size = Size(24f, 4f))
    val nugget = svg("M8 25l3-8 7-4 8 1 6 5 1 6-5 4-10 1-7-2z")
    drawPath(nugget, gold(13f, 31f))
    drawPath(nugget, Color(0xFF9A6C12), style = roundStroke(0.8f))
    drawPath(svg("M11 17l6 4 9-7M17 21l1 9M17 21l16 4"), Color(0xFF9A6C12).copy(alpha = 0.55f), style = Stroke(0.6f))
    drawPath(svg("M12 18l5-3.5 5 .5-5 5z"), Color.White.copy(alpha = 0.45f))
}

/* ---------- رمزارز ---------- */

private val bitcoin: Art = { measurer ->
    background(Color(0xFFF7931A))
    // «₿» در قلم‌های اندروید ۷ نیست؛ B با دو میله‌ی بالا و پایین کشیده می‌شود
    rotate(12f, pivot = Offset(20f, 20f)) {
        label(measurer, "B", 20.5f, 20f, 21f, Color.White)
        for (x in listOf(16.6f, 20.4f)) {
            drawRect(Color.White, topLeft = Offset(x, 8.6f), size = Size(1.8f, 4.4f))
            drawRect(Color.White, topLeft = Offset(x, 27f), size = Size(1.8f, 4.4f))
        }
    }
}

private val tether: Art = {
    background(Color(0xFF26A17B))
    drawRect(Color.White, topLeft = Offset(11f, 10.5f), size = Size(18f, 4.4f))
    drawRect(Color.White, topLeft = Offset(17.8f, 10.5f), size = Size(4.4f, 19.5f))
    drawOval(Color.White, topLeft = Offset(9f, 17f), size = Size(22f, 5f), style = Stroke(1.6f))
}

private val dogecoin: Art = { measurer ->
    background(Color(0xFFC2A633))
    label(measurer, "Ð", 20f, 20.5f, 21f, Color.White)
}

private val ethereum: Art = {
    background(Color(0xFF627EEA))
    val faded = Color.White.copy(alpha = 0.6f)
    drawPath(svg("M20 7l-8 13.3 8 4.7 8-4.7z"), Color.White)
    drawPath(svg("M20 7v18l8-4.7z"), faded)
    drawPath(svg("M12 22.2l8 11 8-11-8 4.7z"), Color.White)
    drawPath(svg("M20 26.9v6.3l8-11z"), faded)
}

private val solana: Art = {
    background(Color(0xFF111111))
    val brush = Brush.linearGradient(
        listOf(Color(0xFF9945FF), Color(0xFF14F195)),
        start = Offset(0f, 40f),
        end = Offset(40f, 0f),
    )
    drawPath(svg("M13 12h16l-3 3H10z"), brush)
    drawPath(svg("M10 18.5h16l3 3H13z"), brush)
    drawPath(svg("M13 25h16l-3 3H10z"), brush)
}

private val ton: Art = {
    background(Color(0xFF0098EA))
    drawPath(svg("M12 12h16l-8 17z"), Color.White, style = roundStroke(2.2f))
    drawLine(Color.White, Offset(20f, 12f), Offset(20f, 29f), strokeWidth = 2.2f)
}

private val ripple: Art = {
    background(Color(0xFF23292F))
    drawPath(
        svg(
            "M11 12h3.5l5.5 5.4 5.5-5.4H29l-7.4 7.2a2.3 2.3 0 0 1-3.2 0z" +
                "M11 28h3.5l5.5-5.4 5.5 5.4H29l-7.4-7.2a2.3 2.3 0 0 0-3.2 0z",
        ),
        Color.White,
    )
}

private val bnb: Art = {
    background(Color(0xFFF3BA2F))
    for ((x, y) in listOf(20f to 10f, 20f to 24f, 13f to 17f, 27f to 17f, 20f to 17f)) {
        val diamond = Path().apply {
            moveTo(x, y); lineTo(x + 3f, y + 3f); lineTo(x, y + 6f); lineTo(x - 3f, y + 3f); close()
        }
        drawPath(diamond, Color.White)
    }
}

private val tron: Art = {
    background(Color(0xFFEB0029))
    drawPath(svg("M10 11l20 5-11 14z"), Color.White, style = roundStroke(1.8f))
    drawPath(svg("M10 11l11 8 9-3M21 19l-2 11"), Color.White, style = roundStroke(1.4f))
}

private val cardano: Art = {
    background(Color(0xFF0033AD))
    drawCircle(Color.White, radius = 3f, center = Offset(20f, 20f))
    for (index in 0 until 6) {
        val inner = index * PI / 3
        drawCircle(Color.White, 1.9f, Offset(20f + cos(inner).toFloat() * 8f, 20f + sin(inner).toFloat() * 8f))
        val outer = inner + PI / 6
        drawCircle(Color.White, 1.1f, Offset(20f + cos(outer).toFloat() * 13f, 20f + sin(outer).toFloat() * 13f))
    }
}

/* ---------- کالا ---------- */

private fun oil(text: String, bg: Color): Art = { measurer ->
    background(bg)
    drawPath(
        svg("M20 7c5 7 9 11.5 9 16.5a9 9 0 0 1-18 0C11 18.5 15 14 20 7z"),
        Brush.linearGradient(listOf(Color(0xFF4B5563), Color(0xFF0B0F14)), start = Offset(11f, 7f), end = Offset(29f, 32.5f)),
    )
    drawPath(svg("M15.5 23.5a4.5 4.5 0 0 0 3 4.2"), Color.White.copy(alpha = 0.45f), style = roundStroke(1.4f))
    label(measurer, text, 20f, 24f, 7f, Color.White)
}

/* ---------- سهام و شاخص ---------- */

private fun ticker(text: String, bg: Color, ink: Color = Color.White): Art = { measurer ->
    background(bg)
    label(measurer, text, 20f, 20.5f, if (text.length > 4) 7.4f else 8.6f, ink)
}

private fun indexChart(text: String, bg: Color): Art = { measurer ->
    background(bg)
    drawPath(svg("M8 27l7-6 5 3 9-10"), Color.White, style = roundStroke(2.2f))
    drawPath(svg("M25 14h4v4"), Color.White, style = roundStroke(2.2f))
    label(measurer, text, 20f, 32.5f, 5.6f, Color.White.copy(alpha = 0.9f))
}

private val ARTS: Map<String, Art> = mapOf(
    // طلا و سکه
    "GOLD18" to bar("18"),
    "GOLD24" to bar("24"),
    "ABSHODEH" to molten,
    "EMAMI" to coin("امامی"),
    "BAHAR" to coin("بهار"),
    "HALF" to coin("نیم", 13.5f, 8f),
    "QUARTER" to coin("ربع", 12f, 7.5f),
    "GRAMI" to coin("گرمی", 10.5f, 6f),
    "OUNCE" to coin("oz", 15f, 10f),

    // رمزارز
    "USDT" to tether,
    "BTC" to bitcoin,
    "ETH" to ethereum,
    "SOL" to solana,
    "TON" to ton,
    "XRP" to ripple,
    "DOGE" to dogecoin,
    "BNB" to bnb,
    "TRX" to tron,
    "ADA" to cardano,

    // کالا
    "BRENT" to oil("B", Color(0xFFE0F2FE)),
    "WTI" to oil("W", Color(0xFFFEF3C7)),
    "XAU" to bar("Au"),
    "XAG" to bar("Ag", SilverMetal),
    "XCU" to bar("Cu", CopperMetal),

    // سهام
    "AAPL" to ticker("AAPL", Color(0xFF111111)),
    "TSLA" to ticker("TSLA", Color(0xFFCC0000)),
    "NVDA" to ticker("NVDA", Color(0xFF76B900)),
    "MSFT" to ticker("MSFT", Color(0xFF00A4EF)),
    "GOOGL" to ticker("GOOGL", Color(0xFF4285F4)),
    "AMZN" to ticker("AMZN", Color(0xFFFF9900), Color(0xFF111111)),
    "META" to ticker("META", Color(0xFF0668E1)),

    // شاخص
    "SPX" to indexChart("S&P 500", Color(0xFF1E3A8A)),
    "IXIC" to indexChart("NASDAQ", Color(0xFF0996C7)),
)
