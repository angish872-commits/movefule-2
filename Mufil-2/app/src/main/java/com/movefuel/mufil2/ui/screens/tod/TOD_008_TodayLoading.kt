package com.movefuel.mufil2.ui.screens.tod

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun TOD008TodayLoadingScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "TOD_008",
        title = "Today Loading",
        subtitle = "Daily home for nutrition, training, device status, and next action.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.TOD_009,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.TOD_007,
        onNavigate = onNavigate,
    ) {
            MFSkeleton(220.dp, 28.dp)
            MFSkeleton(358.dp, 140.dp)
            MFSkeleton(358.dp, 96.dp)
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TOD008TodayLoadingScreenPreview() {
    MoveFuelTheme { TOD008TodayLoadingScreen {} }
}
