package com.movefuel.mufil2.ui.master

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import com.movefuel.mufil2.ui.components.MFCard
import com.movefuel.mufil2.ui.components.MFDailyMetricBar
import com.movefuel.mufil2.ui.components.MFDeviceCard
import com.movefuel.mufil2.ui.components.MFMacroBars
import com.movefuel.mufil2.ui.components.MFMasterScaffold
import com.movefuel.mufil2.ui.components.MFMealCard
import com.movefuel.mufil2.ui.components.MFMetricRow
import com.movefuel.mufil2.ui.components.MFNextActionCard
import com.movefuel.mufil2.ui.components.MFNotice
import com.movefuel.mufil2.ui.components.MFOptionCard
import com.movefuel.mufil2.ui.components.MFSectionHeading
import com.movefuel.mufil2.ui.components.MFWorkoutHero
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelSpacing
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute
import com.movefuel.mufil2.ui.state.TodayMetricUi
import com.movefuel.mufil2.ui.state.TodayUiState
import com.movefuel.mufil2.ui.state.TrainState
import com.movefuel.mufil2.ui.state.previewTodayUiState

@Composable
fun TodayMasterDashboard(
    onNavigate: (MoveFuelRoute) -> Unit,
    state: TodayUiState = previewTodayUiState(),
    trainState: TrainState = TrainState.NotConfigured,
) {
    var dailyExpanded by remember { mutableStateOf(false) }

    MFMasterScaffold(
        active = "Today",
        title = "Today",
        subtitle = state.subtitle,
        onNavigate = onNavigate,
    ) {
        Text(
            state.greeting,
            style = MaterialTheme.typography.titleMedium,
            color = MoveFuelColors.TextSecondary,
        )

        MFCard(Modifier.fillMaxWidth()) {
            MFSectionHeading(
                title = "Daily status",
                action = if (dailyExpanded) "Less ⌃" else "More ⌄",
                onAction = { dailyExpanded = !dailyExpanded },
            )
            Spacer(Modifier.height(MoveFuelSpacing.Base))
            Column(verticalArrangement = Arrangement.spacedBy(MoveFuelSpacing.Base)) {
                TodayMetric(state.energy)
                TodayMetric(state.protein)
                TodayMetric(state.movement)
            }

            if (dailyExpanded) {
                Spacer(Modifier.height(MoveFuelSpacing.Base))
                MFMacroBars(.80f, .80f, .76f, .81f)
                Spacer(Modifier.height(MoveFuelSpacing.Md))
                MFMetricRow(
                    "Fiber" to (state.fiberValue ?: "Unknown"),
                    "Freshness" to state.dataFreshness,
                )
                Spacer(Modifier.height(MoveFuelSpacing.Md))
                MFNotice(
                    title = "Confirmed facts only",
                    body = "Unknown values remain unknown. Planned food and workouts are not counted as actual.",
                    action = "Open full nutrition",
                    onAction = { onNavigate(MoveFuelRoute.TOD_002) },
                )
            }
        }

        state.nextAction?.let { action ->
            MFNextActionCard(
                title = action.title,
                supporting = action.supporting,
                onClick = { onNavigate(action.route) },
            )
        } ?: MFNotice(
            title = "You're up to date",
            body = "There is no unfinished priority action right now.",
        )

        MFSectionHeading("Quick actions")
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(MoveFuelSpacing.Md),
        ) {
            MFOptionCard(
                title = "Log food",
                supporting = "Camera, barcode or search",
                onClick = { onNavigate(MoveFuelRoute.FNO_009) },
                modifier = Modifier.weight(1f),
            )
            MFOptionCard(
                title = if (trainState == TrainState.Active) "Workout" else "Train",
                supporting = when (trainState) {
                    TrainState.NotConfigured -> "Set up when you're ready"
                    TrainState.SetupIncomplete -> "Continue setup"
                    TrainState.PlanPreview -> "Review plan"
                    TrainState.Active -> "Preview or start"
                },
                onClick = { onNavigate(MoveFuelRoute.TOD_005) },
                modifier = Modifier.weight(1f),
            )
        }
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(MoveFuelSpacing.Md),
        ) {
            MFOptionCard(
                title = "Soreness",
                supporting = if (trainState == TrainState.Active) {
                    "Update recovery"
                } else {
                    "Available after Train setup"
                },
                onClick = {
                    if (trainState == TrainState.Active) {
                        onNavigate(MoveFuelRoute.SOR_001)
                    } else {
                        onNavigate(MoveFuelRoute.MASTER_TRAIN)
                    }
                },
                modifier = Modifier.weight(1f),
            )
            MFOptionCard(
                title = "Calendar",
                supporting = "Plan and reschedule",
                onClick = { onNavigate(MoveFuelRoute.CAL_001) },
                modifier = Modifier.weight(1f),
            )
        }

        state.deviceName?.let { deviceName ->
            MFSectionHeading("Connected device")
            MFDeviceCard(
                title = deviceName,
                detail = state.deviceDetail ?: "Status unavailable",
                onClick = { onNavigate(MoveFuelRoute.DEV_007) },
            )
        }

        MFSectionHeading(
            title = "Today's workout",
            action = when (trainState) {
                TrainState.NotConfigured -> "Set up Train"
                TrainState.SetupIncomplete -> "Continue setup"
                TrainState.PlanPreview -> "Review plan"
                TrainState.Active -> "View Train"
            },
            onAction = { onNavigate(MoveFuelRoute.MASTER_TRAIN) },
        )
        when (trainState) {
            TrainState.NotConfigured -> MFNotice(
                title = "Training isn't set up yet",
                body = "MoveFuel will not invent a workout. Train is optional until you choose to set it up.",
                action = "Set up Train",
                onAction = { onNavigate(MoveFuelRoute.MASTER_TRAIN) },
            )

            TrainState.SetupIncomplete -> MFNotice(
                title = "Finish Train setup",
                body = "Your setup progress is saved and can resume from the last step.",
                action = "Continue setup",
                onAction = { onNavigate(MoveFuelRoute.MASTER_TRAIN) },
            )

            TrainState.PlanPreview -> MFNotice(
                title = "Training plan ready to review",
                body = "The proposed plan is not active yet.",
                action = "Review plan",
                onAction = { onNavigate(MoveFuelRoute.TRS_020) },
            )

            TrainState.Active -> MFWorkoutHero(
                title = "Upper Strength A",
                meta = "46 min · 5 exercises · readiness reduced",
                onStart = { onNavigate(MoveFuelRoute.WRK_001) },
            )
        }

        MFSectionHeading(
            title = "Today's meals",
            action = "View Fuel",
            onAction = { onNavigate(MoveFuelRoute.MASTER_FUEL) },
        )
        MFMealCard(
            "Breakfast",
            "Oats · yogurt · banana · confirmed",
            "480 kcal",
            MoveFuelColors.FuelAccent,
            onClick = { onNavigate(MoveFuelRoute.FNO_006) },
        )
        MFMealCard(
            "Lunch",
            "Chicken rice bowl · planned · not counted yet",
            "610 kcal",
            MoveFuelColors.SageStrong,
            onClick = { onNavigate(MoveFuelRoute.FPL_017) },
        )
        MFMealCard(
            "Snack",
            "Apple · yogurt · confirmed",
            "220 kcal",
            MoveFuelColors.Info,
            onClick = { onNavigate(MoveFuelRoute.FNO_006) },
        )
    }
}

@Composable
private fun TodayMetric(metric: TodayMetricUi) {
    MFDailyMetricBar(
        label = metric.label,
        value = metric.value ?: "Unknown",
        target = metric.target ?: "Unknown",
        progress = metric.progress,
    )
}

@Preview(showBackground = true, backgroundColor = 0xFF0B1420, widthDp = 390, heightDp = 844)
@Composable
private fun TodayMasterPreview() = MoveFuelTheme {
    TodayMasterDashboard({})
}
