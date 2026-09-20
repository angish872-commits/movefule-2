package com.movefuel.mufil2.ui.screens.exr

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun EXR007FilterEnvironmentScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "EXR_007",
        title = "Filter Environment",
        subtitle = "Exercise search, technique, media, and substitutions.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.EXR_008,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.EXR_006,
        onNavigate = onNavigate,
    ) {
            MFOptionCard("Gym",null,true)
            MFOptionCard("Home")
            MFOptionCard("Outdoors")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun EXR007FilterEnvironmentScreenPreview() {
    MoveFuelTheme { EXR007FilterEnvironmentScreen {} }
}
