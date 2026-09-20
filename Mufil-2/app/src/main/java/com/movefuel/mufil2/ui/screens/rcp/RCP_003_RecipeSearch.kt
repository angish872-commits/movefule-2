package com.movefuel.mufil2.ui.screens.rcp

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun RCP003RecipeSearchScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "RCP_003",
        title = "Recipe Search",
        subtitle = "Recipes, cooking, creation, and resumable import.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.RCP_004,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.RCP_002,
        onNavigate = onNavigate,
    ) {
            MFField("Search recipes","high protein")
            MFListItem("Chicken rice bowl","25 min","Open")
            MFListItem("Protein oats","10 min","Open")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun RCP003RecipeSearchScreenPreview() {
    MoveFuelTheme { RCP003RecipeSearchScreen {} }
}
