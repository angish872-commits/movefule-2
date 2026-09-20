package com.movefuel.mufil2.ui.screens.rdy

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun RDY008ReadinessReducedScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "RDY_008",
        title = "Readiness Reduced",
        subtitle = "Readiness check with FULL, REDUCED, RECOVERY, or STOP.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.RDY_009,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.RDY_007,
        onNavigate = onNavigate,
    ) {
            MFStatusBanner("REDUCED","Today’s plan is adapted.",MoveFuelColors.Warning)
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun RDY008ReadinessReducedScreenPreview() {
    MoveFuelTheme { RDY008ReadinessReducedScreen {} }
}
