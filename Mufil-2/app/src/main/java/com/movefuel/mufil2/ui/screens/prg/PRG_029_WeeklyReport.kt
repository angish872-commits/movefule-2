package com.movefuel.mufil2.ui.screens.prg

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun PRG029WeeklyReportScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "PRG_029",
        title = "Weekly Report",
        subtitle = "Actual progress, graphs, reports, and data coverage.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.PRG_030,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.PRG_028,
        onNavigate = onNavigate,
    ) {
            MFNotice("Weekly report unavailable", "Reports are generated from canonical completed workout and confirmed intake history.")
            MFListItem("Training", "Completed history unavailable", "Unknown")
            MFListItem("Nutrition", "Confirmed history unavailable", "Unknown")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun PRG029WeeklyReportScreenPreview() {
    MoveFuelTheme { PRG029WeeklyReportScreen {} }
}
