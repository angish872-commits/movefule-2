package com.movefuel.mufil2.ui.screens.rcp

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun RCP017CreateRecipeIngredientsScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "RCP_017",
        title = "Create Recipe Ingredients",
        subtitle = "Recipes, cooking, creation, and resumable import.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.RCP_018,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.RCP_016,
        onNavigate = onNavigate,
    ) {
            MFListItem("Chicken breast","300 g","")
            MFListItem("Rice","160 g dry","")
            MFListItem("Vegetables","250 g","")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun RCP017CreateRecipeIngredientsScreenPreview() {
    MoveFuelTheme { RCP017CreateRecipeIngredientsScreen {} }
}
