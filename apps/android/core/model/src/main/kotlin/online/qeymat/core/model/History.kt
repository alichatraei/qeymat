package online.qeymat.core.model

import kotlinx.serialization.Serializable

@Serializable
data class HistoryPoint(
    val at: String,
    val label: String = "",
    val value: Double,
    val open: Double? = null,
    val high: Double? = null,
    val low: Double? = null,
)

/**
 * سری قیمت برای نمودار.
 * interval: raw (نقاط ۱۵ دقیقه‌ای یک روز) | day | month | year
 */
@Serializable
data class HistorySeries(
    val symbol: String,
    val nameFa: String = "",
    val unit: String = "TOMAN",
    val range: String = "1m",
    val interval: String = "day",
    val firstDay: String? = null,
    val yearsAvailable: Double = 0.0,
    val points: List<HistoryPoint> = emptyList(),
)

@Serializable
data class HistoryResponse(val series: HistorySeries? = null)

/** بازه‌های نمودار — شناسه‌ها همان پارامتر range سرور است */
enum class ChartRange(val id: String, val label: String) {
    DAY("1d", "روز"),
    WEEK("1w", "هفته"),
    MONTH("1m", "ماه"),
    YEAR("1y", "سال"),
    FIVE_YEARS("5y", "۵ سال"),
    ALL("10y", "همه"),
}
