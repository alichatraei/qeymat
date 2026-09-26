package online.qeymat.feature.prices

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import online.qeymat.core.data.AccountRepository
import online.qeymat.core.data.MarketRepository
import online.qeymat.core.data.SettingsStore
import online.qeymat.core.data.UserSettings
import online.qeymat.core.data.ViewMode
import online.qeymat.core.model.Analysis
import online.qeymat.core.model.Asset
import online.qeymat.core.model.Category
import online.qeymat.core.model.ChartRange
import online.qeymat.core.model.HistorySeries
import online.qeymat.core.model.PlusStatus

/** زبانه‌های صفحه‌ی قیمت — مطابق طراحی */
enum class PriceTab(val label: String, val categories: Set<Category>, val listTitle: String) {
    CURRENCY("ارز", setOf(Category.CURRENCY), "ارزهای منتخب"),
    GOLD("طلا و سکه", setOf(Category.GOLD), "طلا و سکه"),
    CRYPTO("کریپتو", setOf(Category.CRYPTO), "کریپتو"),
    COMMODITY("کالا و انرژی", setOf(Category.COMMODITY), "کالا و انرژی"),
    STOCK("بورس جهانی", setOf(Category.STOCK, Category.INDEX), "بورس جهانی");

    /** کلید ذخیره‌ی ترتیب دلخواه این زبانه */
    val orderKey: Category get() = categories.first()
}

data class PricesUiState(
    val loaded: Boolean = false,
    val refreshing: Boolean = false,
    val error: String? = null,
    val tab: PriceTab = PriceTab.CURRENCY,
    val items: List<Asset> = emptyList(),
    val assets: List<Asset> = emptyList(),
    val settings: UserSettings = UserSettings(),
    val heroRange: ChartRange = ChartRange.WEEK,
    val heroSeries: HistorySeries? = null,
    val edit: Boolean = false,
    val loggedIn: Boolean = false,
    val plus: PlusStatus = PlusStatus(),
    val updatedAt: String = "",
) {
    fun isFavorite(asset: Asset): Boolean =
        if (asset.category == Category.CURRENCY) asset.symbol in settings.favorites else asset.symbol in settings.stars
}

data class DetailState(
    val asset: Asset,
    val range: ChartRange = ChartRange.WEEK,
    val series: HistorySeries? = null,
    val loading: Boolean = true,
    val analysis: Analysis? = null,
)

private data class Local(
    val tab: PriceTab,
    val heroRange: ChartRange,
    val heroSeries: HistorySeries?,
    val edit: Boolean,
    val order: List<String>?,
)

@OptIn(ExperimentalCoroutinesApi::class)
class PricesViewModel(
    private val market: MarketRepository,
    private val settingsStore: SettingsStore,
    private val account: AccountRepository,
) : ViewModel() {
    private val tab = MutableStateFlow(PriceTab.CURRENCY)
    private val heroRange = MutableStateFlow(ChartRange.WEEK)
    private val heroSeries = MutableStateFlow<HistorySeries?>(null)
    private val edit = MutableStateFlow(false)
    /** ترتیب موقت هنگام کشیدن؛ با رها کردن ذخیره می‌شود */
    private val dragOrder = MutableStateFlow<List<String>?>(null)

    private val local = combine(tab, heroRange, heroSeries, edit, dragOrder) { t, r, s, e, o -> Local(t, r, s, e, o) }

    val state: StateFlow<PricesUiState> = combine(
        market.snapshot,
        settingsStore.settings,
        local,
        combine(account.session, account.plus) { session, plus -> session to plus },
        combine(market.refreshing, market.lastError) { refreshing, error -> refreshing to error },
    ) { snapshot, settings, l, (session, plus), (refreshing, error) ->
        val assets = snapshot?.assets.orEmpty()
        PricesUiState(
            loaded = snapshot != null,
            refreshing = refreshing,
            error = error,
            tab = l.tab,
            items = itemsFor(l.tab, assets, settings, l.order),
            assets = assets,
            settings = settings,
            heroRange = l.heroRange,
            heroSeries = l.heroSeries,
            edit = l.edit,
            loggedIn = session != null,
            plus = plus,
            updatedAt = snapshot?.updatedAt.orEmpty(),
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), PricesUiState())

    private val _detail = MutableStateFlow<DetailState?>(null)
    val detail: StateFlow<DetailState?> = _detail

    init {
        viewModelScope.launch { market.loadCached() }
        // نمودار کارت اصلی: اولین دارایی فهرست + بازه‌ی انتخاب‌شده
        viewModelScope.launch {
            combine(state.map { it.items.firstOrNull()?.symbol }.distinctUntilChanged(), heroRange) { symbol, range ->
                symbol to range
            }.distinctUntilChanged().collectLatest { (symbol, range) ->
                heroSeries.value = null
                if (symbol != null) market.history(symbol, range).onSuccess { heroSeries.value = it }
            }
        }
    }

    fun refresh() {
        viewModelScope.launch { market.refresh() }
    }

    fun selectTab(value: PriceTab) {
        tab.value = value
        edit.value = false
        dragOrder.value = null
    }

    fun selectHeroRange(range: ChartRange) {
        heroRange.value = range
    }

    fun startEdit() {
        edit.value = true
    }

    fun endEdit() {
        edit.value = false
        dragOrder.value = null
    }

    fun setViewMode(mode: ViewMode) {
        viewModelScope.launch { settingsStore.setViewMode(mode) }
    }

    /** جابه‌جایی زنده هنگام کشیدن */
    fun move(fromSymbol: String, toSymbol: String) {
        val list = state.value.items.map { it.symbol }.toMutableList()
        val from = list.indexOf(fromSymbol)
        val to = list.indexOf(toSymbol)
        if (from < 0 || to < 0 || from == to) return
        list.add(to, list.removeAt(from))
        dragOrder.value = list
    }

    /** با رها کردن، ترتیب ذخیره می‌شود */
    fun commitOrder() {
        val order = dragOrder.value ?: return
        val current = tab.value
        viewModelScope.launch {
            if (current == PriceTab.CURRENCY) {
                // ارزهای منتخبی که الان در اسنپ‌شات نیستند هم حفظ می‌شوند
                val missing = state.value.settings.favorites.filter { it !in order }
                settingsStore.setFavorites(order + missing)
            } else {
                settingsStore.setOrder(current.orderKey, order)
            }
            dragOrder.value = null
        }
    }

    fun toggleFavorite(asset: Asset) {
        viewModelScope.launch {
            if (asset.category == Category.CURRENCY) settingsStore.toggleFavorite(asset.symbol)
            else settingsStore.toggleStar(asset.symbol)
        }
    }

    // ---------------- جزئیات ----------------

    fun openDetail(asset: Asset) {
        _detail.value = DetailState(asset)
        loadDetail(asset.symbol, ChartRange.WEEK)
        if (state.value.plus.active) {
            viewModelScope.launch {
                market.analysis(asset.symbol).onSuccess { analysis ->
                    _detail.value = _detail.value?.takeIf { it.asset.symbol == asset.symbol }?.copy(analysis = analysis)
                }
            }
        }
    }

    fun closeDetail() {
        _detail.value = null
    }

    fun selectDetailRange(range: ChartRange) {
        val current = _detail.value ?: return
        _detail.value = current.copy(range = range, loading = true)
        loadDetail(current.asset.symbol, range)
    }

    private fun loadDetail(symbol: String, range: ChartRange) {
        viewModelScope.launch {
            val result = market.history(symbol, range)
            _detail.value = _detail.value
                ?.takeIf { it.asset.symbol == symbol && it.range == range }
                ?.copy(series = result.getOrNull(), loading = false)
        }
    }

    suspend fun createAlert(symbol: String, threshold: Double, sms: Boolean): Result<Unit> =
        account.createAlert(symbol, threshold, sms)

    companion object {
        fun itemsFor(tab: PriceTab, assets: List<Asset>, settings: UserSettings, order: List<String>?): List<Asset> {
            val bySymbol = assets.associateBy { it.symbol }
            if (tab == PriceTab.CURRENCY) {
                return (order ?: settings.favorites).mapNotNull { bySymbol[it] }
            }
            val base = assets.filter { it.category in tab.categories }
            val rank = (order ?: settings.orders[tab.orderKey].orEmpty())
                .withIndex()
                .associate { (index, symbol) -> symbol to index }
            return base.sortedBy { rank[it.symbol] ?: Int.MAX_VALUE }
        }
    }
}
