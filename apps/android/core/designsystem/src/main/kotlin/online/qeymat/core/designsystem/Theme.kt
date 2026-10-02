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

/** سبز جنگلی تیره، طلایی و نعنایی — طراحی اصلی */
val DarkPalette = QPalette(
    dark = true,
    deep = Color(0xFF06120D),
    bg = Color(0xFF0B1D17),
    sheet = Color(0xFF0F251C),
    bar = Color(0xFF0E231B),
    cardTop = Color(0xFF153227),
    cardBottom = Color(0xFF0E241C),
    tileTop = Color(0xFF1B3C2F),
    tileBottom = Color(0xFF0C231A),
    segOn = Color(0xFF1D3B2E),
    gold = Color(0xFFD8B56C),
    goldLight = Color(0xFFE6C987),
    goldDark = Color(0xFF6B5326),
    mint = Color(0xFF4FD6A4),
    red = Color(0xFFEF6F66),
    text = Color(0xFFECE7DA),
    sub = Color(0xFF8FA89B),
    soft = Color(0xFFA9B8AC),
    muted = Color(0xFF5F7A6D),
    toggleOn = Color(0xFF2F8F6D),
    toggleOff = Color(0xFF1C3A2D),
    lineBase = Color(0xFFD8B56C),
    field = Color(0x33000000),
    raised = Color(0x08FFFFFF),
    shadow = Color(0xFF000000),
    scrim = Color(0xB3030C08),
)

/** کاغذی گرم با همان سبز و طلایی، پررنگ‌تر برای خوانایی روی زمینه‌ی روشن */
val LightPalette = QPalette(
    dark = false,
    deep = Color(0xFFFFFFFF),
    bg = Color(0xFFF3F5F0),
    sheet = Color(0xFFFFFFFF),
    bar = Color(0xFFFFFFFF),
    cardTop = Color(0xFFFFFFFF),
    cardBottom = Color(0xFFF9FBF8),
    tileTop = Color(0xFFF1F5F1),
    tileBottom = Color(0xFFE3ECE6),
    segOn = Color(0xFFFFFFFF),
    gold = Color(0xFFA67B26),
    goldLight = Color(0xFF94681A),
    goldDark = Color(0xFFEADBB8),
    mint = Color(0xFF0E9A69),
    red = Color(0xFFD5473D),
    text = Color(0xFF15241D),
    sub = Color(0xFF5D7067),
    soft = Color(0xFF465850),
    muted = Color(0xFF8D9C94),
    toggleOn = Color(0xFF14A06F),
    toggleOff = Color(0xFFD3DCD6),
    lineBase = Color(0xFF7D8F74),
    field = Color(0xFFEDF1EC),
    raised = Color(0xFFF7F9F6),
    shadow = Color(0xFF29473A),
    scrim = Color(0x80142A20),
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
