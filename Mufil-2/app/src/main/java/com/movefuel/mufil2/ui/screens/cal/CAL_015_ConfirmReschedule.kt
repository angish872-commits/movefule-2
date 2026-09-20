package com.movefuel.mufil2.ui.screens.cal

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun CAL015ConfirmRescheduleScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "CAL_015",
        title = "Confirm Reschedule",
        subtitle = "Canonical calendar shared by Fuel and Train.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.CAL_016,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.CAL_014,
        onNavigate = onNavigate,
    ) {
            MFCalendarMini()
            MFStatusBanner("Choose a new date","Existing events remain visible to avoid conflicts.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun CAL015ConfirmRescheduleScreenPreview() {
    MoveFuelTheme { CAL015ConfirmRescheduleScreen {} }
}
