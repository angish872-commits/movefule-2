package com.movefuel.mufil2.ui.screens.tod

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun TOD001TodayDashboardScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "TOD_001",
        title = "Today Dashboard",
        subtitle = "Daily home for nutrition, training, device status, and next action.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.TOD_002,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.ONB_018,
        onNavigate = onNavigate,
    ) {
            MFMetricRow("Energy" to "1,742", "Protein" to "116g", "Movement" to "38m")
            MFStatusBanner("Next action", "Review your planned lunch.")
            MFListItem("Upper Strength A", "46 min · 5 exercises", "Open")
            MFListItem("Pixel Watch", "Connected · synced recently", "Synced")
            MFListItem("Breakfast", "Oats · yogurt · banana", "Confirmed")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TOD001TodayDashboardScreenPreview() {
    MoveFuelTheme { TOD001TodayDashboardScreen {} }
}
