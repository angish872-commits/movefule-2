package com.movefuel.mufil2.ui.screens.rdy

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun RDY009ReadinessRecoveryScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "RDY_009",
        title = "Readiness Recovery",
        subtitle = "Readiness check with FULL, REDUCED, RECOVERY, or STOP.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.RDY_010,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.RDY_008,
        onNavigate = onNavigate,
    ) {
            MFStatusBanner("RECOVERY","Recovery options replace the normal session.",MoveFuelColors.Info)
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun RDY009ReadinessRecoveryScreenPreview() {
    MoveFuelTheme { RDY009ReadinessRecoveryScreen {} }
}
