package com.movefuel.mufil2.ui.screens.rcp

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun RCP012AddRecipeToPlanScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "RCP_012",
        title = "Add Recipe to Plan",
        subtitle = "Recipes, cooking, creation, and resumable import.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.RCP_013,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.RCP_011,
        onNavigate = onNavigate,
    ) {
            MFCalendarMini()
            MFField("Meal","Dinner")
            MFField("Time","19:30")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun RCP012AddRecipeToPlanScreenPreview() {
    MoveFuelTheme { RCP012AddRecipeToPlanScreen {} }
}
