package com.movefuel.mufil2.ui.screens.prg

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun PRG002MetricSelectorScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "PRG_002",
        title = "Metric Selector",
        subtitle = "Actual progress, graphs, reports, and data coverage.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.PRG_003,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.PRG_001,
        onNavigate = onNavigate,
    ) {
            MFOptionCard("Training volume",null,true)
            MFOptionCard("Strength")
            MFOptionCard("Nutrition average")
            MFOptionCard("Activity")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun PRG002MetricSelectorScreenPreview() {
    MoveFuelTheme { PRG002MetricSelectorScreen {} }
}
