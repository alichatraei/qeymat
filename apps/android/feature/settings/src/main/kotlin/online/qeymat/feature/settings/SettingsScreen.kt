package online.qeymat.feature.settings

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import online.qeymat.core.data.ThemeMode
import online.qeymat.core.data.ViewMode
import online.qeymat.core.designsystem.Q
import online.qeymat.core.designsystem.QIcons
import online.qeymat.core.designsystem.component.PillTone
import online.qeymat.core.designsystem.component.QCard
import online.qeymat.core.designsystem.component.QPill
import online.qeymat.core.designsystem.component.QSegmented
import online.qeymat.core.designsystem.component.QToggle
import online.qeymat.core.designsystem.component.quietClick
import online.qeymat.core.model.format.Fa
import online.qeymat.core.model.format.Jalali
import org.koin.androidx.compose.koinViewModel

/**
 * @param versionName نسخه‌ی اپ برای نمایش
 * @param onLogin رفتن به فرم ورود (زبانه‌ی هشدار)
 * @param onStartTour نمایش دوباره‌ی تور راهنما
 * @param onAddWidget افزودن ویجت به صفحه‌ی اصلی
 */
@Composable
fun SettingsRoute(
    versionName: String,
    onLogin: () -> Unit,
    onStartTour: () -> Unit,
    onAddWidget: () -> Unit,
    viewModel: SettingsViewModel = koinViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current
    fun open(url: String) = runCatching {
        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    Column(
        Modifier
            .fillMaxSize()
            .background(Q.Bg)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 14.dp)
            .padding(bottom = 28.dp),
    ) {
        Column(Modifier.statusBarsPadding().padding(top = 16.dp, bottom = 12.dp)) {
            Text("تنظیمات", fontSize = 18.sp, fontWeight = FontWeight.ExtraBold)
            Text("حساب، نمایش و اعلان‌ها", fontSize = 10.5.sp, color = Q.Sub)
        }

        QCard(Modifier.fillMaxWidth(), radius = 20.dp, padding = 14.dp) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                IconTile(QIcons.User)
                Column(Modifier.weight(1f)) {
                    Text("حساب کاربری", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    Text(
                        if (state.loggedIn) Fa.digits(state.phone) else "برای هشدار و تحلیل قیمت وارد شوید",
                        fontSize = 11.sp,
                        color = Q.Sub,
                    )
                }
                if (state.loggedIn) QPill("خروج", icon = QIcons.Logout, tone = PillTone.Red, onClick = viewModel::logout)
                else QPill("ورود", tone = PillTone.Mint, onClick = onLogin)
            }
        }

        PlusCard(
            active = state.plus.active,
            tier = state.plus.tier,
            expiresAt = state.plus.expiresAt,
            onUpgrade = { open("https://qeymat.online/plus") },
        )

        GroupTitle("پوسته")
        Group {
            Column(Modifier.padding(14.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    IconTile(QIcons.Contrast)
                    Column(Modifier.weight(1f)) {
                        Text("حالت رنگ", fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                        Text("روشن، تاریک یا هماهنگ با گوشی", fontSize = 10.5.sp, color = Q.Sub)
                    }
                }
                QSegmented(
                    options = ThemeMode.entries,
                    selected = state.settings.themeMode,
                    label = {
                        when (it) {
                            ThemeMode.SYSTEM -> "مثل گوشی"
                            ThemeMode.LIGHT -> "روشن"
                            ThemeMode.DARK -> "تاریک"
                        }
                    },
                    modifier = Modifier.padding(top = 12.dp),
                    onSelect = viewModel::setThemeMode,
                )
            }
        }

        GroupTitle("نمایش")
        Group {
            SettingRow(
                icon = if (state.settings.viewMode == ViewMode.LIST) QIcons.ListView else QIcons.Grid,
                title = "حالت نمایش",
                subtitle = "فهرستی / شبکه‌ای",
                onClick = viewModel::toggleView,
            ) {
                Text(if (state.settings.viewMode == ViewMode.LIST) "فهرستی" else "شبکه‌ای", color = Q.Mint, fontSize = 11.5.sp)
            }
            SettingRow(QIcons.Globe, "زبان") { Text("فارسی", color = Q.Sub, fontSize = 11.5.sp) }
            SettingRow(QIcons.Calendar, "تقویم") { Text("شمسی", color = Q.Sub, fontSize = 11.5.sp) }
            SettingRow(QIcons.Eye, "نمایش قیمت خرید") { QToggle(state.settings.showBuy, onChange = viewModel::setShowBuy) }
            SettingRow(QIcons.Bell, "اعلان‌ها و پیامک هشدار") {
                QToggle(state.settings.notifications, onChange = viewModel::setNotifications)
            }
            SettingRow(QIcons.Refresh, "به‌روزرسانی خودکار", subtitle = "هر ۳۰ ثانیه وقتی برنامه باز است") {
                QToggle(state.settings.autoRefresh, onChange = viewModel::setAutoRefresh)
            }
            SettingRow(QIcons.Chart, "تحلیل قیمت پیشرفته", subtitle = "با اشتراک قیمت پلاس", divider = false) {
                Icon(
                    if (state.plus.active) QIcons.Check else QIcons.Lock,
                    contentDescription = null,
                    tint = if (state.plus.active) Q.Mint else Q.Muted,
                    modifier = Modifier.size(18.dp),
                )
            }
        }

        GroupTitle("راهنما و ویجت")
        Group {
            SettingRow(QIcons.Help, "راهنمای برنامه", subtitle = "دیدن دوباره‌ی تور امکانات", onClick = onStartTour) { Chevron() }
            SettingRow(QIcons.Widget, "افزودن ویجت", subtitle = "قیمت‌های منتخب روی صفحه‌ی اصلی گوشی", onClick = onAddWidget, divider = false) { Chevron() }
        }

        GroupTitle("دربارهٔ برنامه")
        Group {
            SettingRow(QIcons.Star, "امتیاز به برنامه", onClick = { open("https://qeymat.online") }) { Chevron() }
            SettingRow(QIcons.Share, "اشتراک‌گذاری", onClick = {
                val send = Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(Intent.EXTRA_TEXT, "قیمت لحظه‌ای دلار، طلا و سکه با اپ «قیمت»: https://qeymat.online")
                }
                runCatching {
                    context.startActivity(Intent.createChooser(send, "اشتراک‌گذاری").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                }
            }) { Chevron() }
            SettingRow(QIcons.Support, "پشتیبانی", onClick = { open("https://qeymat.online/panel/tickets") }) { Chevron() }
            SettingRow(QIcons.Lock, "حریم خصوصی", onClick = { open("https://qeymat.online/privacy") }) { Chevron() }
            SettingRow(QIcons.Info, "نسخه", divider = false) { Text(Fa.digits(versionName), color = Q.Sub, fontSize = 11.5.sp) }
        }

        Column(Modifier.fillMaxWidth().padding(top = 22.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                Text("توسعه توسط", color = Q.Muted, fontSize = 11.sp)
                Text(
                    "گروه برنامه‌نویسی آ",
                    color = Q.Gold,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    textDecoration = TextDecoration.Underline,
                    modifier = Modifier.quietClick { open("https://devora.agency/") },
                )
            }
            Text("Qeymat.online", color = Q.Muted, fontSize = 11.sp, textAlign = TextAlign.Center)
        }
    }
}

@Composable
private fun PlusCard(active: Boolean, tier: String?, expiresAt: String?, onUpgrade: () -> Unit) {
    Box(
        Modifier
            .padding(top = 12.dp)
            .fillMaxWidth()
            .heightIn(min = 140.dp)
            .clip(RoundedCornerShape(22.dp))
            .background(Q.CardBottom)
            .border(1.dp, Q.line(0.35f), RoundedCornerShape(22.dp)),
    ) {
        // مدارهای طلایی تزئینی مثل نمونه‌ی طراحی
        Canvas(Modifier.matchParentSize()) {
            val center = Offset(size.width * 0.12f, size.height * 0.2f)
            for (index in 1..4) {
                drawCircle(
                    Q.Gold.copy(alpha = 0.10f + index * 0.03f),
                    radius = size.height * 0.28f * index,
                    center = center,
                    style = Stroke(width = 1.dp.toPx()),
                )
            }
            drawCircle(
                Brush.radialGradient(listOf(Q.Gold.copy(alpha = 0.35f), Q.Gold.copy(alpha = 0f)), center = center, radius = size.height * 0.4f),
                radius = size.height * 0.4f,
                center = center,
            )
        }
        Column(Modifier.align(Alignment.BottomStart).fillMaxWidth(0.72f).padding(horizontal = 16.dp, vertical = 18.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Icon(QIcons.Crown, contentDescription = null, tint = Q.GoldLight, modifier = Modifier.size(18.dp))
                Text(
                    if (active) (if (tier == "pro") "پلاس حرفه‌ای فعال است" else "قیمت پلاس فعال است") else "قیمت پلاس",
                    color = Q.GoldLight,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.ExtraBold,
                )
            }
            Text(
                if (active) {
                    val until = expiresAt?.let(Jalali::parseIso)?.let { " تا ${Jalali.full(it)}" }.orEmpty()
                    "تحلیل قیمت و هشدار پیامکی$until"
                } else {
                    "تحلیل قیمت، حباب سکه و هشدار پیامکی برای ۱۰ شاخص؛ پلاس حرفه‌ای برای ۵۰ شاخص"
                },
                color = Q.Soft,
                fontSize = 11.5.sp,
                lineHeight = 19.sp,
                modifier = Modifier.padding(top = 6.dp, bottom = 12.dp),
            )
            QPill(if (active) "مدیریت اشتراک" else "ارتقا", onClick = onUpgrade)
        }
    }
}

@Composable
private fun GroupTitle(text: String) {
    Text(text, color = Q.Gold, fontSize = 11.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 18.dp, start = 4.dp))
}

@Composable
private fun Group(content: @Composable ColumnScope.() -> Unit) {
    Column(
        Modifier
            .padding(top = 12.dp)
            .fillMaxWidth()
            .clip(RoundedCornerShape(20.dp))
            .background(Q.card)
            .border(1.dp, Q.line(0.16f), RoundedCornerShape(20.dp)),
        content = content,
    )
}

@Composable
private fun ColumnScope.SettingRow(
    icon: ImageVector,
    title: String,
    subtitle: String? = null,
    onClick: (() -> Unit)? = null,
    divider: Boolean = true,
    trailing: @Composable () -> Unit,
) {
    Row(
        Modifier
            .fillMaxWidth()
            .heightIn(min = 52.dp)
            .then(if (onClick != null) Modifier.quietClick(onClick = onClick) else Modifier)
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        IconTile(icon)
        Column(Modifier.weight(1f)) {
            Text(title, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
            if (subtitle != null) Text(subtitle, fontSize = 10.5.sp, color = Q.Sub)
        }
        trailing()
    }
    if (divider) HorizontalDivider(color = Q.line(0.1f), thickness = 1.dp, modifier = Modifier.padding(start = 60.dp))
}

/** آیکون در کاشی گرد کم‌رنگ طلایی */
@Composable
private fun IconTile(icon: ImageVector) {
    Box(
        Modifier
            .size(34.dp)
            .clip(RoundedCornerShape(11.dp))
            .background(Q.Gold.copy(alpha = if (Q.isDark) 0.12f else 0.13f)),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = null, tint = Q.Gold, modifier = Modifier.size(19.dp))
    }
}

@Composable
private fun Chevron() {
    Icon(QIcons.ChevronLeft, contentDescription = null, tint = Q.Muted, modifier = Modifier.size(16.dp))
}
