package com.movefuel.mufil2.ui.screens.trs

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun TRS008WeeklyAvailabilityScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "TRS_008",
        title = "Weekly Availability",
        subtitle = "First-time training setup.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.TRS_009,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.TRS_007,
        onNavigate = onNavigate,
    ) {
            MFField("Availability","3 days / week")
            MFField("Typical session","45 minutes")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TRS008WeeklyAvailabilityScreenPreview() {
    MoveFuelTheme { TRS008WeeklyAvailabilityScreen {} }
}
