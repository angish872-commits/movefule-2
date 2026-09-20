package com.movefuel.mufil2.ui.screens.rcp

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun RCP002SavedRecipesScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "RCP_002",
        title = "Saved Recipes",
        subtitle = "Recipes, cooking, creation, and resumable import.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.RCP_003,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.RCP_001,
        onNavigate = onNavigate,
    ) {
            MFMediaPanel("Chicken rice bowl","25 min · saved recipe")
            MFListItem("High-protein oats","Saved","Open")
            MFListItem("Salmon bowl","Saved","Open")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun RCP002SavedRecipesScreenPreview() {
    MoveFuelTheme { RCP002SavedRecipesScreen {} }
}
