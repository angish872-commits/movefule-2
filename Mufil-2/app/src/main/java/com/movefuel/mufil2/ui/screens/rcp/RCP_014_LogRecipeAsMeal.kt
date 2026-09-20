package com.movefuel.mufil2.ui.screens.rcp

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun RCP014LogRecipeAsMealScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "RCP_014",
        title = "Log Recipe as Meal",
        subtitle = "Recipes, cooking, creation, and resumable import.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.RCP_015,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.RCP_013,
        onNavigate = onNavigate,
    ) {
            MFListItem("Chicken rice bowl","2 servings recipe","610 kcal")
            MFField("Amount eaten","1 serving")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun RCP014LogRecipeAsMealScreenPreview() {
    MoveFuelTheme { RCP014LogRecipeAsMealScreen {} }
}
