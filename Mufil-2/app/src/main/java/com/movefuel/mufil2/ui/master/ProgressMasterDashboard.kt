package com.movefuel.mufil2.ui.master

import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import com.movefuel.mufil2.ui.components.MFListItem
import com.movefuel.mufil2.ui.components.MFMasterScaffold
import com.movefuel.mufil2.ui.components.MFNotice
import com.movefuel.mufil2.ui.components.MFSectionHeading
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute
import com.movefuel.mufil2.ui.state.TrainState

@Composable
fun ProgressMasterDashboard(
    onNavigate: (MoveFuelRoute) -> Unit,
    trainState: TrainState = TrainState.NotConfigured,
) {
    MFMasterScaffold(
        active = "Progress",
        title = "Progress",
        subtitle = "Measured change · Actual outcomes",
        tabs = listOf("Overview", "Training", "Nutrition", "Activity"),
        selectedTab = "Overview",
        onTabSelected = { tab ->
            when (tab) {
                "Overview" -> onNavigate(MoveFuelRoute.PRG_001)
                "Training" -> onNavigate(MoveFuelRoute.PRG_017)
                "Nutrition" -> onNavigate(MoveFuelRoute.PRG_022)
                "Activity" -> onNavigate(MoveFuelRoute.PRG_026)
            }
        },
        onNavigate = onNavigate,
    ) {
        MFNotice(
            title = "Training progress unavailable",
            body = when (trainState) {
                TrainState.Active -> "Train is active, but no completed workout data is available yet. Progress will populate from real execution data."
                else -> "No training numbers are fabricated. Set up and activate Train, then complete real workouts to populate training progress."
            },
            action = when (trainState) {
                TrainState.NotConfigured -> "Set up Train"
                TrainState.SetupIncomplete -> "Continue Train setup"
                TrainState.PlanPreview -> "Review training plan"
                TrainState.Active -> null
            },
            onAction = { onNavigate(MoveFuelRoute.MASTER_TRAIN) },
        )

        MFSectionHeading("Reports")
        MFListItem(
            "Weekly report",
            "Training · nutrition · activity",
            "Ready",
            onClick = { onNavigate(MoveFuelRoute.PRG_029) },
        )
        MFListItem(
            "Monthly report",
            "30-day trend summary",
            "Open",
            onClick = { onNavigate(MoveFuelRoute.PRG_030) },
        )

        MFNotice(
            title = "Data integrity",
            body = "Missing periods stay visible as gaps. Planned workouts and planned meals never count as actual progress.",
            action = "View data coverage",
            onAction = { onNavigate(MoveFuelRoute.PRG_012) },
        )
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0B1420, widthDp = 390, heightDp = 844)
@Composable
private fun ProgressMasterPreview() = MoveFuelTheme {
    ProgressMasterDashboard({})
}
