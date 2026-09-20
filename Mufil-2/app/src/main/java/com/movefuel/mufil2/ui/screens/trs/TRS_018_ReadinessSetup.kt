package com.movefuel.mufil2.ui.screens.trs

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun TRS018ReadinessSetupScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "TRS_018",
        title = "Readiness Setup",
        subtitle = "First-time training setup.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.TRS_019,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.TRS_017,
        onNavigate = onNavigate,
    ) {
            MFOptionCard("Good")
            MFOptionCard("Okay",null,true)
            MFOptionCard("Low")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TRS018ReadinessSetupScreenPreview() {
    MoveFuelTheme { TRS018ReadinessSetupScreen {} }
}
