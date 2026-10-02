package online.qeymat.feature.prices

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import online.qeymat.core.designsystem.Q
import online.qeymat.core.designsystem.QIcons
import online.qeymat.core.designsystem.component.AssetTile
import online.qeymat.core.designsystem.component.ChangeLabel
import online.qeymat.core.designsystem.component.NumText
import online.qeymat.core.designsystem.component.StarButton
import online.qeymat.core.model.Asset
import online.qeymat.core.model.format.Fa

fun Asset.enLine(): String = listOf(nameEn, symbol.replace('_', ' ')).filter { it.isNotBlank() }.distinct().joinToString(" · ")

/** ردیف فهرستی یک دارایی */
@Composable
fun AssetRow(
    asset: Asset,
    favorite: Boolean,
    modifier: Modifier = Modifier,
    edit: Boolean = false,
    dragging: Boolean = false,
    handle: Modifier = Modifier,
    badge: String? = null,
    onStar: () -> Unit,
    trailing: (@Composable () -> Unit)? = null,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(bottom = 8.dp)
            .scale(if (dragging) 1.02f else 1f)
            .clip(RoundedCornerShape(16.dp))
            .background(if (Q.isDark) Q.Raised else Q.CardTop)
            .border(
                1.dp,
                when {
                    dragging -> Q.Mint
                    edit -> Q.line(0.4f)
                    else -> Q.line(0.12f)
                },
                RoundedCornerShape(16.dp),
            )
            .padding(horizontal = 10.dp, vertical = 9.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        if (edit) {
            Icon(QIcons.Handle, contentDescription = "جابه‌جایی", tint = Q.Sub, modifier = handle.size(22.dp))
        }
        AssetTile(asset, 40.dp)
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(asset.nameFa, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Q.Text, maxLines = 1)
                if (badge != null) {
                    Text(
                        badge,
                        fontSize = 9.5.sp,
                        fontWeight = FontWeight.Bold,
                        color = Q.Gold,
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(Q.Gold.copy(alpha = 0.14f))
                            .padding(horizontal = 6.dp, vertical = 1.dp),
                    )
                }
            }
            Text(asset.enLine(), fontSize = 10.5.sp, color = Q.Sub, maxLines = 1)
        }
        Column(horizontalAlignment = Alignment.End) {
            NumText(Fa.short(asset.sell, asset.isUsd), fontSize = 13.5.sp, fontWeight = FontWeight.ExtraBold, color = Q.Text)
            Spacer(Modifier.height(2.dp))
            ChangeLabel(asset.changePercent)
        }
        if (trailing != null) trailing() else StarButton(favorite, onClick = onStar)
    }
}

/** کارت شبکه‌ای یک دارایی؛ هم‌عرض ستون تا شبکه مرتب بماند */
@Composable
fun AssetGridCard(
    asset: Asset,
    favorite: Boolean,
    modifier: Modifier = Modifier,
    edit: Boolean = false,
    dragging: Boolean = false,
    handle: Modifier = Modifier,
    onStar: () -> Unit,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(bottom = 10.dp)
            .scale(if (dragging) 1.02f else 1f)
            .clip(RoundedCornerShape(20.dp))
            .background(Q.card)
            .border(1.dp, if (dragging) Q.Mint else if (edit) Q.line(0.4f) else Q.line(0.16f), RoundedCornerShape(20.dp))
            .padding(start = 12.dp, end = 8.dp, top = 12.dp, bottom = 12.dp),
    ) {
        Row(verticalAlignment = Alignment.Top) {
            AssetTile(asset, 42.dp)
            Spacer(Modifier.weight(1f))
            if (edit) {
                Icon(QIcons.Handle, contentDescription = "جابه‌جایی", tint = Q.Muted, modifier = handle.padding(top = 8.dp, end = 4.dp).size(18.dp))
            }
            StarButton(favorite, onClick = onStar)
        }
        Spacer(Modifier.height(10.dp))
        Text(asset.nameFa, fontSize = 13.sp, fontWeight = FontWeight.Bold, maxLines = 1, color = Q.Text)
        Text(asset.enLine(), fontSize = 10.sp, color = Q.Sub, maxLines = 1)
        Spacer(Modifier.height(8.dp))
        NumText(Fa.short(asset.sell, asset.isUsd), fontSize = 16.sp, fontWeight = FontWeight.ExtraBold, color = Q.Text)
        Spacer(Modifier.height(2.dp))
        ChangeLabel(asset.changePercent)
    }
}

/** دو کادر اطلاعات کنار هم (خرید / فروش) */
@Composable
fun InfoBox(label: String, value: String, modifier: Modifier = Modifier, small: Boolean = false) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(16.dp))
            .background(Q.Raised)
            .border(1.dp, Q.line(0.16f), RoundedCornerShape(16.dp))
            .padding(12.dp),
    ) {
        Text(label, fontSize = 10.5.sp, color = Q.Sub)
        Spacer(Modifier.height(4.dp))
        NumText(value, fontSize = if (small) 13.sp else 15.sp, fontWeight = FontWeight.ExtraBold, color = Q.Text)
    }
}
