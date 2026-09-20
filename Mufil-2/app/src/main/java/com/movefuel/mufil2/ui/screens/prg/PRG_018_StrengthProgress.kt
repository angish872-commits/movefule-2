package com.movefuel.mufil2.ui.screens.prg

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun PRG018StrengthProgressScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "PRG_018",
        title = "Strength Progress",
        subtitle = "Actual progress, graphs, reports, and data coverage.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.PRG_019,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.PRG_017,
        onNavigate = onNavigate,
    ) {
            MFGraphCard(title = "Strength Progress", subtitle = "Performed workout facts only")
            MFMetricRow("Latest" to "42","Change" to "+8%","Coverage" to "94%")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun PRG018StrengthProgressScreenPreview() {
    MoveFuelTheme { PRG018StrengthProgressScreen {} }
}
