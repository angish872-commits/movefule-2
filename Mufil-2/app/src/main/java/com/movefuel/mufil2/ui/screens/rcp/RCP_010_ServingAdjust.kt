package com.movefuel.mufil2.ui.screens.rcp

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun RCP010ServingAdjustScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "RCP_010",
        title = "Serving Adjust",
        subtitle = "Recipes, cooking, creation, and resumable import.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.RCP_011,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.RCP_009,
        onNavigate = onNavigate,
    ) {
            MFField("Servings","2")
            MFNotice("Ingredient scaling","Amounts update with servings; trusted nutrition matching remains reviewable.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun RCP010ServingAdjustScreenPreview() {
    MoveFuelTheme { RCP010ServingAdjustScreen {} }
}
