package online.qeymat.feature.prices

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.grid.rememberLazyGridState
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import kotlinx.coroutines.delay
import online.qeymat.core.data.ViewMode
import online.qeymat.core.designsystem.Q
import online.qeymat.core.designsystem.QIcons
import online.qeymat.core.designsystem.component.BrandMark
import online.qeymat.core.designsystem.component.ChangeLabel
import online.qeymat.core.designsystem.component.LiveBadge
import online.qeymat.core.designsystem.component.NumText
import online.qeymat.core.designsystem.component.PillTone
import online.qeymat.core.designsystem.component.PriceChart
import online.qeymat.core.designsystem.component.QCard
import online.qeymat.core.designsystem.component.QChip
import online.qeymat.core.designsystem.component.QIconButton
import online.qeymat.core.designsystem.component.QPill
import online.qeymat.core.designsystem.component.QSegmented
import online.qeymat.core.designsystem.component.SectionHeader
import online.qeymat.core.designsystem.component.StarButton
import online.qeymat.core.designsystem.component.quietClick
import online.qeymat.core.designsystem.component.toChartPoints
import online.qeymat.core.model.Asset
import online.qeymat.core.model.ChartRange
import online.qeymat.core.model.format.Fa
import online.qeymat.core.model.format.Jalali
import org.koin.androidx.compose.koinViewModel
import sh.calvin.reorderable.ReorderableItem
import sh.calvin.reorderable.rememberReorderableLazyGridState

private val HERO_RANGES = listOf(ChartRange.DAY, ChartRange.WEEK, ChartRange.MONTH, ChartRange.YEAR, ChartRange.ALL)

/**
 * صفحه‌ی قیمت.
 * @param onRequireLogin وقتی کاربر بدون ورود هشدار می‌خواهد (رفتن به زبانه‌ی هشدار)
 */
@Composable
fun PricesRoute(onRequireLogin: () -> Unit, viewModel: PricesViewModel = koinViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val detail by viewModel.detail.collectAsStateWithLifecycle()
    var searchOpen by rememberSaveable { mutableStateOf(false) }
    var catalogOpen by rememberSaveable { mutableStateOf(false) }

    Box(Modifier.fillMaxSize().background(Q.Bg)) {
        PricesScreen(
            state = state,
            viewModel = viewModel,
            onSearch = { searchOpen = true },
            onCatalog = { catalogOpen = true },
            modifier = if (detail != null) Modifier.blur(6.dp) else Modifier,
        )

        if (catalogOpen) {
            BackHandler { catalogOpen = false }
            CatalogOverlay(
                state = state,
                onClose = { catalogOpen = false },
                onOpen = viewModel::openDetail,
                onStar = viewModel::toggleFavorite,
            )
        }
        if (searchOpen) {
            BackHandler { searchOpen = false }
            SearchOverlay(
                state = state,
                onClose = { searchOpen = false },
                onOpen = viewModel::openDetail,
                onStar = viewModel::toggleFavorite,
            )
        }
        detail?.let { current ->
            DetailSheet(
                detail = current,
                ui = state,
                onDismiss = viewModel::closeDetail,
                onRange = viewModel::selectDetailRange,
                onStar = { viewModel.toggleFavorite(current.asset) },
                onRequireLogin = {
                    viewModel.closeDetail()
                    onRequireLogin()
                },
                createAlert = viewModel::createAlert,
            )
        }
    }
}

@Composable
private fun PricesScreen(
    state: PricesUiState,
    viewModel: PricesViewModel,
    onSearch: () -> Unit,
    onCatalog: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val grid = state.settings.viewMode == ViewMode.GRID
    val gridState = rememberLazyGridState()
    val haptic = LocalHapticFeedback.current
    val reorder = rememberReorderableLazyGridState(gridState) { from, to ->
        val fromKey = from.key as? String ?: return@rememberReorderableLazyGridState
        val toKey = to.key as? String ?: return@rememberReorderableLazyGridState
        viewModel.move(fromKey, toKey)
    }

    // ساعت سربرگ هر ۳۰ ثانیه
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(Unit) {
        while (true) {
            delay(30_000)
            now = System.currentTimeMillis()
        }
    }

    PullToRefreshBox(
        isRefreshing = state.refreshing,
        onRefresh = viewModel::refresh,
        modifier = modifier.fillMaxSize(),
    ) {
        LazyVerticalGrid(
            columns = GridCells.Fixed(if (grid) 2 else 1),
            state = gridState,
            contentPadding = PaddingValues(start = 14.dp, end = 14.dp, bottom = 120.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            modifier = Modifier.fillMaxSize(),
        ) {
            item(key = "header", span = { GridItemSpan(maxLineSpan) }) {
                Header(
                    dateLine = "${Jalali.full(now).substringBeforeLast(' ')} · ${Jalali.time(now)}",
                    edit = state.edit,
                    onEndEdit = viewModel::endEdit,
                    onSearch = onSearch,
                )
            }
            item(key = "chips", span = { GridItemSpan(maxLineSpan) }) {
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    contentPadding = PaddingValues(vertical = 2.dp),
                    modifier = Modifier.padding(bottom = 12.dp),
                ) {
                    items(PriceTab.entries) { tab ->
                        QChip(tab.label, tab == state.tab) { viewModel.selectTab(tab) }
                    }
                }
            }

            val hero = state.items.firstOrNull()
            if (hero != null) {
                item(key = "hero", span = { GridItemSpan(maxLineSpan) }) {
                    HeroCard(
                        asset = hero,
                        favorite = state.isFavorite(hero),
                        showBuy = state.settings.showBuy,
                        range = state.heroRange,
                        series = state.heroSeries,
                        onRange = viewModel::selectHeroRange,
                        onStar = { viewModel.toggleFavorite(hero) },
                        onOpen = { viewModel.openDetail(hero) },
                    )
                }
            } else if (!state.loaded) {
                item(key = "loading", span = { GridItemSpan(maxLineSpan) }) {
                    Box(Modifier.fillMaxWidth().height(260.dp), contentAlignment = Alignment.Center) {
                        Text(state.error ?: "در حال دریافت قیمت‌ها…", color = Q.Sub, fontSize = 12.sp)
                    }
                }
            }

            item(key = "section", span = { GridItemSpan(maxLineSpan) }) {
                SectionHeader(
                    title = "${state.tab.listTitle} · ${Fa.number(state.items.size)} مورد",
                    hint = "برای جابه‌جایی نگه دار",
                ) {
                    QIconButton(
                        icon = if (grid) QIcons.ListView else QIcons.Grid,
                        contentDescription = "تغییر نمایش",
                        size = 32.dp,
                    ) { viewModel.setViewMode(if (grid) ViewMode.LIST else ViewMode.GRID) }
                }
            }

            items(state.items, key = { it.symbol }) { asset ->
                ReorderableItem(reorder, key = asset.symbol) { dragging ->
                    val handle = Modifier.longPressDraggableHandle(
                        onDragStarted = {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            viewModel.startEdit()
                        },
                        onDragStopped = { viewModel.commitOrder() },
                    )
                    val open = Modifier.quietClick(enabled = !state.edit) { viewModel.openDetail(asset) }
                    if (grid) {
                        AssetGridCard(
                            asset = asset,
                            favorite = state.isFavorite(asset),
                            edit = state.edit,
                            dragging = dragging,
                            modifier = handle.then(open),
                            onStar = { viewModel.toggleFavorite(asset) },
                        )
                    } else {
                        AssetRow(
                            asset = asset,
                            favorite = state.isFavorite(asset),
                            edit = state.edit,
                            dragging = dragging,
                            modifier = handle.then(open),
                            onStar = { viewModel.toggleFavorite(asset) },
                        )
                    }
                }
            }

            if (state.tab == PriceTab.CURRENCY) {
                val total = state.assets.count { it.category == online.qeymat.core.model.Category.CURRENCY }
                item(key = "catalog", span = { GridItemSpan(maxLineSpan) }) {
                    QPill(
                        text = "همهٔ ارزهای جهان · ${Fa.number(total)} ارز",
                        icon = QIcons.Globe,
                        dashed = true,
                        modifier = Modifier.fillMaxWidth().padding(top = 6.dp),
                        onClick = onCatalog,
                    )
                }
            }
        }
    }
}

@Composable
private fun Header(dateLine: String, edit: Boolean, onEndEdit: () -> Unit, onSearch: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .padding(top = 16.dp, bottom = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        BrandMark(42.dp)
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("قیمت", fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = Q.Text)
                LiveBadge()
            }
            Text(dateLine, fontSize = 10.5.sp, color = Q.Sub, maxLines = 1)
        }
        if (edit) QPill("پایان ویرایش", icon = QIcons.Check, tone = PillTone.Mint, onClick = onEndEdit)
        QIconButton(QIcons.Search, contentDescription = "جستجو", onClick = onSearch)
    }
}

@Composable
private fun HeroCard(
    asset: Asset,
    favorite: Boolean,
    showBuy: Boolean,
    range: ChartRange,
    series: online.qeymat.core.model.HistorySeries?,
    onRange: (ChartRange) -> Unit,
    onStar: () -> Unit,
    onOpen: () -> Unit,
) {
    QCard(modifier = Modifier.fillMaxWidth().quietClick(onClick = onOpen)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            online.qeymat.core.designsystem.component.AssetTile(asset, 46.dp)
            Column(Modifier.weight(1f)) {
                Text(asset.nameFa, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Q.Text)
                Text(asset.enLine(), fontSize = 10.5.sp, color = Q.Sub)
            }
            StarButton(favorite, onClick = onStar)
        }
        Spacer(Modifier.height(14.dp))
        ChangeLabel(asset.changePercent, absolute = Fa.price(kotlin.math.abs(asset.changeAbsolute), asset.isUsd), big = true)
        if (showBuy) {
            Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 6.dp)) {
                NumText(Fa.price(asset.buy, asset.isUsd), fontSize = 17.sp, fontWeight = FontWeight.SemiBold, color = Q.Sub)
                Text("خرید", fontSize = 10.5.sp, color = Q.Sub)
            }
        }
        Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            NumText(Fa.price(asset.sell, asset.isUsd), fontSize = 30.sp, fontWeight = FontWeight.ExtraBold, color = Q.Text)
            Text(Fa.unit(asset.isUsd), fontSize = 12.sp, color = Q.Sub, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(bottom = 5.dp))
        }
        Spacer(Modifier.height(8.dp))
        PriceChart(
            points = series?.toChartPoints().orEmpty(),
            interval = series?.interval ?: "day",
            height = 96.dp,
            usd = asset.isUsd,
        )
        Spacer(Modifier.height(12.dp))
        QSegmented(HERO_RANGES, range, label = { it.label }, onSelect = onRange)
    }
}
