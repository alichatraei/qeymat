package online.qeymat.feature.prices

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.abs
import kotlin.math.roundToLong
import kotlinx.coroutines.launch
import online.qeymat.core.designsystem.Q
import online.qeymat.core.designsystem.QIcons
import online.qeymat.core.designsystem.component.AssetTile
import online.qeymat.core.designsystem.component.ChangeLabel
import online.qeymat.core.designsystem.component.NumText
import online.qeymat.core.designsystem.component.PillTone
import online.qeymat.core.designsystem.component.PriceChart
import online.qeymat.core.designsystem.component.QIconButton
import online.qeymat.core.designsystem.component.QInputBox
import online.qeymat.core.designsystem.component.QPill
import online.qeymat.core.designsystem.component.QSegmented
import online.qeymat.core.designsystem.component.QToggle
import online.qeymat.core.designsystem.component.StarButton
import online.qeymat.core.designsystem.component.toChartPoints
import online.qeymat.core.designsystem.component.quietClick
import online.qeymat.core.model.Analysis
import online.qeymat.core.model.ChartRange
import online.qeymat.core.model.format.Fa

@Composable
fun DetailSheet(
    detail: DetailState,
    ui: PricesUiState,
    onDismiss: () -> Unit,
    onRange: (ChartRange) -> Unit,
    onStar: () -> Unit,
    onOpenRelated: (online.qeymat.core.model.Asset) -> Unit,
    onRequireLogin: () -> Unit,
    createAlert: suspend (String, Double, Boolean) -> Result<Unit>,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val asset = ui.assets.firstOrNull { it.symbol == detail.asset.symbol } ?: detail.asset
    var alertOpen by remember { mutableStateOf(false) }
    val favorite = ui.isFavorite(asset)
    val points = detail.series?.toChartPoints().orEmpty()

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = Q.Sheet,
        contentColor = Q.Text,
        scrimColor = Q.Scrim,
        shape = RoundedCornerShape(topStart = 26.dp, topEnd = 26.dp),
        dragHandle = {
            Box(
                Modifier
                    .padding(top = 10.dp, bottom = 4.dp)
                    .size(width = 44.dp, height = 5.dp)
                    .clip(CircleShape)
                    .background(Q.Gold.copy(alpha = 0.35f)),
            )
        },
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp)
                .navigationBarsPadding()
                .padding(bottom = 28.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                AssetTile(asset, 44.dp)
                Column(Modifier.weight(1f)) {
                    Text(asset.nameFa, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                    Text(asset.enLine(), fontSize = 10.5.sp, color = Q.Sub, maxLines = 1)
                }
                StarButton(favorite, onClick = onStar)
                QIconButton(QIcons.Close, contentDescription = "بستن", size = 32.dp, onClick = onDismiss)
            }
            Spacer(Modifier.height(14.dp))

            ChangeLabel(asset.changePercent, absolute = Fa.price(abs(asset.changeAbsolute), asset.isUsd), big = true)
            if (ui.settings.showBuy) {
                Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 6.dp)) {
                    NumText(Fa.price(asset.buy, asset.isUsd), fontSize = 17.sp, fontWeight = FontWeight.SemiBold, color = Q.Sub)
                    Text("خرید", fontSize = 10.5.sp, color = Q.Sub)
                }
            }
            Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                NumText(Fa.price(asset.sell, asset.isUsd), fontSize = 30.sp, fontWeight = FontWeight.ExtraBold)
                Text(Fa.unit(asset.isUsd), fontSize = 12.sp, color = Q.Sub, modifier = Modifier.padding(bottom = 5.dp))
            }
            if (points.isNotEmpty()) {
                Row(horizontalArrangement = Arrangement.spacedBy(14.dp), modifier = Modifier.padding(top = 8.dp)) {
                    Text("بیشترین: ${Fa.price(points.maxOf { it.value }, asset.isUsd)}", fontSize = 11.sp, color = Q.Sub)
                    Text("کمترین: ${Fa.price(points.minOf { it.value }, asset.isUsd)}", fontSize = 11.sp, color = Q.Sub)
                }
            }
            Spacer(Modifier.height(10.dp))

            if (detail.loading && detail.series == null) {
                Box(
                    Modifier
                        .fillMaxWidth()
                        .height(170.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(Q.Raised),
                )
            } else {
                PriceChart(
                    points = points,
                    interval = detail.series?.interval ?: "day",
                    height = 150.dp,
                    usd = asset.isUsd,
                    showGrid = true,
                )
            }
            Spacer(Modifier.height(12.dp))
            QSegmented(ChartRange.entries, detail.range, label = { it.label }, onSelect = onRange)

            Row(Modifier.padding(top = 12.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                InfoBox("قیمت خرید", Fa.price(asset.buy, asset.isUsd), Modifier.weight(1f))
                InfoBox("قیمت فروش", Fa.price(asset.sell, asset.isUsd), Modifier.weight(1f))
            }
            Row(Modifier.padding(top = 10.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                // منبع و اطمینان موتور نمایش داده نمی‌شود؛ «قیمت» خودش مرجع نرخ است
                InfoBox("کمترین امروز", asset.dayLow?.let { Fa.price(it, asset.isUsd) } ?: "—", Modifier.weight(1f), small = true)
                InfoBox("بیشترین امروز", asset.dayHigh?.let { Fa.price(it, asset.isUsd) } ?: "—", Modifier.weight(1f), small = true)
            }

            val related = remember(asset.symbol, ui.assets) { online.qeymat.core.model.RateFamilies.related(asset.symbol, ui.assets) }
            if (related.isNotEmpty()) {
                Text("نرخ‌های مرتبط", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Q.Gold, modifier = Modifier.padding(top = 18.dp, bottom = 8.dp))
                Column(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(18.dp))
                        .border(1.dp, Q.line(0.16f), RoundedCornerShape(18.dp)),
                ) {
                    related.forEachIndexed { index, item ->
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .quietClick { onOpenRelated(item) }
                                .padding(horizontal = 12.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                        ) {
                            AssetTile(item, 34.dp)
                            Text(item.nameFa, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Q.Text, maxLines = 1, modifier = Modifier.weight(1f))
                            Column(horizontalAlignment = Alignment.End) {
                                NumText(Fa.price(item.sell, item.isUsd), fontSize = 13.sp, fontWeight = FontWeight.ExtraBold, color = Q.Text)
                                ChangeLabel(item.changePercent)
                            }
                            Icon(QIcons.ChevronLeft, contentDescription = null, tint = Q.Muted, modifier = Modifier.size(14.dp))
                        }
                        if (index < related.lastIndex) {
                            Box(Modifier.fillMaxWidth().padding(start = 56.dp).height(1.dp).background(Q.line(0.1f)))
                        }
                    }
                }
            }

            AnalysisSection(detail.analysis, plusActive = ui.plus.active, loggedIn = ui.loggedIn)

            Row(Modifier.padding(top = 14.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                QPill(
                    "هشدار قیمت",
                    icon = QIcons.Bell,
                    large = true,
                    modifier = Modifier.weight(1f),
                ) { if (ui.loggedIn) alertOpen = true else onRequireLogin() }
                QPill(
                    if (favorite) "حذف از علاقه‌مندی" else "افزودن به علاقه‌مندی",
                    icon = QIcons.Star,
                    tone = PillTone.Mint,
                    large = true,
                    modifier = Modifier.weight(1f),
                    onClick = onStar,
                )
            }
        }
    }

    if (alertOpen) {
        AlertComposer(
            symbol = asset.symbol,
            name = asset.nameFa,
            current = asset.sell,
            usd = asset.isUsd,
            plusActive = ui.plus.active,
            smsLimit = ui.plus.smsLimit,
            onDismiss = { alertOpen = false },
            createAlert = createAlert,
        )
    }
}

/** بخش تحلیل: برای مشترکان پلاس کامل، برای بقیه پیش‌نمایش قفل‌شده */
@Composable
private fun AnalysisSection(analysis: Analysis?, plusActive: Boolean, loggedIn: Boolean) {
    Column(
        Modifier
            .padding(top = 12.dp)
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(if (plusActive) Q.Raised else Q.Gold.copy(alpha = 0.06f))
            .border(1.dp, Q.line(if (plusActive) 0.16f else 0.3f), RoundedCornerShape(16.dp))
            .padding(12.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Icon(QIcons.Sparkle, contentDescription = null, tint = Q.Gold, modifier = Modifier.size(16.dp))
            Text("تحلیل قیمت", fontSize = 13.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
            if (analysis != null) {
                val (label, color) = when (analysis.outlook) {
                    "bullish" -> "صعودی" to Q.Mint
                    "bearish" -> "نزولی" to Q.Red
                    else -> "خنثی" to Q.Gold
                }
                Text(
                    label,
                    color = color,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier
                        .clip(CircleShape)
                        .border(1.dp, color.copy(alpha = 0.5f), CircleShape)
                        .padding(horizontal = 10.dp, vertical = 3.dp),
                )
            }
        }
        when {
            !plusActive -> Text(
                if (loggedIn) "روند، RSI، حمایت و مقاومت و حباب سکه با اشتراک قیمت پلاس. از تنظیمات ← قیمت پلاس فعال کنید."
                else "برای دیدن تحلیل وارد شوید و قیمت پلاس را فعال کنید.",
                fontSize = 11.5.sp,
                color = Q.Soft,
                lineHeight = 19.sp,
                modifier = Modifier.padding(top = 8.dp),
            )
            analysis == null -> Text("در حال محاسبه…", fontSize = 11.5.sp, color = Q.Sub, modifier = Modifier.padding(top = 8.dp))
            else -> {
                Text(analysis.summary, fontSize = 12.sp, color = Q.Soft, modifier = Modifier.padding(top = 8.dp))
                val ind = analysis.indicators
                Row(Modifier.padding(top = 10.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    InfoBox("RSI ۱۴", ind.rsi14?.let { Fa.decimal(it, 1) } ?: "—", Modifier.weight(1f), small = true)
                    InfoBox("حمایت", ind.support?.let { Fa.short(it) } ?: "—", Modifier.weight(1f), small = true)
                    InfoBox("مقاومت", ind.resistance?.let { Fa.short(it) } ?: "—", Modifier.weight(1f), small = true)
                }
                for (metric in analysis.special) {
                    Row(Modifier.padding(top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(metric.label, fontSize = 11.5.sp, color = Q.Sub)
                            Text(metric.hint, fontSize = 10.sp, color = Q.Muted)
                        }
                        NumText(metric.value, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }
                }
                for (line in analysis.insights.take(3)) {
                    Text("• $line", fontSize = 11.sp, color = Q.Soft, lineHeight = 18.sp, modifier = Modifier.padding(top = 6.dp))
                }
                Text(
                    "تحلیل خودکار است و توصیه‌ی خرید یا فروش نیست.",
                    fontSize = 9.5.sp,
                    color = Q.Muted,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }
        }
    }
}

/** ساخت هشدار قیمت: اعلان برای همه، پیامک برای مشترکان پلاس */
@Composable
fun AlertComposer(
    symbol: String,
    name: String,
    current: Double,
    usd: Boolean,
    plusActive: Boolean,
    smsLimit: Int,
    onDismiss: () -> Unit,
    createAlert: suspend (String, Double, Boolean) -> Result<Unit>,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var text by remember { mutableStateOf(Fa.price(if (usd) current else (current * 1.02 / 1000).roundToLong() * 1000.0, usd)) }
    var sms by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val target = Fa.parse(text)

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Q.Sheet,
        titleContentColor = Q.Text,
        textContentColor = Q.Text,
        title = { Text("هشدار قیمت · $name", fontSize = 15.sp, fontWeight = FontWeight.Bold) },
        text = {
            Column {
                Text("وقتی قیمت از این عدد عبور کرد خبرتان می‌کنیم.", fontSize = 11.5.sp, color = Q.Sub)
                Spacer(Modifier.height(12.dp))
                QInputBox(
                    value = text,
                    onValueChange = { text = it; error = null },
                    placeholder = "قیمت هدف",
                    keyboard = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                )
                if (target != null) {
                    Text(
                        "هشدار وقتی قیمت ${if (target >= current) "بالاتر" else "پایین‌تر"} از ${Fa.price(target, usd)} ${Fa.unit(usd)} برود · اکنون ${Fa.price(current, usd)}",
                        fontSize = 10.5.sp,
                        color = Q.Sub,
                        modifier = Modifier.padding(top = 8.dp),
                    )
                }
                Row(
                    Modifier.padding(top = 14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Icon(QIcons.Message, contentDescription = null, tint = if (plusActive) Q.Mint else Q.Muted, modifier = Modifier.size(18.dp))
                    Column(Modifier.weight(1f)) {
                        Text("پیامک هم بفرست", fontSize = 12.5.sp)
                        Text(
                            if (plusActive) "تا ${Fa.number(smsLimit)} شاخص در پلن شما" else "مخصوص مشترکان قیمت پلاس",
                            fontSize = 10.sp,
                            color = Q.Sub,
                        )
                    }
                    QToggle(checked = sms, enabled = plusActive) { sms = it }
                }
                error?.let { Text(it, color = Q.Red, fontSize = 11.sp, modifier = Modifier.padding(top = 10.dp)) }
            }
        },
        confirmButton = {
            QPill("ثبت هشدار", icon = QIcons.Check, tone = PillTone.Mint, enabled = !busy && target != null) {
                val value = target ?: return@QPill
                busy = true
                scope.launch {
                    createAlert(symbol, value, sms)
                        .onSuccess {
                            Toast.makeText(context, "هشدار $name ثبت شد", Toast.LENGTH_SHORT).show()
                            onDismiss()
                        }
                        .onFailure { error = it.message }
                    busy = false
                }
            }
        },
        dismissButton = { QPill("انصراف", tone = PillTone.Sub, onClick = onDismiss) },
    )
}
