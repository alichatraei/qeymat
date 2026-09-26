package online.qeymat.app.ui

import androidx.activity.compose.BackHandler
import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.repeatOnLifecycle
import kotlinx.coroutines.delay
import online.qeymat.core.data.AccountRepository
import online.qeymat.core.data.MarketRepository
import online.qeymat.core.data.SettingsStore
import online.qeymat.core.data.UserSettings
import online.qeymat.core.designsystem.Q
import online.qeymat.core.designsystem.QIcons
import online.qeymat.core.designsystem.component.quietClick
import online.qeymat.feature.alerts.AlertsRoute
import online.qeymat.feature.convert.ConvertRoute
import online.qeymat.feature.prices.PricesRoute
import online.qeymat.feature.settings.SettingsRoute
import org.koin.compose.koinInject

enum class AppTab(val label: String, val icon: ImageVector) {
    PRICES("قیمت", QIcons.TabPrices),
    CONVERT("تبدیل", QIcons.TabConvert),
    ALERTS("هشدار", QIcons.Bell),
    SETTINGS("تنظیمات", QIcons.TabSettings),
}

@Composable
fun QeymatAppRoot(versionName: String) {
    var tab by rememberSaveable { mutableStateOf(AppTab.PRICES) }
    val market: MarketRepository = koinInject()
    val account: AccountRepository = koinInject()
    val settingsStore: SettingsStore = koinInject()
    val settings by settingsStore.settings.collectAsStateWithLifecycle(UserSettings())
    val lifecycleOwner = LocalLifecycleOwner.current

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

    BackHandler(enabled = tab != AppTab.PRICES) { tab = AppTab.PRICES }

    Box(Modifier.fillMaxSize().background(Q.Bg)) {
        when (tab) {
            AppTab.PRICES -> PricesRoute(onRequireLogin = { tab = AppTab.ALERTS })
            AppTab.CONVERT -> ConvertRoute()
            AppTab.ALERTS -> AlertsRoute(onAddAlert = { tab = AppTab.PRICES })
            AppTab.SETTINGS -> SettingsRoute(versionName = versionName, onLogin = { tab = AppTab.ALERTS })
        }
        TabBar(
            selected = tab,
            onSelect = { tab = it },
            modifier = Modifier.align(Alignment.BottomCenter),
        )
    }
}

/** نوار زبانه‌ی شناور شیشه‌ای — مطابق طراحی */
@Composable
private fun TabBar(selected: AppTab, onSelect: (AppTab) -> Unit, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
            .navigationBarsPadding()
            .padding(12.dp)
            .fillMaxWidth()
            .height(64.dp)
            .shadow(18.dp, RoundedCornerShape(22.dp), ambientColor = Color.Black, spotColor = Color.Black)
            .clip(RoundedCornerShape(22.dp))
            .background(Q.Bg.copy(alpha = 0.94f))
            .border(1.dp, Q.line(0.28f), RoundedCornerShape(22.dp))
            .padding(horizontal = 6.dp),
        horizontalArrangement = Arrangement.SpaceAround,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        for (tab in AppTab.entries) {
            val on = tab == selected
            val color by animateColorAsState(if (on) Q.Mint else Q.Muted, label = "tab")
            Column(
                modifier = Modifier
                    .width(72.dp)
                    .height(56.dp)
                    .quietClick { onSelect(tab) },
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(3.dp, Alignment.CenterVertically),
            ) {
                Box(
                    modifier = Modifier
                        .width(38.dp)
                        .height(30.dp)
                        .clip(CircleShape)
                        .background(if (on) Q.Mint.copy(alpha = 0.08f) else Color.Transparent)
                        .border(1.dp, if (on) Q.Mint else Color.Transparent, CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(tab.icon, contentDescription = tab.label, tint = color, modifier = Modifier.size(19.dp))
                }
                Text(tab.label, color = color, fontSize = 10.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}
