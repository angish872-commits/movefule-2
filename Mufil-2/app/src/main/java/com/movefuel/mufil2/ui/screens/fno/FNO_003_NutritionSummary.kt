package com.movefuel.mufil2.ui.screens.fno

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun FNO003NutritionSummaryScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "FNO_003",
        title = "Nutrition Summary",
        subtitle = "Confirmed nutrition for the selected day.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.FNO_004,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.FNO_002,
        onNavigate = onNavigate,
    ) {
            MFMetricRow("Energy" to "Unknown", "Protein" to "Unknown", "Fiber" to "Unknown")
            MFMacroBars(null, null, null, null)
            MFNotice("No confirmed nutrition facts", "Nutrition totals and meal details remain unavailable until confirmed intake history is present.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun FNO003NutritionSummaryScreenPreview() {
    MoveFuelTheme { FNO003NutritionSummaryScreen {} }
}
