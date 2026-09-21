package com.movefuel.mufil2.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.design.*

@Composable
fun MFTabStrip(
    labels: List<String>,
    selected: String,
    onSelect: ((String) -> Unit)? = null,
) {
    var localSelected by remember(selected) { mutableStateOf(selected) }
    Row(
        Modifier
            .fillMaxWidth()
            .background(MoveFuelColors.Surface2, RoundedCornerShape(18.dp))
            .padding(5.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        labels.forEach { label ->
            val isSelected = label == localSelected
            Box(
                Modifier
                    .weight(1f)
                    .background(
                        if (isSelected) MoveFuelColors.Sage.copy(alpha = .15f)
                        else Color.Transparent,
                        RoundedCornerShape(14.dp),
                    )
                    .clickable {
                        localSelected = label
                        onSelect?.invoke(label)
                    }
                    .padding(vertical = 9.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    label,
                    color = if (isSelected) MoveFuelColors.Sage else MoveFuelColors.TextMuted,
                    style = MaterialTheme.typography.labelMedium,
                )
            }
        }
    }
}

@Composable
fun MFSectionHeading(
    title: String,
    action: String? = null,
    onAction: (() -> Unit)? = null,
) {
    Row(
        Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(title, style = MaterialTheme.typography.titleLarge, color = MoveFuelColors.Text)
        action?.let {
            Text(
                it,
                style = MaterialTheme.typography.labelMedium,
                color = MoveFuelColors.Sage,
                modifier = Modifier.then(
                    if (onAction != null) Modifier.clickable(onClick = onAction)
                    else Modifier
                ),
            )
        }
    }
}

@Composable
fun MFNextActionCard(
    title: String,
    supporting: String,
    onClick: (() -> Unit)? = null,
) {
    MFCard(
        Modifier
            .fillMaxWidth()
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
    ) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("NEXT ACTION", color = MoveFuelColors.Sage, style = MaterialTheme.typography.labelMedium)
            if (onClick != null) {
                Text("›", color = MoveFuelColors.Sage, style = MaterialTheme.typography.titleLarge)
            }
        }
        Spacer(Modifier.height(MoveFuelSpacing.Sm))
        Text(title, style = MaterialTheme.typography.titleLarge)
        Text(supporting, color = MoveFuelColors.TextSecondary)
    }
}

@Composable
fun MFMealCard(
    name: String,
    detail: String,
    kcal: String,
    accent: Color,
    onClick: (() -> Unit)? = null,
) {
    MFCard(
        Modifier
            .fillMaxWidth()
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
    ) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(MoveFuelSpacing.Md),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                Modifier
                    .size(72.dp)
                    .background(
                        Brush.linearGradient(
                            listOf(
                                accent.copy(alpha = .48f),
                                MoveFuelColors.Surface3,
                            )
                        ),
                        RoundedCornerShape(18.dp),
                    ),
                contentAlignment = Alignment.Center,
            ) {
                Text(name.take(1), style = MaterialTheme.typography.titleLarge, color = MoveFuelColors.Text)
            }
            Column(Modifier.weight(1f)) {
                Text(name, style = MaterialTheme.typography.titleMedium)
                Text(detail, color = MoveFuelColors.TextSecondary)
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(kcal, color = MoveFuelColors.Sage, style = MaterialTheme.typography.labelLarge)
                if (onClick != null) {
                    Text("›", color = MoveFuelColors.TextMuted)
                }
            }
        }
    }
}

@Composable
fun MFWorkoutHero(
    title: String,
    meta: String,
    loadingMedia: Boolean = false,
    onStart: (() -> Unit)? = null,
) {
    MFCard(Modifier.fillMaxWidth()) {
        Box(
            Modifier
                .fillMaxWidth()
                .height(176.dp)
                .background(
                    Brush.linearGradient(
                        listOf(
                            MoveFuelColors.TrainAccent.copy(alpha = .34f),
                            MoveFuelColors.Surface3,
                            MoveFuelColors.SageStrong.copy(alpha = .13f),
                        )
                    ),
                    RoundedCornerShape(20.dp),
                ),
            contentAlignment = Alignment.Center,
        ) {
            if (loadingMedia) {
                androidx.compose.material3.CircularProgressIndicator(
                    color = MoveFuelColors.Sage,
                    trackColor = MoveFuelColors.Surface2,
                )
            } else {
                Text("Exercise media", color = MoveFuelColors.TextMuted)
            }
        }
        Spacer(Modifier.height(MoveFuelSpacing.Md))
        Text(title, style = MaterialTheme.typography.titleLarge)
        Text(meta, color = MoveFuelColors.TextSecondary)
        if (onStart != null) {
            Spacer(Modifier.height(MoveFuelSpacing.Md))
            MFPrimaryButton(text = "Start workout", onClick = onStart)
        }
    }
}

@Composable
fun MFDeviceCard(
    title: String,
    detail: String,
    onClick: (() -> Unit)? = null,
) {
    MFCard(
        Modifier
            .fillMaxWidth()
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
    ) {
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.titleMedium)
                Text(detail, color = MoveFuelColors.TextSecondary)
            }
            Column(horizontalAlignment = Alignment.End) {
                Box(
                    Modifier
                        .background(MoveFuelColors.Success.copy(alpha = .14f), RoundedCornerShape(999.dp))
                        .padding(horizontal = 10.dp, vertical = 6.dp)
                ) {
                    Text("CONNECTED", color = MoveFuelColors.Success, style = MaterialTheme.typography.labelMedium)
                }
                if (onClick != null) {
                    Text("›", color = MoveFuelColors.TextMuted)
                }
            }
        }
    }
}

@Composable
fun MFRangeStrip(
    labels: List<String> = listOf("7D", "30D", "3M", "6M", "1Y", "All"),
    selected: String = "30D",
    onSelect: ((String) -> Unit)? = null,
) {
    var localSelected by remember(selected) { mutableStateOf(selected) }
    Row(
        Modifier
            .fillMaxWidth()
            .background(MoveFuelColors.Surface3.copy(alpha = .72f), RoundedCornerShape(16.dp))
            .padding(4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        labels.forEach { label ->
            Box(
                Modifier
                    .weight(1f)
                    .background(
                        if (label == localSelected) MoveFuelColors.Sage.copy(alpha = .15f)
                        else Color.Transparent,
                        RoundedCornerShape(12.dp),
                    )
                    .clickable {
                        localSelected = label
                        onSelect?.invoke(label)
                    }
                    .padding(vertical = 8.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    label,
                    color = if (label == localSelected) MoveFuelColors.Sage else MoveFuelColors.TextMuted,
                    style = MaterialTheme.typography.labelMedium,
                )
            }
        }
    }
}
