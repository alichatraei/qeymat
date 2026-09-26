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
    val TabPrices = stroke("tabPrices", "M32 184l56-56 40 32 96-96", "M168 64h56v56")
    val TabConvert = stroke("tabConvert", "M40 88h176M176 48l40 40-40 40", "M216 168H40M80 128l-40 40 40 40")
    val TabSettings = stroke(
        "tabSettings",
        "M40 80h56M136 80h80M40 176h120M200 176h16",
        "M136 80a20 20 0 1 1-40 0a20 20 0 1 1 40 0Z",
        "M200 176a20 20 0 1 1-40 0a20 20 0 1 1 40 0Z",
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
}
