package com.movefuel.mufil2.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
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
    trailing: String = "Calendar · Profile",
) {
    Row(
        Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(3.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = title.removeSuffix("Fuel"),
                style = MaterialTheme.typography.titleLarge,
                color = MoveFuelColors.Text,
            )
            if (title.endsWith("Fuel")) {
                Text(
                    text = "Fuel",
                    style = MaterialTheme.typography.titleLarge,
                    color = MoveFuelColors.Sage,
                )
            }
        }
        Box(
            Modifier
                .background(MoveFuelColors.Surface2, RoundedCornerShape(999.dp))
                .padding(horizontal = MoveFuelSpacing.Md, vertical = MoveFuelSpacing.Sm)
        ) {
            Text(trailing, color = MoveFuelColors.TextMuted, style = MaterialTheme.typography.labelMedium)
        }
    }
}
