package online.qeymat.core.designsystem

import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.addPathNodes
import androidx.compose.ui.unit.dp

/**
 * آیکون‌های خطی طراحی (کادر ۲۵۶، ضخامت ۱۶، سر گرد).
 * با Icon(tint = …) رنگ می‌گیرند.
 */
object QIcons {
    private fun stroke(name: String, vararg paths: String, width: Float = 16f): ImageVector =
        ImageVector.Builder(name = name, defaultWidth = 24.dp, defaultHeight = 24.dp, viewportWidth = 256f, viewportHeight = 256f)
            .apply {
                for (data in paths) {
                    addPath(
                        pathData = addPathNodes(data),
                        fill = null,
                        stroke = SolidColor(androidx.compose.ui.graphics.Color.Black),
                        strokeLineWidth = width,
                        strokeLineCap = StrokeCap.Round,
                        strokeLineJoin = StrokeJoin.Round,
                    )
                }
            }
            .build()

    private fun filled(name: String, data: String): ImageVector =
        ImageVector.Builder(name = name, defaultWidth = 24.dp, defaultHeight = 24.dp, viewportWidth = 256f, viewportHeight = 256f)
            .apply { addPath(pathData = addPathNodes(data), fill = SolidColor(androidx.compose.ui.graphics.Color.Black)) }
            .build()

    private const val STAR = "M128 26 158 92 230 100 176 152 192 226 128 190 64 226 80 152 26 100 98 92Z"

    val Search = stroke("search", "M192 112a80 80 0 1 1-160 0a80 80 0 1 1 160 0Z", "M168.6 168.6 224 224")
    val Check = stroke("check", "M216 72 104 184 48 128")
    val Star = stroke("star", STAR)
    val StarFilled = filled("starFilled", STAR)
    val ArrowUp = stroke("up", "M128 216V40M56 112l72-72 72 72")
    val ArrowDown = stroke("down", "M128 40v176M56 144l72 72 72-72")
    val Grid = stroke("grid", "M44 44h72v72H44ZM140 44h72v72h-72ZM44 140h72v72H44ZM140 140h72v72h-72Z")

    // سوییچ سه‌حالتهٔ نما (فاز ۲): کارتی، دایره v1، سنجه v2
    val ViewSquare = stroke("viewSquare", "M43 43h170v74H43ZM43 144h74v69H43ZM139 144h74v69h-74Z")
    val ViewCircle = stroke("viewCircle", "M170 80a42 42 0 1 1-84 0a42 42 0 1 1 84 0ZM109 181a34 34 0 1 1-68 0a34 34 0 1 1 68 0ZM215 181a34 34 0 1 1-68 0a34 34 0 1 1 68 0Z")
    val ViewDial = stroke("viewDial", "M170 207A91 91 0 1 1 207 170M128 128 171 75M187 187h34v34h-34Z")
    val ListView = stroke("list", "M88 64h128M88 128h128M88 192h128M44 64h0.1M44 128h0.1M44 192h0.1")
    val Handle = stroke(
        "handle",
        "M92 60h0.1M164 60h0.1M92 128h0.1M164 128h0.1M92 196h0.1M164 196h0.1",
        width = 28f,
    )
    val Close = stroke("close", "M200 56 56 200M200 200 56 56")
    val Back = stroke("back", "M40 128h176M144 56l72 72-72 72")
    val ChevronDown = stroke("chevronDown", "M208 96l-80 80-80-80")
    val ChevronLeft = stroke("chevronLeft", "M160 208 80 128l80-80")
    val Swap = stroke("swap", "M80 40v176M40 176l40 40 40-40M176 216V40M136 80l40-40 40 40")
    val Plus = stroke("plus", "M40 128h176M128 40v176")
    val Bell = stroke(
        "bell",
        "M96 192a32 32 0 0 0 64 0",
        "M56 104a72 72 0 0 1 144 0c0 35.8 8.2 64.5 14.8 75.9A8 8 0 0 1 208 192H48a8 8 0 0 1-6.9-12.1C47.8 168.5 56 139.8 56 104Z",
    )
    // زبانه‌ها: نسخه‌ی عادی و نسخه‌ی پررنگ برای زبانه‌ی انتخاب‌شده
    private val TAB_PRICES = arrayOf("M40 40v144a32 32 0 0 0 32 32h144", "M80 160l40-44 32 28 60-68", "M172 76h40v40")
    private val TAB_CONVERT = arrayOf(
        "M52 108a76 76 0 0 1 136-40l12 16",
        "M204 44v44h-44",
        "M204 148a76 76 0 0 1-136 40l-12-16",
        "M52 212v-44h44",
    )
    private val TAB_ALERTS = arrayOf(
        "M60 112a68 68 0 0 1 136 0c0 42 10 64 20 78a6 6 0 0 1-5 10H45a6 6 0 0 1-5-10c10-14 20-36 20-78Z",
        "M100 216a28 28 0 0 0 56 0",
    )
    private val TAB_SETTINGS = arrayOf(gearPath(), "M160 128a32 32 0 1 1-64 0a32 32 0 1 1 64 0Z")

    val TabPrices = stroke("tabPrices", *TAB_PRICES)
    val TabPricesOn = stroke("tabPricesOn", *TAB_PRICES, width = 22f)
    val TabConvert = stroke("tabConvert", *TAB_CONVERT)
    val TabConvertOn = stroke("tabConvertOn", *TAB_CONVERT, width = 22f)
    val TabAlerts = stroke("tabAlerts", *TAB_ALERTS)
    val TabAlertsOn = stroke("tabAlertsOn", *TAB_ALERTS, width = 22f)
    val TabSettings = stroke("tabSettings", *TAB_SETTINGS)
    val TabSettingsOn = stroke("tabSettingsOn", *TAB_SETTINGS, width = 22f)
    val Sliders = stroke(
        "sliders",
        "M40 80h56M136 80h80M40 176h120M200 176h16",
        "M136 80a20 20 0 1 1-40 0a20 20 0 1 1 40 0Z",
        "M200 176a20 20 0 1 1-40 0a20 20 0 1 1 40 0Z",
    )
    val Sun = stroke(
        "sun",
        "M168 128a40 40 0 1 1-80 0a40 40 0 1 1 80 0Z",
        "M128 28v20M128 208v20M28 128h20M208 128h20M57 57l14 14M185 185l14 14M57 199l14-14M185 71l14-14",
    )
    val Contrast = stroke(
        "contrast",
        "M224 128a96 96 0 1 1-192 0a96 96 0 1 1 192 0Z",
        "M128 32v192",
        "M128 64h44M128 96h76M128 128h84M128 160h76M128 192h44",
    )
    val Widget = stroke(
        "widget",
        "M64 40h48a24 24 0 0 1 24 24v48a24 24 0 0 1-24 24H64a24 24 0 0 1-24-24V64a24 24 0 0 1 24-24Z",
        "M180 36l40 40-40 40-40-40Z",
        "M64 160h128a24 24 0 0 1 24 24v8a24 24 0 0 1-24 24H64a24 24 0 0 1-24-24v-8a24 24 0 0 1 24-24Z",
    )
    val Help = stroke(
        "help",
        "M224 128a96 96 0 1 1-192 0a96 96 0 1 1 192 0Z",
        "M100 102a28 28 0 1 1 42 24c-9 5-14 11-14 20v6",
        "M128 184h0.1",
    )
    // دسته‌ها
    val Cash = stroke(
        "cash",
        "M48 64h160a24 24 0 0 1 24 24v80a24 24 0 0 1-24 24H48a24 24 0 0 1-24-24V88a24 24 0 0 1 24-24Z",
        "M156 128a28 28 0 1 1-56 0a28 28 0 1 1 56 0Z",
        "M60 104v48M196 104v48",
    )
    val GoldBars = stroke(
        "goldBars",
        "M28 208l18-56h68l18 56Z",
        "M124 208l18-56h68l18 56Z",
        "M76 140l18-56h68l18 56",
    )
    val Crypto = stroke(
        "crypto",
        "M128 24l88 50v108l-88 50-88-50V74Z",
        "M128 80l42 24v48l-42 24-42-24v-48Z",
    )
    val Drop = stroke("drop", "M128 28c44 54 72 92 72 128a72 72 0 0 1-144 0c0-36 28-74 72-128Z", "M100 168a32 32 0 0 0 28 24")
    val Minus = stroke("minus", "M224 128a96 96 0 1 1-192 0a96 96 0 1 1 192 0Z", "M88 128h80")
    val Edit = stroke("edit", "M168 40l48 48L96 208H48v-48Z", "M136 72l48 48")
    val Hand = stroke(
        "hand",
        "M104 132V60a16 16 0 0 1 32 0v64",
        "M136 116a16 16 0 0 1 32 0v16a16 16 0 0 1 32 0v40a64 64 0 0 1-64 64h-8c-30 0-46-14-64-40l-22-34a16 16 0 0 1 26-18l18 22",
    )
    val Logout = stroke("logout", "M112 40H48v176h64", "M104 128h112M176 88l40 40-40 40")
    val Phone = stroke("phone", "M76 24h104a12 12 0 0 1 12 12v184a12 12 0 0 1-12 12H76a12 12 0 0 1-12-12V36a12 12 0 0 1 12-12Z", "M112 56h32")
    val User = stroke(
        "user",
        "M184 104a56 56 0 1 1-112 0a56 56 0 1 1 112 0Z",
        "M32 216c19-33 55-56 96-56s77 23 96 56",
    )
    val Globe = stroke(
        "globe",
        "M224 128a96 96 0 1 1-192 0a96 96 0 1 1 192 0Z",
        "M32 128h192M128 32c-24 26-36 58-36 96s12 70 36 96c24-26 36-58 36-96s-12-70-36-96Z",
    )
    val Calendar = stroke("calendar", "M48 48h160v168H48ZM48 96h160M88 32v32M168 32v32")
    val Eye = stroke(
        "eye",
        "M128 56C48 56 16 128 16 128s32 72 112 72 112-72 112-72-32-72-112-72Z",
        "M168 128a40 40 0 1 1-80 0a40 40 0 1 1 80 0Z",
    )
    val Refresh = stroke("refresh", "M184 104h48V56", "M232 104l-37-33a96 96 0 1 0 2 116")
    val Chart = stroke("chart", "M32 200 96 136l48 32 80-96", "M176 72h48v48")
    val Moon = stroke("moon", "M216 148A88 88 0 0 1 108 40a88 88 0 1 0 108 108Z")
    val Share = stroke(
        "share",
        "M208 192a32 32 0 1 1-64 0a32 32 0 1 1 64 0Z",
        "M112 128a32 32 0 1 1-64 0a32 32 0 1 1 64 0Z",
        "M208 64a32 32 0 1 1-64 0a32 32 0 1 1 64 0Z",
        "M107 144l42 27M149 85l-42 27",
    )
    val Support = stroke("support", "M40 208V64a16 16 0 0 1 16-16h144a16 16 0 0 1 16 16v96a16 16 0 0 1-16 16H80Z")
    val Info = stroke("info", "M224 128a96 96 0 1 1-192 0a96 96 0 1 1 192 0Z", "M128 120v56M128 84h0.1")
    val Crown = stroke("crown", "M32 88l48 40 48-72 48 72 48-40-24 112H56Z")
    val Lock = stroke("lock", "M56 112h144v104H56Z", "M88 112V80a40 40 0 0 1 80 0v32")
    val Bars = stroke("bars", "M40 208V120M96 208V72M152 208v-96M208 208V48")
    val Message = stroke("message", "M40 208V64a16 16 0 0 1 16-16h144a16 16 0 0 1 16 16v96a16 16 0 0 1-16 16H80Z", "M88 104h80M88 136h48")
    val Trash = stroke("trash", "M40 64h176M96 64V40h64v24M64 64l12 152h104l12-152")
    val Sparkle = stroke("sparkle", "M128 32l20 76 76 20-76 20-20 76-20-76-76-20 76-20Z")

    /** چرخ‌دنده‌ی ۸ دندانه، محاسبه‌شده به‌جای مسیر دستی */
    private fun gearPath(): String {
        val points = buildList {
            for (tooth in 0 until 8) {
                val center = tooth * 45.0
                for ((angle, radius) in listOf(center - 17 to 78.0, center - 9 to 100.0, center + 9 to 100.0, center + 17 to 78.0)) {
                    val rad = Math.toRadians(angle)
                    add(128 + radius * kotlin.math.cos(rad) to 128 + radius * kotlin.math.sin(rad))
                }
            }
        }
        return points.mapIndexed { index, (x, y) ->
            "${if (index == 0) "M" else "L"}${"%.1f".format(java.util.Locale.US, x)} ${"%.1f".format(java.util.Locale.US, y)}"
        }.joinToString("") + "Z"
    }
}
