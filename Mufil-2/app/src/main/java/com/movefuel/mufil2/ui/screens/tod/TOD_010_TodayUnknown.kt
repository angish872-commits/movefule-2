package com.movefuel.mufil2.ui.screens.tod

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun TOD010TodayUnknownScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "TOD_010",
        title = "Today Unknown",
        subtitle = "Daily home for nutrition, training, device status, and next action.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.TOD_011,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.TOD_009,
        onNavigate = onNavigate,
    ) {
            MFNotice("Today Unknown", "Today clearly explains what is available, what is missing, and what can be done next.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TOD010TodayUnknownScreenPreview() {
    MoveFuelTheme { TOD010TodayUnknownScreen {} }
}
