package com.movefuel.mufil2.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.design.*

@Composable
fun MFSectionTitle(title: String, supporting: String? = null) {
    Column(verticalArrangement = Arrangement.spacedBy(MoveFuelSpacing.Xs)) {
        Text(title, style = MaterialTheme.typography.titleLarge)
        supporting?.let { Text(it, color = MoveFuelColors.TextSecondary) }
    }
}

@Composable
fun MFStatusBanner(
    title: String,
    body: String,
    tone: Color = MoveFuelColors.Sage,
    onClick: (() -> Unit)? = null,
) {
    val modifier = Modifier
        .fillMaxWidth()
        .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
    MFCard(modifier) {
        Row(horizontalArrangement = Arrangement.spacedBy(MoveFuelSpacing.Md)) {
            Box(Modifier.size(10.dp).background(tone, RoundedCornerShape(999.dp)))
            Column(Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.titleMedium)
                Text(body, color = MoveFuelColors.TextSecondary)
            }
            if (onClick != null) {
                Text("›", color = MoveFuelColors.TextMuted, style = MaterialTheme.typography.titleLarge)
            }
        }
    }
}

@Composable
fun MFMetricRow(vararg metrics: Pair<String, String>) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(MoveFuelSpacing.Md)) {
        metrics.forEach { (label, value) ->
            MFCard(Modifier.weight(1f)) {
                Text(value, style = MaterialTheme.typography.titleLarge, color = MoveFuelColors.Sage)
                Text(label, color = MoveFuelColors.TextMuted)
            }
        }
    }
}

@Composable
fun MFDailyMetricBar(
    label: String,
    value: String,
    target: String,
    progress: Float?,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(MoveFuelSpacing.Xs),
    ) {
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(label, style = MaterialTheme.typography.titleMedium)
            Text(
                if (progress == null) "Unknown" else "$value / $target",
                color = if (progress == null) MoveFuelColors.TextMuted else MoveFuelColors.TextSecondary,
                style = MaterialTheme.typography.labelMedium,
            )
        }
        LinearProgressIndicator(
            progress = { progress?.coerceIn(0f, 1f) ?: 0f },
            modifier = Modifier.fillMaxWidth(),
            color = if (progress == null) MoveFuelColors.TextMuted else MoveFuelColors.Sage,
            trackColor = MoveFuelColors.Surface3,
        )
    }
}

@Composable
fun MFListItem(
    title: String,
    supporting: String,
    trailing: String? = null,
    onClick: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val cardModifier = modifier
        .fillMaxWidth()
        .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
    MFCard(cardModifier) {
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.titleMedium)
                Text(supporting, color = MoveFuelColors.TextSecondary)
            }
            if (trailing != null) {
                Text(trailing, color = MoveFuelColors.Sage)
            } else if (onClick != null) {
                Text("›", color = MoveFuelColors.TextMuted, style = MaterialTheme.typography.titleLarge)
            }
        }
    }
}

@Composable
fun MFOptionCard(
    title: String,
    supporting: String? = null,
    selected: Boolean = false,
    onClick: (() -> Unit)? = null,
    enabled: Boolean = true,
    modifier: Modifier = Modifier,
) {
    var localSelected by remember(selected) { mutableStateOf(selected) }
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .then(
                if (enabled) Modifier.clickable {
                    localSelected = !localSelected
                    onClick?.invoke()
                } else Modifier
            ),
        shape = RoundedCornerShape(MoveFuelRadius.Card),
        color = if (localSelected) MoveFuelColors.Surface3 else MoveFuelColors.Surface2,
        border = BorderStroke(1.dp, if (localSelected) MoveFuelColors.Sage else MoveFuelColors.Border),
    ) {
        Row(
            Modifier.padding(MoveFuelSpacing.Base),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(MoveFuelSpacing.Md),
        ) {
            Column(Modifier.weight(1f)) {
                Text(
                    title,
                    style = MaterialTheme.typography.titleMedium,
                    color = if (enabled) MoveFuelColors.Text else MoveFuelColors.TextMuted,
                )
                supporting?.let { Text(it, color = MoveFuelColors.TextSecondary) }
            }
            if (enabled) {
                Text(
                    if (localSelected) "✓" else "›",
                    color = if (localSelected) MoveFuelColors.Sage else MoveFuelColors.TextMuted,
                    style = MaterialTheme.typography.titleLarge,
                )
            }
        }
    }
}

@Composable
fun MFField(
    label: String,
    value: String,
    helper: String? = null,
    onValueChange: ((String) -> Unit)? = null,
    editable: Boolean = true,
    secure: Boolean = false,
) {
    var localValue by remember(value) { mutableStateOf(if (value == "—") "" else value) }
    Column(verticalArrangement = Arrangement.spacedBy(MoveFuelSpacing.Sm)) {
        Text(label, style = MaterialTheme.typography.labelLarge)
        if (editable) {
            OutlinedTextField(
                value = localValue,
                onValueChange = {
                    localValue = it
                    onValueChange?.invoke(it)
                },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                visualTransformation = if (secure) PasswordVisualTransformation() else VisualTransformation.None,
                placeholder = { Text("Enter $label", color = MoveFuelColors.TextMuted) },
            )
        } else {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(MoveFuelRadius.Control),
                color = MoveFuelColors.Surface,
                border = BorderStroke(1.dp, MoveFuelColors.Border),
            ) {
                Text(
                    if (localValue.isBlank()) "—" else localValue,
                    color = if (localValue.isBlank()) MoveFuelColors.TextMuted else MoveFuelColors.Text,
                    modifier = Modifier.padding(
                        horizontal = MoveFuelSpacing.Base,
                        vertical = MoveFuelSpacing.Base,
                    ),
                )
            }
        }
        helper?.let {
            Text(it, color = MoveFuelColors.TextMuted, style = MaterialTheme.typography.labelMedium)
        }
    }
}

@Composable
fun MFToggleRow(
    title: String,
    supporting: String,
    checked: Boolean,
    onCheckedChange: ((Boolean) -> Unit)? = null,
) {
    var localChecked by remember(checked) { mutableStateOf(checked) }
    MFCard(Modifier.fillMaxWidth()) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.titleMedium)
                Text(supporting, color = MoveFuelColors.TextSecondary)
            }
            Switch(
                checked = localChecked,
                onCheckedChange = {
                    localChecked = it
                    onCheckedChange?.invoke(it)
                },
            )
        }
    }
}

@Composable
fun MFStageList(stages: List<String>, activeIndex: Int) {
    MFCard(Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(MoveFuelSpacing.Md)) {
            stages.forEachIndexed { stageIndex, stage ->
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(MoveFuelSpacing.Md),
                ) {
                    val done = stageIndex < activeIndex
                    val active = stageIndex == activeIndex
                    if (active) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(22.dp),
                            strokeWidth = 2.dp,
                            color = MoveFuelColors.Sage,
                        )
                    } else {
                        Box(
                            Modifier
                                .size(22.dp)
                                .background(
                                    if (done) MoveFuelColors.Sage else MoveFuelColors.Surface3,
                                    RoundedCornerShape(999.dp),
                                ),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                if (done) "✓" else (stageIndex + 1).toString(),
                                color = if (done) MoveFuelColors.Background else MoveFuelColors.TextMuted,
                            )
                        }
                    }
                    Text(
                        stage,
                        color = if (active) MoveFuelColors.Text else MoveFuelColors.TextSecondary,
                    )
                }
            }
        }
    }
}

@Composable
fun MFMediaPanel(title: String, supporting: String, loading: Boolean = false) {
    MFCard(Modifier.fillMaxWidth()) {
        Box(
            Modifier
                .fillMaxWidth()
                .height(190.dp)
                .background(MoveFuelColors.Surface3, RoundedCornerShape(MoveFuelRadius.Card)),
            contentAlignment = Alignment.Center,
        ) {
            if (loading) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(MoveFuelSpacing.Md),
                ) {
                    CircularProgressIndicator(color = MoveFuelColors.Sage)
                    Text("Loading media…", color = MoveFuelColors.TextSecondary)
                }
            } else {
                Text("Media preview", color = MoveFuelColors.TextMuted)
            }
        }
        Spacer(Modifier.height(MoveFuelSpacing.Md))
        Text(title, style = MaterialTheme.typography.titleMedium)
        Text(supporting, color = MoveFuelColors.TextSecondary)
    }
}

@Composable
fun MFMacroBars(
    energy: Float? = .72f,
    protein: Float? = .8f,
    carbs: Float? = .68f,
    fat: Float? = .61f,
) {
    val rows = listOf("Energy" to energy, "Protein" to protein, "Carbs" to carbs, "Fat" to fat)
    MFCard(Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(MoveFuelSpacing.Md)) {
            rows.forEach { (label, progress) ->
                Column(verticalArrangement = Arrangement.spacedBy(MoveFuelSpacing.Xs)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(label)
                        Text(progress?.let { "${(it * 100).toInt()}%" } ?: "Unknown", color = MoveFuelColors.TextMuted)
                    }
                    LinearProgressIndicator(
                        progress = { progress?.coerceIn(0f, 1f) ?: 0f },
                        modifier = Modifier.fillMaxWidth(),
                        color = if (progress == null) MoveFuelColors.TextMuted else MoveFuelColors.Sage,
                        trackColor = MoveFuelColors.Surface3,
                    )
                }
            }
        }
    }
}

@Composable
fun MFCalendarMini(onDaySelected: ((Int) -> Unit)? = null) {
    var selectedDay by remember { mutableStateOf(19) }
    MFCard(Modifier.fillMaxWidth()) {
        Text("September", style = MaterialTheme.typography.titleLarge)
        Spacer(Modifier.height(MoveFuelSpacing.Md))
        repeat(5) { row ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                repeat(7) { col ->
                    val day = row * 7 + col + 1
                    if (day <= 30) {
                        Text(
                            day.toString(),
                            color = if (day == selectedDay) MoveFuelColors.Sage else MoveFuelColors.TextSecondary,
                            modifier = Modifier
                                .padding(4.dp)
                                .clickable {
                                    selectedDay = day
                                    onDaySelected?.invoke(day)
                                },
                        )
                    } else {
                        Text("")
                    }
                }
            }
        }
    }
}

@Composable
fun MFBodyMapPlaceholder(
    front: Boolean = true,
    onRegionTap: (() -> Unit)? = null,
) {
    MFCard(
        Modifier
            .fillMaxWidth()
            .then(if (onRegionTap != null) Modifier.clickable(onClick = onRegionTap) else Modifier)
    ) {
        Box(Modifier.fillMaxWidth().height(280.dp), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    if (front) "Front body map" else "Back body map",
                    style = MaterialTheme.typography.titleLarge,
                )
                Text("Tap a body region to record soreness.", color = MoveFuelColors.TextSecondary)
            }
        }
    }
}

@Composable
fun MFGraphCard(
    title: String,
    subtitle: String,
    points: List<Float> = listOf(12f, 18f, 14f, 21f, 24f, 22f, 29f),
    onClick: (() -> Unit)? = null,
) {
    MFCard(
        Modifier
            .fillMaxWidth()
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
    ) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Column(Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.titleLarge)
                Text(subtitle, color = MoveFuelColors.TextSecondary)
            }
            if (onClick != null) {
                Text("↗", color = MoveFuelColors.Sage)
            }
        }
        Spacer(Modifier.height(MoveFuelSpacing.Md))
        MFTrendGraph(points)
    }
}

@Composable
fun MFNotice(
    title: String,
    body: String,
    action: String? = null,
    onAction: (() -> Unit)? = null,
) {
    MFCard(Modifier.fillMaxWidth()) {
        Text(title, style = MaterialTheme.typography.titleMedium)
        Text(body, color = MoveFuelColors.TextSecondary)
        action?.let {
            Text(
                it,
                color = MoveFuelColors.Sage,
                modifier = Modifier
                    .padding(top = MoveFuelSpacing.Sm)
                    .then(if (onAction != null) Modifier.clickable(onClick = onAction) else Modifier),
            )
        }
    }
}
