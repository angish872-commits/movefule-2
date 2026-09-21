package com.movefuel.mufil2.ui.screens.cal

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun CAL001CalendarDashboardScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "CAL_001",
        title = "Calendar",
        subtitle = "One calendar for workouts, planned meals, recovery, conflicts, and rescheduling.",
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.MASTER_TODAY,
        onNavigate = onNavigate,
    ) {
        MFTabStrip(
            labels = listOf("Month", "Week", "Day"),
            selected = "Month",
            onSelect = { tab ->
                when (tab) {
                    "Month" -> onNavigate(MoveFuelRoute.CAL_002)
                    "Week" -> onNavigate(MoveFuelRoute.CAL_003)
                    "Day" -> onNavigate(MoveFuelRoute.CAL_004)
                }
            },
        )
        MFCalendarMini(
            onDaySelected = { onNavigate(MoveFuelRoute.CAL_005) },
        )

        MFSectionTitle("Selected day")
        MFNotice("No calendar events", "Workout and meal events appear only when canonical plan or confirmed history provides them.")
        MFPrimaryButton("Reschedule an event") {
            onNavigate(MoveFuelRoute.CAL_009)
        }
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0B1420, widthDp = 390, heightDp = 844)
@Composable
private fun CAL001CalendarDashboardScreenPreview() {
    MoveFuelTheme { CAL001CalendarDashboardScreen {} }
}
