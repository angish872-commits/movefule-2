package com.movefuel.mufil2.ui.screens.exr

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun EXR011ExerciseMediaScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "EXR_011",
        title = "Exercise Media",
        subtitle = "Exercise search, technique, media, and substitutions.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.EXR_012,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.EXR_010,
        onNavigate = onNavigate,
    ) {
            MFMediaPanel("Bench Press","Exercise demonstration",true)
            MFNotice("Media loading","Technique text remains available while video loads.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun EXR011ExerciseMediaScreenPreview() {
    MoveFuelTheme { EXR011ExerciseMediaScreen {} }
}
