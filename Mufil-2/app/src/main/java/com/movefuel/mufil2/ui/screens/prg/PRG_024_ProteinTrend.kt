package com.movefuel.mufil2.ui.screens.prg

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun PRG024ProteinTrendScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "PRG_024",
        title = "Protein Trend",
        subtitle = "Actual progress, graphs, reports, and data coverage.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.PRG_025,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.PRG_023,
        onNavigate = onNavigate,
    ) {
            MFGraphCard(title = "Protein Trend", subtitle = "Confirmed intake only")
            MFMetricRow("Average" to "Stable","Coverage" to "92%")
            MFNotice("Planned food excluded","Future meal plans are not counted as consumed nutrition.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun PRG024ProteinTrendScreenPreview() {
    MoveFuelTheme { PRG024ProteinTrendScreen {} }
}
