package com.movefuel.mufil2.ui.screens.rcp

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun RCP013AddRecipeToShopScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "RCP_013",
        title = "Add Recipe to Shop",
        subtitle = "Recipes, cooking, creation, and resumable import.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.RCP_014,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.RCP_012,
        onNavigate = onNavigate,
    ) {
            MFListItem("Chicken breast","Missing from pantry","Add")
            MFListItem("Rice","Already in pantry","Skip")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun RCP013AddRecipeToShopScreenPreview() {
    MoveFuelTheme { RCP013AddRecipeToShopScreen {} }
}
