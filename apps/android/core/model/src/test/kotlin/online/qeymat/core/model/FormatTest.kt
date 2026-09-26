package online.qeymat.core.model

import online.qeymat.core.model.format.Fa
import online.qeymat.core.model.format.Jalali
import org.junit.Assert.assertEquals
import org.junit.Test

class FormatTest {
    @Test
    fun jalaliConversion() {
        val cases = mapOf(
            "2026-09-24T00:00:00.000Z" to "پنج‌شنبه ۲ مهر ۱۴۰۵",
            "2011-11-26T00:00:00Z" to "شنبه ۵ آذر ۱۳۹۰",
            "2025-03-21T00:00:00Z" to "جمعه ۱ فروردین ۱۴۰۴",
        )
        for ((iso, expected) in cases) {
            assertEquals(expected, Jalali.full(Jalali.parseIso(iso)!!))
        }
    }

    @Test
    fun tehranTime() {
        // ۲۰:۳۰ به وقت جهانی = نیمه‌شب روز بعد در تهران
        val millis = Jalali.parseIso("2026-09-24T20:30:00Z")!!
        assertEquals("۰۰:۰۰", Jalali.time(millis))
        assertEquals("۳ مهر", Jalali.dayMonth(millis))
    }

    @Test
    fun numbers() {
        assertEquals("۲۳۴٬۷۰۰", Fa.price(234_700.0))
        assertEquals("۴٬۲۷۶٫۴", Fa.price(4276.35, usd = true))
        assertEquals("۱٫۵۳", Fa.price(1.53, usd = true))
        assertEquals("۲۳۹ میلیون", Fa.short(239_000_000.0))
        assertEquals("+۰٫۴٪", Fa.percent(0.4))
        assertEquals("−۱٫۰۷٪", Fa.percent(-1.07))
        assertEquals(1234.5, Fa.parse("۱٬۲۳۴٫۵")!!, 0.0001)
    }
}
