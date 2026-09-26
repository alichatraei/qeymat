package online.qeymat.core.designsystem

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.sp

/** پالت طراحی «قیمت»: سبز جنگلی تیره، طلایی و نعنایی */
object Q {
    val Deep = Color(0xFF06120D)
    val Bg = Color(0xFF0D211A)
    val Sheet = Color(0xFF0F251C)
    val CardTop = Color(0xFF153227)
    val CardBottom = Color(0xFF0D221B)
    val TileTop = Color(0xFF1B3C2F)
    val TileBottom = Color(0xFF0C231A)
    val SegOn = Color(0xFF1D3B2E)
    val Gold = Color(0xFFD8B56C)
    val GoldLight = Color(0xFFE6C987)
    val GoldDark = Color(0xFF6B5326)
    val Mint = Color(0xFF4FD6A4)
    val Red = Color(0xFFE0655C)
    val Text = Color(0xFFECE7DA)
    val Sub = Color(0xFF8FA89B)
    val Soft = Color(0xFFA9B8AC)
    val Muted = Color(0xFF5F7A6D)
    val ToggleOn = Color(0xFF2F8F6D)
    val ToggleOff = Color(0xFF163025)

    fun line(alpha: Float = 0.18f) = Gold.copy(alpha = alpha)

    val card: Brush get() = Brush.linearGradient(listOf(CardTop, CardBottom))
    val tile: Brush get() = Brush.linearGradient(listOf(TileTop, TileBottom))

    fun trend(up: Boolean) = if (up) Mint else Red
}

val Vazirmatn = FontFamily(
    Font(R.font.vazirmatn_regular, FontWeight.Normal),
    Font(R.font.vazirmatn_medium, FontWeight.Medium),
    Font(R.font.vazirmatn_semibold, FontWeight.SemiBold),
    Font(R.font.vazirmatn_bold, FontWeight.Bold),
    Font(R.font.vazirmatn_extrabold, FontWeight.ExtraBold),
)

private val base = TextStyle(fontFamily = Vazirmatn, color = Q.Text)

private val QTypography = Typography(
    displaySmall = base.copy(fontSize = 30.sp, fontWeight = FontWeight.ExtraBold, lineHeight = 34.sp),
    headlineSmall = base.copy(fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, lineHeight = 22.sp),
    titleMedium = base.copy(fontSize = 15.sp, fontWeight = FontWeight.Bold, lineHeight = 20.sp),
    titleSmall = base.copy(fontSize = 13.sp, fontWeight = FontWeight.Bold, lineHeight = 18.sp),
    bodyLarge = base.copy(fontSize = 14.sp, lineHeight = 22.sp),
    bodyMedium = base.copy(fontSize = 13.sp, lineHeight = 20.sp),
    bodySmall = base.copy(fontSize = 11.5.sp, lineHeight = 18.sp, color = Q.Sub),
    labelLarge = base.copy(fontSize = 12.sp, fontWeight = FontWeight.Bold),
    labelMedium = base.copy(fontSize = 11.sp, fontWeight = FontWeight.Bold),
    labelSmall = base.copy(fontSize = 10.sp, fontWeight = FontWeight.Medium, color = Q.Sub),
)

private val QColors = darkColorScheme(
    primary = Q.Mint,
    onPrimary = Q.Deep,
    secondary = Q.Gold,
    onSecondary = Q.Deep,
    background = Q.Bg,
    onBackground = Q.Text,
    surface = Q.Sheet,
    onSurface = Q.Text,
    surfaceVariant = Q.CardTop,
    onSurfaceVariant = Q.Sub,
    outline = Q.line(0.3f),
    error = Q.Red,
)

/** اپ همیشه راست‌به‌چپ است، مستقل از زبان دستگاه */
@Composable
fun QeymatTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = QColors, typography = QTypography) {
        CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl, content = content)
    }
}
