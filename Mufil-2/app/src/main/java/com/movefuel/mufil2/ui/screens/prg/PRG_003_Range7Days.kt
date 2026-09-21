package com.movefuel.mufil2.ui.screens.prg

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun PRG003Range7DaysScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "PRG_003",
        title = "Range 7 Days",
        subtitle = "Actual progress, graphs, reports, and data coverage.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.PRG_004,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.PRG_002,
        onNavigate = onNavigate,
    ) {
            MFNotice("7-day trend unavailable", "Exact observations will appear only when canonical history contains this range.")
            MFMetricRow("Latest" to "Unknown", "Coverage" to "Unknown")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun PRG003Range7DaysScreenPreview() {
    MoveFuelTheme { PRG003Range7DaysScreen {} }
}
