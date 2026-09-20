package com.movefuel.mufil2.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelMotion
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun MFBottomNav(
    active: String,
    onNavigate: (MoveFuelRoute) -> Unit,
) {
    val items = listOf(
        "Today" to MoveFuelRoute.MASTER_TODAY,
        "Fuel" to MoveFuelRoute.MASTER_FUEL,
        "Train" to MoveFuelRoute.MASTER_TRAIN,
        "Progress" to MoveFuelRoute.MASTER_PROGRESS,
    )
    Row(
        Modifier
            .fillMaxWidth()
            .background(MoveFuelColors.Surface2.copy(alpha = .96f), RoundedCornerShape(24.dp))
            .padding(horizontal = 6.dp, vertical = 7.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        items.forEach { (label, route) ->
            val selected = label == active
            val bg by animateColorAsState(
                if (selected) MoveFuelColors.Sage.copy(alpha = .14f) else Color.Transparent,
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
                    .clickable { onNavigate(route) }
                    .padding(vertical = 10.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(5.dp),
            ) {
                Box(
                    Modifier
                        .size(if (selected) 6.dp else 4.dp)
                        .background(fg, RoundedCornerShape(999.dp))
                )
                Text(label, color = fg, style = MaterialTheme.typography.labelMedium)
            }
        }
    }
}
