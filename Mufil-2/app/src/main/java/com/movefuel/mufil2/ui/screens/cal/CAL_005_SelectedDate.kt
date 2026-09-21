package com.movefuel.mufil2.ui.screens.cal

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun CAL005SelectedDateScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "CAL_005",
        title = "Selected Date",
        subtitle = "Canonical calendar shared by Fuel and Train.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.CAL_006,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.CAL_004,
        onNavigate = onNavigate,
    ) {
            MFStatusBanner("Selected date","Date details are available; events are unavailable.")
            MFNotice("No selected-date events", "Calendar events are populated from canonical plan and confirmed-history sources.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun CAL005SelectedDateScreenPreview() {
    MoveFuelTheme { CAL005SelectedDateScreen {} }
}
