package com.movefuel.mufil2.ui.screens.tod

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun TOD007ConfirmedMealsScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "TOD_007",
        title = "Confirmed Meals",
        subtitle = "Daily home for nutrition, training, device status, and next action.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.TOD_008,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.TOD_006,
        onNavigate = onNavigate,
    ) {
            MFListItem("Breakfast", "Oats · yogurt · banana", "480 kcal")
            MFListItem("Snack", "Apple · yogurt", "220 kcal")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TOD007ConfirmedMealsScreenPreview() {
    MoveFuelTheme { TOD007ConfirmedMealsScreen {} }
}
