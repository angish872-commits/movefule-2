package com.movefuel.mufil2.ui.screens.exr

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun EXR004FilterEquipmentScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "EXR_004",
        title = "Filter Equipment",
        subtitle = "Exercise search, technique, media, and substitutions.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.EXR_005,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.EXR_003,
        onNavigate = onNavigate,
    ) {
            MFOptionCard("Available equipment",null,true)
            MFOptionCard("Bodyweight")
            MFOptionCard("Dumbbells")
            MFOptionCard("Barbell")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun EXR004FilterEquipmentScreenPreview() {
    MoveFuelTheme { EXR004FilterEquipmentScreen {} }
}
