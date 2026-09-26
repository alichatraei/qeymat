package online.qeymat.core.designsystem.component

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import online.qeymat.core.designsystem.Q
import online.qeymat.core.designsystem.QIcons
import online.qeymat.core.model.Asset
import online.qeymat.core.model.Category

/** نوع نشانه‌ی دارایی — مثل نمونه‌ی طراحی */
private enum class Glyph { Flag, Logo, Bar, Coin, Nugget, Ounce, Barrel, Text }

private data class TileSpec(val glyph: Glyph, val badge: String = "", val metal: Color = Q.Gold, val text: String = "")

private fun specFor(asset: Asset): TileSpec = when {
    asset.category == Category.CURRENCY && asset.countryCode != null -> TileSpec(Glyph.Flag)
    asset.symbol == "GOLD18" -> TileSpec(Glyph.Bar, "۱۸")
    asset.symbol == "GOLD24" -> TileSpec(Glyph.Bar, "۲۴")
    asset.symbol == "EMAMI" || asset.symbol == "BAHAR" -> TileSpec(Glyph.Coin, "۱")
    asset.symbol == "HALF" -> TileSpec(Glyph.Coin, "½")
    asset.symbol == "QUARTER" -> TileSpec(Glyph.Coin, "¼")
    asset.symbol == "GRAMI" -> TileSpec(Glyph.Coin, "گ")
    asset.symbol == "ABSHODEH" -> TileSpec(Glyph.Nugget)
    asset.symbol == "OUNCE" || asset.symbol == "XAU" -> TileSpec(Glyph.Ounce, "Au", Q.Gold)
    asset.symbol == "XAG" -> TileSpec(Glyph.Ounce, "Ag", Color(0xFFC9D1D3))
    asset.symbol == "XCU" -> TileSpec(Glyph.Ounce, "Cu", Color(0xFFC98A5A))
    asset.symbol == "BRENT" || asset.symbol == "WTI" -> TileSpec(Glyph.Barrel)
    asset.category == Category.CRYPTO -> TileSpec(Glyph.Logo, text = asset.mark ?: asset.symbol.take(3))
    else -> TileSpec(Glyph.Text, text = asset.mark?.takeIf { it.isNotBlank() } ?: asset.symbol.take(4))
}

fun flagUrl(countryCode: String) = "https://flagcdn.com/w80/${countryCode.lowercase()}.png"
fun cryptoLogoUrl(symbol: String) = "https://assets.coincap.io/assets/icons/${symbol.lowercase()}@2x.png"

/**
 * نشانه‌ی دارایی در کادر گرد سبز با لبه‌ی طلایی.
 * پرچم و لوگوی رمزارز از شبکه می‌آیند و اگر بار نشدند نماد متنی جایشان می‌نشیند؛
 * شمش، سکه، آبشده، انس و بشکه همین‌جا کشیده می‌شوند.
 */
@Composable
fun AssetTile(asset: Asset, size: Dp = 40.dp, modifier: Modifier = Modifier) {
    val spec = remember(asset.symbol, asset.countryCode) { specFor(asset) }
    val radius = size * 0.32f
    var failed by remember(asset.symbol) { mutableStateOf(false) }

    Box(
        modifier = modifier
            .size(size)
            .clip(RoundedCornerShape(radius))
            .background(Q.tile)
            .border(1.dp, Q.Gold.copy(alpha = 0.5f), RoundedCornerShape(radius)),
        contentAlignment = Alignment.Center,
    ) {
        when {
            spec.glyph == Glyph.Flag && !failed -> AsyncImage(
                model = flagUrl(asset.countryCode!!),
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize(),
                onError = { failed = true },
            )
            spec.glyph == Glyph.Logo && !failed -> AsyncImage(
                model = cryptoLogoUrl(asset.symbol),
                contentDescription = null,
                contentScale = ContentScale.Fit,
                modifier = Modifier.fillMaxSize().padding(size * 0.15f),
                onError = { failed = true },
            )
            spec.glyph in setOf(Glyph.Bar, Glyph.Coin, Glyph.Nugget, Glyph.Ounce, Glyph.Barrel) -> {
                Canvas(Modifier.fillMaxSize().padding(size * 0.11f)) { drawGlyph(spec) }
                if (spec.badge.isNotEmpty()) {
                    if (spec.glyph == Glyph.Ounce) {
                        Text(spec.badge, color = Q.Bg, fontSize = (size.value * 0.26f).sp, fontWeight = FontWeight.ExtraBold)
                    } else if (size >= 34.dp) {
                        Text(
                            spec.badge,
                            color = Q.Bg,
                            fontSize = 8.sp,
                            fontWeight = FontWeight.ExtraBold,
                            modifier = Modifier
                                .align(Alignment.BottomEnd)
                                .padding(2.dp)
                                .clip(RoundedCornerShape(5.dp))
                                .background(Q.GoldLight)
                                .padding(horizontal = 3.dp),
                        )
                    }
                }
            }
            else -> Text(
                text = spec.text.ifEmpty { asset.symbol.take(3) },
                color = Q.GoldLight,
                fontSize = (size.value * if (spec.text.length > 3) 0.26f else 0.36f).sp,
                fontWeight = FontWeight.ExtraBold,
                maxLines = 1,
            )
        }
    }
}

/** شکل‌های طلا در جعبه‌ی ۶۴ واحدی طراحی */
private fun DrawScope.drawGlyph(spec: TileSpec) {
    val s = size.minDimension / 64f
    fun p(x: Float, y: Float) = Offset(x * s, y * s)
    val outline = Stroke(width = 1.5f * s)
    val gold = Brush.linearGradient(
        listOf(Color(0xFFF3DC9A), Q.Gold, Color(0xFF9A7A3C)),
        start = p(0f, 0f),
        end = p(64f, 64f),
    )
    when (spec.glyph) {
        Glyph.Bar -> {
            val bar = Path().apply {
                moveTo(14f * s, 22f * s); lineTo(50f * s, 22f * s); lineTo(58f * s, 44f * s); lineTo(6f * s, 44f * s); close()
            }
            drawPath(bar, gold)
            drawPath(bar, Q.GoldDark, style = outline)
            val shine = Path().apply {
                moveTo(14f * s, 22f * s); lineTo(50f * s, 22f * s); lineTo(47f * s, 27f * s); lineTo(17f * s, 27f * s); close()
            }
            drawPath(shine, Color.White.copy(alpha = 0.35f))
            drawRect(Color(0xFF7A5F2C), topLeft = p(6f, 44f), size = Size(52f * s, 4f * s))
        }
        Glyph.Coin -> {
            val coin = Brush.radialGradient(
                listOf(Color(0xFFF6E3A6), Q.Gold, Color(0xFF8F7034)),
                center = p(22f, 19f),
                radius = 40f * s,
            )
            drawCircle(coin, radius = 24f * s, center = p(32f, 32f))
            drawCircle(Q.GoldDark, radius = 24f * s, center = p(32f, 32f), style = outline)
            drawCircle(Color(0xFF7A5F2C), radius = 17f * s, center = p(32f, 32f), style = Stroke(1.2f * s))
        }
        Glyph.Nugget -> {
            val nugget = Path().apply {
                moveTo(18f * s, 40f * s)
                cubicTo(12f * s, 32f * s, 20f * s, 20f * s, 30f * s, 18f * s)
                cubicTo(38f * s, 16f * s, 42f * s, 22f * s, 48f * s, 22f * s)
                cubicTo(56f * s, 22f * s, 58f * s, 32f * s, 52f * s, 38f * s)
                cubicTo(48f * s, 42f * s, 44f * s, 44f * s, 38f * s, 46f * s)
                cubicTo(30f * s, 48f * s, 22f * s, 46f * s, 18f * s, 40f * s)
                close()
            }
            drawPath(nugget, Q.Gold)
            drawPath(nugget, Q.GoldDark, style = outline)
        }
        Glyph.Ounce -> {
            drawCircle(spec.metal, radius = 24f * s, center = p(32f, 32f))
            drawCircle(Color.Black.copy(alpha = 0.35f), radius = 18f * s, center = p(32f, 32f), style = Stroke(1f * s))
        }
        Glyph.Barrel -> {
            drawRoundRect(
                Color(0xFF2A3540),
                topLeft = p(15f, 14f),
                size = Size(34f * s, 36f * s),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(3f * s),
            )
            drawRoundRect(
                Q.Gold,
                topLeft = p(15f, 14f),
                size = Size(34f * s, 36f * s),
                cornerRadius = androidx.compose.ui.geometry.CornerRadius(3f * s),
                style = outline,
            )
            drawLine(Q.Gold, p(15f, 24f), p(49f, 24f), strokeWidth = 1.5f * s)
            drawLine(Q.Gold, p(15f, 40f), p(49f, 40f), strokeWidth = 1.5f * s)
            drawOval(Q.Gold, topLeft = p(27f, 29f), size = Size(10f * s, 6f * s))
        }
        else -> Unit
    }
}

/** تغییر قیمت با فلش بالا/پایین */
@Composable
fun ChangeLabel(
    percent: Double,
    modifier: Modifier = Modifier,
    absolute: String? = null,
    big: Boolean = false,
) {
    val up = percent >= 0
    val color = Q.trend(up)
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Icon(
            if (up) QIcons.ArrowUp else QIcons.ArrowDown,
            contentDescription = if (up) "افزایش" else "کاهش",
            tint = color,
            modifier = Modifier.size(if (big) 13.dp else 11.dp),
        )
        if (absolute != null) {
            NumText(absolute, color = color, fontWeight = FontWeight.Bold, fontSize = if (big) 14.sp else 13.sp)
        }
        NumText(
            text = if (absolute != null) "(${online.qeymat.core.model.format.Fa.percent(percent)})"
            else online.qeymat.core.model.format.Fa.percent(percent),
            color = if (absolute != null) color.copy(alpha = 0.85f) else color,
            fontWeight = FontWeight.Bold,
            fontSize = if (big) 14.sp else 11.sp,
        )
    }
}
