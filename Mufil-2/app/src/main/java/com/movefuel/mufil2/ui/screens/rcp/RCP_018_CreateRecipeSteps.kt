package com.movefuel.mufil2.ui.screens.rcp

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun RCP018CreateRecipeStepsScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "RCP_018",
        title = "Create Recipe Steps",
        subtitle = "Recipes, cooking, creation, and resumable import.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.RCP_019,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.RCP_017,
        onNavigate = onNavigate,
    ) {
            MFStatusBanner("Step 2 of 5","Cook the rice until tender.")
            MFListItem("Next","Prepare the chicken","Continue")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun RCP018CreateRecipeStepsScreenPreview() {
    MoveFuelTheme { RCP018CreateRecipeStepsScreen {} }
}
