package com.movefuel.mufil2.ui.screens.tod

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun TOD012TodayStaleScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "TOD_012",
        title = "Today Stale",
        subtitle = "Daily home for nutrition, training, device status, and next action.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.CAM_001,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.TOD_011,
        onNavigate = onNavigate,
    ) {
            MFNotice("Today Stale", "Today clearly explains what is available, what is missing, and what can be done next.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TOD012TodayStaleScreenPreview() {
    MoveFuelTheme { TOD012TodayStaleScreen {} }
}
