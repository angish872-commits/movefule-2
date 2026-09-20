package com.movefuel.mufil2.ui.screens.onb

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun ONB009EnergyEstimationSettingScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "ONB_009",
        title = "Energy Estimation Setting",
        subtitle = "Progressive setup with clear, editable inputs.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.ONB_010,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.ONB_008,
        onNavigate = onNavigate,
    ) {
            MFOptionCard("Female equation setting", "Used only where a supported equation requires it.")
            MFOptionCard("Male equation setting", "Used only where a supported equation requires it.")
            MFOptionCard("Prefer not to answer", "Unavailable calculations remain unavailable.", true)
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun ONB009EnergyEstimationSettingScreenPreview() {
    MoveFuelTheme { ONB009EnergyEstimationSettingScreen {} }
}
