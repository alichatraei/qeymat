package online.qeymat.core.model.format

/**
 * تقویم شمسی و زمان تهران بدون وابستگی به java.time (برای minSdk 24).
 * ایران از ۱۴۰۱ ساعت تابستانی ندارد، پس اختلاف ثابت ۳:۳۰ است.
 */
data class JalaliDateTime(
    val year: Int,
    val month: Int,
    val day: Int,
    /** ۰ = یکشنبه … ۶ = شنبه */
    val weekday: Int,
    val hour: Int,
    val minute: Int,
)

object Jalali {
    private const val TEHRAN_OFFSET_MS = (3 * 60 + 30) * 60 * 1000L
    private const val DAY_MS = 24 * 60 * 60 * 1000L

    val MONTHS = listOf(
        "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
        "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
    )

    /** نام روز هفته با شروع از یکشنبه */
    val WEEKDAYS = listOf("یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه", "شنبه")

    fun fromEpochMillis(millis: Long): JalaliDateTime {
        val local = millis + TEHRAN_OFFSET_MS
        val days = Math.floorDiv(local, DAY_MS)
        val msOfDay = Math.floorMod(local, DAY_MS)
        val (gy, gm, gd) = civilFromDays(days)
        val (jy, jm, jd) = gregorianToJalali(gy, gm, gd)
        return JalaliDateTime(
            year = jy,
            month = jm,
            day = jd,
            weekday = Math.floorMod(days + 4, 7L).toInt(),
            hour = (msOfDay / 3_600_000).toInt(),
            minute = ((msOfDay / 60_000) % 60).toInt(),
        )
    }

    /** «2026-09-24T00:00:00.000Z» ← میلی‌ثانیه؛ رشته‌ی نامعتبر null */
    fun parseIso(text: String?): Long? {
        if (text.isNullOrBlank()) return null
        val match = ISO.matchEntire(text.trim()) ?: return null
        val (y, mo, d, h, mi, s, frac) = match.destructured
        val days = daysFromCivil(y.toInt(), mo.toInt(), d.toInt())
        val millis = frac.takeIf { it.isNotEmpty() }?.padEnd(3, '0')?.take(3)?.toLong() ?: 0L
        return days * DAY_MS + h.toInt() * 3_600_000L + mi.toInt() * 60_000L + s.toInt() * 1000L + millis
    }

    private val ISO =
        Regex("""(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?Z""")

    /** «۳ مهر» */
    fun dayMonth(millis: Long): String {
        val date = fromEpochMillis(millis)
        return "${Fa.number(date.day)} ${MONTHS[date.month - 1]}"
    }

    /** «جمعه ۳ مهر ۱۴۰۵» */
    fun full(millis: Long): String {
        val date = fromEpochMillis(millis)
        return "${WEEKDAYS[date.weekday]} ${Fa.number(date.day)} ${MONTHS[date.month - 1]} ${Fa.number(date.year)}"
    }

    /** «مهر ۰۵» یا «مهر ۱۴۰۵» */
    fun monthYear(millis: Long, shortYear: Boolean = false): String {
        val date = fromEpochMillis(millis)
        val year = if (shortYear) Fa.digits((date.year % 100).toString().padStart(2, '0')) else Fa.number(date.year)
        return "${MONTHS[date.month - 1]} $year"
    }

    fun year(millis: Long): String = Fa.number(fromEpochMillis(millis).year)

    /** «۱۴:۳۵» */
    fun time(millis: Long): String {
        val date = fromEpochMillis(millis)
        return Fa.digits("%02d:%02d".format(date.hour, date.minute))
    }

    /** برچسب محور بر اساس دانه‌بندی سری و طول بازه */
    fun axisLabel(millis: Long, interval: String, spanMillis: Long): String = when {
        interval == "raw" || spanMillis <= 2 * DAY_MS -> time(millis)
        interval == "year" || spanMillis > 3 * 365 * DAY_MS -> year(millis)
        interval == "month" || spanMillis > 120 * DAY_MS -> monthYear(millis, shortYear = true)
        else -> dayMonth(millis)
    }

    /** برچسب کامل نقطه‌ی انتخاب‌شده روی نمودار */
    fun pointLabel(millis: Long, interval: String): String = when (interval) {
        "raw" -> "${dayMonth(millis)} · ${time(millis)}"
        "month" -> monthYear(millis)
        "year" -> year(millis)
        else -> full(millis)
    }

    // --- تبدیل‌ها (الگوریتم‌های استاندارد، بدون ممیز شناور) ---

    internal fun civilFromDays(days: Long): Triple<Int, Int, Int> {
        val z = days + 719468
        val era = Math.floorDiv(z, 146097L)
        val doe = z - era * 146097
        val yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365
        val doy = doe - (365 * yoe + yoe / 4 - yoe / 100)
        val mp = (5 * doy + 2) / 153
        val d = (doy - (153 * mp + 2) / 5 + 1).toInt()
        val m = (if (mp < 10) mp + 3 else mp - 9).toInt()
        val y = (yoe + era * 400 + if (m <= 2) 1 else 0).toInt()
        return Triple(y, m, d)
    }

    internal fun daysFromCivil(year: Int, month: Int, day: Int): Long {
        val y = (if (month <= 2) year - 1 else year).toLong()
        val era = Math.floorDiv(y, 400L)
        val yoe = y - era * 400
        val doy = (153 * (if (month > 2) month - 3 else month + 9) + 2) / 5 + day - 1
        val doe = yoe * 365 + yoe / 4 - yoe / 100 + doy
        return era * 146097 + doe - 719468
    }

    internal fun gregorianToJalali(gy: Int, gm: Int, gd: Int): Triple<Int, Int, Int> {
        val gdm = intArrayOf(0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334)
        val gy2 = if (gm > 2) gy + 1 else gy
        var days = 355666 + 365 * gy + (gy2 + 3) / 4 - (gy2 + 99) / 100 + (gy2 + 399) / 400 + gd + gdm[gm - 1]
        var jy = -1595 + 33 * (days / 12053)
        days %= 12053
        jy += 4 * (days / 1461)
        days %= 1461
        if (days > 365) {
            jy += (days - 1) / 365
            days = (days - 1) % 365
        }
        val jm = if (days < 186) 1 + days / 31 else 7 + (days - 186) / 30
        val jd = 1 + if (days < 186) days % 31 else (days - 186) % 30
        return Triple(jy, jm, jd)
    }
}
