package com.movefuel.mufil2.ui.screens.cal

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun CAL014SuggestedAlternativesScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "CAL_014",
        title = "Suggested Alternatives",
        subtitle = "Canonical calendar shared by Fuel and Train.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.CAL_015,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.CAL_013,
        onNavigate = onNavigate,
    ) {
            MFOptionCard("18:30",null,true)
            MFOptionCard("19:00")
            MFOptionCard("Tomorrow · 17:30")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun CAL014SuggestedAlternativesScreenPreview() {
    MoveFuelTheme { CAL014SuggestedAlternativesScreen {} }
}
