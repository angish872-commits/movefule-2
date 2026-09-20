package com.movefuel.mufil2.ui.screens.war

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun WAR001WearTodayScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "WAR_001",
        title = "Wear Today",
        subtitle = "Wear OS glance and workout execution.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.WAR_002,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.BIL_008,
        onNavigate = onNavigate,
    ) {
            MFMetricRow("Readiness" to "Reduced","Workout" to "46m")
            MFListItem("Upper Strength A","5 exercises","Open")
            MFListItem("Soreness","Quick check","Open")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun WAR001WearTodayScreenPreview() {
    MoveFuelTheme { WAR001WearTodayScreen {} }
}
