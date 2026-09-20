package com.movefuel.mufil2.ui.screens.rcp

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun RCP030CheckingNutritionEligibilityScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "RCP_030",
        title = "Checking Nutrition Eligibility",
        subtitle = "Recipes, cooking, creation, and resumable import.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.RCP_031,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.RCP_029,
        onNavigate = onNavigate,
    ) {
            MFStageList(listOf("Queued","Reading source","Extracting recipe evidence","Normalizing ingredients","Matching foods","Checking nutrition"), 5)
            MFNotice("Still working","This is an explicit processing state, not a frozen screen.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun RCP030CheckingNutritionEligibilityScreenPreview() {
    MoveFuelTheme { RCP030CheckingNutritionEligibilityScreen {} }
}
