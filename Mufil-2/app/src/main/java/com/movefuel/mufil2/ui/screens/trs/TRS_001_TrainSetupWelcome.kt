package com.movefuel.mufil2.ui.screens.trs

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.tooling.preview.Preview
import com.movefuel.mufil2.ui.components.MFNotice
import com.movefuel.mufil2.ui.components.MFOptionCard
import com.movefuel.mufil2.ui.components.MFPrimaryButton
import com.movefuel.mufil2.ui.components.MFScreenFrame
import com.movefuel.mufil2.ui.components.MFStatusBanner
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

private enum class TrainSetupMode {
    QUICK,
    PERSONALIZED,
}

@Composable
fun TRS001TrainSetupWelcomeScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    var showStartChoice by remember { mutableStateOf(false) }
    var selectedMode by remember { mutableStateOf<TrainSetupMode?>(null) }

    MFScreenFrame(
        id = "TRS_001",
        title = "Train Setup Welcome",
        subtitle = "Train is independent from the short MoveFuel onboarding.",
        primaryLabel = null,
        primaryRoute = null,
        secondaryLabel = "Not now",
        secondaryRoute = MoveFuelRoute.MASTER_TODAY,
        onNavigate = onNavigate,
    ) {
        MFStatusBanner(
            "Set up Train",
            "Workouts can adapt to your schedule, equipment, preferences, and recovery context.",
        )

        if (!showStartChoice) {
            MFNotice(
                title = "Set up only when you want Train",
                body = "Today, Fuel, Progress, and Profile remain usable without configuring Train.",
            )
            MFPrimaryButton("Set up Train") {
                showStartChoice = true
            }
        } else {
            MFOptionCard(
                title = "Quick setup",
                supporting = "Start with a simpler setup and a plan preview.",
                selected = selectedMode == TrainSetupMode.QUICK,
                onClick = { selectedMode = TrainSetupMode.QUICK },
            )
            MFOptionCard(
                title = "Personalize Train",
                supporting = "Walk through the full Train setup before previewing a plan.",
                selected = selectedMode == TrainSetupMode.PERSONALIZED,
                onClick = { selectedMode = TrainSetupMode.PERSONALIZED },
            )
            MFPrimaryButton(
                text = "Continue",
                enabled = selectedMode != null,
            ) {
                onNavigate(MoveFuelRoute.TRS_002)
            }
        }
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TRS001TrainSetupWelcomeScreenPreview() {
    MoveFuelTheme { TRS001TrainSetupWelcomeScreen {} }
}
