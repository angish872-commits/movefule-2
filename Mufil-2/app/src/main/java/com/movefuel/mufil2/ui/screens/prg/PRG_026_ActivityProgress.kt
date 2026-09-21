package com.movefuel.mufil2.ui.screens.prg

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun PRG026ActivityProgressScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "PRG_026",
        title = "Activity Progress",
        subtitle = "Actual progress, graphs, reports, and data coverage.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.PRG_027,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.PRG_025,
        onNavigate = onNavigate,
    ) {
            MFNotice("Activity trend unavailable", "Activity progress requires acknowledged device observations.")
            MFMetricRow("Sessions" to "Unknown", "Coverage" to "Unknown")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun PRG026ActivityProgressScreenPreview() {
    MoveFuelTheme { PRG026ActivityProgressScreen {} }
}
