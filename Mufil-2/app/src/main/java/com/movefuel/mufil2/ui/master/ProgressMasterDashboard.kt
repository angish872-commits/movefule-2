package com.movefuel.mufil2.ui.master

import androidx.compose.foundation.layout.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.*
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun ProgressMasterDashboard(onNavigate: (MoveFuelRoute) -> Unit) {
    MFMasterScaffold(
        active = "Progress",
        title = "Progress",
        subtitle = "Measured change · Actual outcomes",
        tabs = listOf("Overview", "Training", "Nutrition", "Activity"),
        selectedTab = "Overview",
        onNavigate = onNavigate,
    ) {
        MFCard(Modifier.fillMaxWidth()) {
            MFSectionHeading("Training volume", "30 days")
            Spacer(Modifier.height(MoveFuelSpacing.Base))
            MFTrendGraph(listOf(18f, 22f, 20f, 28f, 26f, 35f, 31f, 39f))
            Spacer(Modifier.height(MoveFuelSpacing.Md))
            MFRangeStrip(selected = "30D")
        }

        MFMetricRow(
            "Workouts" to "11",
            "Coverage" to "96%",
            "PRs" to "2",
        )

        MFSectionHeading("Key progress")
        MFCard(Modifier.fillMaxWidth()) {
            Text("+8%", style = MaterialTheme.typography.displaySmall, color = MoveFuelColors.Sage)
            Text("Training volume vs previous 30 days", color = MoveFuelColors.TextSecondary)
        }

        MFSectionHeading("Milestones", "View all")
        MFListItem("Bench Press PR", "75 kg · September 14", "PR")
        MFListItem("Consistency", "4-week training streak", "✓")

        MFSectionHeading("Reports")
        MFListItem("Weekly report", "Training · nutrition · activity", "Ready")
        MFListItem("Monthly report", "30-day trend summary", "Open")

        MFNotice(
            title = "Data integrity",
            body = "Missing periods stay visible as gaps. Planned workouts and planned meals never count as actual progress.",
        )
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun ProgressMasterPreview() = MoveFuelTheme { ProgressMasterDashboard {} }
