package online.qeymat.core.designsystem.component

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import online.qeymat.core.designsystem.Q

/**
 * فاز شیشه‌ای: کاشی گلس بدون blur واقعی (مطابق جایگزین مستند دیزاین) —
 * گرادیان سفید روی زمینهٔ برند + لبهٔ روشن. روی زمینهٔ هاله‌دار، حس شیشه می‌دهد.
 */
fun Modifier.glassTile(radius: Dp = 20.dp): Modifier {
    val dark = Q.isDark
    val top = if (dark) Color.White.copy(alpha = 0.16f) else Color.White.copy(alpha = 0.78f)
    val bottom = if (dark) Color.White.copy(alpha = 0.04f) else Color.White.copy(alpha = 0.42f)
    val edge = if (dark) Color.White.copy(alpha = 0.22f) else Color.White.copy(alpha = 0.9f)
    val shape = RoundedCornerShape(radius)
    return this
        .clip(shape)
        .background(Brush.linearGradient(listOf(top, bottom)))
        .border(1.dp, edge, shape)
}

/** هاله‌های تار زمینه؛ با گرادیان شعاعی کشیده می‌شوند تا blur لازم نباشد */
@Composable
fun GlassOrbs(modifier: Modifier = Modifier) {
    val dark = Q.isDark
    val orbs: List<Triple<Color, Float, Offset>> = if (dark) {
        listOf(
            Triple(Color(0xFF1EB17A).copy(alpha = 0.32f), 320f, Offset(1.05f, -0.05f)),
            Triple(Color(0xFF8FD8B8).copy(alpha = 0.28f), 280f, Offset(-0.1f, 0.55f)),
            Triple(Color(0xFFE9B949).copy(alpha = 0.14f), 220f, Offset(0.45f, 0.3f)),
            Triple(Color(0xFF0F5643).copy(alpha = 0.5f), 240f, Offset(1.0f, 0.95f)),
        )
    } else {
        listOf(
            Triple(Color(0xFF8FD8B8).copy(alpha = 0.5f), 320f, Offset(1.05f, -0.05f)),
            Triple(Color(0xFFB0DFC8).copy(alpha = 0.6f), 280f, Offset(-0.1f, 0.55f)),
            Triple(Color(0xFFF2C27A).copy(alpha = 0.26f), 220f, Offset(0.45f, 0.3f)),
        )
    }
    Canvas(modifier.fillMaxSize()) {
        for ((color, radius, at) in orbs) {
            val center = Offset(size.width * at.x, size.height * at.y)
            val r = radius * density
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(color, color.copy(alpha = 0f)),
                    center = center,
                    radius = r,
                ),
                radius = r,
                center = center,
            )
        }
    }
}
