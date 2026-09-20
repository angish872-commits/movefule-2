package com.movefuel.mufil2.ui.screens.cal

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun CAL018CalendarOfflineScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "CAL_018",
        title = "Calendar Offline",
        subtitle = "Canonical calendar shared by Fuel and Train.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.PRG_001,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.CAL_017,
        onNavigate = onNavigate,
    ) {
            MFNotice("Calendar offline","Cached events remain visible. Pending changes stay marked until sync succeeds.","Retry sync")
            MFCalendarMini()
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun CAL018CalendarOfflineScreenPreview() {
    MoveFuelTheme { CAL018CalendarOfflineScreen {} }
}
