package online.qeymat.core.model.format

import kotlin.math.abs
import kotlin.math.roundToLong

/**
 * قالب‌بندی عدد به سبک فارسی: ارقام فارسی، جداکننده‌ی هزارگان «٬» و ممیز «٫».
 * همه‌ی متن‌های قیمت در اپ و ویجت از همین‌جا ساخته می‌شوند.
 */
object Fa {
    private const val PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹"

    /** ارقام لاتین ← فارسی؛ نقطه‌ی اعشار ← «٫» */
    fun digits(input: String): String = buildString(input.length) {
        for (char in input) {
            when (char) {
                in '0'..'9' -> append(PERSIAN_DIGITS[char - '0'])
                '.' -> append('٫')
                else -> append(char)
            }
        }
    }

    fun number(value: Int): String = digits(value.toString())

    /** عدد صحیح با جداکننده‌ی هزارگان */
    fun grouped(value: Double): String {
        val rounded = value.roundToLong()
        val negative = rounded < 0
        val raw = abs(rounded).toString()
        val out = StringBuilder()
        raw.forEachIndexed { index, char ->
            if (index > 0 && (raw.length - index) % 3 == 0) out.append('٬')
            out.append(char)
        }
        return (if (negative) "−" else "") + digits(out.toString())
    }

    /** عدد با تعداد رقم اعشار مشخص، بدون صفرهای انتهایی */
    fun decimal(value: Double, fractionDigits: Int): String {
        val text = String.format(java.util.Locale.US, "%.${fractionDigits}f", value)
            .trimEnd('0')
            .trimEnd('.')
        val parts = text.split('.')
        val integer = grouped(parts[0].toDouble())
        return if (parts.size > 1) integer + "٫" + digits(parts[1]) else integer
    }

    /** قیمت کامل: تومانی با هزارگان، دلاری با اعشار به اندازه‌ی لازم (مثل نمونه‌ی طراحی) */
    fun price(value: Double, usd: Boolean = false): String = when {
        !usd && abs(value) >= 1000 -> grouped(value)
        abs(value) >= 10_000 -> grouped(value)
        abs(value) >= 100 -> decimal(value, 1)
        abs(value) >= 1 -> decimal(value, 2)
        abs(value) >= 0.01 -> decimal(value, 4)
        value == 0.0 -> "۰"
        else -> digits(String.format(java.util.Locale.US, "%.3g", value))
    }

    /** قیمت کوتاه برای فهرست‌ها: «۲۳۹ میلیون»، «۱٫۷۷ میلیارد» */
    fun short(value: Double, usd: Boolean = false): String {
        if (usd) return price(value, usd = true)
        val magnitude = abs(value)
        return when {
            magnitude >= 1e9 -> decimal(value / 1e9, 2) + " میلیارد"
            magnitude >= 1e7 -> decimal(value / 1e6, 2) + " میلیون"
            else -> price(value)
        }
    }

    /** «+۱٫۲۳٪» یا «−۰٫۸٪» */
    fun percent(change: Double): String =
        (if (change >= 0) "+" else "−") + decimal(abs(change), 2) + "٪"

    fun unit(usd: Boolean): String = if (usd) "دلار" else "تومان"

    /**
     * ورودی کاربر ← عدد. ارقام فارسی و عربی، «٬» و «,» و فاصله را می‌پذیرد.
     */
    fun parse(input: String): Double? {
        val normalized = buildString {
            for (char in input) {
                when (char) {
                    in '۰'..'۹' -> append('0' + (char - '۰'))
                    in '٠'..'٩' -> append('0' + (char - '٠'))
                    '٫' -> append('.')
                    '٬', ',', ' ', '‌' -> Unit
                    else -> append(char)
                }
            }
        }
        return normalized.toDoubleOrNull()
    }
}
