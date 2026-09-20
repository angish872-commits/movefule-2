package com.movefuel.mufil2.ui.screens.exr

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun EXR008FilterDifficultyScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "EXR_008",
        title = "Filter Difficulty",
        subtitle = "Exercise search, technique, media, and substitutions.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.EXR_009,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.EXR_007,
        onNavigate = onNavigate,
    ) {
            MFOptionCard("Beginner")
            MFOptionCard("Intermediate",null,true)
            MFOptionCard("Advanced")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun EXR008FilterDifficultyScreenPreview() {
    MoveFuelTheme { EXR008FilterDifficultyScreen {} }
}
