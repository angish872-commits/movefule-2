package com.movefuel.mufil2.ui.screens.fno

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun FNO008DeleteMealConfirmationScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "FNO_008",
        title = "Delete Meal Confirmation",
        subtitle = "Confirmed nutrition for the selected day.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.FNO_009,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.FNO_007,
        onNavigate = onNavigate,
    ) {
            MFNotice("Delete this meal?", "This removes the confirmed meal from the selected day. This action requires confirmation.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun FNO008DeleteMealConfirmationScreenPreview() {
    MoveFuelTheme { FNO008DeleteMealConfirmationScreen {} }
}
