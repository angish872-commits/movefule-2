package com.movefuel.mufil2.ui.screens.cal

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun CAL012CalendarConflictScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "CAL_012",
        title = "Calendar Conflict",
        subtitle = "Canonical calendar shared by Fuel and Train.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.CAL_013,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.CAL_011,
        onNavigate = onNavigate,
    ) {
            MFNotice("Calendar conflict","The requested time overlaps another MoveFuel event.")
            MFListItem("Existing workout","17:30–18:20","Conflict")
            MFListItem("Requested meal","18:00","Conflict")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun CAL012CalendarConflictScreenPreview() {
    MoveFuelTheme { CAL012CalendarConflictScreen {} }
}
