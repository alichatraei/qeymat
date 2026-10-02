package online.qeymat.feature.prices

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import online.qeymat.core.designsystem.Q
import online.qeymat.core.designsystem.QIcons
import online.qeymat.core.designsystem.component.QIconButton
import online.qeymat.core.designsystem.component.QSearchField
import online.qeymat.core.designsystem.component.SectionHeader
import online.qeymat.core.designsystem.component.quietClick
import online.qeymat.core.model.Asset
import online.qeymat.core.model.Category
import online.qeymat.core.model.format.Fa

/** جست‌وجو در نام فارسی، انگلیسی و نماد (مثلاً «درهم»، «Dirham»، «AED») */
fun Asset.matches(query: String): Boolean {
    val q = query.trim().lowercase()
    if (q.isEmpty()) return false
    return nameFa.contains(q) || nameEn.lowercase().contains(q) || symbol.lowercase().contains(q)
}

@Composable
private fun OverlayScaffold(
    onClose: () -> Unit,
    header: @Composable () -> Unit,
    content: @Composable () -> Unit,
) {
    Column(
        Modifier
            .fillMaxSize()
            .background(Q.Bg)
            // لمس به صفحه‌ی زیرین نرسد
            .quietClick {},
    ) {
        Row(
            Modifier
                .fillMaxWidth()
                .background(Q.Bg.copy(alpha = 0.9f))
                .statusBarsPadding()
                .padding(horizontal = 14.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            QIconButton(QIcons.Back, contentDescription = "بازگشت", onClick = onClose)
            Box(Modifier.weight(1f)) { header() }
        }
        Box(
            Modifier
                .fillMaxWidth()
                .border(0.5.dp, Q.line(0.18f)),
        )
        content()
    }
}

/** جست‌وجوی سراسری در همه‌ی دارایی‌ها */
@Composable
fun SearchOverlay(
    state: PricesUiState,
    onClose: () -> Unit,
    onOpen: (Asset) -> Unit,
    onStar: (Asset) -> Unit,
) {
    var query by rememberSaveable { mutableStateOf("") }
    val results = remember(query, state.assets, state.settings.favorites) {
        if (query.isBlank()) {
            val bySymbol = state.assets.associateBy { it.symbol }
            state.settings.favorites.mapNotNull { bySymbol[it] }
        } else {
            state.assets.filter { it.matches(query) }.take(60)
        }
    }

    OverlayScaffold(
        onClose = onClose,
        header = {
            QSearchField(
                value = query,
                onValueChange = { query = it },
                placeholder = "جستجو در همهٔ دارایی‌ها: درهم، Dirham، AED…",
                autoFocus = true,
            )
        },
    ) {
        LazyColumn(contentPadding = PaddingValues(start = 14.dp, end = 14.dp, top = 12.dp, bottom = 28.dp)) {
            if (query.isBlank()) item { SectionHeader("منتخب شما") }
            items(results, key = { it.symbol }) { asset ->
                AssetRow(
                    asset = asset,
                    favorite = state.isFavorite(asset),
                    modifier = Modifier.quietClick { onOpen(asset) },
                    onStar = { onStar(asset) },
                )
            }
            if (query.isNotBlank() && results.isEmpty()) {
                item {
                    Text(
                        "نتیجه‌ای پیدا نشد",
                        color = Q.Muted,
                        fontSize = 12.sp,
                        modifier = Modifier.fillMaxWidth().padding(vertical = 30.dp),
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    )
                }
            }
        }
    }
}

/** کاتالوگ همه‌ی ارزهای جهان؛ ستاره، ارز را به صفحه‌ی اول اضافه می‌کند */
@Composable
fun CatalogOverlay(
    state: PricesUiState,
    onClose: () -> Unit,
    onOpen: (Asset) -> Unit,
    onStar: (Asset) -> Unit,
) {
    var query by rememberSaveable { mutableStateOf("") }
    val currencies = remember(state.assets) { state.assets.filter { it.category == Category.CURRENCY } }
    val list = remember(query, currencies, state.settings.favorites) {
        if (query.isBlank()) currencies.sortedByDescending { it.symbol in state.settings.favorites }
        else currencies.filter { it.matches(query) }
    }

    OverlayScaffold(
        onClose = onClose,
        header = {
            Column {
                Text("همهٔ ارزهای جهان", fontSize = 18.sp, fontWeight = FontWeight.ExtraBold)
                Text(
                    "${Fa.number(currencies.size)} ارز · استاندارد ISO 4217 · با ستاره به صفحهٔ اول اضافه کن",
                    fontSize = 10.5.sp,
                    color = Q.Sub,
                    maxLines = 1,
                )
            }
        },
    ) {
        QSearchField(
            value = query,
            onValueChange = { query = it },
            placeholder = "نام فارسی، انگلیسی یا کد ارز…",
            modifier = Modifier.padding(start = 14.dp, end = 14.dp, top = 12.dp),
        )
        LazyColumn(contentPadding = PaddingValues(start = 14.dp, end = 14.dp, top = 12.dp, bottom = 28.dp)) {
            items(list, key = { it.symbol }) { asset ->
                AssetRow(
                    asset = asset,
                    favorite = asset.symbol in state.settings.favorites,
                    modifier = Modifier.quietClick { onOpen(asset) },
                    onStar = { onStar(asset) },
                )
            }
            if (list.isEmpty()) {
                item {
                    Text(
                        "ارزی با این نام پیدا نشد",
                        color = Q.Muted,
                        fontSize = 12.sp,
                        modifier = Modifier.fillMaxWidth().padding(vertical = 30.dp),
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    )
                }
            }
        }
    }
}
