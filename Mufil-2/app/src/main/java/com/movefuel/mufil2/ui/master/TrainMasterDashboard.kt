package com.movefuel.mufil2.ui.master

import androidx.compose.foundation.layout.*
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
        onTabSelected = { tab ->
            when (tab) {
                "Now" -> onNavigate(MoveFuelRoute.TRN_001)
                "Soreness" -> onNavigate(MoveFuelRoute.SOR_001)
                "Exercises" -> onNavigate(MoveFuelRoute.EXR_001)
                "Calendar" -> onNavigate(MoveFuelRoute.CAL_001)
            }
        },
        onNavigate = onNavigate,
    ) {
        MFStatusBanner(
            title = "Readiness · Reduced",
            body = "Recent recovery information changed today's prescription. Tap to review the factors.",
            tone = MoveFuelColors.Warning,
            onClick = { onNavigate(MoveFuelRoute.RDY_007) },
        )

        MFSectionHeading(
            title = "Today's workout",
            action = "Why adapted",
            onAction = { onNavigate(MoveFuelRoute.TRN_012) },
        )
        MFWorkoutHero(
            title = "Upper Strength A",
            meta = "46 min · 5 exercises · adapted for today",
            loadingMedia = true,
            onStart = { onNavigate(MoveFuelRoute.WRK_001) },
        )

        MFNotice(
            title = "Media is loading",
            body = "Workout controls remain usable while exercise media buffers.",
            action = "Open workout preview",
            onAction = { onNavigate(MoveFuelRoute.TRN_006) },
        )

        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(MoveFuelSpacing.Md),
        ) {
            MFOptionCard(
                title = "Quick Start",
                supporting = "Flexible session",
                onClick = { onNavigate(MoveFuelRoute.WRK_001) },
                modifier = Modifier.weight(1f),
            )
            MFOptionCard(
                title = "Weekly Plan",
                supporting = "3 sessions",
                onClick = { onNavigate(MoveFuelRoute.TRN_010) },
                modifier = Modifier.weight(1f),
            )
        }

        MFSectionHeading(
            title = "Workout preview",
            action = "View details",
            onAction = { onNavigate(MoveFuelRoute.TRN_006) },
        )
        MFListItem(
            "Bench Press",
            "4 × 8 · 60 kg target",
            "1",
            onClick = { onNavigate(MoveFuelRoute.EXR_010) },
        )
        MFListItem(
            "Seated Row",
            "3 × 10 · controlled",
            "2",
            onClick = { onNavigate(MoveFuelRoute.EXR_010) },
        )
        MFListItem(
            "Shoulder Press",
            "3 × 10",
            "3",
            onClick = { onNavigate(MoveFuelRoute.EXR_010) },
        )

        MFSectionHeading("Recovery context")
        MFMetricRow(
            "Energy" to "Good",
            "Fatigue" to "Medium",
            "Soreness" to "Legs",
        )
        MFOptionCard(
            title = "Update soreness",
            supporting = "Record current recovery context before training",
            onClick = { onNavigate(MoveFuelRoute.SOR_001) },
        )
        MFOptionCard(
            title = "Run readiness check",
            supporting = "Review today's training readiness",
            onClick = { onNavigate(MoveFuelRoute.RDY_001) },
        )
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0B1420, widthDp = 390, heightDp = 844)
@Composable
private fun TrainMasterPreview() = MoveFuelTheme { TrainMasterDashboard {} }
