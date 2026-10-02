package online.qeymat.feature.prices

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.material3.Icon
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.border
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.shape.CircleShape
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
import online.qeymat.core.designsystem.component.QTabTrack
import online.qeymat.core.designsystem.component.QIconButton
import online.qeymat.core.designsystem.component.QPill
import online.qeymat.core.designsystem.component.QSegmented
import online.qeymat.core.designsystem.component.SectionHeader
import online.qeymat.core.designsystem.component.StarButton
import online.qeymat.core.designsystem.component.quietClick
import online.qeymat.core.designsystem.component.toChartPoints
import online.qeymat.core.designsystem.component.TourKeys
import online.qeymat.core.designsystem.component.tourTarget
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
                onOpenRelated = viewModel::openDetail,
                onRequireLogin = {
                    viewModel.closeDetail()
                    onRequireLogin()
                },
                createAlert = viewModel::createAlert,
            )
        }
    }
}

private fun PriceTab.icon() = when (this) {
    PriceTab.FAVORITES -> QIcons.StarFilled
    PriceTab.CURRENCY -> QIcons.Cash
    PriceTab.GOLD -> QIcons.GoldBars
    PriceTab.CRYPTO -> QIcons.Crypto
    PriceTab.COMMODITY -> QIcons.Drop
    PriceTab.STOCK -> QIcons.Bars
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
    val favoritesTab = state.tab == PriceTab.FAVORITES
    // در «منتخب من» اولی جدا و بزرگ بالای صفحه است؛ در حالت ویرایش همه در یک فهرست
    val featured = if (favoritesTab && !state.edit) state.items.firstOrNull() else null
    val rest = if (featured != null) state.items.drop(1) else state.items

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
            columns = GridCells.Fixed(if (grid && !state.edit) 2 else 1),
            state = gridState,
            contentPadding = PaddingValues(start = 14.dp, end = 14.dp, bottom = 28.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            modifier = Modifier.fillMaxSize(),
        ) {
            item(key = "header", span = { GridItemSpan(maxLineSpan) }) {
                Header(
                    dateLine = "${Jalali.full(now).substringBeforeLast(' ')} · ${Jalali.time(now)}",
                    onSearch = onSearch,
                )
            }
            item(key = "tabs", span = { GridItemSpan(maxLineSpan) }) {
                QTabTrack(
                    options = PriceTab.entries,
                    selected = state.tab,
                    label = { it.label },
                    icon = { it.icon() },
                    modifier = Modifier.padding(bottom = 14.dp).tourTarget(TourKeys.TABS),
                    onSelect = viewModel::selectTab,
                )
            }

            if (!state.loaded && state.items.isEmpty()) {
                item(key = "loading", span = { GridItemSpan(maxLineSpan) }) {
                    Box(Modifier.fillMaxWidth().height(220.dp), contentAlignment = Alignment.Center) {
                        Text(state.error ?: "در حال دریافت قیمت‌ها…", color = Q.Sub, fontSize = 12.sp)
                    }
                }
            } else if (favoritesTab && state.items.isEmpty()) {
                item(key = "empty", span = { GridItemSpan(maxLineSpan) }) {
                    EmptyFavorites(onAdd = onSearch)
                }
            }

            if (featured != null) {
                item(key = "featured", span = { GridItemSpan(maxLineSpan) }) {
                    FeaturedCard(
                        asset = featured,
                        showBuy = state.settings.showBuy,
                        onStar = { viewModel.toggleFavorite(featured) },
                        onOpen = { viewModel.openDetail(featured) },
                    )
                }
            }

            if (state.items.isNotEmpty()) {
                item(key = "section", span = { GridItemSpan(maxLineSpan) }) {
                    if (state.edit) {
                        EditBar(
                            favorites = favoritesTab,
                            onAdd = onSearch,
                            onDone = viewModel::endEdit,
                        )
                    } else {
                        SectionHeader(
                            modifier = Modifier.tourTarget(TourKeys.LIST),
                            title = if (rest.isEmpty() && favoritesTab) "منتخب‌ها" else "${state.tab.listTitle} · ${Fa.number(rest.size)} مورد",
                        ) {
                            QPill("ویرایش", icon = QIcons.Edit, tone = PillTone.Sub, onClick = viewModel::startEdit)
                            QIconButton(
                                icon = if (grid) QIcons.ListView else QIcons.Grid,
                                contentDescription = "تغییر نمایش",
                                size = 34.dp,
                            ) { viewModel.setViewMode(if (grid) ViewMode.LIST else ViewMode.GRID) }
                        }
                    }
                }
            }

            items(rest, key = { it.symbol }) { asset ->
                ReorderableItem(reorder, key = asset.symbol) { dragging ->
                    val longPress = Modifier.longPressDraggableHandle(
                        onDragStarted = {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            viewModel.startEdit()
                        },
                        onDragStopped = { viewModel.commitOrder() },
                    )
                    val handle = Modifier.draggableHandle(
                        onDragStarted = { haptic.performHapticFeedback(HapticFeedbackType.LongPress) },
                        onDragStopped = { viewModel.commitOrder() },
                    )
                    val open = Modifier.quietClick(enabled = !state.edit) { viewModel.openDetail(asset) }
                    if (state.edit) {
                        AssetRow(
                            asset = asset,
                            favorite = state.isFavorite(asset),
                            edit = true,
                            dragging = dragging,
                            handle = handle,
                            badge = if (favoritesTab && asset == state.items.firstOrNull()) "بالای صفحه" else null,
                            onStar = { viewModel.toggleFavorite(asset) },
                            trailing = if (favoritesTab) {
                                { RemoveButton { viewModel.toggleFavorite(asset) } }
                            } else {
                                null
                            },
                        )
                    } else if (grid) {
                        AssetGridCard(
                            asset = asset,
                            favorite = state.isFavorite(asset),
                            dragging = dragging,
                            modifier = longPress.then(open),
                            onStar = { viewModel.toggleFavorite(asset) },
                        )
                    } else {
                        AssetRow(
                            asset = asset,
                            favorite = state.isFavorite(asset),
                            dragging = dragging,
                            modifier = longPress.then(open),
                            onStar = { viewModel.toggleFavorite(asset) },
                        )
                    }
                }
            }

            if (state.tab == PriceTab.CURRENCY && !state.edit) {
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
private fun Header(dateLine: String, onSearch: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .padding(top = 16.dp, bottom = 14.dp),
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
        QIconButton(QIcons.Search, contentDescription = "جستجو", modifier = Modifier.tourTarget(TourKeys.SEARCH), onClick = onSearch)
    }
}

/** نرخ ویژه: فقط با نرخ بزرگ‌تر از بقیه متمایز است؛ نمودار در جزئیات */
@Composable
private fun FeaturedCard(asset: Asset, showBuy: Boolean, onStar: () -> Unit, onOpen: () -> Unit) {
    QCard(
        modifier = Modifier.fillMaxWidth().tourTarget(TourKeys.HERO).quietClick(onClick = onOpen),
        borderAlpha = 0.3f,
        padding = 18.dp,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            online.qeymat.core.designsystem.component.AssetTile(asset, 46.dp)
            Column(Modifier.weight(1f)) {
                Text(asset.nameFa, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Q.Text)
                Text(asset.enLine(), fontSize = 10.5.sp, color = Q.Sub)
            }
            StarButton(true, onClick = onStar)
        }
        Spacer(Modifier.height(16.dp))
        Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            NumText(Fa.price(asset.sell, asset.isUsd), fontSize = 38.sp, fontWeight = FontWeight.ExtraBold, color = Q.Text)
            Text(Fa.unit(asset.isUsd), fontSize = 13.sp, color = Q.Sub, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(bottom = 7.dp))
        }
        Spacer(Modifier.height(6.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            ChangeLabel(asset.changePercent, absolute = Fa.price(kotlin.math.abs(asset.changeAbsolute), asset.isUsd))
            Spacer(Modifier.weight(1f))
            if (showBuy) {
                Text("خرید ", fontSize = 11.sp, color = Q.Sub)
                NumText(Fa.price(asset.buy, asset.isUsd), fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Q.Soft)
            }
        }
        Row(
            Modifier.fillMaxWidth().padding(top = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Text("نمودار، نرخ‌های مرتبط و هشدار", fontSize = 11.sp, color = Q.Mint, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
            Icon(QIcons.ChevronLeft, contentDescription = null, tint = Q.Mint, modifier = Modifier.size(14.dp))
        }
    }
}

/** نوار حالت ویرایش، جای ثابت و پیدا */
@Composable
private fun EditBar(favorites: Boolean, onAdd: () -> Unit, onDone: () -> Unit) {
    Column(
        Modifier
            .fillMaxWidth()
            .padding(bottom = 10.dp)
            .clip(RoundedCornerShape(18.dp))
            .background(Q.Mint.copy(alpha = 0.08f))
            .border(1.dp, Q.Mint.copy(alpha = 0.35f), RoundedCornerShape(18.dp))
            .padding(14.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Icon(QIcons.Edit, contentDescription = null, tint = Q.Mint, modifier = Modifier.size(18.dp))
            Text(
                if (favorites) "ویرایش منتخب‌ها" else "ویرایش ترتیب",
                fontSize = 14.sp,
                fontWeight = FontWeight.ExtraBold,
                color = Q.Text,
                modifier = Modifier.weight(1f),
            )
            if (favorites) QPill("افزودن", icon = QIcons.Plus, tone = PillTone.Gold, onClick = onAdd)
            QPill("تمام", icon = QIcons.Check, tone = PillTone.Mint, onClick = onDone)
        }
        Text(
            if (favorites) "با دستگیره‌ی کنار هر ردیف ترتیب را عوض کنید؛ اولی بزرگ بالای صفحه نمایش داده می‌شود."
            else "با دستگیره‌ی کنار هر ردیف ترتیب را عوض کنید.",
            fontSize = 11.5.sp,
            color = Q.Soft,
            lineHeight = 19.sp,
            modifier = Modifier.padding(top = 8.dp),
        )
    }
}

@Composable
private fun RemoveButton(onClick: () -> Unit) {
    Box(
        Modifier
            .size(34.dp)
            .clip(CircleShape)
            .quietClick(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(QIcons.Minus, contentDescription = "حذف از منتخب", tint = Q.Red, modifier = Modifier.size(22.dp))
    }
}

@Composable
private fun EmptyFavorites(onAdd: () -> Unit) {
    QCard(Modifier.fillMaxWidth(), padding = 22.dp) {
        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(QIcons.Star, contentDescription = null, tint = Q.Gold, modifier = Modifier.size(30.dp))
            Text("هنوز منتخبی ندارید", fontSize = 15.sp, fontWeight = FontWeight.ExtraBold, color = Q.Text, modifier = Modifier.padding(top = 10.dp))
            Text(
                "روی ستاره‌ی هر نرخ بزنید یا از جستجو اضافه کنید.",
                fontSize = 12.sp,
                color = Q.Sub,
                modifier = Modifier.padding(top = 4.dp, bottom = 14.dp),
            )
            QPill("افزودن منتخب", icon = QIcons.Plus, tone = PillTone.Mint, onClick = onAdd)
        }
    }
}
