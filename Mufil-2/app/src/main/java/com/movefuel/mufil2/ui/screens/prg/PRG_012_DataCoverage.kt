package com.movefuel.mufil2.ui.screens.prg

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun PRG012DataCoverageScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "PRG_012",
        title = "Data Coverage",
        subtitle = "Actual progress, graphs, reports, and data coverage.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.PRG_013,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.PRG_011,
        onNavigate = onNavigate,
    ) {
            MFMetricRow("Coverage" to "96%","Missing" to "2 days","Unknown" to "Shown")
            MFNotice("Coverage matters","Progress summaries disclose when the dataset is incomplete.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun PRG012DataCoverageScreenPreview() {
    MoveFuelTheme { PRG012DataCoverageScreen {} }
}
