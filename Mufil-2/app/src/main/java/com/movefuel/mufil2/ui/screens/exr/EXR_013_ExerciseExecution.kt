package com.movefuel.mufil2.ui.screens.exr

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun EXR013ExerciseExecutionScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "EXR_013",
        title = "Exercise Execution",
        subtitle = "Exercise search, technique, media, and substitutions.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.EXR_014,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.EXR_012,
        onNavigate = onNavigate,
    ) {
            MFListItem("Lower","Controlled path toward chest","1")
            MFListItem("Press","Drive smoothly to lockout","2")
            MFListItem("Repeat","Maintain stable setup","3")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun EXR013ExerciseExecutionScreenPreview() {
    MoveFuelTheme { EXR013ExerciseExecutionScreen {} }
}
