package com.movefuel.mufil2.ui.screens.tod

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun TOD006TodayMealPlanScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "TOD_006",
        title = "Today Meal Plan",
        subtitle = "Daily home for nutrition, training, device status, and next action.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.TOD_007,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.TOD_005,
        onNavigate = onNavigate,
    ) {
            MFListItem("Breakfast", "Confirmed", "08:10")
            MFListItem("Lunch", "Planned", "13:00")
            MFListItem("Dinner", "Planned", "19:30")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TOD006TodayMealPlanScreenPreview() {
    MoveFuelTheme { TOD006TodayMealPlanScreen {} }
}
