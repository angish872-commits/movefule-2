package com.movefuel.mufil2.ui.screens.cal

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun CAL017MissedMealScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "CAL_017",
        title = "Missed Meal",
        subtitle = "Canonical calendar shared by Fuel and Train.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.CAL_018,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.CAL_016,
        onNavigate = onNavigate,
    ) {
            MFNotice(title = "Missed Meal", body = "MoveFuel records that the event was missed instead of pretending it occurred.")
            MFOptionCard("Reschedule",null,true)
            MFOptionCard("Continue plan")
            MFOptionCard("Skip")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun CAL017MissedMealScreenPreview() {
    MoveFuelTheme { CAL017MissedMealScreen {} }
}
