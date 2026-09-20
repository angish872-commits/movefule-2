package com.movefuel.mufil2.ui.screens.bar

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun BAR008IngredientsAndAllergensScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "BAR_008",
        title = "Ingredients and Allergens",
        subtitle = "Barcode and nutrition-label capture with fallback entry.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.BAR_009,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.BAR_007,
        onNavigate = onNavigate,
    ) {
            MFListItem("Ingredients", "Product ingredient list", "View")
            MFStatusBanner("Allergen information", "Unknown fields remain explicitly unknown.", MoveFuelColors.Warning)
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun BAR008IngredientsAndAllergensScreenPreview() {
    MoveFuelTheme { BAR008IngredientsAndAllergensScreen {} }
}
