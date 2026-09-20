package com.movefuel.mufil2.ui.screens.rdy

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun RDY001ReadinessCheckInScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "RDY_001",
        title = "Readiness Check In",
        subtitle = "Readiness check with FULL, REDUCED, RECOVERY, or STOP.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.RDY_002,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.SOR_010,
        onNavigate = onNavigate,
    ) {
            MFOptionCard("Start readiness check",null,true)
            MFNotice("Short check-in","Energy, fatigue, recovery, and soreness shape today’s plan.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun RDY001ReadinessCheckInScreenPreview() {
    MoveFuelTheme { RDY001ReadinessCheckInScreen {} }
}
