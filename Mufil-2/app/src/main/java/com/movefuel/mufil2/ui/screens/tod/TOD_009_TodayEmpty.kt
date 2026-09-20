package com.movefuel.mufil2.ui.screens.tod

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun TOD009TodayEmptyScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "TOD_009",
        title = "Today Empty",
        subtitle = "Daily home for nutrition, training, device status, and next action.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.TOD_010,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.TOD_008,
        onNavigate = onNavigate,
    ) {
            MFNotice("Today Empty", "Today clearly explains what is available, what is missing, and what can be done next.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TOD009TodayEmptyScreenPreview() {
    MoveFuelTheme { TOD009TodayEmptyScreen {} }
}
