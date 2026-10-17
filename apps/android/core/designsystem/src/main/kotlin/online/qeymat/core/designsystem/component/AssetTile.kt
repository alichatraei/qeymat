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
 * آیکن‌های اختصاصی «قیمت» (فاز ۲، نسخهٔ B): قاب مربع گرد سبز تیره با حلقهٔ Q
 * کرم و نقطهٔ نعنایی، باندل‌شده در assets تا بدون شبکه هم کار کنند.
 */
private val BRAND_ICON_IDS = mapOf(
    "USD" to "usd", "USD_FARDA" to "usd", "USD_HERAT" to "usd", "EUR" to "eur", "AED" to "aed",
    "GBP" to "gbp", "TRY" to "try", "CAD" to "cad", "CNY" to "cny", "CHF" to "chf", "JPY" to "jpy",
    "RUB" to "rub", "INR" to "inr", "SAR" to "sar", "KWD" to "kwd", "IQD" to "iqd", "AUD" to "aud",
    "SEK" to "sek", "NOK" to "nok", "DKK" to "dkk", "AZN" to "azn", "AMD" to "amd", "GEL" to "gel",
    "OMR" to "omr", "QAR" to "qar", "BHD" to "bhd", "HKD" to "hkd", "MYR" to "myr",
    "GOLD18" to "gold18", "GOLD24" to "gold24", "ABSHODEH" to "mesghal", "OUNCE" to "xau", "XAU" to "xau",
    "EMAMI" to "emami", "HALF" to "nim", "QUARTER" to "rob", "GRAMI" to "gerami", "BAHAR" to "bahar",
    "USDT" to "usdt", "BTC" to "btc", "ETH" to "eth", "TON" to "ton", "SOL" to "sol", "BNB" to "bnb",
    "XRP" to "xrp", "DOGE" to "doge", "TRX" to "trx", "ADA" to "ada", "LTC" to "ltc", "USDC" to "usdc",
    "XAG" to "silver", "SILVER999" to "silver", "XPT" to "platinum", "XCU" to "copper",
    "BRENT" to "brent", "WTI" to "wti", "OPEC" to "opec", "NATGAS" to "natgas",
)

fun brandIconAsset(symbol: String): String? = BRAND_ICON_IDS[symbol]?.let { "file:///android_asset/qicons/$it.svg" }

/**
 * نشانه‌ی دارایی در کادر گرد.
 * پرچم از شبکه می‌آید؛ طلا، سکه، رمزارز، کالا، سهام و شاخص‌ها آواتار
 * کشیده‌شده دارند (AssetArt، همتای سایت). اگر تصویر شبکه بار نشد یا
 * دارایی آواتار نداشت، نماد متنی جایش می‌نشیند.
 */
@Composable
fun AssetTile(asset: Asset, size: Dp = 40.dp, modifier: Modifier = Modifier) {
    // آیکن برند فاز ۲ اگر موجود باشد؛ زیر ۲۴dp حلقهٔ Q ناخواناست
    val brandIcon = if (size >= 24.dp) remember(asset.symbol) { brandIconAsset(asset.symbol) } else null
    if (brandIcon != null) {
        val context = androidx.compose.ui.platform.LocalContext.current
        AsyncImage(
            model = coil.request.ImageRequest.Builder(context)
                .data(brandIcon)
                .decoderFactory(coil.decode.SvgDecoder.Factory())
                .build(),
            contentDescription = null,
            modifier = modifier.size(size),
        )
        return
    }
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
                if (glyph == Glyph.Art) Q.line(0.12f) else Q.Gold.copy(alpha = 0.5f),
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

/** تغییر قیمت با فلش بالا/پایین؛ بدون تغییر خاکستری و بی‌فلش */
@Composable
fun ChangeLabel(
    percent: Double,
    modifier: Modifier = Modifier,
    absolute: String? = null,
    big: Boolean = false,
) {
    val flat = kotlin.math.abs(percent) < 0.005
    val up = percent >= 0
    val color = Q.trend(percent)
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        if (!flat) {
            Icon(
                if (up) QIcons.ArrowUp else QIcons.ArrowDown,
                contentDescription = if (up) "افزایش" else "کاهش",
                tint = color,
                modifier = Modifier.size(if (big) 13.dp else 11.dp),
            )
        }
        if (absolute != null && !flat) {
            NumText(absolute, color = color, fontWeight = FontWeight.Bold, fontSize = if (big) 14.sp else 13.sp)
        }
        val percentText = if (flat) "۰٪" else online.qeymat.core.model.format.Fa.percent(percent)
        NumText(
            text = if (absolute != null && !flat) "($percentText)" else percentText,
            color = if (absolute != null && !flat) color.copy(alpha = 0.85f) else color,
            fontWeight = FontWeight.Bold,
            fontSize = if (big) 14.sp else 11.sp,
        )
    }
}
