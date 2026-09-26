package online.qeymat.feature.convert

import androidx.compose.animation.core.animateFloatAsState
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
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import online.qeymat.core.designsystem.Q
import online.qeymat.core.designsystem.QIcons
import online.qeymat.core.designsystem.Vazirmatn
import online.qeymat.core.designsystem.component.AssetTile
import online.qeymat.core.designsystem.component.NumText
import online.qeymat.core.designsystem.component.QSearchField
import online.qeymat.core.designsystem.component.SectionHeader
import online.qeymat.core.designsystem.component.quietClick
import online.qeymat.core.model.Asset
import online.qeymat.core.model.format.Fa
import org.koin.androidx.compose.koinViewModel

private val QUICK = listOf(
    Triple("دلار ← تومان", "USD", "IRT"),
    Triple("دلار ← یورو", "USD", "EUR"),
    Triple("طلای ۱۸ ← دلار", "GOLD18", "USD"),
    Triple("بیت‌کوین ← دلار", "BTC", "USD"),
)

@Composable
fun ConvertRoute(viewModel: ConvertViewModel = koinViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var picker by remember { mutableStateOf<String?>(null) }
    var rotated by remember { mutableStateOf(false) }
    val rotation by animateFloatAsState(if (rotated) 180f else 0f, label = "swap")

    Column(
        Modifier
            .fillMaxSize()
            .background(Q.Bg)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 14.dp)
            .padding(bottom = 120.dp),
    ) {
        Column(Modifier.statusBarsPadding().padding(top = 16.dp, bottom = 12.dp)) {
            Text("تبدیل نرخ", fontSize = 18.sp, fontWeight = FontWeight.ExtraBold)
            Text("تبدیل بین ارز، طلا و رمزارز", fontSize = 10.5.sp, color = Q.Sub)
        }

        ConvertCard(label = "از", asset = state.from, onPick = { picker = "from" }) {
            BasicTextField(
                value = state.amount,
                onValueChange = viewModel::setAmount,
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                textStyle = TextStyle(
                    fontFamily = Vazirmatn,
                    fontSize = 26.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Q.Text,
                    textAlign = TextAlign.Left,
                    textDirection = TextDirection.Ltr,
                ),
                cursorBrush = SolidColor(Q.Mint),
                modifier = Modifier.fillMaxWidth(),
            )
        }
        Box(Modifier.fillMaxWidth().offset(y = (-2).dp), contentAlignment = Alignment.Center) {
            Box(
                Modifier
                    .offset(y = 0.dp)
                    .size(46.dp)
                    .clip(CircleShape)
                    .background(Q.Sheet)
                    .border(1.dp, Q.Mint, CircleShape)
                    .quietClick {
                        rotated = !rotated
                        viewModel.swap()
                    },
                contentAlignment = Alignment.Center,
            ) {
                Icon(QIcons.Swap, contentDescription = "جابه‌جایی", tint = Q.Mint, modifier = Modifier.size(20.dp).rotate(rotation))
            }
        }
        ConvertCard(label = "به", asset = state.to, onPick = { picker = "to" }) {
            NumText(
                state.result,
                fontSize = 26.sp,
                fontWeight = FontWeight.ExtraBold,
                color = Q.Mint,
                modifier = Modifier.fillMaxWidth(),
            )
        }
        Box(
            Modifier
                .padding(top = 12.dp)
                .fillMaxWidth()
                .clip(RoundedCornerShape(14.dp))
                .border(1.dp, Q.line(0.25f), RoundedCornerShape(14.dp))
                .padding(10.dp),
            contentAlignment = Alignment.Center,
        ) {
            NumText(state.rateLine, fontSize = 11.5.sp, color = Q.Sub)
        }

        SectionHeader("تبدیل‌های پرکاربرد")
        for (row in QUICK.chunked(2)) {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.padding(bottom = 10.dp)) {
                for ((label, from, to) in row) {
                    Box(
                        Modifier
                            .weight(1f)
                            .height(44.dp)
                            .clip(RoundedCornerShape(16.dp))
                            .background(Color.White.copy(alpha = 0.02f))
                            .border(1.dp, Q.line(0.2f), RoundedCornerShape(16.dp))
                            .quietClick { viewModel.quick(from, to) },
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(label, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Q.Soft)
                    }
                }
            }
        }
    }

    picker?.let { side ->
        AssetPicker(
            title = if (side == "from") "انتخاب دارایی مبدأ" else "انتخاب دارایی مقصد",
            options = state.options,
            onDismiss = { picker = null },
            onPick = { asset ->
                if (side == "from") viewModel.setFrom(asset.symbol) else viewModel.setTo(asset.symbol)
                picker = null
            },
        )
    }
}

@Composable
private fun ConvertCard(label: String, asset: Asset, onPick: () -> Unit, value: @Composable () -> Unit) {
    Column(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(Brush.linearGradient(listOf(Q.CardTop, Q.CardBottom)))
            .border(1.dp, Q.line(0.22f), RoundedCornerShape(20.dp))
            .padding(horizontal = 16.dp, vertical = 14.dp),
    ) {
        Text(label, fontSize = 10.5.sp, color = Q.Sub, modifier = Modifier.padding(bottom = 8.dp))
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(
                Modifier
                    .height(40.dp)
                    .clip(CircleShape)
                    .border(1.dp, Q.Gold.copy(alpha = 0.4f), CircleShape)
                    .quietClick(onClick = onPick)
                    .padding(start = 6.dp, end = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                AssetTile(asset, 26.dp)
                Text(asset.symbol.replace('_', ' '), color = Q.GoldLight, fontWeight = FontWeight.ExtraBold, fontSize = 13.sp)
                Icon(QIcons.ChevronDown, contentDescription = null, tint = Q.GoldLight, modifier = Modifier.size(14.dp))
            }
            Box(Modifier.weight(1f)) { value() }
        }
    }
}

@Composable
private fun AssetPicker(title: String, options: List<Asset>, onDismiss: () -> Unit, onPick: (Asset) -> Unit) {
    var query by remember { mutableStateOf("") }
    val list = remember(query, options) {
        val q = query.trim().lowercase()
        if (q.isEmpty()) options
        else options.filter { it.nameFa.contains(q) || it.nameEn.lowercase().contains(q) || it.symbol.lowercase().contains(q) }
    }
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = Q.Sheet,
        contentColor = Q.Text,
        shape = RoundedCornerShape(topStart = 26.dp, topEnd = 26.dp),
    ) {
        Column(Modifier.fillMaxWidth().height(560.dp).padding(horizontal = 16.dp)) {
            Text(title, fontSize = 15.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(bottom = 10.dp))
            QSearchField(query, { query = it }, placeholder = "جستجو…")
            Spacer(Modifier.height(10.dp))
            LazyColumn(contentPadding = PaddingValues(bottom = 24.dp)) {
                items(list, key = { it.symbol }) { asset ->
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .padding(bottom = 8.dp)
                            .clip(RoundedCornerShape(16.dp))
                            .background(Color.White.copy(alpha = 0.02f))
                            .border(1.dp, Q.line(0.12f), RoundedCornerShape(16.dp))
                            .quietClick { onPick(asset) }
                            .padding(10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        AssetTile(asset, 34.dp)
                        Column(Modifier.weight(1f)) {
                            Text(asset.nameFa, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                            Text("${asset.nameEn} · ${asset.symbol}", fontSize = 10.5.sp, color = Q.Sub, maxLines = 1)
                        }
                        if (asset.symbol != "IRT") NumText(Fa.short(asset.sell, asset.isUsd), fontSize = 11.5.sp, color = Q.Sub)
                    }
                }
            }
        }
    }
}
