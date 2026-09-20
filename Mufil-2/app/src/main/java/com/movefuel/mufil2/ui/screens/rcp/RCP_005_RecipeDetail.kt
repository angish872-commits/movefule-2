package com.movefuel.mufil2.ui.screens.rcp

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun RCP005RecipeDetailScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "RCP_005",
        title = "Recipe Detail",
        subtitle = "Recipes, cooking, creation, and resumable import.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.RCP_006,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.RCP_004,
        onNavigate = onNavigate,
    ) {
            MFMediaPanel("Chicken rice bowl","25 min · 2 servings")
            MFMetricRow("Energy" to "610","Protein" to "45g","Time" to "25m")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun RCP005RecipeDetailScreenPreview() {
    MoveFuelTheme { RCP005RecipeDetailScreen {} }
}
