package online.qeymat.app

import android.graphics.Bitmap
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onFirst
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import com.github.takahirom.roborazzi.captureRoboImage
import com.github.takahirom.roborazzi.captureScreenRoboImage
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
 * تصویرهای خام صفحه‌ی برنامه در فروشگاه‌ها (بازار و مایکت) با داده‌ی زنده.
 * قاب و تیتر را scripts/store-frames.mjs می‌سازد.
 *   gradle :app:testDebugUnitTest --tests '*StoreShotsTest*' -Pqeymat.screenshots=true
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [34], qualifiers = "w393dp-h852dp-xxhdpi", application = TestQeymatApplication::class)
class StoreShotsTest {
    @get:Rule
    val compose = createAndroidComposeRule<MainActivity>()

    private val out = File("build/store-raw").apply { mkdirs() }

    private fun shot(name: String, screen: Boolean = false) {
        compose.mainClock.advanceTimeBy(800)
        compose.waitForIdle()
        if (screen) captureScreenRoboImage(File(out, "$name.png").path)
        else compose.onRoot().captureRoboImage(File(out, "$name.png").path)
    }

    private fun click(text: String) {
        compose.onAllNodesWithText(text).onFirst().performClick()
        compose.mainClock.advanceTimeBy(700)
    }

    /** تا رسیدن پاسخ شبکه (نمودار، پرچم‌ها) زمان واقعی می‌گذرد */
    private fun settle(ms: Long) {
        val end = System.currentTimeMillis() + ms
        while (System.currentTimeMillis() < end) {
            compose.mainClock.advanceTimeBy(250)
            Thread.sleep(250)
        }
    }

    @Test
    fun storeShots() {
        assumeTrue(System.getProperty("qeymat.screenshots") == "true")
        val market: MarketRepository = GlobalContext.get().get()
        val store: SettingsStore = GlobalContext.get().get()
        runBlocking {
            store.setThemeMode(ThemeMode.DARK)
            store.setViewMode(ViewMode.LIST)
        }
        compose.waitUntil(40_000) { market.snapshot.value != null }
        settle(1_500)
        click("رد کردن")
        settle(4_000)

        shot("1-home")

        click("ویرایش")
        shot("2-edit")
        click("تمام")

        click("نمودار، نرخ‌های مرتبط و هشدار")
        compose.waitUntil(20_000) { compose.onAllNodesWithText("بیشترین:", substring = true).fetchSemanticsNodes().isNotEmpty() }
        settle(2_500)
        shot("3-detail", screen = true)
        androidx.test.espresso.Espresso.pressBack()
        settle(1_000)

        click("تبدیل")
        settle(1_500)
        shot("4-convert")

        runBlocking {
            store.setThemeMode(ThemeMode.LIGHT)
            store.setViewMode(ViewMode.GRID)
        }
        click("قیمت")
        click("طلا و سکه")
        settle(2_000)
        shot("5-light-gold")

        runBlocking { store.setViewMode(ViewMode.LIST) }
        click("منتخب من")
        settle(1_500)
        shot("6-light-home")

        val context = RuntimeEnvironment.getApplication()
        val assets = market.snapshot.value!!.assets.associateBy { it.symbol }
        val favorites = runBlocking { store.current().favorites }.mapNotNull { assets[it] }
        val d = context.resources.displayMetrics.density
        val updatedAt = market.snapshot.value?.updatedAt
        save(WidgetArt.prices(context, favorites, updatedAt, (330 * d).toInt(), (230 * d).toInt(), true), "widget-prices-dark")
        save(WidgetArt.prices(context, favorites, updatedAt, (330 * d).toInt(), (230 * d).toInt(), false), "widget-prices-light")
        val series = runBlocking { market.history("USD", online.qeymat.core.model.ChartRange.WEEK) }
            .getOrNull()?.points?.map { it.value }.orEmpty()
        save(WidgetArt.dollar(context, assets["USD"], series, updatedAt, (160 * d).toInt(), (160 * d).toInt(), true), "widget-dollar-dark")
        save(WidgetArt.dollar(context, assets["USD"], series, updatedAt, (160 * d).toInt(), (160 * d).toInt(), false), "widget-dollar-light")
    }

    private fun save(bitmap: Bitmap, name: String) {
        File(out, "$name.png").outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
    }
}
