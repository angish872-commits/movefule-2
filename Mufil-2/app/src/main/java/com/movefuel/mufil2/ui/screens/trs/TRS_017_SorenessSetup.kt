package com.movefuel.mufil2.ui.screens.trs

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun TRS017SorenessSetupScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "TRS_017",
        title = "Soreness Setup",
        subtitle = "First-time training setup.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.TRS_018,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.TRS_016,
        onNavigate = onNavigate,
    ) {
            MFBodyMapPlaceholder(true)
            MFNotice("Optional current soreness","You can skip if nothing is sore.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TRS017SorenessSetupScreenPreview() {
    MoveFuelTheme { TRS017SorenessSetupScreen {} }
}
