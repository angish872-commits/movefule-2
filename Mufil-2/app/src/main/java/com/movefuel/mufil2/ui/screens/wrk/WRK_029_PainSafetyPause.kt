package com.movefuel.mufil2.ui.screens.wrk

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun WRK029PainSafetyPauseScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "WRK_029",
        title = "Pain Safety Pause",
        subtitle = "Live workout execution using performed facts.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.WRK_030,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.WRK_028,
        onNavigate = onNavigate,
    ) {
            MFNotice("Pain reported","Normal workout progression is paused. Pain is not treated as soreness.","Review safety options")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun WRK029PainSafetyPauseScreenPreview() {
    MoveFuelTheme { WRK029PainSafetyPauseScreen {} }
}
