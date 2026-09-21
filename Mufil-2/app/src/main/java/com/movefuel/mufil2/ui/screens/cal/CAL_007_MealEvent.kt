package com.movefuel.mufil2.ui.screens.cal

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun CAL007MealEventScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "CAL_007",
        title = "Meal Event",
        subtitle = "Canonical calendar shared by Fuel and Train.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.CAL_008,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.CAL_006,
        onNavigate = onNavigate,
    ) {
            MFListItem("Meal event", "Planned/confirmed meal identity unavailable", "Unknown")
            MFField("Time", "")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun CAL007MealEventScreenPreview() {
    MoveFuelTheme { CAL007MealEventScreen {} }
}
