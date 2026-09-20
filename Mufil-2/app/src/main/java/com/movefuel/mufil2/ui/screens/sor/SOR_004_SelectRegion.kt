package com.movefuel.mufil2.ui.screens.sor

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun SOR004SelectRegionScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "SOR_004",
        title = "Select Region",
        subtitle = "Soreness body-map workflow; pain stays separate.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.SOR_005,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.SOR_003,
        onNavigate = onNavigate,
    ) {
            MFBodyMapPlaceholder(true)
            MFListItem("Current soreness","Left quadriceps · Mild","Active")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun SOR004SelectRegionScreenPreview() {
    MoveFuelTheme { SOR004SelectRegionScreen {} }
}
