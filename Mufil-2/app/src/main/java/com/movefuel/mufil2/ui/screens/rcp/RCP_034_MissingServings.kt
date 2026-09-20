package com.movefuel.mufil2.ui.screens.rcp

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun RCP034MissingServingsScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "RCP_034",
        title = "Missing Servings",
        subtitle = "Recipes, cooking, creation, and resumable import.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.RCP_035,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.RCP_033,
        onNavigate = onNavigate,
    ) {
            MFNotice("Review required","MoveFuel will not invent missing nutrition facts.")
            MFField("Ingredient / quantity","—")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun RCP034MissingServingsScreenPreview() {
    MoveFuelTheme { RCP034MissingServingsScreen {} }
}
