package online.qeymat.core.model

import org.junit.Assert.assertEquals
import org.junit.Test

class RateFamiliesTest {
    private fun asset(symbol: String, category: Category = Category.CURRENCY) = Asset(symbol = symbol, nameFa = symbol, category = category)

    private val assets = listOf(
        asset("USD"), asset("USD_FARDA"), asset("USD_HERAT"), asset("EUR"), asset("AED"),
        asset("USDT", Category.CRYPTO), asset("GOLD18", Category.GOLD), asset("EMAMI", Category.GOLD),
    )

    @Test
    fun dollarShowsItsVariants() {
        assertEquals(listOf("USD_FARDA", "USD_HERAT", "USDT"), RateFamilies.related("USD", assets).map { it.symbol })
    }

    @Test
    fun herathShowsTehranDollarFirst() {
        assertEquals(listOf("USD", "USD_FARDA", "USDT"), RateFamilies.related("USD_HERAT", assets).map { it.symbol })
    }

    @Test
    fun assetWithoutFamilyFallsBackToCategory() {
        assertEquals(listOf("USD", "USD_FARDA", "USD_HERAT", "AED"), RateFamilies.related("EUR", assets).map { it.symbol })
    }
}
