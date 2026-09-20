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
            MFMetricRow("Energy" to "1,742", "Protein" to "116g", "Fiber" to "24g")
            MFMacroBars()
            MFListItem("Breakfast", "Oats · yogurt · banana", "480 kcal")
            MFListItem("Lunch", "Chicken rice bowl", "675 kcal")
            MFListItem("Snack", "Apple · yogurt", "220 kcal")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun FNO003NutritionSummaryScreenPreview() {
    MoveFuelTheme { FNO003NutritionSummaryScreen {} }
}
