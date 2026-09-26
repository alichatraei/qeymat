package online.qeymat.feature.alerts

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import online.qeymat.core.designsystem.Q
import online.qeymat.core.designsystem.QIcons
import online.qeymat.core.designsystem.component.BrandMark
import online.qeymat.core.designsystem.component.InfoStrip
import online.qeymat.core.designsystem.component.NumText
import online.qeymat.core.designsystem.component.PillTone
import online.qeymat.core.designsystem.component.QCard
import online.qeymat.core.designsystem.component.QInputBox
import online.qeymat.core.designsystem.component.QPill
import online.qeymat.core.designsystem.component.TipBox
import online.qeymat.core.designsystem.component.quietClick
import online.qeymat.core.model.PriceAlert
import online.qeymat.core.model.format.Fa
import online.qeymat.core.model.format.Jalali
import org.koin.androidx.compose.koinViewModel

/**
 * صفحه‌ی هشدار. بدون ورود فرم شماره موبایل، بعد از ورود فهرست هشدارها.
 * @param onAddAlert رفتن به صفحه‌ی قیمت برای انتخاب دارایی
 */
@Composable
fun AlertsRoute(onAddAlert: () -> Unit, viewModel: AlertsViewModel = koinViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val notificationPermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {}

    LaunchedEffect(state.loggedIn) {
        if (state.loggedIn) {
            viewModel.refresh()
            // اعلان هشدارها روی اندروید ۱۳ به بالا اجازه می‌خواهد
            if (Build.VERSION.SDK_INT >= 33 &&
                ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
            ) {
                notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
    }

    Column(
        Modifier
            .fillMaxSize()
            .background(Q.Bg)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 14.dp)
            .padding(bottom = 120.dp),
    ) {
        Row(
            Modifier.statusBarsPadding().padding(top = 16.dp, bottom = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text("هشدار قیمت", fontSize = 18.sp, fontWeight = FontWeight.ExtraBold)
                Text("پیامک و نوتیفیکیشن هنگام رسیدن به قیمت هدف", fontSize = 10.5.sp, color = Q.Sub)
            }
            Icon(QIcons.Bell, contentDescription = null, tint = Q.Gold, modifier = Modifier.size(22.dp))
        }

        if (!state.loggedIn) {
            LoginCard(state.login, viewModel)
        } else {
            InfoStrip(
                text = if (state.plus.active) "هشدارها با پیامک و نوتیفیکیشن به ${Fa.digits(state.phone)} ارسال می‌شود"
                else "هشدارها با نوتیفیکیشن ارسال می‌شود · پیامک با قیمت پلاس",
                icon = QIcons.Check,
            )
            if (state.plus.active) {
                val used = state.alerts?.smsUsed ?: 0
                Text(
                    "پیامک: ${Fa.number(used)} از ${Fa.number(state.plus.smsLimit)} شاخص",
                    fontSize = 11.sp,
                    color = Q.Sub,
                    modifier = Modifier.padding(top = 8.dp, start = 4.dp),
                )
            }
            QPill(
                "افزودن هشدار جدید",
                icon = QIcons.Plus,
                dashed = true,
                modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
                onClick = onAddAlert,
            )

            val list = state.alerts?.alerts.orEmpty()
            when {
                state.alerts == null && state.loadingAlerts ->
                    Text("در حال دریافت…", color = Q.Sub, fontSize = 12.sp, modifier = Modifier.padding(top = 20.dp).fillMaxWidth(), textAlign = TextAlign.Center)
                state.alertsError != null && list.isEmpty() ->
                    Text(state.alertsError!!, color = Q.Red, fontSize = 12.sp, modifier = Modifier.padding(top = 20.dp).fillMaxWidth(), textAlign = TextAlign.Center)
                list.isEmpty() ->
                    Text("هنوز هشداری ندارید.", color = Q.Muted, fontSize = 12.sp, modifier = Modifier.padding(top = 24.dp).fillMaxWidth(), textAlign = TextAlign.Center)
                else -> for (alert in list) AlertRow(alert, onDelete = { viewModel.delete(alert.id) })
            }

            TipBox(
                "با زدن روی هر دارایی در صفحهٔ قیمت و انتخاب «هشدار قیمت» می‌توانی هشدار جدید بسازی. هشدار با عبور قیمت از عدد هدف یک‌بار اجرا می‌شود.",
                modifier = Modifier.padding(top = 14.dp),
            )
        }
    }
}

@Composable
private fun LoginCard(login: LoginState, viewModel: AlertsViewModel) {
    QCard(Modifier.fillMaxWidth().padding(top = 8.dp)) {
        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
            BrandMark(64.dp)
            Text("ورود با شماره موبایل", fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, modifier = Modifier.padding(top = 14.dp))
            Text(
                "برای فعال‌سازی هشدار قیمت و دسترسی به تحلیل‌ها، با شماره موبایل خود وارد شوید. ورود ۳۰ روز روی همین دستگاه می‌ماند.",
                fontSize = 12.sp,
                color = Q.Soft,
                lineHeight = 21.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 8.dp, bottom = 16.dp),
            )
            if (login.step == 1) {
                QInputBox(
                    value = login.phone,
                    onValueChange = viewModel::setPhone,
                    placeholder = "۰۹۱۲ ۰۰۰ ۰۰۰۰",
                    keyboard = KeyboardOptions(keyboardType = KeyboardType.Phone),
                )
                Spacer(Modifier.height(12.dp))
                QPill(
                    if (login.busy) "در حال ارسال…" else "دریافت کد تأیید",
                    icon = QIcons.Phone,
                    tone = PillTone.Mint,
                    large = true,
                    enabled = !login.busy,
                    modifier = Modifier.fillMaxWidth(),
                    onClick = viewModel::sendCode,
                )
            } else {
                Text("کد تأیید به ${Fa.digits(login.maskedPhone)} ارسال شد", fontSize = 10.5.sp, color = Q.Sub, modifier = Modifier.padding(bottom = 10.dp))
                QInputBox(
                    value = login.code,
                    onValueChange = viewModel::setCode,
                    placeholder = "کد ۵ رقمی",
                    keyboard = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                    letterSpacing = 10.sp,
                    fontSize = 22.sp,
                )
                Spacer(Modifier.height(12.dp))
                QPill(
                    if (login.busy) "در حال بررسی…" else "ورود",
                    icon = QIcons.Check,
                    tone = PillTone.Mint,
                    large = true,
                    enabled = !login.busy,
                    modifier = Modifier.fillMaxWidth(),
                    onClick = viewModel::verify,
                )
                QPill(
                    "تغییر شماره",
                    tone = PillTone.Sub,
                    large = true,
                    modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
                    onClick = viewModel::changePhone,
                )
            }
            login.error?.let {
                Text(it, color = Q.Red, fontSize = 11.5.sp, modifier = Modifier.padding(top = 10.dp), textAlign = TextAlign.Center)
            }
        }
    }
}

@Composable
private fun AlertRow(alert: PriceAlert, onDelete: () -> Unit) {
    val usd = alert.unit == "USD"
    Row(
        Modifier
            .padding(top = 8.dp)
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(Color.White.copy(alpha = 0.02f))
            .border(1.dp, Q.line(0.12f), RoundedCornerShape(16.dp))
            .padding(10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Column(Modifier.weight(1f)) {
            Text(alert.nameFa, fontSize = 13.sp, fontWeight = FontWeight.Bold)
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(if (alert.direction == "ABOVE") "بالاتر از" else "پایین‌تر از", fontSize = 10.5.sp, color = Q.Sub)
                NumText(Fa.price(alert.threshold, usd), fontSize = 10.5.sp, color = Q.Sub)
                alert.current?.let {
                    Text("· اکنون", fontSize = 10.5.sp, color = Q.Sub)
                    NumText(Fa.price(it, usd), fontSize = 10.5.sp, color = Q.Sub)
                }
            }
            val fired = alert.firedAt?.let(Jalali::parseIso)
            if (fired != null) {
                Text("اجرا: ${Jalali.dayMonth(fired)} ${Jalali.time(fired)}", fontSize = 10.sp, color = Q.Muted)
            }
        }
        if (alert.sms) Text("پیامک", color = Q.Gold, fontSize = 10.sp, fontWeight = FontWeight.Bold)
        Text(
            if (alert.isActive) "فعال" else "اجرا شده",
            color = if (alert.isActive) Q.Mint else Q.Sub,
            fontSize = 10.5.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier
                .clip(CircleShape)
                .border(1.dp, if (alert.isActive) Q.Mint.copy(alpha = 0.5f) else Color.White.copy(alpha = 0.14f), CircleShape)
                .padding(horizontal = 10.dp, vertical = 4.dp),
        )
        Icon(
            QIcons.Trash,
            contentDescription = "حذف هشدار",
            tint = Q.Muted,
            modifier = Modifier.size(20.dp).quietClick(onClick = onDelete),
        )
    }
}
