package com.movefuel.mufil2.ui.screens.cal

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun CAL006WorkoutEventScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "CAL_006",
        title = "Workout Event",
        subtitle = "Canonical calendar shared by Fuel and Train.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.CAL_007,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.CAL_005,
        onNavigate = onNavigate,
    ) {
            MFListItem("Workout event", "Prescription unavailable", "Unknown")
            MFField("Time", "")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun CAL006WorkoutEventScreenPreview() {
    MoveFuelTheme { CAL006WorkoutEventScreen {} }
}
