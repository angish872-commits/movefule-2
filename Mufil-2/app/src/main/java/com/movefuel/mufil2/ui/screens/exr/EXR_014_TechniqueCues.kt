package com.movefuel.mufil2.ui.screens.exr

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun EXR014TechniqueCuesScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "EXR_014",
        title = "Technique Cues",
        subtitle = "Exercise search, technique, media, and substitutions.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.EXR_015,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.EXR_013,
        onNavigate = onNavigate,
    ) {
            MFListItem("Upper back","Keep it stable","Cue")
            MFListItem("Wrists","Keep stacked over forearms","Cue")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun EXR014TechniqueCuesScreenPreview() {
    MoveFuelTheme { EXR014TechniqueCuesScreen {} }
}
