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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import online.qeymat.core.designsystem.Q
import online.qeymat.core.designsystem.QIcons
import online.qeymat.core.model.Asset
import online.qeymat.core.model.Category

/** نوع نشانه‌ی دارایی */
private enum class Glyph { Flag, Art, Logo, Text }

private fun glyphFor(asset: Asset): Glyph = when {
    asset.category == Category.CURRENCY && asset.countryCode != null -> Glyph.Flag
    hasAssetArt(asset.symbol) -> Glyph.Art
    // رمزارز تازه‌ای که هنوز آواتار ندارد
    asset.category == Category.CRYPTO -> Glyph.Logo
    else -> Glyph.Text
}

fun flagUrl(countryCode: String) = "https://flagcdn.com/w80/${countryCode.lowercase()}.png"
fun cryptoLogoUrl(symbol: String) = "https://assets.coincap.io/assets/icons/${symbol.lowercase()}@2x.png"

/**
 * نشانه‌ی دارایی در کادر گرد.
 * پرچم از شبکه می‌آید؛ طلا، سکه، رمزارز، کالا، سهام و شاخص‌ها آواتار
 * کشیده‌شده دارند (AssetArt، همتای سایت). اگر تصویر شبکه بار نشد یا
 * دارایی آواتار نداشت، نماد متنی جایش می‌نشیند.
 */
@Composable
fun AssetTile(asset: Asset, size: Dp = 40.dp, modifier: Modifier = Modifier) {
    val glyph = remember(asset.symbol, asset.countryCode) { glyphFor(asset) }
    val radius = size * 0.32f
    var failed by remember(asset.symbol) { mutableStateOf(false) }
    val measurer = rememberTextMeasurer()
    val shape = RoundedCornerShape(radius)

    Box(
        modifier = modifier
            .size(size)
            .clip(shape)
            .background(Q.tile)
            .border(
                1.dp,
                // آواتار رنگی زمینه‌ی خودش را دارد؛ لبه‌ی طلایی فقط برای کاشی تیره
                if (glyph == Glyph.Art) Color.White.copy(alpha = 0.08f) else Q.Gold.copy(alpha = 0.5f),
                shape,
            ),
        contentAlignment = Alignment.Center,
    ) {
        when {
            glyph == Glyph.Flag && !failed -> AsyncImage(
                model = flagUrl(asset.countryCode!!),
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize(),
                onError = { failed = true },
            )
            glyph == Glyph.Art -> Canvas(Modifier.fillMaxSize()) { drawAssetArt(asset.symbol, measurer) }
            glyph == Glyph.Logo && !failed -> AsyncImage(
                model = cryptoLogoUrl(asset.symbol),
                contentDescription = null,
                contentScale = ContentScale.Fit,
                modifier = Modifier.fillMaxSize().padding(size * 0.15f),
                onError = { failed = true },
            )
            else -> {
                val text = asset.mark?.takeIf { it.isNotBlank() } ?: asset.symbol.take(4)
                Text(
                    text = text,
                    color = Q.GoldLight,
                    fontSize = (size.value * if (text.length > 3) 0.26f else 0.36f).sp,
                    fontWeight = FontWeight.ExtraBold,
                    maxLines = 1,
                )
            }
        }
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
