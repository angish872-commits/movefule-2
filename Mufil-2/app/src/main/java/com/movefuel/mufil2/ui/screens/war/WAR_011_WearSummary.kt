package com.movefuel.mufil2.ui.screens.war

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun WAR011WearSummaryScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "WAR_011",
        title = "Wear Summary",
        subtitle = "Wear OS glance and workout execution.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.WAR_012,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.WAR_010,
        onNavigate = onNavigate,
    ) {
            MFMetricRow("Completed" to "5/5","Time" to "43m")
            MFListItem("Sync state","Saved locally","Pending phone")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun WAR011WearSummaryScreenPreview() {
    MoveFuelTheme { WAR011WearSummaryScreen {} }
}
