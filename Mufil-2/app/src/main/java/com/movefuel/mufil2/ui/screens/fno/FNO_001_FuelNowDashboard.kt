package com.movefuel.mufil2.ui.screens.fno

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun FNO001FuelNowDashboardScreen(onNavigate: (MoveFuelRoute) -> Unit) {
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
            MFMetricRow("Energy" to "1,742", "Protein" to "116g", "Fiber" to "24g")
            MFMacroBars()
            MFListItem("Breakfast", "Oats · yogurt · banana", "480 kcal")
            MFListItem("Lunch", "Chicken rice bowl", "675 kcal")
            MFListItem("Snack", "Apple · yogurt", "220 kcal")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun FNO001FuelNowDashboardScreenPreview() {
    MoveFuelTheme { FNO001FuelNowDashboardScreen {} }
}
