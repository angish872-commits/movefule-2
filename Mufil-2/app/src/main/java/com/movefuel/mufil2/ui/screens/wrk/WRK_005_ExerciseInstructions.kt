package com.movefuel.mufil2.ui.screens.wrk

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun WRK005ExerciseInstructionsScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "WRK_005",
        title = "Exercise Instructions",
        subtitle = "Live workout execution using performed facts.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.WRK_006,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.WRK_004,
        onNavigate = onNavigate,
    ) {
            MFMediaPanel("Bench Press","Exercise demonstration")
            MFListItem("Setup","Feet planted · stable upper back","1")
            MFListItem("Execution","Controlled lowering · press smoothly","2")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun WRK005ExerciseInstructionsScreenPreview() {
    MoveFuelTheme { WRK005ExerciseInstructionsScreen {} }
}
