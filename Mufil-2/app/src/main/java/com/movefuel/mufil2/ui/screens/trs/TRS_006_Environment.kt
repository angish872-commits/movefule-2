package com.movefuel.mufil2.ui.screens.trs

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun TRS006EnvironmentScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "TRS_006",
        title = "Environment",
        subtitle = "First-time training setup.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.TRS_007,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.TRS_005,
        onNavigate = onNavigate,
    ) {
            MFOptionCard("Gym",null,true)
            MFOptionCard("Home")
            MFOptionCard("Outdoors")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TRS006EnvironmentScreenPreview() {
    MoveFuelTheme { TRS006EnvironmentScreen {} }
}
