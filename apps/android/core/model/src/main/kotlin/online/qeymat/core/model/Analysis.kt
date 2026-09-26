package online.qeymat.core.model

import kotlinx.serialization.Serializable

/** تحلیل قیمت مشترکان پلاس — ساختار /api/plus/analysis */
@Serializable
data class Analysis(
    val symbol: String,
    val nameFa: String = "",
    val unit: String = "TOMAN",
    val price: Double = 0.0,
    val confidence: Double? = null,
    val sourceCount: Int? = null,
    val changes: List<AnalysisChange> = emptyList(),
    val indicators: Indicators = Indicators(),
    val special: List<SpecialMetric> = emptyList(),
    /** bullish | bearish | neutral */
    val outlook: String = "neutral",
    val score: Double = 0.0,
    val summary: String = "",
    val insights: List<String> = emptyList(),
)

@Serializable
data class AnalysisChange(val id: String, val label: String, val percent: Double? = null)

@Serializable
data class Indicators(
    val sma20: Double? = null,
    val sma50: Double? = null,
    val sma200: Double? = null,
    val rsi14: Double? = null,
    val macd: Double? = null,
    val macdSignal: Double? = null,
    val volatility30: Double? = null,
    val high52w: Double? = null,
    val low52w: Double? = null,
    val position52w: Double? = null,
    val drawdown1y: Double? = null,
    val support: Double? = null,
    val resistance: Double? = null,
)

@Serializable
data class SpecialMetric(val label: String, val value: String, val hint: String = "")

@Serializable
data class AnalysisResponse(val analysis: Analysis? = null)
