package online.qeymat.app.ui

import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.BackHandler
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsBottomHeight
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.runtime.CompositionLocalProvider
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.repeatOnLifecycle
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import online.qeymat.core.data.AccountRepository
import online.qeymat.core.data.MarketRepository
import online.qeymat.core.data.SettingsStore
import online.qeymat.core.data.ThemeMode
import online.qeymat.core.data.UserSettings
import online.qeymat.core.designsystem.Q
import online.qeymat.core.designsystem.QIcons
import online.qeymat.core.designsystem.QeymatTheme
import online.qeymat.core.designsystem.component.BrandMark
import online.qeymat.core.designsystem.component.LocalTourTargets
import online.qeymat.core.designsystem.component.TourKeys
import online.qeymat.core.designsystem.component.TourOverlay
import online.qeymat.core.designsystem.component.TourStep
import online.qeymat.core.designsystem.component.TourTargets
import online.qeymat.core.designsystem.component.quietClick
import online.qeymat.core.designsystem.component.tourTarget
import online.qeymat.feature.alerts.AlertsRoute
import online.qeymat.feature.convert.ConvertRoute
import online.qeymat.feature.prices.PricesRoute
import online.qeymat.feature.settings.SettingsRoute
import online.qeymat.widget.QeymatWidgets
import online.qeymat.widget.WidgetArt
import org.koin.compose.koinInject

enum class AppTab(val label: String, val icon: ImageVector, val iconOn: ImageVector) {
    PRICES("قیمت", QIcons.TabPrices, QIcons.TabPricesOn),
    CONVERT("تبدیل", QIcons.TabConvert, QIcons.TabConvertOn),
    ALERTS("هشدار", QIcons.TabAlerts, QIcons.TabAlertsOn),
    SETTINGS("تنظیمات", QIcons.TabSettings, QIcons.TabSettingsOn),
}

@Composable
fun QeymatAppRoot(versionName: String) {
    val settingsStore: SettingsStore = koinInject()
    val settings by settingsStore.settings.collectAsStateWithLifecycle(UserSettings())
    val dark = when (settings.themeMode) {
        ThemeMode.SYSTEM -> isSystemInDarkTheme()
        ThemeMode.LIGHT -> false
        ThemeMode.DARK -> true
    }

    // آیکون‌های نوار وضعیت و ناوبری هم‌رنگ پوسته
    val activity = LocalContext.current as? ComponentActivity
    LaunchedEffect(dark) {
        val style = if (dark) SystemBarStyle.dark(android.graphics.Color.TRANSPARENT)
        else SystemBarStyle.light(android.graphics.Color.TRANSPARENT, android.graphics.Color.TRANSPARENT)
        activity?.enableEdgeToEdge(statusBarStyle = style, navigationBarStyle = style)
    }

    QeymatTheme(dark = dark) {
        AppContent(versionName, settings, settingsStore)
    }
}

@Composable
private fun AppContent(versionName: String, settings: UserSettings, settingsStore: SettingsStore) {
    var tab by rememberSaveable { mutableStateOf(AppTab.PRICES) }
    val market: MarketRepository = koinInject()
    val account: AccountRepository = koinInject()
    val lifecycleOwner = LocalLifecycleOwner.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val targets = remember { TourTargets() }

    // تور راهنما: بار اول خودکار، بعداً از تنظیمات
    val tourDone by settingsStore.tourDone.collectAsStateWithLifecycle(initialValue = null)
    var tourIndex by rememberSaveable { mutableStateOf<Int?>(null) }
    LaunchedEffect(tourDone) {
        if (tourDone == false && tourIndex == null) {
            tab = AppTab.PRICES
            delay(500)
            tourIndex = 0
        }
    }
    fun finishTour() {
        tourIndex = null
        scope.launch { settingsStore.setTourDone(true) }
    }
    fun startTour() {
        tab = AppTab.PRICES
        tourIndex = 0
    }
    fun addWidget() {
        if (!QeymatWidgets.requestPin(context)) {
            Toast.makeText(
                context,
                "روی صفحه‌ی اصلی گوشی انگشت نگه دارید، «ویجت‌ها» را بزنید و «قیمت» را انتخاب کنید.",
                Toast.LENGTH_LONG,
            ).show()
        }
    }

    // تا وقتی اپ جلوی چشم است، هر ۳۰ ثانیه قیمت‌ها تازه می‌شوند
    LaunchedEffect(settings.autoRefresh) {
        lifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
            account.refreshAccount()
            while (true) {
                market.refresh()
                if (!settings.autoRefresh) break
                delay(30_000)
            }
        }
    }

    BackHandler(enabled = tourIndex == null && tab != AppTab.PRICES) { tab = AppTab.PRICES }

    CompositionLocalProvider(LocalTourTargets provides targets) {
        Box(Modifier.fillMaxSize().background(Q.Bg)) {
            Column(Modifier.fillMaxSize()) {
                Box(Modifier.weight(1f)) {
                    when (tab) {
                        AppTab.PRICES -> PricesRoute(onRequireLogin = { tab = AppTab.ALERTS })
                        AppTab.CONVERT -> ConvertRoute()
                        AppTab.ALERTS -> AlertsRoute(onAddAlert = { tab = AppTab.PRICES })
                        AppTab.SETTINGS -> SettingsRoute(
                            versionName = versionName,
                            onLogin = { tab = AppTab.ALERTS },
                            onStartTour = ::startTour,
                            onAddWidget = ::addWidget,
                        )
                    }
                }
                TabBar(selected = tab, onSelect = { tab = it })
            }

            tourIndex?.let { index ->
                BackHandler { if (index > 0) tourIndex = index - 1 else finishTour() }
                val steps = tourSteps(
                    favorites = settings.favorites,
                    market = market,
                    dark = Q.isDark,
                    canPin = QeymatWidgets.canPin(context),
                    onAddWidget = ::addWidget,
                )
                TourOverlay(
                    steps = steps,
                    index = index.coerceAtMost(steps.lastIndex),
                    targets = targets,
                    onIndex = { tourIndex = it },
                    onFinish = ::finishTour,
                )
            }
        }
    }
}

@Composable
private fun tourSteps(
    favorites: List<String>,
    market: MarketRepository,
    dark: Boolean,
    canPin: Boolean,
    onAddWidget: () -> Unit,
): List<TourStep> {
    val snapshot by market.snapshot.collectAsStateWithLifecycle()
    return listOf(
        TourStep(
            title = "به «قیمت» خوش آمدید",
            body = "نرخ لحظه‌ای ارز، طلا، سکه و رمزارز از چند منبع، در یک جا. در چند قدم کوتاه امکانات برنامه را با هم ببینیم.",
            icon = QIcons.Sparkle,
            illustration = { BrandMark(72.dp) },
        ),
        TourStep(
            title = "دسته‌ها",
            body = "«منتخب من» نرخ‌هایی است که خودتان انتخاب کرده‌اید. بقیه‌ی دسته‌ها، یعنی ارز، طلا و سکه، کریپتو، کالا و بورس جهانی، از همین نوار در دسترس‌اند.",
            icon = QIcons.StarFilled,
            target = TourKeys.TABS,
        ),
        TourStep(
            title = "نرخ ویژه",
            body = "اولین منتخب شما بزرگ‌تر بالای صفحه می‌آید. روی هر نرخ بزنید تا نمودار، بیشترین و کمترین امروز، نرخ‌های مرتبط مثل فردایی و هرات و ساخت هشدار را ببینید.",
            icon = QIcons.Chart,
            target = TourKeys.HERO,
        ),
        TourStep(
            title = "ویرایش منتخب‌ها",
            body = "با «ویرایش» ترتیب منتخب‌ها را عوض کنید، حذفشان کنید یا نرخ ویژه را تغییر دهید. ستاره‌ی هر نرخ آن را به منتخب اضافه می‌کند. دکمه‌ی کنارش نمایش فهرستی یا شبکه‌ای را عوض می‌کند.",
            icon = QIcons.Edit,
            target = TourKeys.LIST,
        ),
        TourStep(
            title = "جستجو",
            body = "هر ارز، سکه یا رمزارزی را با نام فارسی، انگلیسی یا نماد پیدا کنید.",
            icon = QIcons.Search,
            target = TourKeys.SEARCH,
        ),
        TourStep(
            title = "تبدیل",
            body = "مبلغ را بنویسید و بین ارز، طلا، سکه و رمزارز تبدیل کنید؛ تبدیل‌های پرکاربرد هم با یک لمس آماده‌اند.",
            icon = QIcons.TabConvert,
            target = tabTarget(AppTab.CONVERT),
        ),
        TourStep(
            title = "هشدار قیمت",
            body = "قیمت هدف بگذارید؛ وقتی رسید اعلان می‌گیرید. با «قیمت پلاس» پیامک هم می‌آید.",
            icon = QIcons.TabAlerts,
            target = tabTarget(AppTab.ALERTS),
        ),
        TourStep(
            title = "تنظیمات و پوسته",
            body = "پوسته‌ی روشن یا تاریک، نمایش قیمت خرید، به‌روزرسانی خودکار و حساب کاربری. این راهنما را هم هر وقت خواستید از همین‌جا دوباره ببینید.",
            icon = QIcons.TabSettings,
            target = tabTarget(AppTab.SETTINGS),
        ),
        TourStep(
            title = "ویجت صفحه‌ی اصلی",
            body = if (canPin) {
                "قیمت‌ها را بدون باز کردن برنامه ببینید. ویجت «قیمت‌های منتخب» همان ارزهای صفحه‌ی اول را نشان می‌دهد و ویجت «دلار» نمودار هفته را. با دکمه‌ی زیر اضافه‌اش کنید."
            } else {
                "قیمت‌ها را بدون باز کردن برنامه ببینید: روی صفحه‌ی اصلی گوشی انگشت نگه دارید، «ویجت‌ها» را بزنید و «قیمت» را انتخاب کنید."
            },
            icon = QIcons.Widget,
            actionLabel = if (canPin) "افزودن ویجت به صفحه‌ی اصلی" else null,
            onAction = if (canPin) onAddWidget else null,
            illustration = {
                val assets = snapshot?.assets.orEmpty().associateBy { it.symbol }
                WidgetPreview(favorites.mapNotNull { assets[it] }, snapshot?.updatedAt, dark)
            },
        ),
    )
}

/** پیش‌نمایش واقعی ویجت، با همان کدی که روی صفحه‌ی اصلی کشیده می‌شود */
@Composable
private fun WidgetPreview(assets: List<online.qeymat.core.model.Asset>, updatedAt: String?, dark: Boolean) {
    val context = LocalContext.current
    val density = LocalDensity.current
    val width = 260.dp
    val height = 176.dp
    val bitmap = remember(assets, updatedAt, dark) {
        with(density) {
            WidgetArt.prices(context, assets.take(3), updatedAt, width.roundToPx(), height.roundToPx(), dark).asImageBitmap()
        }
    }
    Image(bitmap, contentDescription = "پیش‌نمایش ویجت", modifier = Modifier.size(width, height))
}

private fun tabTarget(tab: AppTab) = TourKeys.tab(tab.name)

/** نوار زبانه‌ی چسبیده به پایین، با نشانگر کپسولی زبانه‌ی فعال */
@Composable
private fun TabBar(selected: AppTab, onSelect: (AppTab) -> Unit) {
    val line = Q.line(0.16f)
    Column(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
            .background(Q.Bar)
            .drawBehind {
                drawLine(line, Offset(0f, 0.5f), Offset(size.width, 0.5f), strokeWidth = 1.dp.toPx())
            },
    ) {
        Row(
            Modifier.fillMaxWidth().height(66.dp).padding(horizontal = 8.dp),
            horizontalArrangement = Arrangement.SpaceAround,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            for (tab in AppTab.entries) {
                val on = tab == selected
                val color by animateColorAsState(if (on) Q.Mint else Q.Sub, label = "tab")
                val pill by animateDpAsState(if (on) 58.dp else 36.dp, label = "pill")
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .height(60.dp)
                        .tourTarget(tabTarget(tab))
                        .quietClick { onSelect(tab) },
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(4.dp, Alignment.CenterVertically),
                ) {
                    Box(
                        modifier = Modifier
                            .width(pill)
                            .height(32.dp)
                            .clip(CircleShape)
                            .background(if (on) Q.Mint.copy(alpha = if (Q.isDark) 0.14f else 0.12f) else Q.Bar),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(if (on) tab.iconOn else tab.icon, contentDescription = tab.label, tint = color, modifier = Modifier.size(22.dp))
                    }
                    Text(
                        tab.label,
                        color = color,
                        fontSize = 11.sp,
                        fontWeight = if (on) FontWeight.ExtraBold else FontWeight.Medium,
                    )
                }
            }
        }
        // زیر نوار ناوبری گوشی هم هم‌رنگ نوار است
        Box(Modifier.fillMaxWidth().windowInsetsBottomHeight(WindowInsets.navigationBars))
    }
}
