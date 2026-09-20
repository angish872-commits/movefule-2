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
fun TrainMasterDashboard(onNavigate: (MoveFuelRoute) -> Unit) {
    MFMasterScaffold(
        active = "Train",
        title = "Train",
        subtitle = "Adaptive training · Today",
        tabs = listOf("Now", "Soreness", "Exercises", "Calendar"),
        selectedTab = "Now",
        onNavigate = onNavigate,
    ) {
        MFStatusBanner(
            title = "Readiness · Reduced",
            body = "Lower-body soreness changed today’s plan. Tap to see why.",
            tone = MoveFuelColors.Warning,
        )

        MFSectionHeading("Today's workout", "Why adapted")
        MFWorkoutHero(
            title = "Upper Strength A",
            meta = "46 min · 5 exercises · adapted for today",
            loadingMedia = true,
            onStart = { onNavigate(MoveFuelRoute.WRK_001) },
        )

        MFNotice(
            title = "Media is loading",
            body = "Workout controls stay usable while exercise media buffers. This state looks intentional instead of frozen.",
        )

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(MoveFuelSpacing.Md)) {
            MFCard(Modifier.weight(1f)) {
                Text("Quick Start", style = MaterialTheme.typography.titleMedium)
                Text("Flexible session", color = MoveFuelColors.TextMuted)
            }
            MFCard(Modifier.weight(1f)) {
                Text("Weekly Plan", style = MaterialTheme.typography.titleMedium)
                Text("3 sessions", color = MoveFuelColors.TextMuted)
            }
        }

        MFSectionHeading("Workout preview", "View details")
        MFListItem("Bench Press", "4 × 8 · 60 kg target", "1")
        MFListItem("Seated Row", "3 × 10 · controlled", "2")
        MFListItem("Shoulder Press", "3 × 10", "3")

        MFSectionHeading("Recovery context")
        MFMetricRow("Energy" to "Good", "Fatigue" to "Medium", "Soreness" to "Legs")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TrainMasterPreview() = MoveFuelTheme { TrainMasterDashboard {} }
