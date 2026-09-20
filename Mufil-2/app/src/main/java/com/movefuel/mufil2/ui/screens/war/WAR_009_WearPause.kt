package com.movefuel.mufil2.ui.screens.war

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun WAR009WearPauseScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "WAR_009",
        title = "Wear Pause",
        subtitle = "Wear OS glance and workout execution.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.WAR_010,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.WAR_008,
        onNavigate = onNavigate,
    ) {
            MFStatusBanner("Paused","Workout state is preserved.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun WAR009WearPauseScreenPreview() {
    MoveFuelTheme { WAR009WearPauseScreen {} }
}
