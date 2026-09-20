package com.movefuel.mufil2.ui.screens.exr

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun EXR001ExerciseLibraryScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "EXR_001",
        title = "Exercise Library",
        subtitle = "Exercise search, technique, media, and substitutions.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.EXR_002,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.RDY_010,
        onNavigate = onNavigate,
    ) {
            MFField("Search exercises","")
            MFListItem("Bench Press","Chest · Barbell","Open")
            MFListItem("Seated Row","Back · Cable","Open")
            MFListItem("Goblet Squat","Legs · Dumbbell","Open")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun EXR001ExerciseLibraryScreenPreview() {
    MoveFuelTheme { EXR001ExerciseLibraryScreen {} }
}
