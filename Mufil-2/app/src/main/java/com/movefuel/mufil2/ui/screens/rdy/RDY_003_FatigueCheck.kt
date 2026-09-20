package com.movefuel.mufil2.ui.screens.rdy

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun RDY003FatigueCheckScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "RDY_003",
        title = "Fatigue Check",
        subtitle = "Readiness check with FULL, REDUCED, RECOVERY, or STOP.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.RDY_004,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.RDY_002,
        onNavigate = onNavigate,
    ) {
            MFOptionCard("Good")
            MFOptionCard("Okay",null,true)
            MFOptionCard("Low")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun RDY003FatigueCheckScreenPreview() {
    MoveFuelTheme { RDY003FatigueCheckScreen {} }
}
