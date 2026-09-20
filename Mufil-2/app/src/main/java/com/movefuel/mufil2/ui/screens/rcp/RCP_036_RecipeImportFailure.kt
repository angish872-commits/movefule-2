package com.movefuel.mufil2.ui.screens.rcp

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun RCP036RecipeImportFailureScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "RCP_036",
        title = "Recipe Import Failure",
        subtitle = "Recipes, cooking, creation, and resumable import.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.TRS_001,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.RCP_035,
        onNavigate = onNavigate,
    ) {
            MFNotice("Import failed","The source is preserved. Retry or enter the recipe manually.","Retry")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun RCP036RecipeImportFailureScreenPreview() {
    MoveFuelTheme { RCP036RecipeImportFailureScreen {} }
}
