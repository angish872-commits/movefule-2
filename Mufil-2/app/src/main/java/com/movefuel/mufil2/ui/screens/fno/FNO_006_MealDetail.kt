package com.movefuel.mufil2.ui.screens.fno

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun FNO006MealDetailScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "FNO_006",
        title = "Meal Detail",
        subtitle = "Confirmed nutrition for the selected day.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.FNO_007,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.FNO_005,
        onNavigate = onNavigate,
    ) {
            MFListItem("Chicken rice bowl", "13:16 · confirmed", "675 kcal")
            MFMetricRow("Protein" to "48g","Carbs" to "78g","Fat" to "18g")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun FNO006MealDetailScreenPreview() {
    MoveFuelTheme { FNO006MealDetailScreen {} }
}
