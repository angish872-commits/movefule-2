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
            MFGraphCard("This month","30-day overview")
            MFMetricRow("Workouts" to "11","PRs" to "2","Coverage" to "94%")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun PRG030MonthlyReportScreenPreview() {
    MoveFuelTheme { PRG030MonthlyReportScreen {} }
}
