package com.movefuel.mufil2.ui.screens.rcp

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun RCP008CookingModeScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "RCP_008",
        title = "Cooking Mode",
        subtitle = "Recipes, cooking, creation, and resumable import.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.RCP_009,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.RCP_007,
        onNavigate = onNavigate,
    ) {
            MFStatusBanner("Step 2 of 5","Cook the rice until tender.")
            MFListItem("Next","Prepare the chicken","Continue")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun RCP008CookingModeScreenPreview() {
    MoveFuelTheme { RCP008CookingModeScreen {} }
}
