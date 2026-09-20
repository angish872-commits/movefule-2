package com.movefuel.mufil2.ui.screens.trs

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun TRS012ExercisePreferencesScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "TRS_012",
        title = "Exercise Preferences",
        subtitle = "First-time training setup.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.TRS_013,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.TRS_011,
        onNavigate = onNavigate,
    ) {
            MFField("Training preference","")
            MFField("Avoid / limit","—")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TRS012ExercisePreferencesScreenPreview() {
    MoveFuelTheme { TRS012ExercisePreferencesScreen {} }
}
