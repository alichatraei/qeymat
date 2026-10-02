package online.qeymat.core.model

/**
 * نرخ‌های هم‌خانواده برای «نرخ‌های مرتبط» در جزئیات؛ همتای RATE_FAMILIES در
 * packages/shared سایت. دلار تهران کنار فردایی، هرات و تتر؛ طلا کنار آبشده و انس.
 */
object RateFamilies {
    val families: List<List<String>> = listOf(
        listOf("USD", "USD_FARDA", "USD_HERAT", "USDT"),
        listOf("GOLD18", "GOLD24", "ABSHODEH", "OUNCE", "EMAMI"),
        listOf("EMAMI", "BAHAR", "HALF", "QUARTER", "GRAMI", "GOLD18"),
        listOf("BRENT", "WTI", "OPEC", "NATGAS"),
        listOf("XAU", "OUNCE", "XAG", "SILVER999", "XPT", "XPD"),
        listOf("BTC", "ETH", "USDT", "SOL", "TON"),
    )

    /** تا [limit] نرخ مرتبط؛ اگر خانواده نداشت، هم‌دسته‌های اول فهرست */
    fun related(symbol: String, assets: List<Asset>, limit: Int = 5): List<Asset> {
        val bySymbol = assets.associateBy { it.symbol }
        val family = families.firstOrNull { it.first() == symbol } ?: families.firstOrNull { symbol in it }
        val list = family.orEmpty().filter { it != symbol && it in bySymbol }.toMutableList()
        if (list.size < 2) {
            val category = bySymbol[symbol]?.category
            assets.filter { it.category == category && it.symbol != symbol && it.symbol !in list }.mapTo(list) { it.symbol }
        }
        return list.take(limit).mapNotNull { bySymbol[it] }
    }
}
