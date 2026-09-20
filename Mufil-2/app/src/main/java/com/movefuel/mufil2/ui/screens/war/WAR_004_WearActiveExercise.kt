package com.movefuel.mufil2.ui.screens.war

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun WAR004WearActiveExerciseScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "WAR_004",
        title = "Wear Active Exercise",
        subtitle = "Wear OS glance and workout execution.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.WAR_005,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.WAR_003,
        onNavigate = onNavigate,
    ) {
            MFMediaPanel("Bench Press","Set 2 of 4")
            MFMetricRow("Reps" to "8","Load" to "60kg")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun WAR004WearActiveExerciseScreenPreview() {
    MoveFuelTheme { WAR004WearActiveExerciseScreen {} }
}
