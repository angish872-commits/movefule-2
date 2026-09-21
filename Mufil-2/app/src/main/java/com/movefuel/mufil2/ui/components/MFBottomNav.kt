package com.movefuel.mufil2.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelMotion
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

private data class MFBottomNavItem(
    val label: String,
    val route: MoveFuelRoute,
    val icon: MFNavigationIconType,
)

@Composable
fun MFBottomNav(active: String?, onNavigate: (MoveFuelRoute) -> Unit) {
    val items = listOf(
        MFBottomNavItem("Today", MoveFuelRoute.MASTER_TODAY, MFNavigationIconType.TODAY),
        MFBottomNavItem("Fuel", MoveFuelRoute.MASTER_FUEL, MFNavigationIconType.FUEL),
        MFBottomNavItem("Train", MoveFuelRoute.MASTER_TRAIN, MFNavigationIconType.TRAIN),
        MFBottomNavItem("Progress", MoveFuelRoute.MASTER_PROGRESS, MFNavigationIconType.PROGRESS),
    )
    Row(
        Modifier
            .fillMaxWidth()
            .background(MoveFuelColors.Surface2.copy(alpha = .97f), RoundedCornerShape(24.dp))
            .padding(horizontal = 6.dp, vertical = 7.dp)
            .selectableGroup(),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        items.forEach { item ->
            val selected = item.label == active
            val bg by animateColorAsState(
                if (selected) MoveFuelColors.Sage.copy(alpha = .15f) else Color.Transparent,
                animationSpec = MoveFuelMotion.card(),
                label = "navBg",
            )
            val fg by animateColorAsState(
                if (selected) MoveFuelColors.Sage else MoveFuelColors.TextMuted,
                animationSpec = MoveFuelMotion.card(),
                label = "navFg",
            )
            Column(
                Modifier
                    .weight(1f)
                    .background(bg, RoundedCornerShape(18.dp))
                    .selectable(selected = selected, role = Role.Tab) { onNavigate(item.route) }
                    .padding(vertical = 8.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                MFNavigationIcon(item.icon, fg, item.label, Modifier.size(22.dp))
                Text(item.label, color = fg, style = MaterialTheme.typography.labelMedium)
            }
        }
    }
}
