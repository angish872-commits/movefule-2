package com.movefuel.mufil2.ui.screens.war

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun WAR006WearCompleteSetScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "WAR_006",
        title = "Wear Complete Set",
        subtitle = "Wear OS glance and workout execution.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.WAR_007,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.WAR_005,
        onNavigate = onNavigate,
    ) {
            MFStatusBanner("Set complete","Saved on watch until phone acknowledgment.",MoveFuelColors.Success)
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun WAR006WearCompleteSetScreenPreview() {
    MoveFuelTheme { WAR006WearCompleteSetScreen {} }
}
