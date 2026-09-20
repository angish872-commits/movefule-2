package com.movefuel.mufil2.ui.screens.war

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun WAR010WearFinishScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "WAR_010",
        title = "Wear Finish",
        subtitle = "Wear OS glance and workout execution.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.WAR_011,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.WAR_009,
        onNavigate = onNavigate,
    ) {
            MFNotice("Finish workout","Completed facts stay saved even if phone sync is pending.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun WAR010WearFinishScreenPreview() {
    MoveFuelTheme { WAR010WearFinishScreen {} }
}
