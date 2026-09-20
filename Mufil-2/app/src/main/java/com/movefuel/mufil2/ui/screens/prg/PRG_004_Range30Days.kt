package com.movefuel.mufil2.ui.screens.prg

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun PRG004Range30DaysScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "PRG_004",
        title = "Range 30 Days",
        subtitle = "Actual progress, graphs, reports, and data coverage.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.PRG_005,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.PRG_003,
        onNavigate = onNavigate,
    ) {
            MFGraphCard("30-day trend","Exact observations from the last month")
            MFMetricRow("Latest" to "42","Change" to "+8%","Coverage" to "96%")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun PRG004Range30DaysScreenPreview() {
    MoveFuelTheme { PRG004Range30DaysScreen {} }
}
