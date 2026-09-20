package com.movefuel.mufil2.ui.screens.rcp

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun RCP035RecipeImportConfirmationScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "RCP_035",
        title = "Recipe Import Confirmation",
        subtitle = "Recipes, cooking, creation, and resumable import.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.RCP_036,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.RCP_034,
        onNavigate = onNavigate,
    ) {
            MFStatusBanner("Recipe ready","Review complete. Save only after confirmation.")
            MFListItem("Chicken rice bowl","2 servings · 25 min","Save")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun RCP035RecipeImportConfirmationScreenPreview() {
    MoveFuelTheme { RCP035RecipeImportConfirmationScreen {} }
}
