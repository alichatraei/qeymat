package online.qeymat.feature.convert

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.requiredSize
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import online.qeymat.core.designsystem.Q
import online.qeymat.core.designsystem.QIcons
import online.qeymat.core.designsystem.component.AssetTile
import online.qeymat.core.designsystem.component.GlassOrbs
import online.qeymat.core.designsystem.component.NumText
import online.qeymat.core.designsystem.component.QSearchField
import online.qeymat.core.designsystem.component.glassTile
import online.qeymat.core.designsystem.component.quietClick
import online.qeymat.core.model.Asset
import online.qeymat.core.model.format.Fa
import org.koin.androidx.compose.koinViewModel

/** مبلغ‌های میان‌بر زیر خط نرخ، مثل وب */
private val QUICK = listOf("100", "500", "1000", "10000")
private val KEYPAD = listOf("1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del")

/** تبدیل شیشه‌ای «دارم / می‌شود» — همتای صفحهٔ وب و بوم نهایی */
@Composable
fun ConvertRoute(viewModel: ConvertViewModel = koinViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var picker by remember { mutableStateOf<String?>(null) }
    var rotated by remember { mutableStateOf(false) }
    val rotation by animateFloatAsState(if (rotated) 180f else 0f, label = "swap")

    val btnBg = if (Q.isDark) Color.White.copy(alpha = 0.08f) else Color.White.copy(alpha = 0.7f)
    val btnEdge = if (Q.isDark) Color.White.copy(alpha = 0.16f) else Color(0xFF0C332A).copy(alpha = 0.12f)

    Box(Modifier.fillMaxSize().background(Q.Bg)) {
        GlassOrbs(Modifier.fillMaxSize())
        Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp)
            .padding(bottom = 110.dp),
    ) {
        Column(Modifier.statusBarsPadding().padding(top = 18.dp, bottom = 14.dp)) {
            Text("تبدیل", fontSize = 25.sp, fontWeight = FontWeight.ExtraBold)
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Box(Modifier.size(7.dp).clip(CircleShape).background(Color(0xFF2ED491)))
                Text("با نرخ لحظه‌ای بازار · نرخ تحلیلی قیمت", fontSize = 13.sp, color = Q.Sub)
            }
        }

        // ------------------------- دارم -------------------------
        Column(Modifier.fillMaxWidth().glassTile(20.dp).padding(horizontal = 16.dp, vertical = 14.dp)) {
            Text("دارم", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Q.Sub)
            AmountText(ConvertFormat.display(state.amountRaw), color = Q.Text, cursor = true)
            WordsLine(if (state.amount >= 1) "${ConvertFormat.words(state.amount)} ${state.from.nameFa}" else "")
            Spacer(Modifier.height(8.dp))
            PickPill(state.from, btnBg, btnEdge) { picker = "from" }
        }

        // دیسک جابه‌جایی روی درز دو کارت
        Box(Modifier.fillMaxWidth().height(10.dp).zIndex(2f), contentAlignment = Alignment.Center) {
            val discBg = if (Q.isDark) Color(0xFFF3EFE5) else Color(0xFF0C332A)
            val discFg = if (Q.isDark) Color(0xFF0C332A) else Color(0xFFF3EFE5)
            Box(
                Modifier
                    .requiredSize(44.dp)
                    .clip(CircleShape)
                    .background(Q.Bg)
                    .padding(3.dp)
                    .clip(CircleShape)
                    .background(discBg)
                    .quietClick {
                        rotated = !rotated
                        viewModel.swap()
                    },
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    QIcons.Swap,
                    contentDescription = "جابه‌جا کردن دو ارز",
                    tint = discFg,
                    modifier = Modifier.size(20.dp).rotate(rotation),
                )
            }
        }

        // ------------------------- می‌شود -------------------------
        Column(Modifier.fillMaxWidth().glassTile(20.dp).padding(horizontal = 16.dp, vertical = 14.dp)) {
            Text("می‌شود", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Q.Sub)
            AmountText(ConvertFormat.amount(state.result), color = Q.Mint, cursor = false)
            WordsLine(if (state.result >= 1) "${ConvertFormat.words(state.result)} ${state.to.nameFa}" else "")
            Spacer(Modifier.height(8.dp))
            PickPill(state.to, btnBg, btnEdge) { picker = "to" }
        }

        // نرخ واحد؛ نرخ خیلی کوچک (مثل تومان به دلار) معکوس نمایش داده می‌شود
        val flip = state.unitRate > 0 && state.unitRate < 0.01
        val rateFrom = if (flip) state.to.nameFa else state.from.nameFa
        val rateTo = if (flip) state.from.nameFa else state.to.nameFa
        val rateValue = if (flip) 1 / state.unitRate else state.unitRate
        Text(
            buildAnnotatedString {
                append("هر ۱ $rateFrom = ")
                withStyle(SpanStyle(color = Q.Text, fontWeight = FontWeight.Bold)) {
                    append(if (state.unitRate > 0) ConvertFormat.amount(rateValue) else "—")
                }
                append(" $rateTo")
            },
            fontSize = 13.sp,
            color = Q.Sub,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
        )

        // مبلغ‌های میان‌بر
        Row(
            Modifier.fillMaxWidth().padding(top = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
        ) {
            for (value in QUICK) {
                Box(
                    Modifier
                        .height(36.dp)
                        .clip(RoundedCornerShape(999.dp))
                        .background(btnBg)
                        .border(1.dp, btnEdge, RoundedCornerShape(999.dp))
                        .quietClick { viewModel.setAmount(value) }
                        .padding(horizontal = 14.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    NumText(ConvertFormat.display(value), fontSize = 14.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        // کی‌پد فارسی داخلی
        val keyBg = if (Q.isDark) Color.White.copy(alpha = 0.07f) else Color.White.copy(alpha = 0.7f)
        Column(Modifier.padding(top = 12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            for (rowKeys in KEYPAD.chunked(3)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    for (key in rowKeys) {
                        val fn = key == "del" || key == "."
                        Box(
                            Modifier
                                .weight(1f)
                                .height(50.dp)
                                .clip(RoundedCornerShape(14.dp))
                                .background(keyBg)
                                .border(1.dp, btnEdge, RoundedCornerShape(14.dp))
                                .quietClick { viewModel.press(key) },
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                when (key) {
                                    "del" -> "⌫"
                                    "." -> "٫"
                                    else -> Fa.digits(key)
                                },
                                fontSize = if (fn) 16.sp else 22.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (fn) Q.Sub else Q.Text,
                            )
                        }
                    }
                }
            }
        }

        Text(
            "عددها تخمینی‌اند و بر اساس نرخ تحلیلی قیمت؛ نرخ خرید و فروش صرافی‌ها ممکن است فرق کند.",
            fontSize = 11.5.sp,
            color = Q.Muted,
            textAlign = TextAlign.Center,
            lineHeight = 18.sp,
            modifier = Modifier.fillMaxWidth().padding(top = 14.dp),
        )
    }
    }

    picker?.let { side ->
        AssetPicker(
            title = if (side == "from") "چه چیزی داری؟" else "به چه چیزی تبدیل شود؟",
            options = state.options,
            selected = if (side == "from") state.from.symbol else state.to.symbol,
            onDismiss = { picker = null },
            onPick = { asset ->
                if (side == "from") viewModel.setFrom(asset.symbol) else viewModel.setTo(asset.symbol)
                picker = null
            },
        )
    }
}

/** رقم درشت کارت؛ با بلند شدن عدد ریزتر می‌شود تا در کارت بماند */
@Composable
private fun AmountText(text: String, color: Color, cursor: Boolean) {
    val size = when {
        text.length <= 9 -> 39.sp
        text.length <= 13 -> 31.sp
        else -> 25.sp
    }
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 6.dp)) {
        NumText(text, fontSize = size, fontWeight = FontWeight.ExtraBold, color = color)
        if (cursor) {
            val blink = rememberInfiniteTransition(label = "cursor")
            val a by blink.animateFloat(
                initialValue = 1f,
                targetValue = 0f,
                animationSpec = infiniteRepeatable(tween(500, easing = LinearEasing), RepeatMode.Reverse),
                label = "alpha",
            )
            Box(
                Modifier
                    .padding(start = 4.dp)
                    .width(2.dp)
                    .height(30.dp)
                    .alpha(a)
                    .background(Q.Mint),
            )
        }
    }
}

@Composable
private fun WordsLine(text: String) {
    Text(text, fontSize = 13.sp, color = Q.Sub, lineHeight = 21.sp, modifier = Modifier.height(21.dp))
}

/** قرص انتخاب ارز: آیکن گرد، نام فارسی و شورون */
@Composable
private fun PickPill(asset: Asset, bg: Color, edge: Color, onPick: () -> Unit) {
    Row(
        Modifier
            .height(44.dp)
            .clip(RoundedCornerShape(999.dp))
            .background(bg)
            .border(1.dp, edge, RoundedCornerShape(999.dp))
            .quietClick(onClick = onPick)
            .padding(start = 12.dp, end = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        AssetTile(asset, 26.dp)
        Text(asset.nameFa, fontSize = 15.sp, fontWeight = FontWeight.Bold)
        Icon(QIcons.ChevronDown, contentDescription = null, tint = Q.Sub, modifier = Modifier.size(16.dp))
    }
}

@Composable
private fun AssetPicker(
    title: String,
    options: List<Asset>,
    selected: String,
    onDismiss: () -> Unit,
    onPick: (Asset) -> Unit,
) {
    var query by remember { mutableStateOf("") }
    val list = remember(query, options) {
        val q = query.trim().lowercase()
        if (q.isEmpty()) options
        else options.filter { it.nameFa.contains(q) || it.nameEn.lowercase().contains(q) || it.symbol.lowercase().contains(q) }
    }
    val rowBg = if (Q.isDark) Color.White.copy(alpha = 0.08f) else Color(0xFF0C332A).copy(alpha = 0.06f)
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = Q.Sheet,
        contentColor = Q.Text,
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
    ) {
        Column(Modifier.fillMaxWidth().height(560.dp).padding(horizontal = 16.dp)) {
            Text(title, fontSize = 16.sp, fontWeight = FontWeight.ExtraBold, modifier = Modifier.padding(bottom = 10.dp))
            QSearchField(query, { query = it }, placeholder = "جست‌وجوی نام یا نماد")
            Spacer(Modifier.height(10.dp))
            LazyColumn(contentPadding = PaddingValues(bottom = 24.dp)) {
                items(list, key = { it.symbol }) { asset ->
                    val isSelected = asset.symbol == selected
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .padding(bottom = 6.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(if (isSelected) rowBg else Color.Transparent)
                            .quietClick { onPick(asset) }
                            .padding(horizontal = 8.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        AssetTile(asset, 32.dp)
                        Column(Modifier.weight(1f)) {
                            Text(asset.nameFa, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                            Text(asset.nameEn, fontSize = 10.5.sp, color = Q.Sub, maxLines = 1)
                        }
                        NumText(
                            if (asset.symbol == "IRT") "پول ایران" else Fa.short(asset.sell, asset.isUsd),
                            fontSize = 12.sp,
                            color = Q.Sub,
                        )
                    }
                }
            }
        }
    }
}
