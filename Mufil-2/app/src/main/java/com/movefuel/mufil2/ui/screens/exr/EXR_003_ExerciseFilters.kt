package com.movefuel.mufil2.ui.screens.exr

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun EXR003ExerciseFiltersScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "EXR_003",
        title = "Exercise Filters",
        subtitle = "Exercise search, technique, media, and substitutions.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.EXR_004,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.EXR_002,
        onNavigate = onNavigate,
    ) {
            MFOptionCard("Equipment")
            MFOptionCard("Movement")
            MFOptionCard("Muscle")
            MFOptionCard("Environment")
            MFOptionCard("Difficulty")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun EXR003ExerciseFiltersScreenPreview() {
    MoveFuelTheme { EXR003ExerciseFiltersScreen {} }
}
