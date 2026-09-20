package com.movefuel.mufil2.ui.screens.rdy

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun RDY006EvaluatingReadinessScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "RDY_006",
        title = "Evaluating Readiness",
        subtitle = "Readiness check with FULL, REDUCED, RECOVERY, or STOP.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.RDY_007,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.RDY_005,
        onNavigate = onNavigate,
    ) {
            MFStageList(listOf("Checking energy","Checking fatigue","Checking recovery","Checking soreness","Preparing result"),3)
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun RDY006EvaluatingReadinessScreenPreview() {
    MoveFuelTheme { RDY006EvaluatingReadinessScreen {} }
}
