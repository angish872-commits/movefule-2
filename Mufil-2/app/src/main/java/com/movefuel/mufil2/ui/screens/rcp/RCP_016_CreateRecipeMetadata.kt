package com.movefuel.mufil2.ui.screens.rcp

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun RCP016CreateRecipeMetadataScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "RCP_016",
        title = "Create Recipe Metadata",
        subtitle = "Recipes, cooking, creation, and resumable import.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.RCP_017,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.RCP_015,
        onNavigate = onNavigate,
    ) {
            MFField("Recipe name","")
            MFField("Servings","2")
            MFField("Prep time","")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun RCP016CreateRecipeMetadataScreenPreview() {
    MoveFuelTheme { RCP016CreateRecipeMetadataScreen {} }
}
