package com.movefuel.mufil2.ui.screens.prg

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun PRG005Range3MonthsScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "PRG_005",
        title = "Range 3 Months",
        subtitle = "Actual progress, graphs, reports, and data coverage.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.PRG_006,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.PRG_004,
        onNavigate = onNavigate,
    ) {
            MFNotice("3-month trend unavailable", "Longer-term change requires canonical historical observations.")
            MFMetricRow("Change" to "Unknown", "Coverage" to "Unknown")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun PRG005Range3MonthsScreenPreview() {
    MoveFuelTheme { PRG005Range3MonthsScreen {} }
}
