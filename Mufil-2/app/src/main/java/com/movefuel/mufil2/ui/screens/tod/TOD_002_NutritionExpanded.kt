package com.movefuel.mufil2.ui.screens.tod

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun TOD002NutritionExpandedScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "TOD_002",
        title = "Nutrition Expanded",
        subtitle = "Daily home for nutrition, training, device status, and next action.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.TOD_003,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.TOD_001,
        onNavigate = onNavigate,
    ) {
            MFMacroBars()
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TOD002NutritionExpandedScreenPreview() {
    MoveFuelTheme { TOD002NutritionExpandedScreen {} }
}
