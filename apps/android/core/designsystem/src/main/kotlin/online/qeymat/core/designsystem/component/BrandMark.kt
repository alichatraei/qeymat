package online.qeymat.core.designsystem.component

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.addPathNodes
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/** نشان Q «قیمت» — همان هندسه‌ی لوگوی وب (scripts/generate-icons.mjs) */
val QeymatMarkVector: ImageVector by lazy {
    ImageVector.Builder(
        name = "qeymatMark",
        defaultWidth = 64.dp,
        defaultHeight = 64.dp,
        viewportWidth = 64f,
        viewportHeight = 64f,
    ).apply {
        addPath(
            pathData = addPathNodes("M15 0h34a15 15 0 0 1 15 15v34a15 15 0 0 1-15 15H15A15 15 0 0 1 0 49V15A15 15 0 0 1 15 0Z"),
            fill = Brush.linearGradient(listOf(Color(0xFF11443A), Color(0xFF072019)), Offset(0f, 0f), Offset(64f, 64f)),
        )
        addPath(
            pathData = addPathNodes("M15 0h34a15 15 0 0 1 15 15v34a15 15 0 0 1-15 15H15A15 15 0 0 1 0 49V15A15 15 0 0 1 15 0Z"),
            fill = Brush.radialGradient(
                listOf(Color(0x478FD8B8), Color(0x008FD8B8)),
                center = Offset(50f, 9f),
                radius = 48f,
            ),
        )
        val cream = Brush.verticalGradient(listOf(Color(0xFFFBF8F0), Color(0xFFE9E3D3)), startY = 12f, endY = 49f)
        addPath(
            pathData = addPathNodes("M45.86 37.90 A17.5 17.5 0 1 0 29.39 47.99 L29.65 40.49 A10 10 0 1 1 39.06 34.73 Z"),
            fill = cream,
        )
        addPath(
            pathData = addPathNodes("M28.39 47.88 L28.39 34.30 L29.39 33.70 L35.79 28.90 L35.79 47.01 A17.5 17.5 0 0 1 28.39 47.88 Z"),
            fill = cream,
        )
        addPath(
            pathData = addPathNodes("M42.5 43.2h3.6a1.3 1.3 0 0 1 1.3 1.3v3.6a1.3 1.3 0 0 1-1.3 1.3h-3.6a1.3 1.3 0 0 1-1.3-1.3v-3.6a1.3 1.3 0 0 1 1.3-1.3Z"),
            fill = SolidColor(Color(0xFF8FD8B8)),
        )
    }.build()
}

@Composable
fun BrandMark(size: Dp = 42.dp, modifier: Modifier = Modifier) {
    Image(
        imageVector = QeymatMarkVector,
        contentDescription = "قیمت",
        modifier = modifier
            .size(size)
            .shadow(6.dp, RoundedCornerShape(size * 0.3f))
            .clip(RoundedCornerShape(size * 0.3f)),
    )
}
