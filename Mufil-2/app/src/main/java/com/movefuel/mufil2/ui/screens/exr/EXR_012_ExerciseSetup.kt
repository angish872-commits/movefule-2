package com.movefuel.mufil2.ui.screens.exr

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun EXR012ExerciseSetupScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "EXR_012",
        title = "Exercise Setup",
        subtitle = "Exercise search, technique, media, and substitutions.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.EXR_013,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.EXR_011,
        onNavigate = onNavigate,
    ) {
            MFListItem("Bench position","Eyes below the bar","1")
            MFListItem("Grip","Stable grip width","2")
            MFListItem("Feet","Firm contact with floor","3")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun EXR012ExerciseSetupScreenPreview() {
    MoveFuelTheme { EXR012ExerciseSetupScreen {} }
}
