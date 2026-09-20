package com.movefuel.mufil2.ui.screens.onb

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun ONB010DailyActivityScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "ONB_010",
        title = "Daily Activity",
        subtitle = "Progressive setup with clear, editable inputs.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.ONB_011,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.ONB_009,
        onNavigate = onNavigate,
    ) {
            MFOptionCard("Mostly seated", "Low everyday movement")
            MFOptionCard("Some movement", "Regular walking or standing", true)
            MFOptionCard("Active day", "Frequent everyday movement")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun ONB010DailyActivityScreenPreview() {
    MoveFuelTheme { ONB010DailyActivityScreen {} }
}
