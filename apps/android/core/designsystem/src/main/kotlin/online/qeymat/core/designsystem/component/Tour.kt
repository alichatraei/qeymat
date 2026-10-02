package online.qeymat.core.designsystem.component

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.layout.boundsInRoot
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import online.qeymat.core.designsystem.Q

/**
 * تور راهنما با نورافکن.
 *
 * هر بخشی از صفحه که تور باید نشانش دهد با `Modifier.tourTarget("کلید")`
 * جایش را ثبت می‌کند؛ لایه‌ی تور (TourOverlay) دور همان مستطیل را روشن
 * می‌گذارد و توضیح را بالا یا پایینش نشان می‌دهد. اگر هدف روی صفحه نبود
 * (مثلاً قیمت‌ها هنوز نیامده‌اند)، کارت وسط صفحه می‌آید.
 */
@Stable
class TourTargets {
    internal val rects = mutableStateMapOf<String, Rect>()
    operator fun get(key: String): Rect? = rects[key]
}

val LocalTourTargets = staticCompositionLocalOf<TourTargets?> { null }

/** کلیدهای مشترک هدف‌های تور بین اپ و صفحه‌ها */
object TourKeys {
    const val TABS = "tour_tabs"
    const val HERO = "tour_hero"
    const val LIST = "tour_list"
    const val SEARCH = "tour_search"
    fun tab(name: String) = "tour_tab_$name"
}

fun Modifier.tourTarget(key: String): Modifier = composed {
    val targets = LocalTourTargets.current
    if (targets == null) {
        this
    } else {
        DisposableEffect(key, targets) { onDispose { targets.rects.remove(key) } }
        this.onGloballyPositioned { targets.rects[key] = it.boundsInRoot() }
    }
}

/** یک قدم تور؛ target خالی یعنی کارت وسط صفحه */
class TourStep(
    val title: String,
    val body: String,
    val icon: ImageVector,
    val target: String? = null,
    val actionLabel: String? = null,
    val onAction: (() -> Unit)? = null,
    val illustration: (@Composable () -> Unit)? = null,
)

@Composable
fun TourOverlay(
    steps: List<TourStep>,
    index: Int,
    targets: TourTargets,
    onIndex: (Int) -> Unit,
    onFinish: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val step = steps[index]
    val density = LocalDensity.current
    val pad = with(density) { 8.dp.toPx() }
    val target = step.target?.let { targets[it] }?.let {
        Rect(it.left - pad, it.top - pad, it.right + pad, it.bottom + pad)
    }

    // نورافکن نرم بین قدم‌ها جابه‌جا می‌شود؛ بدون هدف، در مرکز جمع می‌شود
    val spec = spring<Float>(dampingRatio = 0.85f, stiffness = 260f)
    val holeAlpha by animateFloatAsState(if (target != null) 1f else 0f, tween(220), label = "holeAlpha")
    val left by animateFloatAsState(target?.left ?: 0f, spec, label = "l")
    val top by animateFloatAsState(target?.top ?: 0f, spec, label = "t")
    val right by animateFloatAsState(target?.right ?: 0f, spec, label = "r")
    val bottom by animateFloatAsState(target?.bottom ?: 0f, spec, label = "b")
    val ring = Q.Mint

    Box(
        modifier
            .fillMaxSize()
            // همه‌ی لمس‌ها مال تور است تا کاربر وسط راهنما جابه‌جا نشود
            .pointerInput(Unit) { detectTapGestures { } },
    ) {
        Canvas(
            Modifier
                .fillMaxSize()
                .graphicsLayer(compositingStrategy = CompositingStrategy.Offscreen),
        ) {
            drawRect(Color(0xFF020906).copy(alpha = 0.74f))
            if (holeAlpha > 0.01f && right > left) {
                val radius = CornerRadius(22.dp.toPx())
                val hole = Size(right - left, bottom - top)
                drawRoundRect(Color.Black.copy(alpha = holeAlpha), Offset(left, top), hole, radius, blendMode = BlendMode.Clear)
                drawRoundRect(ring.copy(alpha = holeAlpha), Offset(left, top), hole, radius, style = Stroke(2.dp.toPx()))
                drawRoundRect(
                    ring.copy(alpha = 0.25f * holeAlpha),
                    Offset(left - 5.dp.toPx(), top - 5.dp.toPx()),
                    Size(hole.width + 10.dp.toPx(), hole.height + 10.dp.toPx()),
                    CornerRadius(26.dp.toPx()),
                    style = Stroke(4.dp.toPx()),
                )
            }
        }

        val gap = with(density) { 14.dp.roundToPx() }
        Layout(
            content = {
                AnimatedContent(
                    targetState = index,
                    transitionSpec = { fadeIn(tween(220)) togetherWith fadeOut(tween(160)) },
                    label = "tourCard",
                ) { current ->
                    TourCard(
                        step = steps[current],
                        index = current,
                        count = steps.size,
                        onBack = { if (current > 0) onIndex(current - 1) },
                        onNext = { if (current < steps.lastIndex) onIndex(current + 1) else onFinish() },
                        onSkip = onFinish,
                    )
                }
            },
            modifier = Modifier.fillMaxSize(),
        ) { measurables, constraints ->
            val side = 18.dp.roundToPx()
            val placeable = measurables.first().measure(
                Constraints(maxWidth = (constraints.maxWidth - 2 * side).coerceAtLeast(0), maxHeight = constraints.maxHeight),
            )
            layout(constraints.maxWidth, constraints.maxHeight) {
                val height = constraints.maxHeight
                val y = when {
                    target == null -> (height - placeable.height) / 2
                    // هدف در نیمه‌ی بالا ← کارت زیرش؛ وگرنه بالایش
                    target.center.y < height / 2f -> (target.bottom.toInt() + gap).coerceAtMost(height - placeable.height - gap)
                    else -> (target.top.toInt() - gap - placeable.height).coerceAtLeast(gap)
                }
                placeable.place(side, y)
            }
        }
    }
}

@Composable
private fun TourCard(
    step: TourStep,
    index: Int,
    count: Int,
    onBack: () -> Unit,
    onNext: () -> Unit,
    onSkip: () -> Unit,
) {
    Column(
        Modifier
            .fillMaxWidth()
            .qShadow(RoundedCornerShape(24.dp), 20.dp)
            .clip(RoundedCornerShape(24.dp))
            .background(Q.Sheet)
            .border(1.dp, Q.line(0.3f), RoundedCornerShape(24.dp))
            .padding(18.dp),
    ) {
        step.illustration?.let {
            Box(Modifier.fillMaxWidth().padding(bottom = 14.dp), contentAlignment = Alignment.Center) { it() }
        }
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(
                Modifier
                    .size(42.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .background(Q.Mint.copy(alpha = 0.14f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(step.icon, contentDescription = null, tint = Q.Mint, modifier = Modifier.size(22.dp))
            }
            Text(step.title, color = Q.Text, fontSize = 16.sp, fontWeight = FontWeight.ExtraBold, modifier = Modifier.weight(1f))
            Text(
                "${online.qeymat.core.model.format.Fa.number(index + 1)} از ${online.qeymat.core.model.format.Fa.number(count)}",
                color = Q.Muted,
                fontSize = 11.sp,
            )
        }
        Text(step.body, color = Q.Soft, fontSize = 13.sp, lineHeight = 22.sp, modifier = Modifier.padding(top = 10.dp))

        if (step.actionLabel != null && step.onAction != null) {
            QPill(
                step.actionLabel,
                icon = step.icon,
                tone = PillTone.Mint,
                large = true,
                modifier = Modifier.fillMaxWidth().padding(top = 14.dp),
                onClick = step.onAction,
            )
        }

        Spacer(Modifier.height(16.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            // نقطه‌های پیشرفت
            Row(horizontalArrangement = Arrangement.spacedBy(5.dp), modifier = Modifier.weight(1f)) {
                repeat(count) { dot ->
                    Box(
                        Modifier
                            .height(6.dp)
                            .width(if (dot == index) 18.dp else 6.dp)
                            .clip(CircleShape)
                            .background(if (dot == index) Q.Mint else Q.line(0.35f)),
                    )
                }
            }
            if (index < count - 1) {
                Text(
                    "رد کردن",
                    color = Q.Muted,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.quietClick(onClick = onSkip).padding(horizontal = 10.dp, vertical = 8.dp),
                )
            }
            if (index > 0) {
                QPill("قبلی", tone = PillTone.Sub, modifier = Modifier.padding(end = 8.dp), onClick = onBack)
            }
            Box(
                Modifier
                    .height(36.dp)
                    .clip(CircleShape)
                    .background(Q.Mint)
                    .quietClick(onClick = onNext)
                    .padding(horizontal = 18.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    if (index < count - 1) "بعدی" else "شروع کنیم",
                    color = if (Q.isDark) Q.Deep else Color.White,
                    fontSize = 12.5.sp,
                    fontWeight = FontWeight.ExtraBold,
                )
            }
        }
    }
}
