package com.movefuel.mufil2.ui.screens.war

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun WAR005WearSetInputScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "WAR_005",
        title = "Wear Set Input",
        subtitle = "Wear OS glance and workout execution.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.WAR_006,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.WAR_004,
        onNavigate = onNavigate,
    ) {
            MFField("Reps","8")
            MFField("Load","60 kg")
            MFField("RPE","7")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun WAR005WearSetInputScreenPreview() {
    MoveFuelTheme { WAR005WearSetInputScreen {} }
}
