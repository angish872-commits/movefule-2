package com.movefuel.mufil2.ui.screens.prg

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun PRG028SwimmingProgressScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "PRG_028",
        title = "Swimming Progress",
        subtitle = "Actual progress, graphs, reports, and data coverage.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.PRG_029,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.PRG_027,
        onNavigate = onNavigate,
    ) {
            MFGraphCard(title = "Swimming Progress", subtitle = "Supported actual activity observations")
            MFMetricRow("Sessions" to "8","Coverage" to "88%")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun PRG028SwimmingProgressScreenPreview() {
    MoveFuelTheme { PRG028SwimmingProgressScreen {} }
}
