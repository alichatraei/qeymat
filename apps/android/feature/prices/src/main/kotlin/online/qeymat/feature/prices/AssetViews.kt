package online.qeymat.feature.prices

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import online.qeymat.core.designsystem.Q
import online.qeymat.core.designsystem.QIcons
import online.qeymat.core.designsystem.component.AssetTile
import online.qeymat.core.designsystem.component.ChangeLabel
import online.qeymat.core.designsystem.component.NumText
import online.qeymat.core.designsystem.component.StarButton
import online.qeymat.core.model.Asset
import online.qeymat.core.model.format.Fa

fun Asset.enLine(): String = listOf(nameEn, symbol.replace('_', ' ')).filter { it.isNotBlank() }.distinct().joinToString(" · ")

/** ردیف فهرستی یک دارایی */
@Composable
fun AssetRow(
    asset: Asset,
    favorite: Boolean,
    modifier: Modifier = Modifier,
    edit: Boolean = false,
    dragging: Boolean = false,
    handle: Modifier = Modifier,
    badge: String? = null,
    onStar: () -> Unit,
    trailing: (@Composable () -> Unit)? = null,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(bottom = 8.dp)
            .scale(if (dragging) 1.02f else 1f)
            .clip(RoundedCornerShape(16.dp))
            .background(if (Q.isDark) Q.Raised else Q.CardTop)
            .border(
                1.dp,
                when {
                    dragging -> Q.Mint
                    edit -> Q.line(0.4f)
                    else -> Q.line(0.12f)
                },
                RoundedCornerShape(16.dp),
            )
            .padding(horizontal = 10.dp, vertical = 9.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        if (edit) {
            Icon(QIcons.Handle, contentDescription = "جابه‌جایی", tint = Q.Sub, modifier = handle.size(22.dp))
        }
        AssetTile(asset, 40.dp)
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(asset.nameFa, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Q.Text, maxLines = 1)
                if (badge != null) {
                    Text(
                        badge,
                        fontSize = 9.5.sp,
                        fontWeight = FontWeight.Bold,
                        color = Q.Gold,
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(Q.Gold.copy(alpha = 0.14f))
                            .padding(horizontal = 6.dp, vertical = 1.dp),
                    )
                }
            }
            Text(asset.enLine(), fontSize = 10.5.sp, color = Q.Sub, maxLines = 1)
        }
        Column(horizontalAlignment = Alignment.End) {
            // فاز ۲: رنگ قیمت از جهت تغییر می‌آید، مثل درصد
            NumText(Fa.short(asset.sell, asset.isUsd), fontSize = 13.5.sp, fontWeight = FontWeight.ExtraBold, color = Q.trend(asset.changePercent))
            Spacer(Modifier.height(2.dp))
            ChangeLabel(asset.changePercent)
        }
        if (trailing != null) trailing() else StarButton(favorite, onClick = onStar)
    }
}

/** کارت شبکه‌ای یک دارایی؛ هم‌عرض ستون تا شبکه مرتب بماند */
@Composable
fun AssetGridCard(
    asset: Asset,
    favorite: Boolean,
    modifier: Modifier = Modifier,
    edit: Boolean = false,
    dragging: Boolean = false,
    handle: Modifier = Modifier,
    onStar: () -> Unit,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(bottom = 10.dp)
            .scale(if (dragging) 1.02f else 1f)
            .clip(RoundedCornerShape(20.dp))
            .background(Q.card)
            .border(1.dp, if (dragging) Q.Mint else if (edit) Q.line(0.4f) else Q.line(0.16f), RoundedCornerShape(20.dp))
            .padding(start = 12.dp, end = 8.dp, top = 12.dp, bottom = 12.dp),
    ) {
        Row(verticalAlignment = Alignment.Top) {
            AssetTile(asset, 42.dp)
            Spacer(Modifier.weight(1f))
            if (edit) {
                Icon(QIcons.Handle, contentDescription = "جابه‌جایی", tint = Q.Muted, modifier = handle.padding(top = 8.dp, end = 4.dp).size(18.dp))
            }
            StarButton(favorite, onClick = onStar)
        }
        Spacer(Modifier.height(10.dp))
        Text(asset.nameFa, fontSize = 13.sp, fontWeight = FontWeight.Bold, maxLines = 1, color = Q.Text)
        Text(asset.enLine(), fontSize = 10.sp, color = Q.Sub, maxLines = 1)
        Spacer(Modifier.height(8.dp))
        NumText(Fa.short(asset.sell, asset.isUsd), fontSize = 16.sp, fontWeight = FontWeight.ExtraBold, color = Q.trend(asset.changePercent))
        Spacer(Modifier.height(2.dp))
        ChangeLabel(asset.changePercent)
    }
}

/* ---------- دایره v1 و سنجه v2 (فاز ۲) — هندسهٔ دیزاین در viewBox صد ---------- */

private const val GAUGE_START = 75f
private const val GAUGE_SWEEP = 300f

private fun polar(center: androidx.compose.ui.geometry.Offset, deg: Float, r: Float) =
    androidx.compose.ui.geometry.Offset(
        center.x + r * kotlin.math.cos(Math.toRadians(deg.toDouble())).toFloat(),
        center.y + r * kotlin.math.sin(Math.toRadians(deg.toDouble())).toFloat(),
    )

/** جای عقربه در بازهٔ امروز؛ بدون دامنه از درصد تغییر تخمین می‌خورد */
private fun gaugePosition(asset: Asset): Float {
    val low = asset.dayLow
    val high = asset.dayHigh
    val pos = if (low != null && high != null && high > low) {
        ((asset.sell - low) / (high - low)).toFloat()
    } else {
        0.5f + (asset.changePercent / 4).toFloat()
    }
    return pos.coerceIn(0.04f, 0.96f)
}

/**
 * خانهٔ دایره‌ای: حلقه با شکاف ۴۵ درجه (هم‌راستای حلقهٔ Q) که کمان رنگی‌اش
 * به اندازهٔ تغییر امروز پر می‌شود؛ یا سنجهٔ ۳۰۰ درجه با عقربه در بازهٔ امروز.
 */
@Composable
fun AssetRingCard(
    asset: Asset,
    dial: Boolean,
    modifier: Modifier = Modifier,
    featured: Boolean = false,
    dragging: Boolean = false,
) {
    val color = Q.trend(asset.changePercent)
    val line = Q.line(0.16f)
    val lineStrong = Q.line(0.4f)
    val surface = Q.Sheet
    val mintDot = if (Q.isDark) Color(0xFF8FD8B8) else Color(0xFF1EB17A)
    val flat = kotlin.math.abs(asset.changePercent) < 0.005
    val pos = gaugePosition(asset)

    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(bottom = 6.dp)
            .scale(if (dragging) 1.03f else 1f)
            .aspectRatio(1f),
        contentAlignment = Alignment.Center,
    ) {
        androidx.compose.foundation.Canvas(Modifier.fillMaxSize()) {
            val unit = size.minDimension / 104f
            val c = center
            fun r(value: Float) = value * unit
            if (!dial) {
                // دایره v1: track با شکاف و کمان رنگی به اندازهٔ |تغییر|
                val rect = androidx.compose.ui.geometry.Rect(c - androidx.compose.ui.geometry.Offset(r(46f), r(46f)), androidx.compose.ui.geometry.Size(r(92f), r(92f)))
                drawCircle(surface, r(46f), c)
                drawArc(line, 67.5f, 315f, false, rect.topLeft, rect.size, style = androidx.compose.ui.graphics.drawscope.Stroke(r(1.6f)))
                if (!flat) {
                    val sweep = 315f * (0.14f + (kotlin.math.abs(asset.changePercent).toFloat() / 3f).coerceAtMost(1f) * 0.86f)
                    drawArc(color, 67.5f, sweep, false, rect.topLeft, rect.size, style = androidx.compose.ui.graphics.drawscope.Stroke(r(2.6f), cap = androidx.compose.ui.graphics.StrokeCap.Round))
                }
                val mark = polar(c, 45f, r(46f))
                drawRoundRect(color, androidx.compose.ui.geometry.Offset(mark.x - r(4f), mark.y - r(4f)), androidx.compose.ui.geometry.Size(r(8f), r(8f)), androidx.compose.ui.geometry.CornerRadius(r(1.7f)))
            } else {
                // سنجه v2: ۳۱ درجه، کمان از نقطهٔ آغاز روز تا جای فعلی، عقربه و نقطهٔ نعنایی
                drawCircle(surface, r(41f), c)
                for (i in 0..30) {
                    val angle = GAUGE_START + GAUGE_SWEEP * i / 30f
                    val from = polar(c, angle, r(if (i % 5 == 0) 46.5f else 48f))
                    val to = polar(c, angle, r(50f))
                    drawLine(lineStrong, from, to, r(1f))
                }
                val rect = androidx.compose.ui.geometry.Rect(c - androidx.compose.ui.geometry.Offset(r(44f), r(44f)), androidx.compose.ui.geometry.Size(r(88f), r(88f)))
                drawArc(line, GAUGE_START, GAUGE_SWEEP, false, rect.topLeft, rect.size, style = androidx.compose.ui.graphics.drawscope.Stroke(r(2.4f), cap = androidx.compose.ui.graphics.StrokeCap.Round))
                if (!flat) {
                    val a0 = GAUGE_START + GAUGE_SWEEP * minOf(0.5f, pos)
                    val sweep = GAUGE_SWEEP * kotlin.math.abs(pos - 0.5f)
                    drawArc(color, a0, sweep, false, rect.topLeft, rect.size, style = androidx.compose.ui.graphics.drawscope.Stroke(r(3.4f), cap = androidx.compose.ui.graphics.StrokeCap.Round))
                }
                drawCircle(Q.Muted, r(1f), polar(c, GAUGE_START + GAUGE_SWEEP * 0.5f, r(40.5f)))
                val needle = GAUGE_START + GAUGE_SWEEP * pos
                drawLine(color, polar(c, needle, r(37f)), polar(c, needle, r(50f)), r(2.6f), cap = androidx.compose.ui.graphics.StrokeCap.Round)
                val dot = polar(c, 45f, r(44f))
                drawRoundRect(mintDot, androidx.compose.ui.geometry.Offset(dot.x - r(3.4f), dot.y - r(3.4f)), androidx.compose.ui.geometry.Size(r(6.8f), r(6.8f)), androidx.compose.ui.geometry.CornerRadius(r(1.5f)))
            }
        }
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            AssetTile(asset, if (featured) 48.dp else 32.dp)
            Spacer(Modifier.height(4.dp))
            Text(asset.nameFa, fontSize = if (featured) 14.sp else 11.5.sp, color = Q.Sub, maxLines = 1, modifier = Modifier.padding(horizontal = 24.dp))
            NumText(Fa.short(asset.sell, asset.isUsd), fontSize = if (featured) 26.sp else 15.sp, fontWeight = FontWeight.ExtraBold, color = Q.trend(asset.changePercent))
            ChangeLabel(asset.changePercent)
        }
    }
}

/** دو کادر اطلاعات کنار هم (خرید / فروش) */
@Composable
fun InfoBox(label: String, value: String, modifier: Modifier = Modifier, small: Boolean = false) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(16.dp))
            .background(Q.Raised)
            .border(1.dp, Q.line(0.16f), RoundedCornerShape(16.dp))
            .padding(12.dp),
    ) {
        Text(label, fontSize = 10.5.sp, color = Q.Sub)
        Spacer(Modifier.height(4.dp))
        NumText(value, fontSize = if (small) 13.sp else 15.sp, fontWeight = FontWeight.ExtraBold, color = Q.Text)
    }
}
