package online.qeymat.app

import android.graphics.Bitmap
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onFirst
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import com.github.takahirom.roborazzi.captureRoboImage
import com.github.takahirom.roborazzi.captureScreenRoboImage
import androidx.compose.ui.test.performScrollTo
import java.io.File
import kotlinx.coroutines.runBlocking
import online.qeymat.core.data.MarketRepository
import online.qeymat.core.data.SettingsStore
import online.qeymat.core.data.ThemeMode
import online.qeymat.core.data.ViewMode
import online.qeymat.widget.WidgetArt
import org.junit.Assume.assumeTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.koin.core.context.GlobalContext
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * تصویر صفحه‌ها و ویجت، بدون شبیه‌ساز و با داده‌ی زنده‌ی qeymat.online.
 * فقط با -Pqeymat.screenshots=true اجرا می‌شود (در CI رد می‌شود).
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [34], qualifiers = "w393dp-h852dp-xxhdpi", application = TestQeymatApplication::class)
class ScreenshotTest {
    @get:Rule
    val compose = createAndroidComposeRule<MainActivity>()

    private val out = File("build/screens").apply { mkdirs() }

    private fun shot(name: String) {
        compose.waitForIdle()
        compose.onRoot().captureRoboImage(File(out, "$name.png").path)
    }

    private fun next(label: String = "بعدی") {
        compose.onNodeWithText(label).performClick()
        compose.mainClock.advanceTimeBy(900)
    }

    private fun tab(label: String) {
        compose.onAllNodesWithText(label).onFirst().performClick()
        compose.mainClock.advanceTimeBy(600)
    }

    @Test
    fun screens() {
        assumeTrue(System.getProperty("qeymat.screenshots") == "true")
        val market: MarketRepository = GlobalContext.get().get()
        val store: SettingsStore = GlobalContext.get().get()
        runBlocking { store.setThemeMode(ThemeMode.DARK) }
        compose.waitUntil(40_000) { market.snapshot.value != null }
        compose.mainClock.advanceTimeBy(1_500)

        // تور راهنما
        for (step in 0 until 9) {
            shot("tour-$step")
            if (step < 8) next()
        }
        next("شروع کنیم")

        for (theme in listOf(ThemeMode.DARK, ThemeMode.LIGHT)) {
            val t = theme.name.lowercase()
            runBlocking {
                store.setThemeMode(theme)
                store.setViewMode(ViewMode.LIST)
            }
            compose.mainClock.advanceTimeBy(600)
            tab("قیمت")
            tab("منتخب من")
            shot("$t-prices-list")
            if (theme == ThemeMode.DARK) {
                tab("ویرایش")
                shot("dark-edit")
                tab("تمام")
                compose.onAllNodesWithText("نمودار، نرخ‌های مرتبط و هشدار").onFirst().performClick()
                compose.mainClock.advanceTimeBy(1_500)
                compose.onNodeWithText("نرخ‌های مرتبط").performScrollTo()
                compose.mainClock.advanceTimeBy(600)
                compose.waitForIdle()
                captureScreenRoboImage(File(out, "dark-detail.png").path)
                androidx.test.espresso.Espresso.pressBack()
                compose.mainClock.advanceTimeBy(1_000)
            }
            runBlocking { store.setViewMode(ViewMode.GRID) }
            compose.mainClock.advanceTimeBy(600)
            tab("طلا و سکه")
            shot("$t-prices-grid")
            tab("تبدیل")
            shot("$t-convert")
            tab("هشدار")
            shot("$t-alerts")
            tab("تنظیمات")
            shot("$t-settings")
        }

        // ویجت‌ها با همان کدی که روی صفحه‌ی اصلی کشیده می‌شوند
        val context = RuntimeEnvironment.getApplication()
        val assets = market.snapshot.value!!.assets.associateBy { it.symbol }
        val favorites = runBlocking { store.current().favorites }.mapNotNull { assets[it] }
        val d = context.resources.displayMetrics.density
        for (dark in listOf(true, false)) {
            val name = if (dark) "dark" else "light"
            save(WidgetArt.prices(context, favorites, market.snapshot.value?.updatedAt, (300 * d).toInt(), (220 * d).toInt(), dark), "widget-prices-$name")
            val series = listOf(255.0, 256.2, 255.8, 257.1, 258.3, 257.9, 259.9)
            save(WidgetArt.dollar(context, assets["USD"], series, market.snapshot.value?.updatedAt, (170 * d).toInt(), (170 * d).toInt(), dark), "widget-dollar-$name")
        }
    }

    private fun save(bitmap: Bitmap, name: String) {
        File(out, "$name.png").outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
    }
}
