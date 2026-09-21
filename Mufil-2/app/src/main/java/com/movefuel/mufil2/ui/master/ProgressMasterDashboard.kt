package com.movefuel.mufil2.ui.master

import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import com.movefuel.mufil2.ui.components.MFCard
import com.movefuel.mufil2.ui.components.MFListItem
import com.movefuel.mufil2.ui.components.MFMasterScaffold
import com.movefuel.mufil2.ui.components.MFMetricRow
import com.movefuel.mufil2.ui.components.MFNotice
import com.movefuel.mufil2.ui.components.MFRangeStrip
import com.movefuel.mufil2.ui.components.MFSectionHeading
import com.movefuel.mufil2.ui.components.MFTrendGraph
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelSpacing
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
        if (trainState == TrainState.Active) {
            MFCard(Modifier.fillMaxWidth()) {
                MFSectionHeading(
                    title = "Training volume",
                    action = "Expand ↗",
                    onAction = { onNavigate(MoveFuelRoute.PRG_009) },
                )
                Spacer(Modifier.height(MoveFuelSpacing.Base))
                MFTrendGraph(listOf(18f, 22f, 20f, 28f, 26f, 35f, 31f, 39f))
                Spacer(Modifier.height(MoveFuelSpacing.Md))
                MFRangeStrip(selected = "30D") { range ->
                    when (range) {
                        "7D" -> onNavigate(MoveFuelRoute.PRG_003)
                        "30D" -> onNavigate(MoveFuelRoute.PRG_004)
                        "3M" -> onNavigate(MoveFuelRoute.PRG_005)
                        "6M" -> onNavigate(MoveFuelRoute.PRG_006)
                        "1Y" -> onNavigate(MoveFuelRoute.PRG_007)
                        "All" -> onNavigate(MoveFuelRoute.PRG_008)
                    }
                }
            }

            MFMetricRow(
                "Workouts" to "11",
                "Coverage" to "96%",
                "PRs" to "2",
            )

            MFSectionHeading(
                title = "Key progress",
                action = "Details",
                onAction = { onNavigate(MoveFuelRoute.PRG_019) },
            )
            MFCard(Modifier.fillMaxWidth()) {
                Text(
                    "+8%",
                    style = MaterialTheme.typography.displaySmall,
                    color = MoveFuelColors.Sage,
                )
                Text(
                    "Training volume vs previous 30 days",
                    color = MoveFuelColors.TextSecondary,
                )
            }

            MFSectionHeading(
                title = "Milestones",
                action = "View all",
                onAction = { onNavigate(MoveFuelRoute.PRG_016) },
            )
            MFListItem(
                "Bench Press PR",
                "75 kg · September 14",
                "PR",
                onClick = { onNavigate(MoveFuelRoute.PRG_015) },
            )
            MFListItem(
                "Consistency",
                "4-week training streak",
                "✓",
                onClick = { onNavigate(MoveFuelRoute.PRG_020) },
            )
        } else {
            MFNotice(
                title = "Training progress unavailable",
                body = "No training numbers are fabricated. Set up and activate Train, then complete real workouts to populate training progress.",
                action = when (trainState) {
                    TrainState.NotConfigured -> "Set up Train"
                    TrainState.SetupIncomplete -> "Continue Train setup"
                    TrainState.PlanPreview -> "Review training plan"
                    TrainState.Active -> null
                },
                onAction = { onNavigate(MoveFuelRoute.MASTER_TRAIN) },
            )
        }

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
