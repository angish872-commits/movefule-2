package com.movefuel.mufil2.ui.screens.war

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun WAR002WearReadinessScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "WAR_002",
        title = "Wear Readiness",
        subtitle = "Wear OS glance and workout execution.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.WAR_003,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.WAR_001,
        onNavigate = onNavigate,
    ) {
            MFStatusBanner("Reduced","Today’s workout is adapted.",MoveFuelColors.Warning)
            MFMetricRow("Energy" to "Good","Fatigue" to "Medium")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun WAR002WearReadinessScreenPreview() {
    MoveFuelTheme { WAR002WearReadinessScreen {} }
}
