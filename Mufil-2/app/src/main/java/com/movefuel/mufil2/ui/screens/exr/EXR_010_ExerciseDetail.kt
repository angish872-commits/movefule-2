package com.movefuel.mufil2.ui.screens.exr

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun EXR010ExerciseDetailScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "EXR_010",
        title = "Exercise Detail",
        subtitle = "Exercise search, technique, media, and substitutions.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.EXR_011,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.EXR_009,
        onNavigate = onNavigate,
    ) {
            MFMediaPanel("Bench Press","Chest · Barbell · Intermediate")
            MFMetricRow("Primary" to "Chest","Pattern" to "Push","Level" to "Mid")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun EXR010ExerciseDetailScreenPreview() {
    MoveFuelTheme { EXR010ExerciseDetailScreen {} }
}
