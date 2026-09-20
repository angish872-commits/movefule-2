package com.movefuel.mufil2.ui.screens.rcp

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun RCP011IngredientSubstitutionScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "RCP_011",
        title = "Ingredient Substitution",
        subtitle = "Recipes, cooking, creation, and resumable import.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.RCP_012,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.RCP_010,
        onNavigate = onNavigate,
    ) {
            MFOptionCard("Chicken breast","Current",true)
            MFOptionCard("Turkey breast","Alternative")
            MFOptionCard("Tofu","Alternative")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun RCP011IngredientSubstitutionScreenPreview() {
    MoveFuelTheme { RCP011IngredientSubstitutionScreen {} }
}
