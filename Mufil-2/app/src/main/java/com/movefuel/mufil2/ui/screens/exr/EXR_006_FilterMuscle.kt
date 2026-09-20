package com.movefuel.mufil2.ui.screens.exr

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun EXR006FilterMuscleScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "EXR_006",
        title = "Filter Muscle",
        subtitle = "Exercise search, technique, media, and substitutions.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.EXR_007,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.EXR_005,
        onNavigate = onNavigate,
    ) {
            MFOptionCard("Chest")
            MFOptionCard("Back",null,true)
            MFOptionCard("Legs")
            MFOptionCard("Shoulders")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun EXR006FilterMuscleScreenPreview() {
    MoveFuelTheme { EXR006FilterMuscleScreen {} }
}
