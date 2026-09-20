package com.movefuel.mufil2.ui.screens.exr

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun EXR016ExerciseSubstitutionsScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "EXR_016",
        title = "Exercise Substitutions",
        subtitle = "Exercise search, technique, media, and substitutions.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.CAL_001,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.EXR_015,
        onNavigate = onNavigate,
    ) {
            MFOptionCard("Dumbbell Bench Press","Similar movement pattern",true)
            MFOptionCard("Machine Chest Press","Stable alternative")
            MFOptionCard("Push-up","Bodyweight option")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun EXR016ExerciseSubstitutionsScreenPreview() {
    MoveFuelTheme { EXR016ExerciseSubstitutionsScreen {} }
}
