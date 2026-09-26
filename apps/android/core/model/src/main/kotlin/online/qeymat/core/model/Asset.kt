package online.qeymat.core.model

import kotlinx.serialization.Serializable

/** دسته‌ی دارایی — هم‌نام با سرور */
@Serializable
enum class Category {
    CURRENCY,
    GOLD,
    CRYPTO,
    COMMODITY,
    STOCK,
    INDEX,
}

/**
 * یک دارایی با آخرین نرخ «تحلیل قیمت».
 * قیمت‌ها تومانی‌اند، مگر `unit == "USD"` (مثل انس جهانی طلا).
 */
@Serializable
data class Asset(
    val symbol: String,
    val nameFa: String,
    val nameEn: String = "",
    val category: Category = Category.CURRENCY,
    val featured: Boolean = true,
    val countryCode: String? = null,
    val mark: String? = null,
    val unit: String = "TOMAN",
    val sourceLabel: String = "",
    val buy: Double = 0.0,
    val sell: Double = 0.0,
    val changePercent: Double = 0.0,
    val dayLow: Double? = null,
    val dayHigh: Double? = null,
    val globalPrice: Double? = null,
    val confidence: Double? = null,
    val sourceCount: Int? = null,
    val fetchedAt: String? = null,
) {
    val isUsd: Boolean get() = unit == "USD"

    /** تغییر مطلق امروز بر حسب واحد قیمت */
    val changeAbsolute: Double
        get() = if (changePercent == -100.0) 0.0 else sell - sell / (1 + changePercent / 100)
}

@Serializable
data class MarketSnapshot(
    val updatedAt: String = "",
    val assets: List<Asset> = emptyList(),
    val hasPlus: Boolean = false,
)
