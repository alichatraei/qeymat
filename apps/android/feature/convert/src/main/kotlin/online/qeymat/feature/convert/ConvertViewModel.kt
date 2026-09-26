package online.qeymat.feature.convert

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import online.qeymat.core.data.MarketRepository
import online.qeymat.core.model.Asset
import online.qeymat.core.model.Category
import online.qeymat.core.model.format.Fa

/** تومان به‌عنوان یک «دارایی» تا در فهرست مبدأ و مقصد هم بیاید */
val TOMAN = Asset(
    symbol = "IRT",
    nameFa = "تومان ایران",
    nameEn = "Iranian Toman",
    category = Category.CURRENCY,
    countryCode = "IR",
    sell = 1.0,
    buy = 1.0,
    sourceLabel = "—",
)

data class ConvertUiState(
    val options: List<Asset> = emptyList(),
    val from: Asset = TOMAN,
    val to: Asset = TOMAN,
    val amount: String = "۱۰۰",
    val result: String = "—",
    val rateLine: String = "",
)

class ConvertViewModel(market: MarketRepository) : ViewModel() {
    private val fromSymbol = MutableStateFlow("USD")
    private val toSymbol = MutableStateFlow("IRT")
    private val amount = MutableStateFlow("۱۰۰")

    val state: StateFlow<ConvertUiState> = combine(market.snapshot, fromSymbol, toSymbol, amount) { snapshot, f, t, a ->
        val assets = snapshot?.assets.orEmpty()
        val usd = assets.firstOrNull { it.symbol == "USD" }?.sell ?: 0.0
        val options = listOf(TOMAN) + assets.filter { it.category in CONVERTIBLE }
        val from = options.firstOrNull { it.symbol == f } ?: TOMAN
        val to = options.firstOrNull { it.symbol == t } ?: TOMAN
        val fromToman = tomanValue(from, usd)
        val toToman = tomanValue(to, usd)
        val rate = if (toToman > 0) fromToman / toToman else 0.0
        val value = Fa.parse(a)
        ConvertUiState(
            options = options,
            from = from,
            to = to,
            amount = a,
            result = if (value != null && rate > 0) format(to, value * rate) else "—",
            rateLine = if (rate > 0) "۱ ${from.symbol} = ${format(to, rate)} ${to.symbol}" else "نرخ در دسترس نیست",
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), ConvertUiState())

    fun setAmount(value: String) {
        amount.value = value
    }

    fun setFrom(symbol: String) {
        fromSymbol.value = symbol
    }

    fun setTo(symbol: String) {
        toSymbol.value = symbol
    }

    fun swap() {
        val from = fromSymbol.value
        fromSymbol.value = toSymbol.value
        toSymbol.value = from
    }

    fun quick(from: String, to: String) {
        fromSymbol.value = from
        toSymbol.value = to
    }

    companion object {
        private val CONVERTIBLE = setOf(Category.CURRENCY, Category.GOLD, Category.CRYPTO)

        /** ارزش تومانی یک واحد؛ دارایی‌های دلاری (انس) با نرخ دلار */
        fun tomanValue(asset: Asset, usd: Double): Double =
            if (asset.isUsd) asset.sell * usd else asset.sell

        private fun format(asset: Asset, value: Double): String =
            if (asset.symbol == "IRT" || value >= 1000) Fa.price(value) else Fa.price(value, usd = true)
    }
}
