package com.movefuel.mufil2.ui.screens.onb

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun ONB016DietaryPreferencesScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "ONB_016",
        title = "Dietary Preferences",
        subtitle = "Progressive setup with clear, editable inputs.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.ONB_017,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.ONB_013,
        onNavigate = onNavigate,
    ) {
            MFOptionCard("No specific pattern", null, true)
            MFOptionCard("Vegetarian")
            MFOptionCard("Vegan")
            MFOptionCard("Other / cultural preference")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun ONB016DietaryPreferencesScreenPreview() {
    MoveFuelTheme { ONB016DietaryPreferencesScreen {} }
}
