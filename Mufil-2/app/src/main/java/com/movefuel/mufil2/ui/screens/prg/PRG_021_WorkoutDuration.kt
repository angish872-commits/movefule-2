package com.movefuel.mufil2.ui.screens.prg

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import com.movefuel.mufil2.ui.components.MFGraphCard
import com.movefuel.mufil2.ui.components.MFMetricRow
import com.movefuel.mufil2.ui.components.MFNotice
import com.movefuel.mufil2.ui.components.MFScreenFrame
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute
import com.movefuel.mufil2.ui.state.TrainState

@Composable
fun PRG021WorkoutDurationScreen(
    onNavigate: (MoveFuelRoute) -> Unit,
    trainState: TrainState = TrainState.NotConfigured,
) {
    val trainActive = trainState == TrainState.Active

    MFScreenFrame(
        id = "PRG_021",
        title = "Workout Duration",
        subtitle = "Actual progress only. Missing training data is never converted to zero.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.PRG_022,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.PRG_020,
        primaryEnabled = trainActive,
        onNavigate = onNavigate,
    ) {
        if (trainActive) {
            MFGraphCard(
                title = "Workout Duration",
                subtitle = "Performed workout facts only",
            )
            MFMetricRow(
                "Latest" to "42",
                "Change" to "+8%",
                "Coverage" to "94%",
            )
        } else {
            MFNotice(
                title = "Training progress unavailable",
                body = "Train is not active yet, so MoveFuel shows no made-up workout totals, trends, or zero values.",
                action = when (trainState) {
                    TrainState.NotConfigured -> "Set up Train"
                    TrainState.SetupIncomplete -> "Continue Train setup"
                    TrainState.PlanPreview -> "Review training plan"
                    TrainState.Active -> null
                },
                onAction = { onNavigate(MoveFuelRoute.MASTER_TRAIN) },
            )
        }
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun PRG021WorkoutDurationScreenPreview() {
    MoveFuelTheme { PRG021WorkoutDurationScreen({}) }
}
