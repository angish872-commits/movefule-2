package com.movefuel.mufil2.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelSpacing

@Composable
fun MFTopBar(
    title: String = "MoveFuel",
    onBack: (() -> Unit)? = null,
    onCalendar: (() -> Unit)? = null,
    onProfile: (() -> Unit)? = null,
) {
    Row(
        Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(MoveFuelSpacing.Sm),
        ) {
            if (onBack != null) {
                IconButton(onClick = onBack) {
                    MFNavigationIcon(
                        MFNavigationIconType.BACK,
                        MoveFuelColors.Text,
                        "Back",
                        Modifier.size(22.dp),
                    )
                }
            }
            Box(
                Modifier
                    .size(32.dp)
                    .background(MoveFuelColors.Sage, RoundedCornerShape(10.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Text("M", style = MaterialTheme.typography.titleMedium, color = MoveFuelColors.Background)
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    if (title == "MoveFuel") "Move" else title,
                    style = MaterialTheme.typography.titleLarge,
                    color = MoveFuelColors.Text,
                )
                if (title == "MoveFuel") {
                    Text("Fuel", style = MaterialTheme.typography.titleLarge, color = MoveFuelColors.Sage)
                }
            }
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            if (onCalendar != null) {
                IconButton(onClick = onCalendar) {
                    MFNavigationIcon(
                        MFNavigationIconType.CALENDAR,
                        MoveFuelColors.TextSecondary,
                        "Calendar",
                        Modifier.size(23.dp),
                    )
                }
            }
            if (onProfile != null) {
                IconButton(onClick = onProfile) {
                    MFNavigationIcon(
                        MFNavigationIconType.PROFILE,
                        MoveFuelColors.TextSecondary,
                        "Profile",
                        Modifier.size(23.dp),
                    )
                }
            }
        }
    }
}
