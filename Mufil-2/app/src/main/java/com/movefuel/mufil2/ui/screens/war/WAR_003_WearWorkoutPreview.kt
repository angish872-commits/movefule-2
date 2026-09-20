package com.movefuel.mufil2.ui.screens.war

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun WAR003WearWorkoutPreviewScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "WAR_003",
        title = "Wear Workout Preview",
        subtitle = "Wear OS glance and workout execution.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.WAR_004,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.WAR_002,
        onNavigate = onNavigate,
    ) {
            MFListItem("Upper Strength A","5 exercises · 46 min","Start")
            MFListItem("Bench Press","4 × 8","1")
            MFListItem("Seated Row","3 × 10","2")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun WAR003WearWorkoutPreviewScreenPreview() {
    MoveFuelTheme { WAR003WearWorkoutPreviewScreen {} }
}
