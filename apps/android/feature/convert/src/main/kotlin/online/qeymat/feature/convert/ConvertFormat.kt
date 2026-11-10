package online.qeymat.feature.convert

import online.qeymat.core.model.format.Fa

/** فرمت‌های صفحهٔ تبدیل (فاز شیشه‌ای) — گرد کردن اسپک و عدد به حروف فارسی، همتای وب */
object ConvertFormat {
    /** گرد کردن اسپک: بالای ۱۰۰ بدون اعشار؛ ۱ تا ۱۰۰ دو رقم؛ زیر ۱ چهار رقم */
    fun amount(value: Double): String = when {
        !value.isFinite() -> "—"
        value < 1 -> Fa.decimal(value, 4)
        value < 100 -> Fa.decimal(value, 2)
        else -> Fa.grouped(value)
    }

    /** نمایش رشتهٔ در حال تایپِ کی‌پد (ارقام لاتین خام) با جداکننده و ارقام فارسی */
    fun display(raw: String): String {
        if (raw.isEmpty()) return "۰"
        val whole = raw.substringBefore('.').ifEmpty { "0" }
        val grouped = StringBuilder()
        whole.forEachIndexed { index, char ->
            if (index > 0 && (whole.length - index) % 3 == 0) grouped.append('٬')
            grouped.append(char)
        }
        val head = Fa.digits(grouped.toString())
        return if (raw.contains('.')) head + "٫" + Fa.digits(raw.substringAfter('.')) else head
    }

    private val ONES = arrayOf("", "یک", "دو", "سه", "چهار", "پنج", "شش", "هفت", "هشت", "نه")
    private val TEENS = arrayOf("ده", "یازده", "دوازده", "سیزده", "چهارده", "پانزده", "شانزده", "هفده", "هجده", "نوزده")
    private val TENS = arrayOf("", "", "بیست", "سی", "چهل", "پنجاه", "شصت", "هفتاد", "هشتاد", "نود")
    private val HUNDREDS = arrayOf("", "صد", "دویست", "سیصد", "چهارصد", "پانصد", "ششصد", "هفتصد", "هشتصد", "نهصد")
    private val SCALES = arrayOf("", "هزار", "میلیون", "میلیارد", "هزار میلیارد")

    private fun threeDigits(n: Int): String {
        val parts = mutableListOf<String>()
        val hundreds = n / 100
        val rest = n % 100
        if (hundreds > 0) parts += HUNDREDS[hundreds]
        if (rest in 10..19) {
            parts += TEENS[rest - 10]
        } else {
            if (rest / 10 > 0) parts += TENS[rest / 10]
            if (rest % 10 > 0) parts += ONES[rest % 10]
        }
        return parts.joinToString(" و ")
    }

    /** مبلغ به حروف فارسی — برای کاربری که با عددهای بلند راحت نیست */
    fun words(value: Double): String {
        var v = kotlin.math.floor(value).toLong()
        if (v <= 0L || v >= 1_000_000_000_000_000L) return ""
        val parts = ArrayDeque<String>()
        var scale = 0
        while (v > 0L) {
            val group = (v % 1000).toInt()
            if (group > 0) {
                parts.addFirst(threeDigits(group) + if (SCALES[scale].isNotEmpty()) " ${SCALES[scale]}" else "")
            }
            v /= 1000
            scale += 1
        }
        return parts.joinToString(" و ")
    }
}
