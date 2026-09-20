package com.movefuel.mufil2.ui.screens.rcp

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun RCP006RecipeNutritionScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "RCP_006",
        title = "Recipe Nutrition",
        subtitle = "Recipes, cooking, creation, and resumable import.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.RCP_007,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.RCP_005,
        onNavigate = onNavigate,
    ) {
            MFMacroBars(.65f,.82f,.7f,.46f)
            MFMetricRow("Fiber" to "9g","Coverage" to "96%")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun RCP006RecipeNutritionScreenPreview() {
    MoveFuelTheme { RCP006RecipeNutritionScreen {} }
}
