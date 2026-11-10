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

/** تومان به‌عنوان یک «دارایی» تا در فهرست مبدأ و مقصد هم بیاید */
val TOMAN = Asset(
    symbol = "IRT",
    nameFa = "تومان",
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
    /** مبلغ خام با ارقام لاتین؛ نمایش با ConvertFormat.display */
    val amountRaw: String = "1000",
    val amount: Double = 0.0,
    val result: Double = 0.0,
    /** ارزش ۱ واحد مبدأ بر حسب مقصد */
    val unitRate: Double = 0.0,
)

class ConvertViewModel(market: MarketRepository) : ViewModel() {
    private val fromSymbol = MutableStateFlow("USD")
    private val toSymbol = MutableStateFlow("IRT")
    private val amount = MutableStateFlow("1000")

    val state: StateFlow<ConvertUiState> = combine(market.snapshot, fromSymbol, toSymbol, amount) { snapshot, f, t, a ->
        val assets = snapshot?.assets.orEmpty()
        val usd = assets.firstOrNull { it.symbol == "USD" }?.sell ?: 0.0
        val options = listOf(TOMAN) + assets.filter { it.category in CONVERTIBLE }
        val from = options.firstOrNull { it.symbol == f } ?: TOMAN
        val to = options.firstOrNull { it.symbol == t } ?: TOMAN
        val fromToman = tomanValue(from, usd)
        val toToman = tomanValue(to, usd)
        val rate = if (fromToman > 0 && toToman > 0) fromToman / toToman else 0.0
        val value = a.toDoubleOrNull() ?: 0.0
        ConvertUiState(
            options = options,
            from = from,
            to = to,
            amountRaw = a,
            amount = value,
            result = if (rate > 0) value * rate else 0.0,
            unitRate = rate,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), ConvertUiState())

    /** کلید کی‌پد داخلی: رقم، «.» یا «del» */
    fun press(key: String) {
        amount.value = amount.value.let { current ->
            when {
                key == "del" -> current.dropLast(1)
                key == "." -> if (current.contains('.')) current else current.ifEmpty { "0" } + "."
                else -> {
                    val next = if (current == "0") "" else current
                    if (next.replace(".", "").length >= 12) current else next + key
                }
            }
        }
    }

    fun setAmount(raw: String) {
        amount.value = raw
    }

    /** انتخاب همان ارزِ طرف دیگر، دو طرف را جابه‌جا می‌کند */
    fun setFrom(symbol: String) {
        if (symbol == toSymbol.value) toSymbol.value = fromSymbol.value
        fromSymbol.value = symbol
    }

    fun setTo(symbol: String) {
        if (symbol == fromSymbol.value) fromSymbol.value = toSymbol.value
        toSymbol.value = symbol
    }

    fun swap() {
        val from = fromSymbol.value
        fromSymbol.value = toSymbol.value
        toSymbol.value = from
    }

    companion object {
        private val CONVERTIBLE = setOf(Category.CURRENCY, Category.GOLD, Category.CRYPTO)

        /** ارزش تومانی یک واحد؛ دارایی‌های دلاری (انس) با نرخ دلار */
        fun tomanValue(asset: Asset, usd: Double): Double =
            if (asset.isUsd) asset.sell * usd else asset.sell
    }
}
