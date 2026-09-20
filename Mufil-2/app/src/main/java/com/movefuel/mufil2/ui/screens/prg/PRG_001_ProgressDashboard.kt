package com.movefuel.mufil2.ui.screens.prg

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun PRG001ProgressDashboardScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "PRG_001",
        title = "Progress Dashboard",
        subtitle = "Actual progress, graphs, reports, and data coverage.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.PRG_002,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.CAL_018,
        onNavigate = onNavigate,
    ) {
            MFGraphCard("Training volume","30 days")
            MFMetricRow("Workouts" to "11","Coverage" to "96%","PRs" to "2")
            MFListItem("Weekly report","Ready","Open")
            MFListItem("Monthly report","In progress","Open")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun PRG001ProgressDashboardScreenPreview() {
    MoveFuelTheme { PRG001ProgressDashboardScreen {} }
}
