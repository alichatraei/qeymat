package online.qeymat.core.designsystem

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.sp

/** رنگ‌های یک تم «قیمت» */
@Immutable
data class QPalette(
    val dark: Boolean,
    val deep: Color,
    val bg: Color,
    val sheet: Color,
    val bar: Color,
    val cardTop: Color,
    val cardBottom: Color,
    val tileTop: Color,
    val tileBottom: Color,
    val segOn: Color,
    val gold: Color,
    val goldLight: Color,
    val goldDark: Color,
    val mint: Color,
    val red: Color,
    val text: Color,
    val sub: Color,
    val soft: Color,
    val muted: Color,
    val toggleOn: Color,
    val toggleOff: Color,
    /** رنگ پایه‌ی خط‌ها و لبه‌ها */
    val lineBase: Color,
    /** زمینه‌ی فیلدها و کنترل‌های فرورفته */
    val field: Color,
    /** لایه‌ی خیلی کم‌رنگ روی کارت (ردیف‌ها، دکمه‌های فرعی) */
    val raised: Color,
    val shadow: Color,
    val scrim: Color,
)

/** پالت فاز ۲ — همان توکن‌های دیزاین‌سیستم وب: سطوح خنثی، هیرلاین، سبز/قرمز قیمتی */
val DarkPalette = QPalette(
    dark = true,
    deep = Color(0xFF09261F), // brand-deep: متن روی دکمهٔ نعنایی
    bg = Color(0xFF070E0C), // page
    sheet = Color(0xFF0D1613), // surface
    bar = Color(0xFF0D1613),
    cardTop = Color(0xFF0D1613), // سطوح تختِ هیرلاین‌دار، بدون گرادیان
    cardBottom = Color(0xFF0D1613),
    tileTop = Color(0xFF131E1A), // soft
    tileBottom = Color(0xFF131E1A),
    segOn = Color(0xFF0D1613),
    gold = Color(0xFFEAAA40), // amber: فقط برای پلاس و تأکیدهای غیرقیمتی
    goldLight = Color(0xFFEEBE68),
    goldDark = Color(0xFF54401E),
    mint = Color(0xFF58D6A4), // price-up
    red = Color(0xFFF56C70), // price-down (جدا از قرمز خطا در وب؛ این‌جا مشترک)
    text = Color(0xFFE6EEEA), // ink
    sub = Color(0xFFAAB8B2),
    soft = Color(0xFFC2CEC8),
    muted = Color(0xFF84938C),
    toggleOn = Color(0xFF1EB17A),
    toggleOff = Color(0xFF31433B),
    lineBase = Color(0xFFE6EEEA), // با آلفای line() می‌شود 1f2d27/31433b دیزاین
    field = Color(0xFF101A16),
    raised = Color(0xFF131E1A),
    shadow = Color(0xFF000000),
    scrim = Color(0xB3000000),
)

val LightPalette = QPalette(
    dark = false,
    deep = Color(0xFFF3EFE5), // brand-cream: متن روی دکمهٔ سبز تیره
    bg = Color(0xFFFAFCFB), // page
    sheet = Color(0xFFFFFFFF), // surface
    bar = Color(0xFFFFFFFF),
    cardTop = Color(0xFFFFFFFF),
    cardBottom = Color(0xFFFFFFFF),
    tileTop = Color(0xFFF4F7F5), // soft
    tileBottom = Color(0xFFF4F7F5),
    segOn = Color(0xFFFFFFFF),
    gold = Color(0xFFB07A1C),
    goldLight = Color(0xFF8A5B10),
    goldDark = Color(0xFFF2C27A),
    mint = Color(0xFF08764F), // price-up (AA روی سفید)
    red = Color(0xFFB8474B), // price-down
    text = Color(0xFF07131F), // ink
    sub = Color(0xFF505C64),
    soft = Color(0xFF31433B),
    muted = Color(0xFF748089),
    toggleOn = Color(0xFF0B8F61),
    toggleOff = Color(0xFFCBD6D1),
    lineBase = Color(0xFF07131F),
    field = Color(0xFFFBFCFB),
    raised = Color(0xFFF7FAF8),
    shadow = Color(0xFF123D2D),
    scrim = Color(0x80071A13),
)

/**
 * پالت جاری. مقدارش state است، پس هر جا خوانده شود (حتی داخل Canvas) با
 * عوض شدن تم دوباره کشیده می‌شود. فقط QeymatTheme آن را تنظیم می‌کند.
 */
object Q {
    var palette: QPalette by mutableStateOf(DarkPalette)
        internal set

    val isDark get() = palette.dark
    val Deep get() = palette.deep
    val Bg get() = palette.bg
    val Sheet get() = palette.sheet
    val Bar get() = palette.bar
    val CardTop get() = palette.cardTop
    val CardBottom get() = palette.cardBottom
    val TileTop get() = palette.tileTop
    val TileBottom get() = palette.tileBottom
    val SegOn get() = palette.segOn
    val Gold get() = palette.gold
    val GoldLight get() = palette.goldLight
    val GoldDark get() = palette.goldDark
    val Mint get() = palette.mint
    val Red get() = palette.red
    val Text get() = palette.text
    val Sub get() = palette.sub
    val Soft get() = palette.soft
    val Muted get() = palette.muted
    val ToggleOn get() = palette.toggleOn
    val ToggleOff get() = palette.toggleOff
    val Field get() = palette.field
    val Raised get() = palette.raised
    val Shadow get() = palette.shadow
    val Scrim get() = palette.scrim

    /** خط و لبه؛ در تم روشن کمی پررنگ‌تر تا دیده شود */
    fun line(alpha: Float = 0.18f) = palette.lineBase.copy(alpha = if (palette.dark) alpha else (alpha * 1.25f).coerceAtMost(1f))

    val card: Brush get() = Brush.linearGradient(listOf(CardTop, CardBottom))
    val tile: Brush get() = Brush.linearGradient(listOf(TileTop, TileBottom))

    /** بدون تغییر = خاکستری، نه سبز */
    fun trend(up: Boolean) = if (up) Mint else Red
    fun trend(percent: Double) = when {
        percent > 0.0049 -> Mint
        percent < -0.0049 -> Red
        else -> Sub
    }
}

val Vazirmatn = FontFamily(
    Font(R.font.vazirmatn_regular, FontWeight.Normal),
    Font(R.font.vazirmatn_medium, FontWeight.Medium),
    Font(R.font.vazirmatn_semibold, FontWeight.SemiBold),
    Font(R.font.vazirmatn_bold, FontWeight.Bold),
    Font(R.font.vazirmatn_extrabold, FontWeight.ExtraBold),
)

private fun typography(text: Color, sub: Color): Typography {
    val base = TextStyle(fontFamily = Vazirmatn, color = text)
    return Typography(
        displaySmall = base.copy(fontSize = 30.sp, fontWeight = FontWeight.ExtraBold, lineHeight = 34.sp),
        headlineSmall = base.copy(fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, lineHeight = 22.sp),
        titleMedium = base.copy(fontSize = 15.sp, fontWeight = FontWeight.Bold, lineHeight = 20.sp),
        titleSmall = base.copy(fontSize = 13.sp, fontWeight = FontWeight.Bold, lineHeight = 18.sp),
        bodyLarge = base.copy(fontSize = 14.sp, lineHeight = 22.sp),
        bodyMedium = base.copy(fontSize = 13.sp, lineHeight = 20.sp),
        bodySmall = base.copy(fontSize = 11.5.sp, lineHeight = 18.sp, color = sub),
        labelLarge = base.copy(fontSize = 12.sp, fontWeight = FontWeight.Bold),
        labelMedium = base.copy(fontSize = 11.sp, fontWeight = FontWeight.Bold),
        labelSmall = base.copy(fontSize = 10.sp, fontWeight = FontWeight.Medium, color = sub),
    )
}

private val DarkTypography = typography(DarkPalette.text, DarkPalette.sub)
private val LightTypography = typography(LightPalette.text, LightPalette.sub)

private fun colorScheme(p: QPalette) = if (p.dark) {
    darkColorScheme(
        primary = p.mint, onPrimary = p.deep, secondary = p.gold, onSecondary = p.deep,
        background = p.bg, onBackground = p.text, surface = p.sheet, onSurface = p.text,
        surfaceVariant = p.cardTop, onSurfaceVariant = p.sub, outline = p.lineBase.copy(alpha = 0.3f), error = p.red,
    )
} else {
    lightColorScheme(
        primary = p.mint, onPrimary = p.deep, secondary = p.gold, onSecondary = p.deep,
        background = p.bg, onBackground = p.text, surface = p.sheet, onSurface = p.text,
        surfaceVariant = p.tileTop, onSurfaceVariant = p.sub, outline = p.lineBase.copy(alpha = 0.35f), error = p.red,
    )
}

private val DarkScheme = colorScheme(DarkPalette)
private val LightScheme = colorScheme(LightPalette)

/** اپ همیشه راست‌به‌چپ است، مستقل از زبان دستگاه */
@Composable
fun QeymatTheme(dark: Boolean = true, content: @Composable () -> Unit) {
    val palette = if (dark) DarkPalette else LightPalette
    // پیش از خوانده شدن در فرزندان تنظیم می‌شود؛ تغییرش همه‌ی خواننده‌ها را تازه می‌کند
    if (Q.palette !== palette) Q.palette = palette
    MaterialTheme(
        colorScheme = if (dark) DarkScheme else LightScheme,
        typography = if (dark) DarkTypography else LightTypography,
    ) {
        CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl, content = content)
    }
}
