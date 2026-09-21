package com.movefuel.mufil2.ui.master

import androidx.compose.foundation.layout.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.*
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute
import com.movefuel.mufil2.ui.state.CanonicalAppState
import com.movefuel.mufil2.ui.state.TrainState

@Composable
fun TrainMasterDashboard(
    onNavigate: (MoveFuelRoute) -> Unit,
    state: CanonicalAppState = CanonicalAppState(),
) {
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
            title = "Readiness unavailable",
            body = "Readiness is populated from committed check-ins and synced device facts. It is never inferred from a planned workout.",
            tone = MoveFuelColors.TextMuted,
            onClick = { onNavigate(MoveFuelRoute.RDY_007) },
        )

        MFSectionHeading(
            title = "Today's workout",
            action = "Why adapted",
            onAction = { onNavigate(MoveFuelRoute.TRN_012) },
        )
        if (state.trainState == TrainState.Active && state.activePlanReference != null) {
            MFNotice(
                title = "Active plan",
                body = "The active plan reference is stored, but workout prescription details are unavailable until the canonical engine is connected.",
                action = "Open workout",
                onAction = { onNavigate(MoveFuelRoute.WRK_001) },
            )
        } else {
            MFNotice(
                title = "No active workout",
                body = "Train setup, a real plan reference, and explicit activation are required before a workout can be started.",
                action = "Open setup",
                onAction = { onNavigate(MoveFuelRoute.MASTER_TRAIN) },
            )
        }

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
                supporting = "Availability unknown",
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
            "Exercise prescription",
            "Unavailable until the canonical plan is loaded",
            "Unknown",
            onClick = { onNavigate(MoveFuelRoute.EXR_010) },
        )
        MFListItem(
            "Exercise execution",
            "Performed facts are recorded separately from prescription",
            "Unknown",
            onClick = { onNavigate(MoveFuelRoute.EXR_010) },
        )
        MFListItem(
            "Workout history",
            "No fabricated totals",
            "Unknown",
            onClick = { onNavigate(MoveFuelRoute.EXR_010) },
        )

        MFSectionHeading("Recovery context")
        MFMetricRow(
            "Energy" to "Unknown",
            "Fatigue" to "Unknown",
            "Soreness" to "Unknown",
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
private fun TrainMasterPreview() = MoveFuelTheme { TrainMasterDashboard(onNavigate = {}) }
