package com.movefuel.mufil2.ui.screens.onb

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun ONB006UnitsScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "ONB_006",
        title = "Units",
        subtitle = "Progressive setup with clear, editable inputs.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.ONB_007,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.ONB_005,
        onNavigate = onNavigate,
    ) {
            MFOptionCard("Metric", "kg · cm · km", true)
            MFOptionCard("Imperial", "lb · ft/in · mi")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun ONB006UnitsScreenPreview() {
    MoveFuelTheme { ONB006UnitsScreen {} }
}
