package com.movefuel.mufil2.ui.screens.trn

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute
import com.movefuel.mufil2.ui.state.CanonicalAppState

@Composable
fun TRN001TrainNowDashboardScreen(
    onNavigate: (MoveFuelRoute) -> Unit,
    state: CanonicalAppState = CanonicalAppState(),
) {
    MFScreenFrame(
        id = "TRN_001",
        title = "Train Now Dashboard",
        subtitle = "Readiness, today’s workout, and program context.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.TRN_002,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.TRS_020,
        onNavigate = onNavigate,
    ) {
            MFStatusBanner(
                "Readiness unavailable",
                "Readiness is populated from committed check-ins and synced device facts.",
                MoveFuelColors.TextMuted,
            )
            MFNotice(
                title = if (state.activePlanReference == null) "Active plan unavailable" else "Active plan reference stored",
                body = "Workout prescription details remain unavailable until the canonical engine provides them.",
            )
            MFListItem("Quick Start", "Requires an available prescription", "Unavailable")
            MFListItem("Weekly Plan", "Requires an available prescription", "Unavailable")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TRN001TrainNowDashboardScreenPreview() {
    MoveFuelTheme { TRN001TrainNowDashboardScreen(onNavigate = {}) }
}
