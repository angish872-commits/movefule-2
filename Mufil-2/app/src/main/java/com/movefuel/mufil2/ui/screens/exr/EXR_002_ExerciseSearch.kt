package com.movefuel.mufil2.ui.screens.exr

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun EXR002ExerciseSearchScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "EXR_002",
        title = "Exercise Search",
        subtitle = "Exercise search, technique, media, and substitutions.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.EXR_003,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.EXR_001,
        onNavigate = onNavigate,
    ) {
            MFField("Search exercises","bench")
            MFListItem("Bench Press","Chest · Barbell","Open")
            MFListItem("Dumbbell Bench Press","Chest · Dumbbell","Open")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun EXR002ExerciseSearchScreenPreview() {
    MoveFuelTheme { EXR002ExerciseSearchScreen {} }
}
