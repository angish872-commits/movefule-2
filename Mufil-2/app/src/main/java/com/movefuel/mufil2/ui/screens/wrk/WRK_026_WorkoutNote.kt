package com.movefuel.mufil2.ui.screens.wrk

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun WRK026WorkoutNoteScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "WRK_026",
        title = "Workout Note",
        subtitle = "Live workout execution using performed facts.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.WRK_027,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.WRK_025,
        onNavigate = onNavigate,
    ) {
            MFField("Workout note","")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun WRK026WorkoutNoteScreenPreview() {
    MoveFuelTheme { WRK026WorkoutNoteScreen {} }
}
