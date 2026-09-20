package com.movefuel.mufil2.ui.screens.cal

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun CAL009RescheduleEventScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "CAL_009",
        title = "Reschedule Event",
        subtitle = "Canonical calendar shared by Fuel and Train.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.CAL_010,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.CAL_008,
        onNavigate = onNavigate,
    ) {
            MFCalendarMini()
            MFStatusBanner("Choose a new date","Existing events remain visible to avoid conflicts.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun CAL009RescheduleEventScreenPreview() {
    MoveFuelTheme { CAL009RescheduleEventScreen {} }
}
