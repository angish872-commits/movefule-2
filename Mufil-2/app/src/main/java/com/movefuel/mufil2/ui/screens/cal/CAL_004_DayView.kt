package com.movefuel.mufil2.ui.screens.cal

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun CAL004DayViewScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "CAL_004",
        title = "Day View",
        subtitle = "Canonical calendar shared by Fuel and Train.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.CAL_005,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.CAL_003,
        onNavigate = onNavigate,
    ) {
            MFStatusBanner("Saturday, September 19","Selected date")
            MFListItem("Lunch","13:00 · Planned meal","Open")
            MFListItem("Upper Strength A","17:30 · Workout","Open")
            MFListItem("Dinner","19:30 · Planned meal","Open")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun CAL004DayViewScreenPreview() {
    MoveFuelTheme { CAL004DayViewScreen {} }
}
