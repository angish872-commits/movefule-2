package com.movefuel.mufil2.ui.screens.fno

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute
import com.movefuel.mufil2.ui.state.CanonicalAppState

@Composable
fun FNO001FuelNowDashboardScreen(
    onNavigate: (MoveFuelRoute) -> Unit,
    state: CanonicalAppState = CanonicalAppState(),
) {
    MFScreenFrame(
        id = "FNO_001",
        title = "Fuel Now Dashboard",
        subtitle = "Confirmed nutrition for the selected day.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.FNO_002,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.BAR_016,
        onNavigate = onNavigate,
    ) {
            MFMetricRow("Energy" to "Unknown", "Protein" to "Unknown", "Fiber" to "Unknown")
            MFMacroBars(null, null, null, null)
            if ((state.confirmedFoodCount ?: 0) > 0) {
                MFListItem("Confirmed intake", "Nutrition details unavailable", "Confirmed")
            } else {
                MFNotice(
                    title = "No confirmed intake",
                    body = "Unconfirmed food drafts are intentionally excluded from this dashboard.",
                )
            }
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun FNO001FuelNowDashboardScreenPreview() {
    MoveFuelTheme { FNO001FuelNowDashboardScreen(onNavigate = {}) }
}
