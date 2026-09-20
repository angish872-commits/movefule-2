package com.movefuel.mufil2.ui.screens.war

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun WAR007WearRestTimerScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "WAR_007",
        title = "Wear Rest Timer",
        subtitle = "Wear OS glance and workout execution.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.WAR_008,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.WAR_006,
        onNavigate = onNavigate,
    ) {
            MFMetricRow("Rest" to "01:12","Next" to "Set 3")
            MFOptionCard("+15 sec")
            MFOptionCard("Skip rest")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun WAR007WearRestTimerScreenPreview() {
    MoveFuelTheme { WAR007WearRestTimerScreen {} }
}
