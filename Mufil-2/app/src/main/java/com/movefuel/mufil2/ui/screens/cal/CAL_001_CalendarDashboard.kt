package com.movefuel.mufil2.ui.screens.cal

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun CAL001CalendarDashboardScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "CAL_001",
        title = "Calendar Dashboard",
        subtitle = "Canonical calendar shared by Fuel and Train.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.CAL_002,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.EXR_016,
        onNavigate = onNavigate,
    ) {
            MFCalendarMini()
            MFListItem("Upper Strength A","17:30 · Workout","Open")
            MFListItem("Dinner","19:30 · Planned meal","Open")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun CAL001CalendarDashboardScreenPreview() {
    MoveFuelTheme { CAL001CalendarDashboardScreen {} }
}
