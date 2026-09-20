package com.movefuel.mufil2.ui.screens.trn

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun TRN014ReplacementOptionsScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "TRN_014",
        title = "Replacement Options",
        subtitle = "Readiness, today’s workout, and program context.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.TRN_015,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.TRN_013,
        onNavigate = onNavigate,
    ) {
            MFOptionCard("Dumbbell press","Same movement pattern",true)
            MFOptionCard("Push-up","Bodyweight alternative")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TRN014ReplacementOptionsScreenPreview() {
    MoveFuelTheme { TRN014ReplacementOptionsScreen {} }
}
