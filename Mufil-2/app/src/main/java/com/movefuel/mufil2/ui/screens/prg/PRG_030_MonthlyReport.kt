package com.movefuel.mufil2.ui.screens.prg

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun PRG030MonthlyReportScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "PRG_030",
        title = "Monthly Report",
        subtitle = "Actual progress, graphs, reports, and data coverage.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.PRO_001,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.PRG_029,
        onNavigate = onNavigate,
    ) {
            MFNotice("Monthly report unavailable", "The 30-day overview remains unavailable until canonical history is present.")
            MFMetricRow("Workouts" to "Unknown", "PRs" to "Unknown", "Coverage" to "Unknown")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun PRG030MonthlyReportScreenPreview() {
    MoveFuelTheme { PRG030MonthlyReportScreen {} }
}
