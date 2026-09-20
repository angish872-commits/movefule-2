package com.movefuel.mufil2.ui.screens.onb

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun ONB005CountryLanguageTimezoneScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "ONB_005",
        title = "Country Language Timezone",
        subtitle = "Progressive setup with clear, editable inputs.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.ONB_006,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.ONB_004,
        onNavigate = onNavigate,
    ) {
            MFField("Country / region", "Nepal")
            MFField("Language", "English")
            MFField("Timezone", "Automatic from device")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun ONB005CountryLanguageTimezoneScreenPreview() {
    MoveFuelTheme { ONB005CountryLanguageTimezoneScreen {} }
}
