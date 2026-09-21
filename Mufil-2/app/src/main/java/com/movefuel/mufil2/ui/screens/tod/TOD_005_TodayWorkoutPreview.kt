package com.movefuel.mufil2.ui.screens.tod

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import com.movefuel.mufil2.ui.components.MFMediaPanel
import com.movefuel.mufil2.ui.components.MFMetricRow
import com.movefuel.mufil2.ui.components.MFNotice
import com.movefuel.mufil2.ui.components.MFPrimaryButton
import com.movefuel.mufil2.ui.components.MFScreenFrame
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute
import com.movefuel.mufil2.ui.state.TrainState

@Composable
fun TOD005TodayWorkoutPreviewScreen(
    onNavigate: (MoveFuelRoute) -> Unit,
    trainState: TrainState = TrainState.NotConfigured,
) {
    MFScreenFrame(
        id = "TOD_005",
        title = "Today Workout Preview",
        subtitle = "Training information appears only after the Train flow has real state.",
        primaryLabel = null,
        primaryRoute = null,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.MASTER_TODAY,
        onNavigate = onNavigate,
    ) {
        when (trainState) {
            TrainState.NotConfigured -> {
                MFNotice(
                    title = "Training isn't set up yet",
                    body = "You can keep using Today, Fuel, and Progress. Set up Train only when you're ready.",
                )
                MFPrimaryButton("Set up Train") {
                    onNavigate(MoveFuelRoute.MASTER_TRAIN)
                }
            }

            TrainState.SetupIncomplete -> {
                MFNotice(
                    title = "Train setup is incomplete",
                    body = "Your setup progress is saved. Continue from your last Train step.",
                )
                MFPrimaryButton("Continue Train setup") {
                    onNavigate(MoveFuelRoute.MASTER_TRAIN)
                }
            }

            TrainState.PlanPreview -> {
                MFNotice(
                    title = "Your training plan is ready to review",
                    body = "The preview is not active until you explicitly activate it.",
                )
                MFPrimaryButton("Review training plan") {
                    onNavigate(MoveFuelRoute.TRS_020)
                }
            }

            TrainState.Active -> {
                MFMediaPanel("Upper Strength A", "46 min · 5 exercises")
                MFMetricRow(
                    "Readiness" to "Reduced",
                    "Exercises" to "5",
                    "Time" to "46m",
                )
                MFPrimaryButton("Start workout") {
                    onNavigate(MoveFuelRoute.TRN_007)
                }
            }
        }
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TOD005TodayWorkoutPreviewScreenPreview() {
    MoveFuelTheme { TOD005TodayWorkoutPreviewScreen({}) }
}
