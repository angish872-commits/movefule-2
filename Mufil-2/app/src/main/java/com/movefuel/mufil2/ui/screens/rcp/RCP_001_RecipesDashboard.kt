package com.movefuel.mufil2.ui.screens.rcp

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun RCP001RecipesDashboardScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "RCP_001",
        title = "Recipes Dashboard",
        subtitle = "Recipes, cooking, creation, and resumable import.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.RCP_002,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.FSH_016,
        onNavigate = onNavigate,
    ) {
            MFMediaPanel("Chicken rice bowl","25 min · saved recipe")
            MFListItem("High-protein oats","Saved","Open")
            MFListItem("Salmon bowl","Saved","Open")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun RCP001RecipesDashboardScreenPreview() {
    MoveFuelTheme { RCP001RecipesDashboardScreen {} }
}
