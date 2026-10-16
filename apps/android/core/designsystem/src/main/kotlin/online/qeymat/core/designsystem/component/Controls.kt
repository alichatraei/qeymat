package online.qeymat.core.designsystem.component

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.BiasAbsoluteAlignment
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDirection
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import online.qeymat.core.designsystem.Q
import online.qeymat.core.designsystem.QIcons
import online.qeymat.core.designsystem.Vazirmatn

/**
 * متن عددی. عدد خالص («۲۳۴٬۷۰۰»، «+۱٫۲٪») چپ‌به‌راست نمایش داده می‌شود تا
 * علامت و ارقام جابه‌جا نشوند؛ عدد همراه واژه («۲۳۹ میلیون») راست‌به‌چپ.
 */
fun numberDirection(text: String): TextDirection =
    if (text.any { it in '؀'..'ۿ' && it !in '۰'..'۹' && it != '٬' && it != '٫' && it != '٪' }) TextDirection.Rtl
    else TextDirection.Ltr

@Composable
fun NumText(
    text: String,
    modifier: Modifier = Modifier,
    style: TextStyle = MaterialTheme.typography.bodyMedium,
    color: Color = Color.Unspecified,
    fontWeight: FontWeight? = null,
    fontSize: androidx.compose.ui.unit.TextUnit = androidx.compose.ui.unit.TextUnit.Unspecified,
) {
    Text(
        text = text,
        modifier = modifier,
        color = color,
        fontWeight = fontWeight,
        fontSize = fontSize,
        maxLines = 1,
        style = style.copy(textDirection = numberDirection(text)),
    )
}

/** کلیک بدون موج — ظاهر طراحی دکمه‌ها با فشردن کمی کوچک می‌شوند */
fun Modifier.quietClick(enabled: Boolean = true, onClick: () -> Unit): Modifier = this.then(
    Modifier.clickable(
        enabled = enabled,
        role = Role.Button,
        interactionSource = null,
        indication = null,
        onClick = onClick,
    ),
)

/** سایه‌ی کارت: در تم تاریک عمیق، در تم روشن نرم و کم */
fun Modifier.qShadow(shape: androidx.compose.ui.graphics.Shape, elevation: Dp = 14.dp): Modifier = this.then(
    if (Q.isDark) Modifier.shadow(elevation, shape, ambientColor = Q.Shadow, spotColor = Q.Shadow)
    else Modifier.shadow(elevation * 0.45f, shape, ambientColor = Q.Shadow.copy(alpha = 0.18f), spotColor = Q.Shadow.copy(alpha = 0.22f)),
)

/** کارت شیشه‌ای با گرادیان سبز و لبه‌ی طلایی */
@Composable
fun QCard(
    modifier: Modifier = Modifier,
    radius: Dp = 22.dp,
    padding: Dp = 16.dp,
    borderAlpha: Float = 0.22f,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(
        modifier = modifier
            .qShadow(RoundedCornerShape(radius))
            .clip(RoundedCornerShape(radius))
            .background(Q.card)
            .border(1.dp, Q.line(borderAlpha), RoundedCornerShape(radius))
            .padding(padding),
        content = content,
    )
}

enum class PillTone { Gold, Mint, Sub, Red }

@Composable
fun QPill(
    text: String,
    modifier: Modifier = Modifier,
    icon: ImageVector? = null,
    tone: PillTone = PillTone.Gold,
    large: Boolean = false,
    dashed: Boolean = false,
    enabled: Boolean = true,
    onClick: () -> Unit,
) {
    // فاز ۲: دکمهٔ پیش‌فرض خنثی است (هیرلاین + متن اصلی)؛ طلایی فقط برای پلاس
    val color = when (tone) {
        PillTone.Gold -> Q.Text
        PillTone.Mint -> Q.Mint
        PillTone.Sub -> Q.Sub
        PillTone.Red -> Q.Red
    }
    val border = when (tone) {
        PillTone.Mint -> Q.Mint
        PillTone.Sub -> Q.line(0.3f)
        PillTone.Red -> Q.Red.copy(alpha = 0.5f)
        PillTone.Gold -> Q.line(0.4f)
    }
    Row(
        modifier = modifier
            .height(if (dashed) 44.dp else if (large) 44.dp else 34.dp)
            .clip(CircleShape)
            .border(BorderStroke(1.dp, if (enabled) border else border.copy(alpha = 0.3f)), CircleShape)
            .background(if (tone == PillTone.Mint) Q.Mint.copy(alpha = 0.06f) else Color.Transparent)
            .quietClick(enabled, onClick)
            .padding(horizontal = if (large) 18.dp else 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp, Alignment.CenterHorizontally),
    ) {
        if (icon != null) Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(16.dp))
        Text(
            text = text,
            color = if (enabled) color else color.copy(alpha = 0.5f),
            fontSize = if (large) 13.sp else 12.sp,
            fontWeight = FontWeight.Bold,
            maxLines = 1,
        )
    }
}

@Composable
fun QIconButton(
    icon: ImageVector,
    contentDescription: String,
    modifier: Modifier = Modifier,
    tone: PillTone = PillTone.Gold,
    size: Dp = 40.dp,
    onClick: () -> Unit,
) {
    val color = if (tone == PillTone.Mint) Q.Mint else Q.Text
    Box(
        modifier = modifier
            .size(size)
            .clip(CircleShape)
            .border(1.dp, Q.line(0.3f), CircleShape)
            .quietClick(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = contentDescription, tint = color, modifier = Modifier.size(size * 0.48f))
    }
}

@Composable
fun QChip(label: String, selected: Boolean, onClick: () -> Unit) {
    val color by animateColorAsState(if (selected) Q.Mint else Q.Sub, label = "chip")
    Box(
        modifier = Modifier
            .height(36.dp)
            .clip(CircleShape)
            .background(if (selected) Q.Mint.copy(alpha = 0.1f) else Color.Transparent)
            .border(1.dp, if (selected) Q.Mint else Q.line(0.22f), CircleShape)
            .quietClick(onClick = onClick)
            .padding(horizontal = 16.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(label, color = color, fontSize = 12.sp, fontWeight = FontWeight.Bold, maxLines = 1)
    }
}

/** کنترل چندگزینه‌ای کپسولی (بازه‌ی نمودار) */
@Composable
fun <T> QSegmented(
    options: List<T>,
    selected: T,
    label: (T) -> String,
    modifier: Modifier = Modifier,
    onSelect: (T) -> Unit,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(CircleShape)
            .background(Q.Field)
            .border(1.dp, Q.line(0.14f), CircleShape)
            .padding(3.dp),
    ) {
        for (option in options) {
            val on = option == selected
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(32.dp)
                    .clip(CircleShape)
                    .background(if (on) Q.SegOn else Color.Transparent)
                    .quietClick { onSelect(option) },
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    label(option),
                    color = if (on) Q.Mint else Q.Sub,
                    fontSize = 11.5.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                )
            }
        }
    }
}

/**
 * نوار دسته‌ها: همان کپسول کنترل بازه‌ی نمودار، با گزینه‌های آیکون‌دار و
 * اسکرول افقی؛ گزینه‌ی انتخاب‌شده خودش به دید می‌آید.
 */
@Composable
fun <T> QTabTrack(
    options: List<T>,
    selected: T,
    label: (T) -> String,
    icon: (T) -> ImageVector?,
    modifier: Modifier = Modifier,
    onSelect: (T) -> Unit,
) {
    val listState = androidx.compose.foundation.lazy.rememberLazyListState()
    androidx.compose.runtime.LaunchedEffect(selected) {
        val index = options.indexOf(selected)
        if (index >= 0) runCatching { listState.animateScrollToItem((index - 1).coerceAtLeast(0)) }
    }
    androidx.compose.foundation.lazy.LazyRow(
        state = listState,
        modifier = modifier
            .fillMaxWidth()
            .clip(CircleShape)
            .background(Q.Field)
            .border(1.dp, Q.line(0.14f), CircleShape),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(4.dp),
        horizontalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        items(options.size) { index ->
            val option = options[index]
            val on = option == selected
            val color by animateColorAsState(if (on) Q.Mint else Q.Sub, label = "track")
            Row(
                modifier = Modifier
                    .height(36.dp)
                    .then(if (on) Modifier.qShadow(CircleShape, 4.dp) else Modifier)
                    .clip(CircleShape)
                    .background(if (on) Q.SegOn else Color.Transparent)
                    .quietClick { onSelect(option) }
                    .padding(horizontal = 14.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                icon(option)?.let { Icon(it, contentDescription = null, tint = color, modifier = Modifier.size(16.dp)) }
                Text(label(option), color = color, fontSize = 12.sp, fontWeight = if (on) FontWeight.ExtraBold else FontWeight.SemiBold, maxLines = 1)
            }
        }
    }
}

@Composable
fun QToggle(checked: Boolean, enabled: Boolean = true, onChange: (Boolean) -> Unit) {
    // مثل طراحی: روشن = دکمه سمت راست، مستقل از جهت چیدمان
    val bias by animateFloatAsState(if (checked) 1f else -1f, label = "toggle")
    Box(
        modifier = Modifier
            .width(44.dp)
            .height(26.dp)
            .clip(CircleShape)
            .background(if (checked) Q.ToggleOn else Q.ToggleOff)
            .quietClick(enabled) { onChange(!checked) }
            .padding(3.dp),
        contentAlignment = BiasAbsoluteAlignment(bias, 0f),
    ) {
        Box(
            modifier = Modifier
                .size(20.dp)
                .clip(CircleShape)
                .background(if (Q.isDark) Q.Text else Color.White),
        )
    }
}

@Composable
fun StarButton(active: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Box(
        modifier = modifier
            .size(34.dp)
            .clip(CircleShape)
            .quietClick(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            if (active) QIcons.StarFilled else QIcons.Star,
            contentDescription = if (active) "حذف از علاقه‌مندی" else "افزودن به علاقه‌مندی",
            tint = if (active) Q.Gold else Q.Muted,
            modifier = Modifier.size(20.dp),
        )
    }
}

/** فیلد جست‌وجوی کپسولی */
@Composable
fun QSearchField(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    modifier: Modifier = Modifier,
    autoFocus: Boolean = false,
) {
    val focus = remember { androidx.compose.ui.focus.FocusRequester() }
    Row(
        modifier = modifier
            .height(44.dp)
            .clip(CircleShape)
            .background(Q.Field)
            .border(1.dp, Q.line(0.3f), CircleShape)
            .padding(horizontal = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(QIcons.Search, contentDescription = null, tint = Q.Sub, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(8.dp))
        Box(Modifier.weight(1f), contentAlignment = Alignment.CenterStart) {
            if (value.isEmpty()) Text(placeholder, color = Q.Muted, fontSize = 13.sp, maxLines = 1)
            BasicTextField(
                value = value,
                onValueChange = onValueChange,
                singleLine = true,
                textStyle = TextStyle(fontFamily = Vazirmatn, color = Q.Text, fontSize = 13.sp),
                cursorBrush = SolidColor(Q.Mint),
                modifier = Modifier
                    .fillMaxWidth()
                    .then(if (autoFocus) Modifier.focusRequester(focus) else Modifier),
            )
        }
        if (value.isNotEmpty()) {
            Icon(
                QIcons.Close,
                contentDescription = "پاک کردن",
                tint = Q.Sub,
                modifier = Modifier
                    .size(18.dp)
                    .quietClick { onValueChange("") },
            )
        }
    }
    if (autoFocus) {
        androidx.compose.runtime.LaunchedEffect(Unit) { runCatching { focus.requestFocus() } }
    }
}

/** کادر ورودی بزرگ وسط‌چین (شماره موبایل، کد تأیید، مبلغ) */
@Composable
fun QInputBox(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    modifier: Modifier = Modifier,
    keyboard: KeyboardOptions = KeyboardOptions.Default,
    letterSpacing: androidx.compose.ui.unit.TextUnit = 1.sp,
    fontSize: androidx.compose.ui.unit.TextUnit = 18.sp,
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(52.dp)
            .clip(CircleShape)
            .background(Q.Field)
            .border(1.dp, Q.line(0.35f), CircleShape)
            .padding(horizontal = 16.dp),
        contentAlignment = Alignment.Center,
    ) {
        if (value.isEmpty()) Text(placeholder, color = Q.Muted, fontSize = 13.sp)
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            singleLine = true,
            keyboardOptions = keyboard,
            textStyle = TextStyle(
                fontFamily = Vazirmatn,
                color = Q.Text,
                fontSize = fontSize,
                fontWeight = FontWeight.Bold,
                letterSpacing = letterSpacing,
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                textDirection = TextDirection.Ltr,
            ),
            cursorBrush = SolidColor(Q.Mint),
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

/** عنوان بخش فهرست: «ارزهای منتخب · ۱۰ مورد» */
@Composable
fun SectionHeader(
    title: String,
    modifier: Modifier = Modifier,
    hint: String? = null,
    trailing: @Composable RowScope.() -> Unit = {},
) {
    Row(
        modifier = modifier.fillMaxWidth().padding(top = 18.dp, bottom = 10.dp, start = 2.dp, end = 2.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(title, color = Q.Sub, fontSize = 13.sp, fontWeight = FontWeight.Bold)
        Spacer(Modifier.weight(1f))
        if (hint != null) Text(hint, color = Q.Muted, fontSize = 10.sp)
        trailing()
    }
}

/** نقطه‌ی «زنده» با تپش */
@Composable
fun LiveBadge() {
    val transition = androidx.compose.animation.core.rememberInfiniteTransition(label = "live")
    val alpha by transition.animateFloat(
        initialValue = 1f,
        targetValue = 0.4f,
        animationSpec = androidx.compose.animation.core.infiniteRepeatable(
            animation = androidx.compose.animation.core.tween(900),
            repeatMode = androidx.compose.animation.core.RepeatMode.Reverse,
        ),
        label = "liveAlpha",
    )
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
        Box(
            Modifier
                .size(7.dp)
                .clip(CircleShape)
                .background(Q.Mint.copy(alpha = alpha)),
        )
        Text("زنده", color = Q.Mint, fontSize = 10.5.sp, fontWeight = FontWeight.Bold)
    }
}

/** نوار اطلاع سبز */
@Composable
fun InfoStrip(text: String, icon: ImageVector, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(Q.Mint.copy(alpha = 0.08f))
            .border(1.dp, Q.Mint.copy(alpha = 0.35f), RoundedCornerShape(16.dp))
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Icon(icon, contentDescription = null, tint = Q.Mint, modifier = Modifier.size(18.dp))
        Text(text, color = Q.Mint, fontSize = 11.5.sp, lineHeight = 18.sp)
    }
}

/** راهنمای خاکستری با آیکون طلایی */
@Composable
fun TipBox(text: String, icon: ImageVector = QIcons.Info, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .border(1.dp, Q.line(0.14f), RoundedCornerShape(16.dp))
            .padding(horizontal = 14.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Icon(icon, contentDescription = null, tint = Q.Gold, modifier = Modifier.size(18.dp).padding(top = 2.dp))
        Text(text, color = Q.Soft, fontSize = 11.5.sp, lineHeight = 19.sp)
    }
}

@Composable
fun BoxScope.EmptyText(text: String) {
    Text(text, color = Q.Muted, fontSize = 12.sp, modifier = Modifier.align(Alignment.Center).padding(vertical = 30.dp))
}
